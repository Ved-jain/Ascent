import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import api from '../api/client.js';
import '../components/Layout.css';
import './SkillTree.css';

const MAJOR_TAGS = {
  'dp': { label: 'Dynamic Programming', description: 'The art of breaking problems into subproblems.', icon: '🧠' },
  'math': { label: 'Mathematics', description: 'Number theory, combinatorics, and logic.', icon: '📐' },
  'graphs': { label: 'Graph Theory', description: 'Nodes, edges, and pathfinding algorithms.', icon: '🕸️' },
  'data structures': { label: 'Data Structures', description: 'Trees, heaps, sets, and segment trees.', icon: '🗄️' },
  'greedy': { label: 'Greedy Algorithms', description: 'Making the locally optimal choice.', icon: '💰' },
  'implementation': { label: 'Implementation', description: 'Writing raw code accurately.', icon: '⚙️' },
};

export default function SkillTree() {
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

  // Aggregate user levels
  const skillLevels = {};
  let totalLevel = 1;

  Object.keys(MAJOR_TAGS).forEach(tag => {
    skillLevels[tag] = { count: 0, level: 1, maxRating: 0 };
  });

  if (cfData && cfData.submissions) {
    const solvedProblems = new Set();
    
    cfData.submissions.forEach(sub => {
      if (sub.verdict === 'OK' && sub.problem && sub.problem.tags) {
        const probId = `${sub.problem.contestId}${sub.problem.index}`;
        if (!solvedProblems.has(probId)) {
          solvedProblems.add(probId);
          
          sub.problem.tags.forEach(tag => {
            if (skillLevels[tag]) {
              skillLevels[tag].count += 1;
              const rating = sub.problem.rating || 0;
              if (rating > skillLevels[tag].maxRating) {
                skillLevels[tag].maxRating = rating;
              }
            }
          });
        }
      }
    });

    Object.keys(skillLevels).forEach(tag => {
      // Calculate level: 1 solved = lvl 1, 4 = lvl 2, 9 = lvl 3, 16 = lvl 4, etc.
      skillLevels[tag].level = Math.max(1, Math.floor(Math.sqrt(skillLevels[tag].count)));
      totalLevel += skillLevels[tag].level;
    });
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <div className="page-content">
          <header className="skilltree-header">
            <h1 className="page-title">Ascent Skill Tree</h1>
            <p className="subtitle">
              Your overall coder level: <strong style={{ color: 'var(--accent)', fontSize: '18px' }}>Lv. {totalLevel}</strong>
            </p>
          </header>

          {!myHandle ? (
            <div className="card error-msg">Please connect your Codeforces handle on the Home Dashboard.</div>
          ) : loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-2)' }}>Calculating skill tree nodes...</p>
            </div>
          ) : error ? (
            <div className="card error-msg">{error}</div>
          ) : (
            <div className="skill-tree-container">
              {Object.entries(MAJOR_TAGS).map(([tag, info]) => {
                const stats = skillLevels[tag];
                const level = stats.level;
                
                // Calculate glow intensity based on level
                const glowLevel = Math.min(level, 10);
                const isMax = level >= 10;
                
                return (
                  <div key={tag} className={`skill-node lvl-${glowLevel} ${isMax ? 'max-level' : ''}`}>
                    <div className="skill-icon">{info.icon}</div>
                    <div className="skill-details">
                      <h3>{info.label}</h3>
                      <div className="skill-level-badge">Level {level}</div>
                      <p>{info.description}</p>
                      
                      <div className="skill-stats">
                        <span>Solved: <strong>{stats.count}</strong></span>
                        <span>Max Rating: <strong style={{ color: 'var(--accent)' }}>{stats.maxRating || 'N/A'}</strong></span>
                      </div>
                      
                      <div className="xp-bar-container">
                        <div 
                          className="xp-bar-fill" 
                          style={{ width: `${Math.min(100, ((stats.count - Math.pow(level, 2)) / (Math.pow(level+1, 2) - Math.pow(level, 2))) * 100)}%` }}
                        />
                      </div>
                      <div className="xp-text">
                        {stats.count} / {Math.pow(level+1, 2)} to next level
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
