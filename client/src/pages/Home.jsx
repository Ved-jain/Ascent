import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import api from '../api/client.js';
import '../components/Layout.css';
import './Home.css';

/**
 * Dashboard Homepage Component.
 * Fetches user's Codeforces submission and rating history from cache/API.
 * Displays statistics, a 90-day activity heatmap, and a list of recent solves.
 */
export default function Home() {
  const { user } = useAuth();
  const [cfData, setCfData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // AI Coach state
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  
  // Local state to capture and update the Codeforces handle input
  const [handleInput, setHandleInput] = useState('');
  const [isSavingHandle, setIsSavingHandle] = useState(false);

  const handle = user?.cfHandle || user?.codeforcesHandle;

  useEffect(() => {
    if (!handle) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    // Fetch cached/fresh Codeforces data
    api.getCFData(handle)
      .then(data => {
        setCfData(data);
      })
      .catch(err => {
        console.error('Error loading dashboard data:', err);
        setError('Could not retrieve your Codeforces data. Please verify your handle.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [handle]);

  // Connect/Save Codeforces Handle
  const handleConnect = async (e) => {
    e.preventDefault();
    if (!handleInput.trim()) return;

    setIsSavingHandle(true);
    setError('');

    try {
      // Step 1: Pre-validate handle by making sure we can fetch it
      const verifiedData = await api.getCFData(handleInput.trim());
      
      // Step 2: Save to user profile on the server
      await api.updateProfile({ codeforcesHandle: handleInput.trim() });
      
      // Step 3: Set local data and trigger refresh via page reload
      setCfData(verifiedData);
      window.location.reload();
    } catch (err) {
      console.error('Failed to connect handle:', err);
      setError(err.response?.data?.error || 'Invalid handle. Could not verify with Codeforces.');
    } finally {
      setIsSavingHandle(false);
    }
  };

  // Trigger AI Coach analysis
  const handleAICoach = async () => {
    if (!cfData || !handle) return;
    setAiLoading(true);
    setError('');
    setAiAnalysis('');
    
    try {
      // 1. Fetch struggles profile first
      const struggles = await api.getCFStruggles(handle);
      
      // 2. Ask Gemini for analysis
      const lightweightData = {
        handle: cfData.handle,
        rating: cfData.rating,
        maxRating: cfData.maxRating,
        rank: cfData.rank,
        problemsSolved: cfData.problemsSolved
      };
      
      const res = await api.getAICoach({ profileData: lightweightData, struggles });
      setAiAnalysis(res.analysis);
    } catch (err) {
      console.error('AI Coach Error:', err);
      setError(err.response?.data?.error || 'Failed to connect to the AI Coach. Make sure the Gemini API Key is set in the server.');
    } finally {
      setAiLoading(false);
    }
  };

  // Determine standard greetings
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Calculate days elapsed in journey
  const getJourneyDay = () => {
    const startDate = user?.startDate ? new Date(user.startDate) : new Date();
    const diffMs = Math.abs(new Date() - startDate);
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  };

  // Process data if handle and data exists
  let problemsSolved = 0;
  let streak = 0;
  let activeDays = 0;
  let contestCount = 0;
  let heatmapCells = [];
  let recentSolves = [];

  if (cfData) {
    const submissions = cfData.submissions || [];
    const ratingHistory = cfData.ratingHistory || [];

    // 1. Problems Solved (Unique problems with verdict 'OK')
    const uniqueAcProblems = new Set(
      submissions
        .filter(s => s.verdict === 'OK' && s.problem)
        .map(s => `${s.problem.contestId}${s.problem.index}`)
    );
    problemsSolved = uniqueAcProblems.size;

    // 2. Active Days (Unique dates with any submission)
    const activeDaysSet = new Set(
      submissions.map(s => new Date(s.creationTimeSeconds * 1000).toISOString().split('T')[0])
    );
    activeDays = activeDaysSet.size;

    // 3. Current Streak (Consecutive days with at least 1 AC)
    const acDates = new Set(
      submissions
        .filter(s => s.verdict === 'OK')
        .map(s => new Date(s.creationTimeSeconds * 1000).toISOString().split('T')[0])
    );

    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    const todayStr = checkDate.toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (acDates.has(todayStr) || acDates.has(yesterdayStr)) {
      if (!acDates.has(todayStr) && acDates.has(yesterdayStr)) {
        checkDate = yesterday;
      }
      while (true) {
        const s = checkDate.toISOString().split('T')[0];
        if (acDates.has(s)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // 4. Contest Count
    contestCount = ratingHistory.length;

    // 5. Heatmap Cells (Last 90 days)
    const now = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateStr = d.toISOString().split('T')[0];

      const daySubs = submissions.filter(s => {
        const sDate = new Date(s.creationTimeSeconds * 1000).toISOString().split('T')[0];
        return sDate === dateStr;
      });

      let status = 'no-activity';
      let tooltip = `${dateStr}: No submissions`;

      if (daySubs.length > 0) {
        const hasAC = daySubs.some(s => s.verdict === 'OK');
        if (hasAC) {
          status = 'accepted-solves';
          const acs = daySubs.filter(s => s.verdict === 'OK').length;
          tooltip = `${dateStr}: ${acs} problem(s) solved`;
        } else {
          status = 'failed-attempts';
          tooltip = `${dateStr}: Attempted but not solved (${daySubs.length} submission(s))`;
        }
      }

      heatmapCells.push({ dateStr, status, tooltip });
    }

    // 6. Recent Solves (Last 5 accepted solves)
    const seen = new Set();
    const acs = submissions.filter(s => s.verdict === 'OK' && s.problem);
    for (const sub of acs) {
      const key = `${sub.problem.contestId}${sub.problem.index}`;
      if (!seen.has(key)) {
        seen.add(key);
        recentSolves.push(sub);
        if (recentSolves.length >= 5) break;
      }
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />
      
      <main className="app-main">
        <div className="page-content">
          
          <header className="dashboard-header">
            <h1 className="page-title">{getGreeting()}, {user?.username}</h1>
            {cfData ? (
              <p className="dashboard-subtitle">
                Day {getJourneyDay()} of your journey · {cfData.rating} {cfData.rank}
              </p>
            ) : (
              <p className="dashboard-subtitle">Day {getJourneyDay()} of your journey</p>
            )}
          </header>

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-2)' }}>Fetching data from Codeforces...</p>
            </div>
          ) : !handle ? (
            <section className="connect-banner">
              <h3>Connect Codeforces Account</h3>
              <p>
                Enter your Codeforces username below to automatically sync your solved problems, 
                contests, and activity heatmap.
              </p>
              
              <form onSubmit={handleConnect} className="connect-form">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Codeforces Handle (e.g. tourist)"
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  disabled={isSavingHandle}
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingHandle || !handleInput.trim()}
                >
                  {isSavingHandle ? 'Saving...' : 'Connect'}
                </button>
              </form>

              {error && <div className="error-msg" style={{ marginTop: '4px' }}>{error}</div>}
            </section>
          ) : (
            <>
              {error && (
                <div className="card error-msg" style={{ marginBottom: '20px', padding: '12px 20px' }}>
                  {error}
                </div>
              )}

              {/* Stats Row */}
              <section className="stats-grid">
                <div className="card stat-card">
                  <span className="stat-label">Problems Solved</span>
                  <strong className="stat-value">{problemsSolved}</strong>
                </div>
                <div className="card stat-card">
                  <span className="stat-label">Current Streak</span>
                  <strong className="stat-value">{streak} days</strong>
                </div>
                <div className="card stat-card">
                  <span className="stat-label">Active Days</span>
                  <strong className="stat-value">{activeDays}</strong>
                </div>
                <div className="card stat-card">
                  <span className="stat-label">Contests Run</span>
                  <strong className="stat-value">{contestCount}</strong>
                </div>
              </section>

              {/* AI Coach Section */}
              <section className="card ai-coach-section" style={{ marginBottom: '28px', borderLeft: '4px solid #8b5cf6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '20px' }}>✨</span> AI Coach & Profile Roast
                  </h3>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleAICoach} 
                    disabled={aiLoading}
                    style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none' }}
                  >
                    {aiLoading ? 'Analyzing...' : 'Analyze My Progress'}
                  </button>
                </div>
                
                {aiAnalysis && (
                  <div className="ai-response" style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--radius)', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {aiAnalysis}
                  </div>
                )}
              </section>

              {/* Main content grid */}
              <div className="dashboard-grid">
                
                {/* Left side: Heatmap */}
                <section className="card heatmap-section">
                  <h3>Activity Heatmap</h3>
                  <div className="heatmap-container">
                    <div className="heatmap-grid">
                      {heatmapCells.map((cell) => (
                        <div
                          key={cell.dateStr}
                          className={`heatmap-cell ${cell.status}`}
                          title={cell.tooltip}
                        />
                      ))}
                    </div>
                    
                    <div className="heatmap-legend">
                      <div className="legend-item">
                        <div className="legend-dot no" />
                        <span>No submissions</span>
                      </div>
                      <div className="legend-item">
                        <div className="legend-dot fail" />
                        <span>Attempted but failed</span>
                      </div>
                      <div className="legend-item">
                        <div className="legend-dot ac" />
                        <span>Solved problems</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Right side: Recent Solves */}
                <section className="card solves-section">
                  <h3>Recent Solves</h3>
                  {recentSolves.length > 0 ? (
                    <div className="solves-list">
                      {recentSolves.map((sub, idx) => {
                        const probId = `${sub.problem.contestId}${sub.problem.index}`;
                        const cfUrl = `https://codeforces.com/problemset/problem/${sub.problem.contestId}/${sub.problem.index}`;
                        return (
                          <div key={idx} className="solve-item">
                            <div className="solve-info">
                              <a
                                href={cfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="solve-name"
                              >
                                {probId}. {sub.problem.name}
                              </a>
                              <span className="solve-tags">
                                {sub.problem.tags?.slice(0, 2).join(', ') || 'No tags'}
                              </span>
                            </div>
                            <div className="solve-meta">
                              <div className="solve-rating">
                                {sub.problem.rating ? `Rating: ${sub.problem.rating}` : 'Unrated'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-2)', fontSize: '13px' }}>
                      No accepted solves found in your history. Time to code!
                    </p>
                  )}
                </section>

              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}
