import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import api from '../api/client.js';
import '../components/Layout.css';
import './Topics.css';

/**
 * Topics Page Component.
 * Visualizes the user's Codeforces progress split by problem difficulties and topic tags.
 * Calculates error rates and tags status indicators.
 */
export default function Topics() {
  const { user } = useAuth();
  const [cfData, setCfData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const myHandle = user?.cfHandle || user?.codeforcesHandle;

  useEffect(() => {
    if (!myHandle) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadingRecs(true);
    setError('');

    api.getCFData(myHandle)
      .then(data => {
        setCfData(data);
      })
      .catch(err => {
        console.error('Failed to load CF data for topics breakdown:', err);
        setError('Could not retrieve your Codeforces data to calculate topic breakdown.');
      })
      .finally(() => {
        setLoading(false);
      });

    api.getRecommendations(myHandle)
      .then(data => {
        setRecommendations(data || []);
      })
      .catch(err => {
        console.error('Failed to load recommendations:', err);
      })
      .finally(() => {
        setLoadingRecs(false);
      });
  }, [myHandle]);

  // Aggregate metrics
  let difficultyBuckets = [];
  let tagList = [];

  if (cfData) {
    const submissions = cfData.submissions || [];

    // 1. Calculate difficulty distribution
    const solvedRatings = {}; // rating -> count of unique problems
    const seenProblemsForDifficulty = new Set();

    submissions.forEach(sub => {
      if (sub.verdict === 'OK' && sub.problem && sub.problem.rating) {
        const probId = `${sub.problem.contestId}${sub.problem.index}`;
        if (!seenProblemsForDifficulty.has(probId)) {
          seenProblemsForDifficulty.add(probId);
          const rating = sub.problem.rating;
          solvedRatings[rating] = (solvedRatings[rating] || 0) + 1;
        }
      }
    });

    // Convert to sorted array of rating buckets
    const sortedRatings = Object.keys(solvedRatings)
      .map(Number)
      .sort((a, b) => a - b);
    
    const maxDifficultyCount = sortedRatings.length > 0
      ? Math.max(...Object.values(solvedRatings))
      : 1;

    difficultyBuckets = sortedRatings.map(rating => ({
      rating,
      count: solvedRatings[rating],
      percentage: Math.max(2, (solvedRatings[rating] / maxDifficultyCount) * 100)
    }));

    // 2. Calculate Tag breakdown stats
    const tagMap = {}; // tag -> { solvedCount, attemptCount }
    const problemAttempts = {};
    const problemSolved = {};
    const problemTags = {};

    submissions.forEach(sub => {
      if (!sub.problem || !sub.problem.contestId || !sub.problem.index) return;
      const probId = `${sub.problem.contestId}${sub.problem.index}`;
      
      problemAttempts[probId] = (problemAttempts[probId] || 0) + 1;
      if (sub.verdict === 'OK') {
        problemSolved[probId] = true;
      }
      problemTags[probId] = sub.problem.tags || [];
    });

    Object.keys(problemAttempts).forEach(probId => {
      const tags = problemTags[probId];
      const attempts = problemAttempts[probId];
      const isSolved = problemSolved[probId] || false;

      tags.forEach(tag => {
        if (!tagMap[tag]) {
          tagMap[tag] = { solvedCount: 0, attemptCount: 0 };
        }
        tagMap[tag].attemptCount += attempts;
        if (isSolved) {
          tagMap[tag].solvedCount += 1;
        }
      });
    });

    // Build final sorted tag array
    tagList = Object.entries(tagMap)
      .map(([tag, stats]) => {
        const errorRate = Math.max(
          0,
          Math.round(((stats.attemptCount - stats.solvedCount) / stats.attemptCount) * 100)
        );
        
        let status = 'Strong';
        let statusClass = 'strong';
        if (errorRate > 50) {
          status = 'Weak area';
          statusClass = 'weak';
        } else if (errorRate >= 30) {
          status = 'Needs work';
          statusClass = 'needs-work';
        }

        return {
          tag,
          solved: stats.solvedCount,
          attempts: stats.attemptCount,
          errorRate,
          status,
          statusClass
        };
      })
      .sort((a, b) => b.attempts - a.attempts); // sort by attempt volume
  }

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="app-main">
        <div className="page-content">
          
          <header className="topics-header">
            <h1 className="page-title">Topic Breakdown</h1>
            <p className="subtitle">
              Detailed breakdown of topic tags and problem difficulty distribution from your Codeforces history.
            </p>
          </header>

          {!myHandle ? (
            <div className="card" style={{ border: '1px dashed var(--warning)', backgroundColor: 'rgba(217, 119, 6, 0.05)' }}>
              <p style={{ color: 'var(--warning)', fontWeight: '500' }}>
                Please set your Codeforces handle on the Home Dashboard to view your topic stats.
              </p>
            </div>
          ) : loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-2)' }}>Analyzing submissions data...</p>
            </div>
          ) : (
            <div className="topics-grid">
              
              {/* Weakness Buster Section */}
              <section className="card weakness-buster-section" style={{ gridColumn: '1 / -1' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '4px' }}>
                  Weakness Buster Recommendations
                </h3>
                <p className="subtitle" style={{ marginBottom: '16px' }}>
                  Targeted practice suggestions matching your weak topics and rating range.
                </p>
                {loadingRecs ? (
                  <p style={{ color: 'var(--text-2)', fontSize: '13px' }}>Compiling recommendations...</p>
                ) : recommendations.length > 0 ? (
                  <div className="recommendations-grid">
                    {recommendations.map(prob => {
                      const contestId = prob.problemId.match(/^(\d+)/)[0];
                      const index = prob.problemId.replace(/^\d+/, '');
                      const cfUrl = `https://codeforces.com/problemset/problem/${contestId}/${index}`;
                      return (
                        <div key={prob.problemId} className="rec-card">
                          <div>
                            <div className="rec-card-top">
                              <span className="rec-id">{prob.problemId}</span>
                              <span className="badge badge-accent">{prob.rating}</span>
                            </div>
                            <h4 className="rec-name">{prob.name}</h4>
                            <div className="tag-badge-container" style={{ margin: '8px 0 16px' }}>
                              {prob.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="tag-badge">{tag}</span>
                              ))}
                            </div>
                          </div>
                          <a
                            href={cfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center', fontSize: '13px', padding: '6px' }}
                          >
                            Solve Problem
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-2)', fontSize: '13px' }}>
                    No weakness recommendations found. Great job! Keep maintaining your streak.
                  </p>
                )}
              </section>

              {/* Difficulty Distribution Section */}
              <section className="card difficulty-section">
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>
                  Solved Problem Difficulty Distribution
                </h3>
                {difficultyBuckets.length > 0 ? (
                  <div className="difficulty-chart-container">
                    {difficultyBuckets.map(bucket => (
                      <div key={bucket.rating} className="difficulty-row">
                        <span className="difficulty-label">{bucket.rating}</span>
                        <div className="difficulty-bar-bg">
                          <div
                            className="difficulty-bar-fill"
                            style={{ width: `${bucket.percentage}%` }}
                          />
                        </div>
                        <span className="difficulty-count">{bucket.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-2)', fontSize: '13px', marginTop: '12px' }}>
                    No solved problems with rating found in history.
                  </p>
                )}
              </section>

              {/* Tag Breakdown Table Section */}
              <section className="card topics-table-card">
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
                  Topic breakdown and error rates
                </h3>
                {tagList.length > 0 ? (
                  <table className="topics-table">
                    <thead>
                      <tr>
                        <th>Topic Tag</th>
                        <th>Solved</th>
                        <th>Attempts</th>
                        <th>Error Rate</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tagList.map(item => (
                        <tr key={item.tag}>
                          <td style={{ fontWeight: '500' }}>{item.tag}</td>
                          <td>{item.solved}</td>
                          <td>{item.attempts}</td>
                          <td style={{ fontWeight: '600', color: item.errorRate > 40 ? 'var(--warning)' : 'inherit' }}>
                            {item.errorRate}%
                          </td>
                          <td>
                            <span className={`status-indicator ${item.statusClass}`}>
                              {item.statusClass === 'weak' && '⚠ '}
                              {item.statusClass === 'needs-work' && '⚠ '}
                              {item.statusClass === 'strong' && '✓ '}
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: 'var(--text-2)', fontSize: '13px' }}>
                    No topic tag statistics available.
                  </p>
                )}
              </section>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
