import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import api from '../api/client.js';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import '../components/Layout.css';
import './Compare.css';

/**
 * Compare Page Component.
 * Compares rating timelines of the user and a chosen friend.
 * Normalizes rating progress by days elapsed since starting.
 * Displays friend's struggle profile (problems, tags, and abandoned list).
 */
export default function Compare() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Friends dropdown lists
  const [friendsList, setFriendsList] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState('');
  const [customHandle, setCustomHandle] = useState('');

  // Loaded comparison data
  const [comparisonData, setComparisonData] = useState(null);
  const [myProfileData, setMyProfileData] = useState(null);
  const [friendProfileData, setFriendProfileData] = useState(null);
  const [friendStruggles, setFriendStruggles] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedContestId, setSelectedContestId] = useState('');

  // AI Rivalry state
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState('overview');

  const myHandle = user?.cfHandle || user?.codeforcesHandle;
  const urlFriend = searchParams.get('friend') || '';

  // 1. Fetch friends list on mount
  useEffect(() => {
    api.getFriends()
      .then(list => setFriendsList(list || []))
      .catch(err => console.error('Failed to load friends list:', err));
  }, []);

  // 2. Sync selectedFriend state with URL search param
  useEffect(() => {
    if (urlFriend) {
      setSelectedFriend(urlFriend);
      setCustomHandle('');
      setSelectedContestId('');
    }
  }, [urlFriend]);

  // 3. Load comparison data when selectedFriend changes or handle is submitted
  useEffect(() => {
    const activeFriend = selectedFriend || customHandle;
    if (!myHandle || !activeFriend) {
      setComparisonData(null);
      setFriendProfileData(null);
      setFriendStruggles(null);
      setSelectedContestId('');
      return;
    }

    const loadComparison = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch:
        // A. Aligned timelines
        // B. Own CF user profile
        // C. Friend's CF user profile
        // D. Friend's struggle data
        const [cmp, myProfile, friendProfile, struggles] = await Promise.all([
          api.getCompare(myHandle, activeFriend),
          api.getCFData(myHandle),
          api.getCFData(activeFriend),
          api.getCFStruggles(activeFriend)
        ]);

        setComparisonData(cmp);
        setMyProfileData(myProfile);
        setFriendProfileData(friendProfile);
        setFriendStruggles(struggles);
        setSelectedContestId('');
      } catch (err) {
        console.error('Failed to load comparison profiles:', err);
        setError(err.response?.data?.error || `Could not fetch details for handle "${activeFriend}". Make sure it is valid.`);
        setComparisonData(null);
        setFriendProfileData(null);
        setFriendStruggles(null);
        setSelectedContestId('');
      } finally {
        setLoading(false);
      }
    };

    loadComparison();
  }, [myHandle, selectedFriend, customHandle]);

  // Handle custom handle form submit
  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const handleInput = e.target.elements.customHandleInput.value.trim();
    if (!handleInput) return;

    setSelectedFriend('');
    setSearchParams({ friend: handleInput });
    setCustomHandle(handleInput);
  };

  // Trigger AI Rivalry Analysis
  const handleAIRivalry = async () => {
    if (!myProfileData || !friendProfileData) return;
    setAiLoading(true);
    setError('');
    setAiAnalysis('');
    
    try {
      const lightweightMyProfile = {
        handle: myProfileData.handle,
        rating: myProfileData.rating,
        rank: myProfileData.rank,
      };
      const lightweightFriendProfile = {
        handle: friendProfileData.handle,
        rating: friendProfileData.rating,
        rank: friendProfileData.rank,
      };

      const res = await api.getAIRivalry({ 
        myProfileData: lightweightMyProfile, 
        friendProfileData: lightweightFriendProfile, 
        myStruggles: null, 
        friendStruggles 
      });
      setAiAnalysis(res.analysis);
    } catch (err) {
      console.error('AI Rivalry Error:', err);
      setError(err.response?.data?.error || 'Failed to connect to AI Rivalry Analyst.');
    } finally {
      setAiLoading(false);
    }
  };

  // Select friend from dropdown
  const handleDropdownChange = (e) => {
    const val = e.target.value;
    setSelectedFriend(val);
    if (val) {
      setSearchParams({ friend: val });
      setCustomHandle('');
    } else {
      setSearchParams({});
    }
  };

  // Helper: process raw aligned timeline coordinates into Recharts format
  const getChartData = () => {
    if (!comparisonData?.you?.aligned || !comparisonData?.friend?.aligned) {
      return [];
    }

    const youAligned = comparisonData.you.aligned;
    const friendAligned = comparisonData.friend.aligned;

    // Collate all days
    const daysSet = new Set();
    youAligned.forEach(pt => daysSet.add(pt.day));
    friendAligned.forEach(pt => daysSet.add(pt.day));
    daysSet.add(0);

    const sortedDays = Array.from(daysSet).sort((a, b) => a - b);

    let lastYou = 1200;
    let lastFriend = 1200;

    const initialYou = youAligned.find(p => p.day === 0);
    if (initialYou) lastYou = initialYou.rating;

    const initialFriend = friendAligned.find(p => p.day === 0);
    if (initialFriend) lastFriend = initialFriend.rating;

    return sortedDays.map(day => {
      const youPoint = youAligned.find(p => p.day === day);
      const friendPoint = friendAligned.find(p => p.day === day);

      if (youPoint) lastYou = youPoint.rating;
      if (friendPoint) lastFriend = friendPoint.rating;

      return {
        day,
        You: lastYou,
        [comparisonData.friend.handle]: lastFriend
      };
    });
  };

  // Helper: get unique AC count
  const getSolvedCount = (cfData) => {
    if (!cfData?.submissions) return 0;
    return new Set(
      cfData.submissions
        .filter(s => s.verdict === 'OK' && s.problem)
        .map(s => `${s.problem.contestId}${s.problem.index}`)
    ).size;
  };

  // Helper: get relative time string
  const getRelativeStart = (cfData) => {
    if (!cfData?.submissions || cfData.submissions.length === 0) return 'unknown';
    const earliest = Math.min(...cfData.submissions.map(s => s.creationTimeSeconds));
    const days = Math.floor((Date.now() / 1000 - earliest) / 86400);
    return `${days} days ago`;
  };

  // Helper: produce dynamic comparison text for insight
  const getInsightText = () => {
    if (!comparisonData?.you?.aligned || !comparisonData?.friend?.aligned) return '';

    const youAligned = comparisonData.you.aligned;
    const friendAligned = comparisonData.friend.aligned;
    const friendH = comparisonData.friend.handle;

    if (youAligned.length === 0 || friendAligned.length === 0) return '';

    // Find the maximum day they both have in common
    const maxYouDay = Math.max(...youAligned.map(p => p.day));
    const maxFriendDay = Math.max(...friendAligned.map(p => p.day));
    const commonLimit = Math.min(maxYouDay, maxFriendDay);

    if (commonLimit <= 0) return `Timeline data is insufficient for advanced comparative insights. Keep participating in contests!`;

    // Retrieve ratings at the common limit
    let youRating = 1200;
    let friendRating = 1200;

    for (const p of youAligned) {
      if (p.day <= commonLimit) youRating = p.rating;
    }
    for (const p of friendAligned) {
      if (p.day <= commonLimit) friendRating = p.rating;
    }

    const diff = youRating - friendRating;
    if (diff > 0) {
      return `At Day ${commonLimit} of the journey, you achieved a rating of ${youRating}, which is ${diff} points higher than ${friendH} was at the exact same stage (${friendRating}). You are tracking ahead of their early timeline.`;
    } else if (diff < 0) {
      return `At Day ${commonLimit} of the journey, ${friendH} achieved a rating of ${friendRating}, which is ${Math.abs(diff)} points higher than you were at the exact same stage (${youRating}). Focus on consistent practice; their rating profile shows steady timeline intervals.`;
    } else {
      return `At Day ${commonLimit} of the journey, you and ${friendH} are running exactly equal ratings of ${youRating}. You are perfectly aligned with their progression speed.`;
    }
  };

  // Extract user's solved set to filter Shared Struggles
  const mySolvedSet = new Set(
    (myProfileData?.submissions || [])
      .filter(s => s.verdict === 'OK' && s.problem)
      .map(s => `${s.problem.contestId}${s.problem.index}`.toUpperCase())
  );

  const sharedStrugglesList = [];
  if (friendStruggles && myProfileData) {
    (friendStruggles.struggled || []).forEach(prob => {
      const key = prob.problemId.toUpperCase();
      if (!mySolvedSet.has(key)) {
        sharedStrugglesList.push({
          ...prob,
          type: 'friend-struggled',
          details: `Friend failed ${prob.failCount} times before solving (took ${prob.hoursToSolve}h)`
        });
      }
    });

    (friendStruggles.abandoned || []).forEach(prob => {
      const key = prob.problemId.toUpperCase();
      if (!mySolvedSet.has(key)) {
        sharedStrugglesList.push({
          ...prob,
          type: 'friend-abandoned',
          details: `Friend tried ${prob.failCount} times and abandoned`
        });
      }
    });
  }

  // Calculate Milestone Velocity (Days taken to reach specific ranks)
  const getMilestoneVelocity = (alignedHistory) => {
    const milestones = {
      Pupil: { rating: 1200, day: null },
      Specialist: { rating: 1400, day: null },
      Expert: { rating: 1600, day: null }
    };

    if (!alignedHistory) return milestones;

    Object.keys(milestones).forEach(key => {
      const targetRating = milestones[key].rating;
      const match = alignedHistory.find(pt => pt.rating >= targetRating);
      if (match) {
        milestones[key].day = match.day;
      }
    });

    return milestones;
  };

  const myMilestones = comparisonData ? getMilestoneVelocity(comparisonData.you.aligned) : null;
  const friendMilestones = comparisonData ? getMilestoneVelocity(comparisonData.friend.aligned) : null;

  // Intersect contest ids to find shared contests
  const myContestIds = new Set((myProfileData?.ratingHistory || []).map(c => c.contestId));
  const commonContests = (friendProfileData?.ratingHistory || [])
    .filter(c => myContestIds.has(c.contestId))
    .map(c => ({
      contestId: c.contestId,
      name: c.contestName
    }));

  // Calculate submission timelines within the selected common contest
  let faceoffData = [];
  if (selectedContestId && myProfileData && friendProfileData) {
    const numericContestId = Number(selectedContestId);
    
    // Check both s.contestId and s.problem.contestId to catch all submission contexts (round vs problemset)
    const myContestSubs = (myProfileData.submissions || []).filter(s => 
      s.contestId === numericContestId || s.problem?.contestId === numericContestId
    );
    const friendContestSubs = (friendProfileData.submissions || []).filter(s => 
      s.contestId === numericContestId || s.problem?.contestId === numericContestId
    );

    console.log(`[Face-off Debug] Common Contest selected: ${numericContestId}`);
    console.log(`[Face-off Debug] Solves counts: You = ${myContestSubs.length}, Friend = ${friendContestSubs.length}`);

    const indexesSet = new Set();
    myContestSubs.forEach(s => { if (s.problem?.index) indexesSet.add(s.problem.index.toUpperCase()); });
    friendContestSubs.forEach(s => { if (s.problem?.index) indexesSet.add(s.problem.index.toUpperCase()); });

    const sortedIndexes = Array.from(indexesSet).sort();

    faceoffData = sortedIndexes.map(index => {
      const mySubs = myContestSubs.filter(s => s.problem?.index?.toUpperCase() === index);
      const friendSubs = friendContestSubs.filter(s => s.problem?.index?.toUpperCase() === index);

      const myAC = mySubs.find(s => s.verdict === 'OK');
      const friendAC = friendSubs.find(s => s.verdict === 'OK');

      const myAcTime = myAC ? Math.min(...mySubs.filter(s => s.verdict === 'OK').map(s => s.relativeTimeSeconds)) : null;
      const friendAcTime = friendAC ? Math.min(...friendSubs.filter(s => s.verdict === 'OK').map(s => s.relativeTimeSeconds)) : null;

      const myFails = mySubs.filter(s => s.verdict !== 'OK').length;
      const friendFails = friendSubs.filter(s => s.verdict !== 'OK').length;

      return {
        index,
        problemName: mySubs[0]?.problem?.name || friendSubs[0]?.problem?.name || `Problem ${index}`,
        youSolved: !!myAC,
        youTime: myAcTime !== null ? Math.round(myAcTime / 60) : null,
        youFails: myFails,
        friendSolved: !!friendAC,
        friendTime: friendAcTime !== null ? Math.round(friendAcTime / 60) : null,
        friendFails
      };
    });
  }

  const chartData = getChartData();
  const activeFriend = selectedFriend || customHandle;

  // Rank color variables
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

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="app-main">
        <div className="page-content">
          
          <header className="compare-header">
            <h1 className="page-title">Timeline Comparison</h1>
            <p className="subtitle">
              Align rating milestones by time elapsed since first Codeforces solve, mitigating comparison anxiety.
            </p>
          </header>

          {!myHandle ? (
            <div className="card" style={{ border: '1px dashed var(--warning)', backgroundColor: 'rgba(217, 119, 6, 0.05)' }}>
              <p style={{ color: 'var(--warning)', fontWeight: '500' }}>
                Please set your Codeforces handle on the Home Dashboard first to enable comparisons.
              </p>
            </div>
          ) : (
            <>
              {/* Control Bar */}
              <section className="card compare-controls">
                <div className="compare-control-group">
                  <label htmlFor="dropdown-friend">Select Saved Friend</label>
                  <select
                    id="dropdown-friend"
                    className="form-input"
                    value={selectedFriend}
                    onChange={handleDropdownChange}
                  >
                    <option value="">-- Choose Friend --</option>
                    {friendsList.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div style={{ paddingBottom: '10px', color: 'var(--text-3)', fontWeight: 'bold' }}>OR</div>

                <form onSubmit={handleCustomSubmit} className="compare-control-group" style={{ flex: 1.5 }}>
                  <label htmlFor="customHandleInput">Enter Any CF Handle</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="customHandleInput"
                      name="customHandleInput"
                      type="text"
                      className="form-input"
                      placeholder="e.g. tourist"
                    />
                    <button type="submit" className="btn btn-ghost">Search</button>
                  </div>
                </form>
              </section>

              {error && <div className="card error-msg" style={{ marginBottom: '20px', padding: '12px' }}>{error}</div>}

              {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                  <p style={{ color: 'var(--text-2)' }}>Fetching comparison details...</p>
                </div>
              ) : !activeFriend ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px', border: '1px dashed var(--border)' }}>
                  <p style={{ color: 'var(--text-2)' }}>Select a friend above to unlock comparison analytics.</p>
                </div>
              ) : (
                <>
                  <div className="compare-tabs-nav" style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
                    <button 
                      className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                      onClick={() => setActiveTab('overview')}
                      style={{ background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer', color: activeTab === 'overview' ? 'var(--accent)' : 'var(--text-2)', borderBottom: activeTab === 'overview' ? '2px solid var(--accent)' : '2px solid transparent', fontWeight: activeTab === 'overview' ? '600' : '400', fontSize: '15px' }}
                    >
                      Overview
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'struggles' ? 'active' : ''}`}
                      onClick={() => setActiveTab('struggles')}
                      style={{ background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer', color: activeTab === 'struggles' ? 'var(--accent)' : 'var(--text-2)', borderBottom: activeTab === 'struggles' ? '2px solid var(--accent)' : '2px solid transparent', fontWeight: activeTab === 'struggles' ? '600' : '400', fontSize: '15px' }}
                    >
                      Problem Struggles
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'rivalry' ? 'active' : ''}`}
                      onClick={() => setActiveTab('rivalry')}
                      style={{ background: 'none', border: 'none', padding: '12px 16px', cursor: 'pointer', color: activeTab === 'rivalry' ? 'var(--accent)' : 'var(--text-2)', borderBottom: activeTab === 'rivalry' ? '2px solid var(--accent)' : '2px solid transparent', fontWeight: activeTab === 'rivalry' ? '600' : '400', fontSize: '15px' }}
                    >
                      Rivalry & Face-offs
                    </button>
                  </div>

                  {activeTab === 'overview' && (
                    <div className="compare-grid">
                      <div className="compare-col-left" style={{ gridColumn: '1 / -1' }}>
                      {/* Stats Cards side-by-side */}
                  <section className="comparison-summary">
                    {/* You */}
                    <div className="card">
                      <span className="compare-card-title">You</span>
                      {myProfileData && (
                        <div className="compare-profile-details">
                          <div className="compare-user-header">
                            <img
                              src={myProfileData.avatar || 'https://userpic.codeforces.org/no-title-photo.jpg'}
                              alt="Your avatar"
                              className="compare-avatar"
                            />
                            <div>
                              <div className="compare-handle-display">{myProfileData.handle}</div>
                              <div
                                className="friend-rank"
                                style={{ color: getRankColorVar(myProfileData.rank) }}
                              >
                                {myProfileData.rank || 'newbie'}
                              </div>
                            </div>
                          </div>
                          <hr className="divider" style={{ margin: '8px 0', borderTop: '1px solid var(--surface-2)' }} />
                          <div>Rating: <strong>{myProfileData.rating}</strong></div>
                          <div>Journey Started: <strong>{getRelativeStart(myProfileData)}</strong></div>
                          <div>Total Solved: <strong>{getSolvedCount(myProfileData)}</strong></div>
                        </div>
                      )}
                    </div>

                    {/* Friend */}
                    <div className="card">
                      <span className="compare-card-title">Friend</span>
                      {friendProfileData && (
                        <div className="compare-profile-details">
                          <div className="compare-user-header">
                            <img
                              src={friendProfileData.avatar || 'https://userpic.codeforces.org/no-title-photo.jpg'}
                              alt="Friend's avatar"
                              className="compare-avatar"
                            />
                            <div>
                              <div className="compare-handle-display">{friendProfileData.handle}</div>
                              <div
                                className="friend-rank"
                                style={{ color: getRankColorVar(friendProfileData.rank) }}
                              >
                                {friendProfileData.rank || 'newbie'}
                              </div>
                            </div>
                          </div>
                          <hr className="divider" style={{ margin: '8px 0', borderTop: '1px solid var(--surface-2)' }} />
                          <div>Rating: <strong>{friendProfileData.rating}</strong></div>
                          <div>Journey Started: <strong>{getRelativeStart(friendProfileData)}</strong></div>
                          <div>Total Solved: <strong>{getSolvedCount(friendProfileData)}</strong></div>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Chart section */}
                  {chartData.length > 0 && (
                    <section className="card chart-section">
                      <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Rating progression aligned by days elapsed</h3>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <LineChart data={chartData}>
                            <XAxis
                              dataKey="day"
                              label={{ value: 'Days since journey start', position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis
                              label={{ value: 'Rating', angle: -90, position: 'insideLeft' }}
                              domain={['dataMin - 100', 'dataMax + 100']}
                            />
                            <Tooltip formatter={(value, name) => [value, name]} />
                            <Legend verticalAlign="top" height={36} />
                            <Line
                              type="monotone"
                              dataKey="You"
                              stroke="#059669"
                              dot={false}
                              strokeWidth={3}
                            />
                            <Line
                              type="monotone"
                              dataKey={comparisonData.friend.handle}
                              stroke="#9ca3af"
                              dot={false}
                              strokeWidth={2}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </section>
                  )}

                  {/* Dynamic Insight Card */}
                  {getInsightText() && (
                    <div className="insight-card card">
                      {getInsightText()}
                    </div>
                  )}

                  {/* Milestone Velocity Comparison */}
                  {myMilestones && friendMilestones && (
                    <section className="card milestones-section" style={{ marginTop: '24px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>
                        Milestone Velocity
                      </h3>
                      <p className="subtitle" style={{ marginBottom: '12px' }}>
                        Days elapsed since journey start to reach key Codeforces rating checkpoints.
                      </p>
                      <table className="milestones-table">
                        <thead>
                          <tr>
                            <th>Checkpoint</th>
                            <th>Rating Target</th>
                            <th>You</th>
                            <th>{friendProfileData?.handle}</th>
                            <th>Comparison Delta</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(myMilestones).map(([rankName, target]) => {
                            const myDay = target.day;
                            const friendDay = friendMilestones[rankName]?.day;
                            
                            let deltaText = 'N/A';
                            let deltaClass = '';
                            if (myDay !== null && friendDay !== null) {
                              const diff = myDay - friendDay;
                              if (diff < 0) {
                                deltaText = `${Math.abs(diff)} days faster`;
                                deltaClass = 'strong';
                              } else if (diff > 0) {
                                deltaText = `${diff} days slower`;
                                deltaClass = 'needs-work';
                              } else {
                                deltaText = 'Identical velocity';
                              }
                            }

                            return (
                              <tr key={rankName}>
                                <td style={{ fontWeight: '600' }}>{rankName}</td>
                                <td>{target.rating}+</td>
                                <td>{myDay !== null ? `${myDay} days` : 'Not reached'}</td>
                                <td>{friendDay !== null ? `${friendDay} days` : 'Not reached'}</td>
                                <td className={`status-indicator ${deltaClass}`} style={{ borderBottom: '1px solid var(--border)' }}>
                                  {deltaText}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </section>
                  )}
                  </div>
                  </div>
                  )}

                  {activeTab === 'struggles' && (
                    <div className="compare-grid">
                      <div className="compare-col-left">
                        {/* Shared Struggles / Collaborative Practice */}
                        {sharedStrugglesList.length > 0 && (
                          <section className="card" style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>
                              Shared Practice Targets (Help Your Friend)
                            </h3>
                            <p className="subtitle" style={{ marginBottom: '16px' }}>
                              Problems {friendProfileData?.handle} struggled with or abandoned that you have not solved yet.
                            </p>
                            <div className="struggle-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                              {sharedStrugglesList.slice(0, 6).map(prob => {
                                const contestId = prob.problemId.match(/^(\d+)/)[0];
                                const index = prob.problemId.replace(/^\d+/, '');
                                const cfUrl = `https://codeforces.com/problemset/problem/${contestId}/${index}`;
                                return (
                                  <div key={prob.problemId} className="struggle-item" style={{ borderLeft: prob.type === 'friend-abandoned' ? '3px solid var(--danger)' : '3px solid var(--warning)' }}>
                                    <div className="struggle-item-top">
                                      <a href={cfUrl} target="_blank" rel="noopener noreferrer" className="struggle-item-name">
                                        {prob.problemId}. {prob.name}
                                      </a>
                                      <span className="badge badge-accent" style={{ fontSize: '11px' }}>
                                        {prob.rating ? `${prob.rating}` : 'Unrated'}
                                      </span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'var(--text-2)', marginTop: '4px' }}>
                                      {prob.details}
                                    </p>
                                    <div className="tag-badge-container">
                                      {prob.tags.slice(0, 2).map(t => (
                                        <span key={t} className="tag-badge">{t}</span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        )}
                      </div>

                      <div className="compare-col-right">
                        {/* Friend's Struggle Profile */}
                        {friendStruggles && (
                          <section className="struggles-section">
                            {/* Column 1: Struggled & Abandoned */}
                            <div className="struggle-column">
                              <h3>Friend's Problem Struggles</h3>
                              <div className="card" style={{ marginBottom: '24px' }}>
                                <span className="compare-card-title" style={{ display: 'block', marginBottom: '12px' }}>Struggled & Solved (3+ Fails)</span>
                                {friendStruggles.struggled?.length > 0 ? (
                                  <div className="struggle-list">
                                    {friendStruggles.struggled.slice(0, 5).map(prob => (
                                      <div key={prob.problemId} className="struggle-item">
                                        <div className="struggle-item-top">
                                          <a
                                            href={`https://codeforces.com/problemset/problem/${prob.problemId.slice(0, -1)}/${prob.problemId.slice(-1)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="struggle-item-name"
                                          >
                                            {prob.problemId}. {prob.name}
                                          </a>
                                          <span className="badge badge-accent" style={{ fontSize: '11px' }}>
                                            {prob.rating ? `Rating: ${prob.rating}` : 'Unrated'}
                                          </span>
                                        </div>
                                        <div className="struggle-item-meta">
                                          Failed {prob.failCount} times. Solved in {prob.hoursToSolve}h.
                                        </div>
                                        <div className="tag-badge-container">
                                          {prob.tags.map(t => (
                                            <span key={t} className="tag-badge">{t}</span>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p style={{ color: 'var(--text-2)', fontSize: '13px' }}>No recorded problem struggles.</p>
                                )}
                              </div>

                              <div className="card">
                                <span className="compare-card-title" style={{ display: 'block', marginBottom: '12px' }}>Abandoned (2+ Fails, Unsolved)</span>
                                {friendStruggles.abandoned?.length > 0 ? (
                                  <div className="struggle-list">
                                    {friendStruggles.abandoned.slice(0, 5).map(prob => (
                                      <div key={prob.problemId} className="struggle-item" style={{ borderLeft: '3px solid var(--danger)' }}>
                                        <div className="struggle-item-top">
                                          <a
                                            href={`https://codeforces.com/problemset/problem/${prob.problemId.slice(0, -1)}/${prob.problemId.slice(-1)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="struggle-item-name"
                                          >
                                            {prob.problemId}. {prob.name}
                                          </a>
                                          <span className="badge" style={{ fontSize: '11px', color: 'var(--danger)', background: 'rgba(220, 38, 38, 0.08)' }}>
                                            {prob.rating ? `Rating: ${prob.rating}` : 'Unrated'}
                                          </span>
                                        </div>
                                        <div className="struggle-item-meta">
                                          Attempted {prob.failCount} times without success.
                                        </div>
                                        <div className="tag-badge-container">
                                          {prob.tags.map(t => (
                                            <span key={t} className="tag-badge">{t}</span>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p style={{ color: 'var(--text-2)', fontSize: '13px' }}>No abandoned problems found.</p>
                                )}
                              </div>
                            </div>

                            {/* Column 2: Weak Topics */}
                            <div className="struggle-column">
                              <h3>Friend's Weak Topics</h3>
                              <div className="card">
                                <span className="compare-card-title" style={{ display: 'block', marginBottom: '16px' }}>Topics with &gt;50% Error Rate</span>
                                {friendStruggles.weakTags?.length > 0 ? (
                                  <div className="weak-tag-grid">
                                    {friendStruggles.weakTags.map(tagObj => (
                                      <div key={tagObj.tag} className="weak-tag-bar-container">
                                        <div className="weak-tag-label">
                                          <span style={{ fontWeight: '500' }}>{tagObj.tag}</span>
                                          <span style={{ color: 'var(--warning)', fontWeight: '600' }}>
                                            {tagObj.errorRate}% error rate ({tagObj.totalAttempts} tries)
                                          </span>
                                        </div>
                                        <div className="weak-tag-progress-bg">
                                          <div
                                            className="weak-tag-progress-fill"
                                            style={{ width: `${tagObj.errorRate}%` }}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p style={{ color: 'var(--text-2)', fontSize: '13px' }}>
                                    No weak topics found (error rates are within steady bounds).
                                  </p>
                                )}
                              </div>
                            </div>
                          </section>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'rivalry' && (
                    <div className="compare-grid">
                      <div className="compare-col-left" style={{ gridColumn: '1 / -1' }}>
                        {/* AI Rivalry Analysis Section */}
                        <section className="card ai-rivalry-section" style={{ marginBottom: '24px', borderLeft: '4px solid #f43f5e' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '20px' }}>⚔️</span> The Rivalry Analyst (AI)
                            </h3>
                            <button 
                              className="btn btn-primary" 
                              onClick={handleAIRivalry} 
                              disabled={aiLoading}
                              style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', border: 'none' }}
                            >
                              {aiLoading ? 'Analyzing Matchup...' : 'Generate Tale of the Tape'}
                            </button>
                          </div>
                          
                          {aiAnalysis && (
                            <div className="ai-response" style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--radius)', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                              {aiAnalysis}
                            </div>
                          )}
                        </section>

                        {/* Chart section */}
                        {chartData.length > 0 && (
                          <section className="card chart-section">
                            <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Rating progression aligned by days elapsed</h3>
                            <div style={{ width: '100%', height: 300 }}>
                              <ResponsiveContainer>
                                <LineChart data={chartData}>
                                  <XAxis
                                    dataKey="day"
                                    label={{ value: 'Days since journey start', position: 'insideBottom', offset: -5 }}
                                  />
                                  <YAxis
                                    label={{ value: 'Rating', angle: -90, position: 'insideLeft' }}
                                    domain={['dataMin - 100', 'dataMax + 100']}
                                  />
                                  <Tooltip formatter={(value, name) => [value, name]} />
                                  <Legend verticalAlign="top" height={36} />
                                  <Line
                                    type="monotone"
                                    dataKey="You"
                                    stroke="#059669"
                                    dot={false}
                                    strokeWidth={3}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey={comparisonData.friend.handle}
                                    stroke="#9ca3af"
                                    dot={false}
                                    strokeWidth={2}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </section>
                        )}
                        
                        {/* Contest Face-offs */}
                        <section className="card faceoff-section" style={{ marginTop: '24px' }}>
                          <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>
                            Contest Face-off
                          </h3>
                          <p className="subtitle" style={{ marginBottom: '16px' }}>
                            Compare submission timelines side-by-side for contests both of you completed.
                          </p>
                          
                          {commonContests.length > 0 ? (
                            <>
                              <div className="faceoff-selector-wrapper">
                                <label htmlFor="faceoff-contest-select">Select Common Contest</label>
                                <select
                                  id="faceoff-contest-select"
                                  className="form-input"
                                  value={selectedContestId}
                                  onChange={(e) => setSelectedContestId(e.target.value)}
                                >
                                  <option value="">-- Choose Contest --</option>
                                  {commonContests.map(c => (
                                    <option key={c.contestId} value={c.contestId}>
                                      {c.contestId} — {c.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {selectedContestId && faceoffData.length > 0 ? (
                                <table className="faceoff-timeline-table">
                                  <thead>
                                    <tr>
                                      <th>Problem</th>
                                      <th>Name</th>
                                      <th>Your Time</th>
                                      <th>{friendProfileData?.handle}'s Time</th>
                                      <th>Solve Delta</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {faceoffData.map(row => {
                                      let deltaText = 'N/A';
                                      let deltaClass = '';
                                      
                                      const formatSolveTime = (t) => {
                                        if (t === null) return 'Unsolved';
                                        if (isNaN(t) || t > 300) return 'Practice';
                                        return `${t}m`;
                                      };

                                      if (row.youSolved && row.friendSolved && row.youTime !== null && row.friendTime !== null) {
                                        if (row.youTime <= 300 && row.friendTime <= 300) {
                                          const diff = row.youTime - row.friendTime;
                                          if (diff < 0) {
                                            deltaText = `You solved ${Math.abs(diff)}m faster`;
                                            deltaClass = 'strong';
                                          } else if (diff > 0) {
                                            deltaText = `${friendProfileData?.handle} solved ${diff}m faster`;
                                            deltaClass = 'needs-work';
                                          } else {
                                            deltaText = 'Solved at identical minute';
                                          }
                                        } else if (row.youTime <= 300 && row.friendTime > 300) {
                                          deltaText = 'You solved during contest';
                                          deltaClass = 'strong';
                                        } else if (row.youTime > 300 && row.friendTime <= 300) {
                                          deltaText = `${friendProfileData?.handle} solved during contest`;
                                          deltaClass = 'needs-work';
                                        } else {
                                          deltaText = 'Both solved in practice';
                                        }
                                      } else if (row.youSolved && !row.friendSolved) {
                                        deltaText = 'Only you solved';
                                        deltaClass = 'strong';
                                      } else if (!row.youSolved && row.friendSolved) {
                                        deltaText = `Only ${friendProfileData?.handle} solved`;
                                        deltaClass = 'needs-work';
                                      }

                                      return (
                                        <tr key={row.index}>
                                          <td style={{ fontWeight: '700' }}>{row.index}</td>
                                          <td>{row.problemName}</td>
                                          <td>
                                            {row.youSolved ? (
                                              <span className="solved-time-badge solved">
                                                AC ({formatSolveTime(row.youTime)}) {row.youFails > 0 ? `+${row.youFails} WA` : ''}
                                              </span>
                                            ) : (
                                              <span className="solved-time-badge unsolved">
                                                Unsolved {row.youFails > 0 ? `(${row.youFails} WA)` : ''}
                                              </span>
                                            )}
                                          </td>
                                          <td>
                                            {row.friendSolved ? (
                                              <span className="solved-time-badge solved">
                                                AC ({formatSolveTime(row.friendTime)}) {row.friendFails > 0 ? `+${row.friendFails} WA` : ''}
                                              </span>
                                            ) : (
                                              <span className="solved-time-badge unsolved">
                                                Unsolved {row.friendFails > 0 ? `(${row.friendFails} WA)` : ''}
                                              </span>
                                            )}
                                          </td>
                                          <td className={`status-indicator ${deltaClass}`} style={{ borderBottom: '1px solid var(--border)' }}>
                                            {deltaText}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              ) : selectedContestId ? (
                                <p style={{ color: 'var(--text-2)', fontSize: '13px' }}>
                                  No submission histories found for this contest in either profile cache.
                                </p>
                              ) : (
                                <p style={{ color: 'var(--text-2)', fontSize: '13px' }}>
                                  Choose a contest above to view side-by-side timeline breakdowns.
                                </p>
                              )}
                            </>
                          ) : (
                            <p style={{ color: 'var(--text-2)', fontSize: '13px' }}>
                              You and {friendProfileData?.handle || 'this friend'} do not share any common official contests in your histories.
                            </p>
                          )}
                        </section>
                      </div>
                  </div>
                  )}
                </>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
}
