import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import '../components/Layout.css';
import './Leaderboard.css';

export default function Leaderboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/leaderboard');
        setUsers(res.data);
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        setError('Failed to load the global leaderboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankColorVar = (cfRank) => {
    const normalized = (cfRank || '').toLowerCase().replace(/\s+/g, '');
    if (normalized.includes('grandmaster')) return 'var(--cf-grandmaster)';
    if (normalized.includes('master')) return 'var(--cf-master)';
    if (normalized.includes('candidate') || normalized.includes('cm')) return 'var(--cf-cm)';
    if (normalized.includes('expert')) return 'var(--cf-expert)';
    if (normalized.includes('specialist')) return 'var(--cf-specialist)';
    if (normalized.includes('pupil')) return 'var(--cf-pupil)';
    return 'var(--cf-newbie)';
  };

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <div className="page-content">
            <div className="leaderboard-table skeleton" style={{ height: '300px', width: '100%', borderRadius: '12px' }}></div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="app-main">
          <div className="page-content">
            <div className="error-message">{error}</div>
          </div>
        </main>
      </div>
    );
  }

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

          <header className="leaderboard-header">
            <h1>Global Leaderboard</h1>
            <p>Rankings across all Ascent users. Compete globally, track your progress!</p>
          </header>

      <div className="leaderboard-card card">
        <div className="table-responsive">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Codeforces Handle</th>
                <th>Rank</th>
                <th>Rating</th>
                <th>Max Rating</th>
                <th>Problems Solved</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user.handle} className={index < 3 ? `top-${index + 1}` : ''}>
                  <td className="rank-cell">
                    {index === 0 && <span className="medal gold">🥇</span>}
                    {index === 1 && <span className="medal silver">🥈</span>}
                    {index === 2 && <span className="medal bronze">🥉</span>}
                    {index > 2 && <span className="rank-number">{index + 1}</span>}
                  </td>
                  <td className="handle-cell">
                    {user.avatar && <img src={user.avatar} alt="avatar" className="avatar-img" />}
                    <span 
                      style={{ color: getRankColorVar(user.rank), fontWeight: 700 }}
                    >
                      {user.handle}
                    </span>
                  </td>
                  <td>
                    <span 
                      className="rank-badge" 
                      style={{ color: getRankColorVar(user.rank), border: `1px solid ${getRankColorVar(user.rank)}` }}
                    >
                      {user.rank}
                    </span>
                  </td>
                  <td className="rating-cell">{user.rating}</td>
                  <td>{user.maxRating}</td>
                  <td className="solved-cell">{user.problemsSolved}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" className="no-data">No users found in the system yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </div>
      </main>
    </div>
  );
}
