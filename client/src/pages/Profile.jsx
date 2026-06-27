import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import '../components/Layout.css';
import './Profile.css';

/**
 * Custom Tooltip component for Recharts rating graph.
 */
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        className="card"
        style={{
          padding: '8px 12px',
          fontSize: '12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)'
        }}
      >
        <p style={{ fontWeight: '700', margin: 0, color: 'var(--text)' }}>
          {data.rating ? `Rating: ${data.rating}` : `Predicted: ${data.predictedRating}`}
        </p>
        <p style={{ color: 'var(--text-2)', margin: '4px 0 2px', maxWidth: '240px', lineHeight: 1.3 }}>
          {data.contest}
        </p>
        <p style={{ color: 'var(--accent)', margin: 0, fontWeight: '600' }}>Rank: #{data.rank}</p>
        <p style={{ color: 'var(--text-3)', margin: '2px 0 0', fontSize: '11px' }}>{data.date}</p>
      </div>
    );
  }
  return null;
};

/**
 * Profile Page Component.
 * Visualizes user's personal analytics: contest rating line chart, top problem tags, 
 * historical journal notes timeline, and allows updating Codeforces handle.
 */
export default function Profile() {
  const { user } = useAuth();
  const [cfData, setCfData] = useState(null);
  const [notes, setNotes] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Handle updates local state
  const [newHandle, setNewHandle] = useState('');
  const [isUpdatingHandle, setIsUpdatingHandle] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  const myHandle = user?.cfHandle || user?.codeforcesHandle;

  // 1. Fetch own Codeforces data and notes list on mount
  useEffect(() => {
    if (!myHandle) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    Promise.all([
      api.getCFData(myHandle), 
      api.getNotes(),
      api.getPrediction(myHandle).catch(() => null) // Ignore errors, gracefully degrade
    ])
      .then(([cf, notesList, predData]) => {
        setCfData(cf);
        setNotes(notesList || []);
        setPrediction(predData);
      })
      .catch(err => {
        console.error('Failed to load profile details:', err);
        setError('Could not retrieve Codeforces user profile data.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [myHandle]);

  // 2. Setup subscription to reload notes when note-added custom event fires from modal
  useEffect(() => {
    const handleNoteAdded = () => {
      api.getNotes()
        .then(notesList => setNotes(notesList || []))
        .catch(err => console.error('Failed to reload notes list:', err));
    };

    window.addEventListener('note-added', handleNoteAdded);
    return () => window.removeEventListener('note-added', handleNoteAdded);
  }, []);

  // Update Codeforces handle action
  const handleUpdateHandle = async (e) => {
    e.preventDefault();
    if (!newHandle.trim()) return;

    setIsUpdatingHandle(true);
    setUpdateError('');
    setUpdateSuccess('');

    try {
      // Validate handle exists on CF first
      const validatedData = await api.getCFData(newHandle.trim());
      
      // Save changes to profile on backend
      await api.updateProfile({ codeforcesHandle: newHandle.trim() });
      
      setCfData(validatedData);
      setUpdateSuccess('Codeforces handle updated successfully!');
      
      // Page reload to rebuild global contexts and sidebar details
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Failed to update handle:', err);
      setUpdateError(err.response?.data?.error || 'Invalid handle. Could not verify with Codeforces.');
    } finally {
      setIsUpdatingHandle(false);
    }
  };

  // Process data if handle and data exists
  let totalSolved = 0;
  let contestCount = 0;
  let bestRank = 'N/A';
  let daysActive = 0;
  let chartData = [];
  let topTags = [];

  if (cfData) {
    const submissions = cfData.submissions || [];
    const ratingHistory = cfData.ratingHistory || [];

    // 1. Solved unique count
    totalSolved = new Set(
      submissions
        .filter(s => s.verdict === 'OK' && s.problem)
        .map(s => `${s.problem.contestId}${s.problem.index}`)
    ).size;

    // 2. Contest count
    contestCount = ratingHistory.length;

    // 3. Best rank achieved
    if (ratingHistory.length > 0) {
      bestRank = `#${Math.min(...ratingHistory.map(c => c.rank))}`;
    }

    // 4. Days active
    daysActive = new Set(
      submissions.map(s => new Date(s.creationTimeSeconds * 1000).toISOString().split('T')[0])
    ).size;

    // 5. Contest Rating progression chart data
    chartData = ratingHistory.map(c => ({
      date: new Date(c.ratingUpdateTimeSeconds * 1000).toLocaleDateString(undefined, {
        month: 'short',
        year: '2-digit'
      }),
      rating: c.newRating,
      contest: c.contestName,
      rank: c.rank
    }));

    // Add predicted point to chartData
    if (prediction && chartData.length > 0) {
      const lastPoint = chartData[chartData.length - 1];
      // To connect the lines, we need the last actual point to also have a 'predictedRating'
      lastPoint.predictedRating = lastPoint.rating;
      
      chartData.push({
        date: 'Next',
        predictedRating: prediction.predictedRating,
        contest: 'Predicted Next Rating',
        rank: 'N/A'
      });
    }

    // 6. Top 8 tags calculation
    const tagSolvedSet = {};
    submissions.forEach(sub => {
      if (sub.verdict === 'OK' && sub.problem && sub.problem.tags) {
        const probId = `${sub.problem.contestId}${sub.problem.index}`;
        sub.problem.tags.forEach(tag => {
          if (!tagSolvedSet[tag]) {
            tagSolvedSet[tag] = new Set();
          }
          tagSolvedSet[tag].add(probId);
        });
      }
    });

    const unsortedTags = Object.entries(tagSolvedSet).map(([tag, set]) => ({
      tag,
      count: set.size
    }));

    const maxCount = unsortedTags.length > 0 ? Math.max(...unsortedTags.map(t => t.count)) : 1;

    topTags = unsortedTags
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map(tagObj => ({
        ...tagObj,
        percentage: (tagObj.count / maxCount) * 100
      }));
  }

  // Get Codeforces rank color variable
  const getRankColorVar = (cfRank) => {
    if (!cfRank) return 'var(--cf-newbie)';
    const normalized = cfRank.toLowerCase().replace(/\s+/g, '');
    if (normalized.includes('grandmaster')) return 'var(--cf-grandmaster)';
    if (normalized.includes('master')) return 'var(--cf-master)';
    if (normalized.includes('candidate') || normalized.includes('cm')) return 'var(--cf-cm)';
    if (normalized.includes('expert')) return 'var(--cf-expert)';
    if (normalized.includes('specialist')) return 'var(--cf-specialist)';
    if (normalized.includes('pupil')) return 'var(--cf-pupil)';
    return 'var(--cf-newbie)';
  };

  const memberSince = user?.startDate
    ? new Date(user.startDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : 'unknown';

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="app-main">
        <div className="page-content">
          
          {/* Header Card */}
          <section className="card profile-header-card">
            <img
              src={cfData?.avatar || 'https://userpic.codeforces.org/no-title-photo.jpg'}
              alt={`${user?.username}'s avatar`}
              className="profile-avatar"
            />
            
            <div className="profile-title-block">
              <div className="profile-name-row">
                <h2>{user?.username}</h2>
                {cfData && (
                  <span
                    className="badge"
                    style={{
                      background: 'transparent',
                      color: getRankColorVar(cfData.rank),
                      padding: 0,
                      fontWeight: '700',
                      fontSize: '14px',
                      textTransform: 'capitalize'
                    }}
                  >
                    {cfData.rank} · {cfData.rating}
                  </span>
                )}
              </div>
              
              <div className="profile-meta-details">
                {myHandle ? (
                  <span>Codeforces Handle: <strong>{myHandle}</strong></span>
                ) : (
                  <span style={{ color: 'var(--text-3)' }}>No Codeforces handle connected</span>
                )}
                <span>Member since: {memberSince}</span>
              </div>
              
              {myHandle && (
                <div style={{ marginTop: '16px' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => navigate(`/compare?peer=${myHandle}`)}
                    style={{ fontSize: '13px', padding: '8px 16px', background: '#10b981', border: 'none', color: '#fff', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    📊 Compare Journey
                  </button>
                </div>
              )}
            </div>
          </section>

          {!myHandle ? (
            <div className="card" style={{ border: '1px dashed var(--warning)', backgroundColor: 'rgba(217, 119, 6, 0.05)' }}>
              <p style={{ color: 'var(--warning)', fontWeight: '500' }}>
                Please set your Codeforces handle on the Home Dashboard to view profile details and rating charts.
              </p>
            </div>
          ) : loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-2)' }}>Compiling profile analytics...</p>
            </div>
          ) : (
            <>
              {error && <div className="card error-msg" style={{ marginBottom: '20px', padding: '12px' }}>{error}</div>}

              {/* Stats Row */}
              <section className="stats-grid">
                <div className="card stat-card">
                  <span className="stat-label">Total Solved</span>
                  <strong className="stat-value">{totalSolved}</strong>
                </div>
                <div className="card stat-card">
                  <span className="stat-label">Contest Entries</span>
                  <strong className="stat-value">{contestCount}</strong>
                </div>
                <div className="card stat-card">
                  <span className="stat-label">Best Rank</span>
                  <strong className="stat-value">{bestRank}</strong>
                </div>
                <div className="card stat-card">
                  <span className="stat-label">Days Active</span>
                  <strong className="stat-value">{daysActive}</strong>
                </div>
              </section>

              {/* Rating History Chart */}
              {chartData.length > 0 && (
                <section className="card" style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px', color: 'var(--text)' }}>
                    Contest Rating History
                  </h3>
                  <div style={{ width: '100%', height: 240 }}>
                    <ResponsiveContainer>
                      <LineChart data={chartData}>
                        <XAxis dataKey="date" />
                        <YAxis domain={['dataMin - 100', 'dataMax + 100']} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="rating"
                          stroke="var(--accent)"
                          strokeWidth={3}
                          dot={{ stroke: 'var(--accent)', strokeWidth: 1, r: 3, fill: '#fff' }}
                          activeDot={{ r: 5 }}
                        />
                        {prediction && (
                          <Line
                            type="monotone"
                            dataKey="predictedRating"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            strokeDasharray="5 5"
                            dot={{ stroke: '#8b5cf6', strokeWidth: 1, r: 3, fill: '#fff' }}
                            activeDot={{ r: 5 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}

              {/* Predictor Info Widget */}
              {prediction && (
                <section className="card" style={{ marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                      Mathematical Rating Predictor
                    </h3>
                    <p style={{ color: 'var(--text-2)', fontSize: '13px', margin: 0 }}>
                      {prediction.message}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '4px' }}>Predicted Next Rating</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent)' }}>
                      {prediction.predictedRating} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-3)' }}>± {prediction.confidenceRange}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: prediction.slope > 0 ? '#10b981' : '#ef4444' }}>
                      Trend: {prediction.trend}
                    </div>
                  </div>
                </section>
              )}

              {/* Two Column Grid */}
              <div className="profile-grid-layout">
                
                {/* Left Column: Notes Timeline */}
                <section className="card">
                  <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>
                    Journal & Reflection Log
                  </h3>
                  {notes.length > 0 ? (
                    <div className="notes-timeline">
                      {notes.map(note => {
                        const dateStr = new Date(note.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        return (
                          <div key={note._id} className="note-timeline-item">
                            <div className="note-item-date">{dateStr}</div>
                            <div className="note-item-text">{note.text}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-2)', fontSize: '13px', marginTop: '12px' }}>
                      No reflection notes written yet. Click "Add Note" in the sidebar to write your first reflection!
                    </p>
                  )}
                </section>

                {/* Right Column: Top Tags Breakdown & Update Handle */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Top Tags */}
                  <section className="card">
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
                      Top Solved Topics
                    </h3>
                    {topTags.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {topTags.map(tagObj => (
                          <div key={tagObj.tag} className="profile-tag-row">
                            <span className="profile-tag-label" title={tagObj.tag}>{tagObj.tag}</span>
                            <div className="profile-tag-bar-bg">
                              <div
                                className="profile-tag-bar-fill"
                                style={{ width: `${tagObj.percentage}%` }}
                              />
                            </div>
                            <span className="profile-tag-count">{tagObj.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-2)', fontSize: '13px' }}>No tag stats available.</p>
                    )}
                  </section>

                  {/* Update CF Handle */}
                  <section className="card update-handle-section">
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '12px' }}>
                      Update Codeforces Account
                    </h3>
                    <form onSubmit={handleUpdateHandle} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="New Codeforces Handle"
                        value={newHandle}
                        onChange={(e) => setNewHandle(e.target.value)}
                        disabled={isUpdatingHandle}
                        required
                      />
                      <button
                        type="submit"
                        className="btn btn-ghost"
                        style={{ width: '100%' }}
                        disabled={isUpdatingHandle || !newHandle.trim()}
                      >
                        {isUpdatingHandle ? 'Updating...' : 'Update Handle'}
                      </button>
                    </form>
                    
                    {updateError && <div className="error-msg" style={{ marginTop: '8px' }}>{updateError}</div>}
                    {updateSuccess && (
                      <div style={{ color: 'var(--accent)', fontSize: '13px', marginTop: '8px', fontWeight: '500' }}>
                        {updateSuccess}
                      </div>
                    )}
                  </section>

                </div>

              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
