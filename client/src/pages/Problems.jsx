import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import api from '../api/client.js';
import '../components/Layout.css';
import './Problems.css';

/**
 * Problems Page Component.
 * Tab 1: Recent Solves (Last 20 Codeforces AC submissions).
 * Tab 2: Practice Wishlist (Manually added problem IDs, auto-detected solved status).
 */
export default function Problems() {
  const { user } = useAuth();
  const [cfData, setCfData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tab control: 'solves' or 'wishlist'
  const [activeTab, setActiveTab] = useState('solves');

  // Wishlist states
  const [wishlist, setWishlist] = useState([]);
  const [wishlistInput, setWishlistInput] = useState('');
  const [isAddingWish, setIsAddingWish] = useState(false);
  const [wishError, setWishError] = useState('');

  const myHandle = user?.cfHandle || user?.codeforcesHandle;
  const localStorageKey = user ? `ascent_wishlist_${user.id}` : null;

  // 1. Fetch user's CF submissions
  useEffect(() => {
    if (!myHandle) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    api.getCFData(myHandle)
      .then(data => {
        setCfData(data);
      })
      .catch(err => {
        console.error('Failed to load CF data for problems:', err);
        setError('Could not retrieve Codeforces records to compile problem log.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [myHandle]);

  // 2. Load wishlist from local storage on mount (or when user changes)
  useEffect(() => {
    if (localStorageKey) {
      const stored = localStorage.getItem(localStorageKey);
      if (stored) {
        try {
          setWishlist(JSON.parse(stored));
        } catch (e) {
          console.error('Error parsing stored wishlist:', e);
          setWishlist([]);
        }
      } else {
        setWishlist([]);
      }
    }
  }, [localStorageKey]);

  // Helper: Save wishlist to local storage
  const saveWishlist = (newList) => {
    setWishlist(newList);
    if (localStorageKey) {
      localStorage.setItem(localStorageKey, JSON.stringify(newList));
    }
  };

  // 3. Auto check if wishlist items have been solved in CF history
  useEffect(() => {
    if (cfData && wishlist.length > 0) {
      const submissions = cfData.submissions || [];
      const solvedProblemsSet = new Set(
        submissions
          .filter(s => s.verdict === 'OK' && s.problem)
          .map(s => `${s.problem.contestId}${s.problem.index}`.toUpperCase())
      );

      let changed = false;
      const updatedWishlist = wishlist.map(item => {
        const isSolved = solvedProblemsSet.has(item.problemId.toUpperCase());
        if (isSolved && !item.solved) {
          changed = true;
          return { ...item, solved: true };
        }
        return item;
      });

      if (changed) {
        saveWishlist(updatedWishlist);
      }
    }
  }, [cfData, wishlist]);

  // Extract last 20 unique AC submissions
  let recentSolves = [];
  if (cfData) {
    const submissions = cfData.submissions || [];
    const seen = new Set();
    const acSubs = submissions.filter(s => s.verdict === 'OK' && s.problem);

    for (const sub of acSubs) {
      const key = `${sub.problem.contestId}${sub.problem.index}`;
      if (!seen.has(key)) {
        seen.add(key);
        recentSolves.push(sub);
        if (recentSolves.length >= 20) break;
      }
    }
  }

  // Handle adding a problem to the wishlist
  const handleAddWishlist = async (e) => {
    e.preventDefault();
    setWishError('');
    const input = wishlistInput.trim().toUpperCase();

    if (!input) return;

    // Validate problem ID format (e.g. 1234A, 99B2)
    const match = input.match(/^(\d+)([a-zA-Z\d]+)$/);
    if (!match) {
      setWishError('Invalid format. Enter e.g. "1234A" (Contest ID + index)');
      return;
    }

    const contestId = match[1];
    const index = match[2];

    // Check duplicate
    if (wishlist.some(item => item.problemId === input)) {
      setWishError('This problem is already in your wishlist.');
      return;
    }

    setIsAddingWish(true);

    try {
      // Fetch details from Codeforces API by getting status of the contest
      const res = await fetch(`https://codeforces.com/api/contest.status?contestId=${contestId}&from=1&count=100`);
      const data = await res.json();
      
      if (data.status !== 'OK') {
        throw new Error(data.comment || 'Contest not found');
      }

      const submission = data.result.find(s => s.problem?.index?.toUpperCase() === index);
      if (!submission || !submission.problem) {
        throw new Error('Problem index not found in this contest.');
      }

      const problem = submission.problem;
      const newItem = {
        problemId: input,
        name: problem.name,
        rating: problem.rating || null,
        tags: problem.tags || [],
        solved: false
      };

      // Check if it's already solved in our fetched CF history
      if (cfData) {
        const solvedSet = new Set(
          (cfData.submissions || [])
            .filter(s => s.verdict === 'OK' && s.problem)
            .map(s => `${s.problem.contestId}${s.problem.index}`.toUpperCase())
        );
        if (solvedSet.has(input)) {
          newItem.solved = true;
        }
      }

      saveWishlist([...wishlist, newItem]);
      setWishlistInput('');
    } catch (err) {
      console.error('Error fetching problem details:', err);
      setWishError(err.message || 'Failed to verify problem on Codeforces.');
    } finally {
      setIsAddingWish(false);
    }
  };

  // Mark item as manually completed
  const handleMarkDone = (problemId) => {
    const updated = wishlist.map(item => {
      if (item.problemId === problemId) {
        return { ...item, solved: true };
      }
      return item;
    });
    saveWishlist(updated);
  };

  // Remove item from wishlist
  const handleRemoveWish = (problemId) => {
    const updated = wishlist.filter(item => item.problemId !== problemId);
    saveWishlist(updated);
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="app-main">
        <div className="page-content">
          
          <header className="problems-header">
            <h1 className="page-title">Problem Log</h1>
            <p className="subtitle">View recent Codeforces solves or plan your future practice problems.</p>
          </header>

          {!myHandle ? (
            <div className="card" style={{ border: '1px dashed var(--warning)', backgroundColor: 'rgba(217, 119, 6, 0.05)' }}>
              <p style={{ color: 'var(--warning)', fontWeight: '500' }}>
                Please set your Codeforces handle on the Home Dashboard to access your Problem Log.
              </p>
            </div>
          ) : (
            <>
              {/* Tabs selector */}
              <div className="problems-tabs-bar">
                <button
                  className={`problems-tab-btn ${activeTab === 'solves' ? 'active' : ''}`}
                  onClick={() => setActiveTab('solves')}
                >
                  Recent Solves
                </button>
                <button
                  className={`problems-tab-btn ${activeTab === 'wishlist' ? 'active' : ''}`}
                  onClick={() => setActiveTab('wishlist')}
                >
                  Practice Wishlist ({wishlist.filter(w => !w.solved).length})
                </button>
              </div>

              {/* Tab Content 1: Solves Table */}
              {activeTab === 'solves' && (
                <div className="card topics-table-card">
                  <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>
                    Last 20 Codeforces accepted problems
                  </h3>
                  {loading ? (
                    <p style={{ color: 'var(--text-2)', textAlign: 'center', padding: '20px' }}>Loading solves...</p>
                  ) : error ? (
                    <div className="error-msg">{error}</div>
                  ) : recentSolves.length > 0 ? (
                    <table className="topics-table">
                      <thead>
                        <tr>
                          <th>Problem ID</th>
                          <th>Problem Name</th>
                          <th>Difficulty</th>
                          <th>Tags</th>
                          <th>Solved On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentSolves.map((sub, idx) => {
                          const probId = `${sub.problem.contestId}${sub.problem.index}`;
                          const date = new Date(sub.creationTimeSeconds * 1000).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          });
                          const cfUrl = `https://codeforces.com/problemset/problem/${sub.problem.contestId}/${sub.problem.index}`;
                          
                          return (
                            <tr key={idx}>
                              <td style={{ fontWeight: '600' }}>{probId}</td>
                              <td>
                                <a
                                  href={cfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ fontWeight: '500', color: 'var(--text)', textDecoration: 'none' }}
                                  onMouseOver={e => e.target.style.color = 'var(--accent)'}
                                  onMouseOut={e => e.target.style.color = 'var(--text)'}
                                >
                                  {sub.problem.name}
                                </a>
                              </td>
                              <td>
                                {sub.problem.rating ? (
                                  <span className="badge badge-accent">{sub.problem.rating}</span>
                                ) : (
                                  <span style={{ color: 'var(--text-3)' }}>Unrated</span>
                                )}
                              </td>
                              <td>
                                <div className="tag-badge-container">
                                  {sub.problem.tags?.slice(0, 3).map(tag => (
                                    <span key={tag} className="tag-badge">{tag}</span>
                                  )) || <span style={{ color: 'var(--text-3)' }}>None</span>}
                                </div>
                              </td>
                              <td style={{ color: 'var(--text-2)' }}>{date}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: 'var(--text-2)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                      No solved problems found. Go submit on Codeforces!
                    </p>
                  )}
                </div>
              )}

              {/* Tab Content 2: Wishlist */}
              {activeTab === 'wishlist' && (
                <div>
                  {/* Add problem form */}
                  <div className="card" style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>
                      Add Practice Target
                    </h3>
                    <form onSubmit={handleAddWishlist} className="wishlist-add-section">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter Problem ID (e.g. 158A, 1335C)"
                        value={wishlistInput}
                        onChange={(e) => setWishlistInput(e.target.value)}
                        disabled={isAddingWish}
                        required
                      />
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isAddingWish || !wishlistInput.trim()}
                      >
                        {isAddingWish ? 'Adding...' : 'Add'}
                      </button>
                    </form>
                    {wishError && <div className="error-msg">{wishError}</div>}
                  </div>

                  {/* Wishlist grid */}
                  <div className="wishlist-grid">
                    {wishlist.length > 0 ? (
                      wishlist
                        .sort((a, b) => (a.solved === b.solved ? 0 : a.solved ? 1 : -1)) // unsolved first
                        .map((item) => {
                          const cfUrl = `https://codeforces.com/problemset/problem/${item.problemId.match(/^(\d+)/)[0]}/${item.problemId.replace(/^\d+/, '')}`;
                          return (
                            <div key={item.problemId} className={`wishlist-item ${item.solved ? 'solved' : ''}`}>
                              <div className="wishlist-info">
                                <div className="wishlist-title-row">
                                  <a
                                    href={cfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`wishlist-title-text ${item.solved ? 'line-through' : ''}`}
                                    style={{ textDecorationColor: 'var(--text-2)' }}
                                  >
                                    {item.problemId} — {item.name}
                                  </a>
                                  {item.solved && (
                                    <span
                                      className="badge"
                                      style={{
                                        background: 'var(--accent-light)',
                                        color: 'var(--accent-text)',
                                        fontSize: '11px'
                                      }}
                                    >
                                      Completed
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-2)' }}>
                                  <span>Rating: {item.rating || 'Unrated'}</span>
                                  <span>Tags: {item.tags.slice(0, 3).join(', ') || 'none'}</span>
                                </div>
                              </div>

                              <div className="wishlist-actions">
                                {!item.solved && (
                                  <button
                                    className="btn btn-ghost"
                                    style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}
                                    onClick={() => handleMarkDone(item.problemId)}
                                  >
                                    Mark Done
                                  </button>
                                )}
                                <button
                                  className="btn btn-ghost"
                                  style={{ color: 'var(--text-2)' }}
                                  onClick={() => handleRemoveWish(item.problemId)}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="card" style={{ textAlign: 'center', padding: '40px', border: '1px dashed var(--border)' }}>
                        <p style={{ color: 'var(--text-2)' }}>
                          Your practice wishlist is empty. Add problem IDs to target specific problems!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
}
