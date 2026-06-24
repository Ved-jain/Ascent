import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import '../components/Layout.css';
import './ContestHub.css';

export default function ContestHub() {

  const { user } = useAuth();
  const navigate = useNavigate();
  const [contests, setContests] = useState([]);
  const [loadingContests, setLoadingContests] = useState(true);
  
  const [goal, setGoal] = useState('Specialist');
  const [prepData, setPrepData] = useState(null);
  const [loadingPrep, setLoadingPrep] = useState(false);
  const [prepError, setPrepError] = useState(null);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  // Timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch contests
  useEffect(() => {
    const fetchContests = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/contests/upcoming');
        setContests(res.data);
      } catch (err) {
        console.error('Failed to load upcoming contests', err);
      } finally {
        setLoadingContests(false);
      }
    };
    fetchContests();
  }, []);

  // Fetch Prep
  const fetchPrep = async () => {
    const handle = user?.codeforcesHandle || user?.cfHandle || user?.handle;
    if (!handle) return;
    setLoadingPrep(true);
    setPrepError(null);
    try {
      const res = await axios.get(`http://localhost:5000/api/prep/${handle}?goal=${goal}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('ascent_token')}` }
      });
      setPrepData(res.data);
    } catch (err) {
      setPrepError(err.response?.data?.error || 'Failed to load prep data');
    } finally {
      setLoadingPrep(false);
    }
  };

  // Initial prep fetch
  useEffect(() => {
    fetchPrep();
  }, [user, goal]);

  const formatCountdown = (startTimeSeconds) => {
    const diff = startTimeSeconds - now;
    if (diff <= 0) return 'Started!';
    
    const d = Math.floor(diff / (24 * 3600));
    const h = Math.floor((diff % (24 * 3600)) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;

    if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <div className="page-content">
          <button 
            className="btn btn-ghost" 
            onClick={() => navigate(-1)} 
            style={{ marginBottom: '16px', padding: '8px 16px' }}
          >
            &larr; Back
          </button>

          <header className="hub-header">
            <h1>Contest Hub</h1>
            <p>Your live countdown and targeted training regimen.</p>
          </header>

      <div className="hub-grid">
        {/* Left Column: Contests */}
        <div className="upcoming-section">
          <h2>Upcoming Contests</h2>
          {loadingContests ? (
            <div className="skeleton" style={{ height: '100px', borderRadius: '12px', marginBottom: '16px' }}></div>
          ) : contests.length === 0 ? (
            <p className="no-data">No upcoming contests found.</p>
          ) : (
            contests.map((contest, i) => (
              <div className="contest-card card" key={contest.id}>
                <div className="contest-info">
                  <h3>{contest.name}</h3>
                  <span className="contest-date">
                    {new Date(contest.startTimeSeconds * 1000).toLocaleString(undefined, { 
                      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className={`countdown ${i === 0 ? 'next-up' : ''}`}>
                  {formatCountdown(contest.startTimeSeconds)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Prep Generator */}
        <div className="prep-section card">
          <h2>Contest Prep Target</h2>
          <p className="prep-desc">
            Select your goal rank. I will curate exactly 4 high-quality problems hitting your weak tags within the targeted difficulty bracket.
          </p>

          <div className="goal-selector">
            <select value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="Pupil">Aiming for Pupil (Div 2 A, B)</option>
              <option value="Specialist">Aiming for Specialist (Div 2 B, C)</option>
              <option value="Expert">Aiming for Expert (Div 2 C, D)</option>
              <option value="Master">Aiming for Master (Div 2 D, E)</option>
            </select>
          </div>

          <div className="prep-results">
            {loadingPrep ? (
              <div className="skeleton" style={{ height: '200px', borderRadius: '12px' }}></div>
            ) : prepError ? (
              <div className="error-message">{prepError}</div>
            ) : prepData ? (
              <>
                <div className="prep-meta">
                  <span>Target Rating Bracket: <strong>{prepData.targetRatingRange}</strong></span>
                </div>
                <div className="problem-list">
                  {prepData.problems.map((p) => (
                    <a 
                      href={`https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`} 
                      target="_blank" rel="noreferrer" 
                      className="problem-item"
                      key={p.problemId}
                    >
                      <div className="prob-left">
                        <span className="prob-id">{p.problemId}</span>
                        <span className="prob-name">{p.name}</span>
                      </div>
                      <div className="prob-right">
                        <span className="prob-rating">★ {p.rating}</span>
                      </div>
                    </a>
                  ))}
                  {prepData.problems.length === 0 && (
                    <p className="no-data">You've solved all problems in this bracket!</p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
        </div>
      </main>
    </div>
  );
}
