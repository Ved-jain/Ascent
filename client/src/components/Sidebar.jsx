import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/client.js';
import NotesModal from './NotesModal.jsx';
import './Sidebar.css';

/**
 * Sidebar Navigation component.
 * Displays application logo, navigation links, user details with Codeforces rating/rank,
 * and actions to Add Note or Logout.
 */
export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [cfData, setCfData] = useState(null);

  // Fetch Codeforces profile rank and rating for the logged-in user to show in the sidebar footer
  useEffect(() => {
    const handle = user?.cfHandle || user?.codeforcesHandle;
    if (handle) {
      api.getCFData(handle)
        .then(data => {
          setCfData(data);
        })
        .catch(err => {
          console.error('Failed to fetch user CF data for sidebar:', err.message);
        });
    } else {
      setCfData(null);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determine user rank and color styles for the rank badge
  const rank = cfData?.rank || '';
  const rating = cfData?.rating || null;

  const getRankColorVar = (cfRank) => {
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
    <div className="sidebar">
      <div className="sidebar-logo">
        <span>Ascent</span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          Home
        </NavLink>
        
        <NavLink
          to="/compare"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          Compare
        </NavLink>

        <NavLink
          to="/friends"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          Friends
        </NavLink>

        <NavLink
          to="/topics"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          Topics
        </NavLink>

        <NavLink
          to="/problems"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          Problems
        </NavLink>

        <NavLink
          to="/upsolve"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          Upsolve Tracker
        </NavLink>

        <NavLink
          to="/skilltree"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          Skill Tree
        </NavLink>

        <NavLink
          to="/insights"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          System Insights
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          Profile
        </NavLink>
      </nav>

      <div className="sidebar-bottom">
        {user && (
          <div className="sidebar-user">
            <span className="sidebar-username">{user.username}</span>
            {cfData ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span className="sidebar-handle">{cfData.handle}</span>
                {rating !== null && (
                  <span
                    className="badge"
                    style={{
                      backgroundColor: 'transparent',
                      color: getRankColorVar(rank),
                      padding: 0,
                      fontWeight: 700,
                      fontSize: '11px'
                    }}
                  >
                    {rating}
                  </span>
                )}
              </div>
            ) : (
              <span className="sidebar-handle">No CF Connected</span>
            )}
          </div>
        )}

        <div className="sidebar-actions">
          <button className="btn btn-primary" onClick={() => setIsNoteOpen(true)}>
            Add Note
          </button>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      {isNoteOpen && (
        <NotesModal
          onClose={() => setIsNoteOpen(false)}
          onNoteAdded={() => {
            // If we are on the profile page, we might want to refresh the notes timeline.
            // Dispatch a custom event to notify components that a note was added.
            window.dispatchEvent(new Event('note-added'));
          }}
        />
      )}
    </div>
  );
}
