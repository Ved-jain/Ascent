import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import api from '../api/client.js';
import '../components/Layout.css';
import './Upsolve.css';

export default function Upsolve() {
  const { user } = useAuth();
  const [cfData, setCfData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const myHandle = user?.cfHandle || user?.codeforcesHandle;

  useEffect(() => {
    if (!myHandle) {
      setLoading(false);
      return;
    }

    setLoading(true);
    api.getCFData(myHandle)
      .then(data => setCfData(data))
      .catch(err => setError('Failed to load CF data.'))
      .finally(() => setLoading(false));
  }, [myHandle]);

  let upsolveList = [];

  if (cfData && cfData.submissions) {
    const acProblems = new Set();
    const attemptedProblems = {};

    // First pass: identify all ACs
    cfData.submissions.forEach(sub => {
      if (!sub.problem || !sub.problem.contestId || !sub.problem.index) return;
      const probId = `${sub.problem.contestId}${sub.problem.index}`;
      if (sub.verdict === 'OK') {
        acProblems.add(probId);
      }
    });

    // Second pass: find attempts that are not AC
    cfData.submissions.forEach(sub => {
      if (!sub.problem || !sub.problem.contestId || !sub.problem.index) return;
      const probId = `${sub.problem.contestId}${sub.problem.index}`;
      
      // We only care if we never got an AC
      if (!acProblems.has(probId)) {
        if (!attemptedProblems[probId]) {
          attemptedProblems[probId] = {
            problem: sub.problem,
            failCount: 0,
            lastAttempt: 0
          };
        }
        attemptedProblems[probId].failCount += 1;
        if (sub.creationTimeSeconds > attemptedProblems[probId].lastAttempt) {
          attemptedProblems[probId].lastAttempt = sub.creationTimeSeconds;
        }
      }
    });

    // Convert to sorted array
    upsolveList = Object.values(attemptedProblems)
      .map(item => ({
        id: `${item.problem.contestId}${item.problem.index}`,
        name: item.problem.name,
        rating: item.problem.rating || 0,
        tags: item.problem.tags || [],
        failCount: item.failCount,
        lastAttempt: item.lastAttempt,
        contestId: item.problem.contestId,
        index: item.problem.index
      }))
      .sort((a, b) => {
        // Sort by rating ascending (easiest first) to build confidence, then by failCount descending
        if (a.rating !== b.rating) return a.rating - b.rating;
        return b.failCount - a.failCount;
      });
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <div className="page-content">
          <header className="upsolve-header">
            <h1 className="page-title">Upsolve Tracker</h1>
            <p className="subtitle">
              Your to-do list of attempted but unsolved problems. Knock them out to boost your rating!
            </p>
          </header>

          {!myHandle ? (
            <div className="card error-msg">Please connect your Codeforces handle on the Home Dashboard.</div>
          ) : loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-2)' }}>Fetching submissions...</p>
            </div>
          ) : error ? (
            <div className="card error-msg">{error}</div>
          ) : (
            <div className="upsolve-grid">
              {upsolveList.length > 0 ? (
                upsolveList.map(prob => (
                  <div key={prob.id} className="upsolve-card">
                    <div className="upsolve-card-header">
                      <span className="prob-id">{prob.id}</span>
                      <span className={`prob-rating ${prob.rating ? '' : 'unrated'}`}>
                        {prob.rating || 'Unrated'}
                      </span>
                    </div>
                    <h3 className="prob-name">{prob.name}</h3>
                    <div className="prob-meta">
                      <span className="fail-badge">Failed {prob.failCount} times</span>
                    </div>
                    <div className="prob-tags">
                      {prob.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="tag-pill">{tag}</span>
                      ))}
                    </div>
                    <a
                      href={`https://codeforces.com/problemset/problem/${prob.contestId}/${prob.index}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary solve-btn"
                    >
                      Solve Now
                    </a>
                  </div>
                ))
              ) : (
                <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
                  <span style={{ fontSize: '32px' }}>🎉</span>
                  <h3 style={{ marginTop: '16px', color: 'var(--text)' }}>All Clear!</h3>
                  <p style={{ color: 'var(--text-2)' }}>You have no abandoned problems. Amazing job!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
