import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import Sidebar from '../components/Sidebar.jsx';
import JourneyChart from '../components/JourneyChart.jsx';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../components/Layout.css';
import './Compare.css';

export default function Compare() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [myHandleInput, setMyHandleInput] = useState(user?.cfHandle || user?.codeforcesHandle || '');
  const [peerHandleInput, setPeerHandleInput] = useState(searchParams.get('peer') || searchParams.get('friend') || '');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [comparisonData, setComparisonData] = useState(null);
  const [myTimeline, setMyTimeline] = useState(null);
  const [peerTimeline, setPeerTimeline] = useState(null);

  // Stage 4: Milestone Predictor
  const [targetRating, setTargetRating] = useState(1600);
  const [predictionData, setPredictionData] = useState(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  // Stage 6: Struggle Analysis
  const [struggleData, setStruggleData] = useState(null);

  // HTML2Canvas refs & states
  const shareCardRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImg, setGeneratedImg] = useState(null);

  const fetchJourneyData = async (myH, peerH) => {
    if (!myH || !peerH) return;
    setLoading(true);
    setError('');
    setComparisonData(null);
    setMyTimeline(null);
    setPeerTimeline(null);
    setPredictionData(null);
    setStruggleData(null);
    setGeneratedImg(null);
    
    try {
      const [comp, myTLResponse, peerTLResponse, struggles] = await Promise.all([
        api.getJourneyCompare(myH, peerH),
        api.getJourneyTimeline(myH),
        api.getJourneyTimeline(peerH),
        api.getJourneyStruggles(myH, peerH)
      ]);
      
      const myTL = Array.isArray(myTLResponse) ? myTLResponse : myTLResponse.timeline;
      const peerTL = Array.isArray(peerTLResponse) ? peerTLResponse : peerTLResponse.timeline;

      if (!myTL || myTL.length === 0 || !peerTL || peerTL.length === 0) {
        throw new Error('One or both users have no contest history.');
      }

      setComparisonData(comp);
      setMyTimeline(myTL);
      setPeerTimeline(peerTL);
      setStruggleData(struggles);
    } catch (err) {
      console.error('Error fetching journey data:', err);
      if (err.response?.status === 404) {
        setError('Invalid CF handle. Please verify the handles exist.');
      } else if (err.response?.data?.error?.includes('private')) {
        setError('One of the profiles is private or restricted by Codeforces.');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to fetch journey data. Ensure both handles are valid.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPrediction = async (myH, peerH, target) => {
    if (!myH || !peerH || !target) return;
    setPredictionLoading(true);
    try {
      const pred = await api.getJourneyPrediction(myH, peerH, target);
      setPredictionData(pred);
    } catch (err) {
      console.error('Error fetching prediction:', err);
    } finally {
      setPredictionLoading(false);
    }
  };

  useEffect(() => {
    if (myHandleInput && peerHandleInput) {
      fetchJourneyData(myHandleInput, peerHandleInput);
    }
  }, []);

  useEffect(() => {
    if (comparisonData && targetRating) {
      fetchPrediction(comparisonData.myHandle, comparisonData.peerHandle, targetRating);
    }
  }, [comparisonData, targetRating]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (myHandleInput && peerHandleInput) {
      setSearchParams({ peer: peerHandleInput });
      fetchJourneyData(myHandleInput, peerHandleInput);
    }
  };

  // Section 5: Shareable Card Generation
  const generateShareCard = async () => {
    if (!shareCardRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2, // High resolution for social media sharing
        backgroundColor: '#0f172a',
        logging: false,
        useCORS: true
      });
      const dataUrl = canvas.toDataURL('image/png');
      setGeneratedImg(dataUrl);
    } catch (err) {
      console.error('Failed to generate image', err);
      setError('Failed to generate share card. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedImg) return;
    try {
      const response = await fetch(generatedImg);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      alert('Image successfully copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy', err);
      alert('Failed to copy image. Right-click the image and select "Copy image".');
    }
  };

  const downloadImage = () => {
    if (!generatedImg) return;
    const link = document.createElement('a');
    link.href = generatedImg;
    link.download = `Ascent_Journey_${comparisonData.myHandle}_vs_${comparisonData.peerHandle}.png`;
    link.click();
  };

  const renderDelta = (value) => {
    if (value > 0) return <span className="delta delta-positive">▲ +{value}</span>;
    if (value < 0) return <span className="delta delta-negative">▼ {Math.abs(value)}</span>;
    return <span className="delta delta-neutral">− 0</span>;
  };

  const formatInsightText = (text) => {
    let highlighted = text.replace(/(ahead by \d+ rating points|ahead of their historical pace)/gi, '<strong class="text-green">$&</strong>');
    highlighted = highlighted.replace(/(behind their pace|point gap)/gi, '<strong class="text-red">$&</strong>');
    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  };

  const hasInsufficientData = myTimeline && myTimeline.length > 0 && myTimeline[myTimeline.length - 1].day < 30;

  const getCombinedProgressionData = (meProg, peerProg) => {
    if (!meProg || !peerProg) return [];
    const combined = [];
    const maxWindows = Math.max(
      meProg.length > 0 ? meProg[meProg.length - 1].windowIdx : 0,
      peerProg.length > 0 ? peerProg[peerProg.length - 1].windowIdx : 0
    );

    for (let i = 0; i <= maxWindows; i++) {
      const m = meProg.find(p => p.windowIdx === i);
      const p = peerProg.find(p => p.windowIdx === i);
      
      combined.push({
        month: i + 1,
        meAvg: m && m.avgProblemRating > 0 ? m.avgProblemRating : null,
        peerAvg: p && p.avgProblemRating > 0 ? p.avgProblemRating : null
      });
    }
    return combined;
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <div className="page-content compare-page">
        
        {/* SECTION 1: HEADER & INPUTS */}
        <header className="page-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              Journey Comparison
              {comparisonData && (
                <span className={`cache-indicator ${comparisonData.cached ? 'cached' : 'fresh'}`}>
                  {comparisonData.cached ? '⚡ Cached' : '🔄 Fresh'}
                </span>
              )}
            </h1>
            <p className="subtitle" style={{ fontSize: '15px', marginTop: '4px' }}>
              See where they were when you were where you are now.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="compare-form" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <div className="input-group">
              <label>My Handle</label>
              <input 
                type="text" 
                className="form-input" 
                value={myHandleInput}
                onChange={e => setMyHandleInput(e.target.value)}
                placeholder="e.g. tourist"
                required
                style={{ width: '160px' }}
              />
            </div>
            
            <div className="input-group">
              <label>Peer Handle</label>
              <input 
                type="text" 
                className="form-input" 
                value={peerHandleInput}
                onChange={e => setPeerHandleInput(e.target.value)}
                placeholder="e.g. Benq"
                required
                style={{ width: '160px' }}
              />
            </div>

            <button type="submit" className="btn btn-compare" disabled={loading} style={{ height: '40px', minWidth: '100px' }}>
              {loading ? '...' : 'Compare'}
            </button>
          </form>
        </header>

        {error && <div className="card error-msg">{error}</div>}

        {!comparisonData && !loading && !error && (
          <div className="empty-state card">
            <div className="empty-icon">⚖️</div>
            <h3>Enter two handles to begin comparison</h3>
            <p>We will align your Codeforces journeys from Day 1 to show you exactly how you measure up to their past pace.</p>
          </div>
        )}

        {comparisonData && myTimeline && peerTimeline && !loading && (
          <div className="comparison-results">
            
            {hasInsufficientData && (
              <div className="card warning-msg">
                <strong>Not enough data:</strong> You have less than 30 days of contest history. The predictions and comparisons may be highly volatile.
              </div>
            )}

            {/* SECTION 2: THE INSIGHT CARD */}
            <div className="insight-banner giant">
              <div className="insight-icon">💡</div>
              <p className="insight-text large-text">
                {formatInsightText(comparisonData.insight)}
              </p>
            </div>

            {/* SECTION 3: STATS COMPARISON ROW */}
            <div className="stats-row">
              <div className="stat-card card">
                <h4>Rating at Day {comparisonData.journeyDay}</h4>
                <div className="stat-compare">
                  <div className="stat-me">
                    <span className="stat-val">{comparisonData.me.rating}</span>
                    <span className="stat-label">You</span>
                  </div>
                  <div className="stat-vs">vs</div>
                  <div className="stat-peer">
                    <span className="stat-val">{comparisonData.peer.rating}</span>
                    <span className="stat-label">{comparisonData.peerHandle}</span>
                  </div>
                </div>
                <div className="stat-delta">
                  {renderDelta(comparisonData.difference.rating)}
                </div>
              </div>

              <div className="stat-card card">
                <h4>Problems Solved</h4>
                <div className="stat-compare">
                  <div className="stat-me">
                    <span className="stat-val">{comparisonData.me.problemsSolved}</span>
                    <span className="stat-label">You</span>
                  </div>
                  <div className="stat-vs">vs</div>
                  <div className="stat-peer">
                    <span className="stat-val">{comparisonData.peer.problemsSolved}</span>
                    <span className="stat-label">{comparisonData.peerHandle}</span>
                  </div>
                </div>
                <div className="stat-delta">
                  {renderDelta(comparisonData.difference.problemsSolved)}
                </div>
              </div>

              <div className="stat-card card">
                <h4>Contests Given</h4>
                <div className="stat-compare">
                  <div className="stat-me">
                    <span className="stat-val">{comparisonData.me.contestsGiven}</span>
                    <span className="stat-label">You</span>
                  </div>
                  <div className="stat-vs">vs</div>
                  <div className="stat-peer">
                    <span className="stat-val">{comparisonData.peer.contestsGiven}</span>
                    <span className="stat-label">{comparisonData.peerHandle}</span>
                  </div>
                </div>
                <div className="stat-delta">
                  {renderDelta(comparisonData.difference.contestsGiven)}
                </div>
              </div>
            </div>

            {/* SECTION 6: MILESTONE PREDICTOR CARD */}
            {predictionData && (
              <div className="card milestone-card">
                <div className="milestone-header">
                  <h3 className="chart-title">Your Next Milestone</h3>
                  <select 
                    className="milestone-select"
                    value={targetRating}
                    onChange={(e) => setTargetRating(Number(e.target.value))}
                    disabled={predictionLoading}
                  >
                    <option value={1200}>1200 (Pupil)</option>
                    <option value={1400}>1400 (Specialist)</option>
                    <option value={1600}>1600 (Expert)</option>
                    <option value={1900}>1900 (CM)</option>
                    <option value={2100}>2100 (Master)</option>
                    <option value={2300}>2300 (IM)</option>
                    <option value={2400}>2400 (GM)</option>
                  </select>
                </div>

                {predictionData.alreadyReached ? (
                  <div className="milestone-body">
                    <p className="milestone-insight text-green" style={{fontWeight: 600}}>
                      You have already reached or surpassed {targetRating}! Aim higher.
                    </p>
                  </div>
                ) : (
                  <div className="milestone-body">
                    <div className="milestone-insight-container">
                      {predictionData.peerReached ? (
                        <p className="milestone-insight">
                          It took <strong>{comparisonData.peerHandle}</strong> {predictionData.peerDaysToTarget} days to go from your current rating to {targetRating}.
                        </p>
                      ) : (
                        <p className="milestone-insight">
                          <strong>{comparisonData.peerHandle}</strong> hasn't reached this milestone yet. You are blazing a new trail!
                        </p>
                      )}
                      
                      <p className="milestone-prediction">
                        Based on your pace, you will reach {targetRating} in approximately <strong className="text-blue">{predictionData.myPredictedDays} days</strong> 
                        <span className="milestone-date"> ({new Date(predictionData.myPredictedDate).toLocaleDateString()})</span>.
                      </p>
                    </div>

                    <div className="milestone-progress-container">
                      <div className="milestone-labels">
                        <span>Current: {predictionData.currentRating}</span>
                        <span>Target: {targetRating}</span>
                      </div>
                      <div className="milestone-progress-bar">
                        <div 
                          className="milestone-progress-fill" 
                          style={{ width: `${Math.min(100, Math.max(0, (predictionData.currentRating / targetRating) * 100))}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="milestone-confidence">
                      <span className={`confidence-badge conf-${predictionData.confidence}`}>
                        Confidence: {predictionData.confidence.toUpperCase()}
                      </span>
                      <span className="confidence-text">
                        {predictionData.confidence === 'high' ? 'Based on a solid history of contests.' : 'Based on limited recent contests. Keep competing!'}
                      </span>
                    </div>
                  </div>
                )}

                {/* SECTION 7: STRUGGLE COMPARISON */}
                {struggleData && (
                  <div className="card struggle-section">
                    <div className="struggle-header" style={{ marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
                      <h3 className="chart-title" style={{ fontSize: '20px' }}>Struggle Analysis</h3>
                      <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px', margin: 0 }}>
                        A deeper look into the hardships and consistency of both journeys aligned at Day {comparisonData.journeyDay}.
                      </p>
                    </div>

                    <div className="struggle-insights" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                      {struggleData.insights.map((ins, idx) => (
                        <div key={idx} className="struggle-insight-item" style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', fontSize: '15px', color: '#1e293b', borderLeft: '4px solid #10b981' }}>
                          <span style={{ marginRight: '8px' }}>💡</span> {formatInsightText(ins)}
                        </div>
                      ))}
                    </div>

                    <div className="struggle-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                      
                      <div className="struggle-card" style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rating Drops</h4>
                        <div className="struggle-stat-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="s-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span className="s-val text-red" style={{ fontSize: '24px', fontWeight: '800' }}>{struggleData.me.ratingDrops.length}</span>
                            <span className="s-lbl" style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>You</span>
                            <span className="s-sub" style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Avg -{struggleData.me.avgDrop}</span>
                          </div>
                          <div className="s-vs" style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 'bold' }}>vs</div>
                          <div className="s-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span className="s-val text-orange" style={{ fontSize: '24px', fontWeight: '800', color: '#f97316' }}>{struggleData.peer.ratingDrops.length}</span>
                            <span className="s-lbl" style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>{comparisonData.peerHandle}</span>
                            <span className="s-sub" style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Avg -{struggleData.peer.avgDrop}</span>
                          </div>
                        </div>
                      </div>

                      <div className="struggle-card" style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Days / Week</h4>
                        <div className="struggle-stat-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="s-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span className="s-val text-blue" style={{ fontSize: '24px', fontWeight: '800', color: '#3b82f6' }}>{struggleData.me.consistency.avgActiveDaysPerWeek}</span>
                            <span className="s-lbl" style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>You</span>
                            <span className="s-sub" style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Streak: {struggleData.me.consistency.longestStreak}</span>
                          </div>
                          <div className="s-vs" style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 'bold' }}>vs</div>
                          <div className="s-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span className="s-val text-orange" style={{ fontSize: '24px', fontWeight: '800', color: '#f97316' }}>{struggleData.peer.consistency.avgActiveDaysPerWeek}</span>
                            <span className="s-lbl" style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>{comparisonData.peerHandle}</span>
                            <span className="s-sub" style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Streak: {struggleData.peer.consistency.longestStreak}</span>
                          </div>
                        </div>
                      </div>

                      <div className="struggle-card" style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Max Inactivity Gap</h4>
                        <div className="struggle-stat-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div className="s-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span className="s-val" style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>{struggleData.me.consistency.longestGap}</span>
                            <span className="s-lbl" style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>Days</span>
                            <span className="s-sub" style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>You</span>
                          </div>
                          <div className="s-vs" style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: 'bold' }}>vs</div>
                          <div className="s-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span className="s-val text-orange" style={{ fontSize: '24px', fontWeight: '800', color: '#f97316' }}>{struggleData.peer.consistency.longestGap}</span>
                            <span className="s-lbl" style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>Days</span>
                            <span className="s-sub" style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{comparisonData.peerHandle}</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    <div className="struggle-chart-container" style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 20px 0', fontSize: '15px', color: '#0f172a', fontWeight: '700' }}>Problem Difficulty Progression (Monthly Avg)</h4>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <LineChart data={getCombinedProgressionData(struggleData.me.difficultyProgression, struggleData.peer.difficultyProgression)}>
                            <XAxis dataKey="month" tickFormatter={(val) => `Mo ${val}`} stroke="#94a3b8" fontSize={12} />
                            <YAxis domain={['dataMin - 100', 'dataMax + 100']} stroke="#94a3b8" fontSize={12} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                            <Line type="monotone" dataKey="meAvg" stroke="#3b82f6" name={`You`} strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} connectNulls />
                            <Line type="monotone" dataKey="peerAvg" stroke="#f97316" name={comparisonData.peerHandle} strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} connectNulls />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 4: DUAL TIMELINE CHART */}
            <div className="card chart-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 className="chart-title">Your Journey vs Their Journey (Aligned from Day 1)</h3>
                <div className="chart-legend">
                  <div className="legend-item">
                    <div className="legend-color" style={{ background: '#3b82f6' }}></div>
                    <span>Your Path ({comparisonData.myHandle})</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ background: '#f97316' }}></div>
                    <span>Their Path ({comparisonData.peerHandle})</span>
                  </div>
                </div>
              </div>

              <JourneyChart 
                myHandle={comparisonData.myHandle}
                peerHandle={comparisonData.peerHandle}
                myTimeline={myTimeline}
                peerTimeline={peerTimeline}
                comparisonData={comparisonData}
              />
            </div>

            {/* SECTION 5: SHAREABLE CARD GENERATOR */}
            <div className="card share-section">
              <h3 style={{fontSize: '18px', marginBottom: '4px'}}>Share Your Progress</h3>
              <p style={{fontSize: '13px', color: '#64748b', marginBottom: '16px'}}>Generate a beautiful comparison card to share on Twitter or LinkedIn.</p>
              
              {!generatedImg ? (
                <button className="btn btn-secondary" onClick={generateShareCard} disabled={isGenerating}>
                  {isGenerating ? 'Generating Canvas...' : 'Generate Share Card'}
                </button>
              ) : (
                <div className="generated-preview">
                  <img src={generatedImg} alt="Share Card Preview" className="share-img-preview" />
                  <div className="share-actions">
                    <button className="btn btn-primary" onClick={downloadImage}>Download Card</button>
                    <button className="btn btn-secondary" onClick={copyToClipboard}>Copy Image</button>
                    <button className="btn btn-ghost" onClick={() => setGeneratedImg(null)}>Close</button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
        </div>
      </main>

      {/* OFF-SCREEN SHARE CARD (Rendered by html2canvas) */}
      {comparisonData && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <div ref={shareCardRef} className="share-card-layout">
            <div className="sc-header">
              <div className="sc-logo">Ascent.</div>
              <div className="sc-title">Journey Comparison</div>
            </div>

            <div className="sc-insight">
              {formatInsightText(comparisonData.insight)}
            </div>

            <div className="sc-versus">
              <span className="sc-handle sc-blue">{comparisonData.myHandle}</span>
              <span className="sc-vs-text">vs</span>
              <span className="sc-handle sc-orange">{comparisonData.peerHandle}</span>
            </div>
            <div className="sc-day-label">Aligned exactly at Day {comparisonData.journeyDay}</div>

            <div className="sc-stats">
              <div className="sc-stat-box">
                <span className="sc-stat-title">Rating</span>
                <span className="sc-stat-val">{comparisonData.me.rating} vs {comparisonData.peer.rating}</span>
                {renderDelta(comparisonData.difference.rating)}
              </div>
              <div className="sc-stat-box">
                <span className="sc-stat-title">Problems</span>
                <span className="sc-stat-val">{comparisonData.me.problemsSolved} vs {comparisonData.peer.problemsSolved}</span>
                {renderDelta(comparisonData.difference.problemsSolved)}
              </div>
              <div className="sc-stat-box">
                <span className="sc-stat-title">Contests</span>
                <span className="sc-stat-val">{comparisonData.me.contestsGiven} vs {comparisonData.peer.contestsGiven}</span>
                {renderDelta(comparisonData.difference.contestsGiven)}
              </div>
            </div>

            <div className="sc-footer">
              <div className="sc-watermark">Built with Ascent</div>
              <div className="sc-url">ascent.dev</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
