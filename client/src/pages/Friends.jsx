import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import api from '../api/client.js';
import '../components/Layout.css';
import './Friends.css';

/**
 * Friends Page Component.
 * Enables adding and removing Codeforces handles of friends.
 * Loads and caches Codeforces details for friends and compares them relative to current user's journey.
 */
export default function Friends() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [friends, setFriends] = useState([]);
  const [myCFData, setMyCFData] = useState(null);
  const [friendsDetails, setFriendsDetails] = useState({});
  
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [friendInput, setFriendInput] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const myHandle = user?.cfHandle || user?.codeforcesHandle;

  // 1. Fetch user's friends list and own CF data on mount
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      setError('');
      try {
        const friendsList = await api.getFriends();
        setFriends(friendsList || []);

        if (myHandle) {
          const myData = await api.getCFData(myHandle);
          setMyCFData(myData);
        }
      } catch (err) {
        console.error('Failed to load friends initialization data:', err);
        setError('Error initializing friends list. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [myHandle]);

  // 2. Fetch Codeforces data details for each friend in list
  useEffect(() => {
    const fetchFriendsCF = async () => {
      const details = {};
      await Promise.all(
        friends.map(async (f) => {
          try {
            const data = await api.getCFData(f);
            details[f] = data;
          } catch (err) {
            console.error(`Failed to fetch CF data for friend: ${f}`, err);
          }
        })
      );
      setFriendsDetails(details);
    };

    if (friends.length > 0) {
      fetchFriendsCF();
    } else {
      setFriendsDetails({});
    }
  }, [friends]);

  // 3. Add Friend action
  const handleAddFriend = async (e) => {
    e.preventDefault();
    const cleanHandle = friendInput.trim().toLowerCase();
    
    if (!cleanHandle) return;
    
    if (cleanHandle === myHandle?.toLowerCase()) {
      setError('You cannot add yourself as a friend.');
      return;
    }

    if (friends.some(f => f.toLowerCase() === cleanHandle)) {
      setError('This user is already in your friends list.');
      return;
    }

    setAdding(true);
    setError('');
    setSuccessMsg('');

    try {
      // API call validates the user exists on Codeforces and updates list
      await api.addFriend(cleanHandle);
      
      // Update local state lists
      setFriends(prev => [...prev, cleanHandle]);
      setFriendInput('');
      setSuccessMsg(`Successfully added ${cleanHandle}!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Add friend error:', err);
      setError(err.response?.data?.error || 'Failed to add friend. Verify handle is correct.');
    } finally {
      setAdding(false);
    }
  };

  // 4. Remove Friend action
  const handleRemoveFriend = async (handleToRemove) => {
    if (!window.confirm(`Are you sure you want to remove ${handleToRemove} from friends?`)) {
      return;
    }

    setError('');
    setSuccessMsg('');

    try {
      await api.removeFriend(handleToRemove);
      setFriends(prev => prev.filter(f => f.toLowerCase() !== handleToRemove.toLowerCase()));
      setSuccessMsg(`Successfully removed ${handleToRemove}.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Remove friend error:', err);
      setError('Failed to remove friend. Please try again.');
    }
  };

  // 5. Navigate to comparison details
  const handleCompare = (friendH) => {
    navigate(`/compare?friend=${friendH}`);
  };

  // Helper: Get relative date string of first submission
  const getStartDateStr = (cfData) => {
    if (!cfData?.submissions || cfData.submissions.length === 0) return 'unknown';
    const earliest = Math.min(...cfData.submissions.map(s => s.creationTimeSeconds));
    const diffMs = Date.now() - (earliest * 1000);
    const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4));
    
    if (diffMonths === 0) {
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return `${diffDays} days ago`;
    }
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  };

  // Helper: Get unique AC count
  const getSolvedCount = (cfData) => {
    if (!cfData?.submissions) return 0;
    const unique = new Set(
      cfData.submissions
        .filter(s => s.verdict === 'OK' && s.problem)
        .map(s => `${s.problem.contestId}${s.problem.index}`)
    );
    return unique.size;
  };

  // Helper: Get Codeforces rank color variable
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

  // Helper: Compare friend's progress at user's current timeline stage
  const getStageComparison = (friendCF, myCF) => {
    if (!friendCF || !myCF) return null;
    
    const mySubs = myCF.submissions || [];
    const friendSubs = friendCF.submissions || [];
    if (mySubs.length === 0 || friendSubs.length === 0) return null;
    
    const myStart = Math.min(...mySubs.map(s => s.creationTimeSeconds));
    const friendStart = Math.min(...friendSubs.map(s => s.creationTimeSeconds));
    
    const myDays = Math.floor((Date.now() / 1000 - myStart) / 86400);
    
    // Find friend's rating at myDays since friend's start
    const targetTime = friendStart + (myDays * 86400);
    
    const friendHistory = friendCF.ratingHistory || [];
    let friendRatingAtStage = 0;
    for (const c of friendHistory) {
      if (c.ratingUpdateTimeSeconds <= targetTime) {
        friendRatingAtStage = c.newRating;
      } else {
        break;
      }
    }
    
    const myCurrentRating = myCF.rating || 0;
    const delta = friendRatingAtStage - myCurrentRating;
    
    if (delta > 0) {
      return `vs You at your stage: +${delta} rating ahead`;
    } else if (delta < 0) {
      return `vs You at your stage: ${Math.abs(delta)} rating behind`;
    } else {
      return `vs You at your stage: identical rating`;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="app-main">
        <div className="page-content">
          
          <header className="friends-header">
            <h1 className="page-title">Friends</h1>
            <p className="subtitle">
              Add friends by Codeforces handle. Compare timelines to reduce comparison anxiety.
            </p>
          </header>

          {/* Add Friend Row */}
          <section className="card add-friend-card">
            <form onSubmit={handleAddFriend} className="add-friend-form">
              <input
                type="text"
                className="form-input"
                placeholder="Friend's Codeforces Handle (e.g. tourist)"
                value={friendInput}
                onChange={(e) => setFriendInput(e.target.value)}
                disabled={adding}
                required
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={adding || !friendInput.trim()}
              >
                {adding ? 'Verifying...' : 'Add Friend'}
              </button>
            </form>
            
            {error && <div className="error-msg" style={{ marginTop: '10px' }}>{error}</div>}
            {successMsg && <div style={{ color: 'var(--accent)', fontSize: '13px', marginTop: '10px', fontWeight: '500' }}>{successMsg}</div>}
          </section>

          {/* Connected Handle Warning */}
          {!myHandle && (
            <div className="card" style={{ marginBottom: '20px', border: '1px dashed var(--warning)', backgroundColor: 'rgba(217, 119, 6, 0.05)' }}>
              <p style={{ color: 'var(--warning)', fontSize: '13px', fontWeight: '500' }}>
                Note: You have not set your own Codeforces handle yet. Set it on the dashboard so we can calculate relative comparisons.
              </p>
            </div>
          )}

          {/* Friends List Grid */}
          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-2)' }}>Loading friends list...</p>
            </div>
          ) : friends.length > 0 ? (
            <section className="friends-list">
              {friends.map((friend) => {
                const fData = friendsDetails[friend];
                const isLoaded = !!fData;
                const avatar = fData?.avatar || 'https://userpic.codeforces.org/no-title-photo.jpg';
                const rating = fData?.rating || null;
                const rank = fData?.rank || 'newbie';
                const solvedCount = isLoaded ? getSolvedCount(fData) : 0;
                const comparisonText = isLoaded && myCFData ? getStageComparison(fData, myCFData) : null;

                return (
                  <div key={friend} className="friend-card">
                    <div>
                      <div className="friend-top">
                        <img src={avatar} alt={`${friend}'s avatar`} className="friend-avatar" />
                        <div className="friend-info-block">
                          <span className="friend-handle">{friend}</span>
                          {isLoaded && rating !== null ? (
                            <span className="friend-rank" style={{ color: getRankColorVar(rank) }}>
                              {rank} · <span className="friend-rating-badge">{rating}</span>
                            </span>
                          ) : (
                            <span className="friend-rank" style={{ color: 'var(--text-3)' }}>
                              Loading profile...
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="friend-details-block">
                        {isLoaded ? (
                          <>
                            <span>Started: {getStartDateStr(fData)}</span>
                            <span>Solved: {solvedCount} problems</span>
                            {comparisonText && (
                              <div className="friend-comparison-text">
                                {comparisonText}
                              </div>
                            )}
                          </>
                        ) : (
                          <span>Loading Codeforces records...</span>
                        )}
                      </div>
                    </div>

                    <div className="friend-actions">
                      <button
                        className="btn btn-ghost"
                        onClick={() => handleCompare(friend)}
                        disabled={!isLoaded}
                      >
                        Compare
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ borderColor: 'rgba(220, 38, 38, 0.2)', color: 'var(--danger)' }}
                        onClick={() => handleRemoveFriend(friend)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
          ) : (
            <section className="card friends-empty-state">
              <h3>No Friends Yet</h3>
              <p>Add friends by Codeforces handle above to start comparing rating histories and struggles side-by-side.</p>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}
