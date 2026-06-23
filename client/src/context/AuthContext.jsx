// ─────────────────────────────────────────────────────────
//  src/context/AuthContext.jsx  —  Global Auth State
//
//  What is React Context?
//    A way to share state across components without passing
//    props down every level. Any component in the app can
//    call useAuth() and get the current user + token.
//
//  What it stores:
//    user    → { id, username, codeforcesHandle, startDate }
//    token   → the JWT string
//    loading → true while we check if a stored token is valid
// ─────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

// The Provider wraps the whole app (see main.jsx)
// and makes the auth state available everywhere
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // starts true — we check localStorage first

  // ── On app load — restore session from localStorage ───
  //    If a token exists in localStorage, validate it by
  //    calling /api/profile. If it works, the user stays
  //    logged in. If it fails (expired), we clear it.
  useEffect(() => {
    const token = localStorage.getItem('ascent_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.getProfile()
      .then((profile) => setUser(profile))
      .catch(() => localStorage.removeItem('ascent_token'))
      .finally(() => setLoading(false));
  }, []);

  // Called after successful register or login
  const login = (token, userData) => {
    localStorage.setItem('ascent_token', token);
    setUser(userData);
  };

  // Clears the session
  const logout = () => {
    localStorage.removeItem('ascent_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — components call this instead of useContext directly
// e.g.  const { user, logout } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}
