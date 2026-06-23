// ─────────────────────────────────────────────────────────
//  src/components/ProtectedRoute.jsx
//
//  Wraps any route that requires login.
//  If user is not logged in → redirect to /login.
//  While checking session (loading) → show nothing.
//  If logged in → render the actual page (children).
// ─────────────────────────────────────────────────────────

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Still checking localStorage — don't redirect yet
  if (loading) return null;

  // Not logged in → send to login page
  if (!user) return <Navigate to="/login" replace />;

  // Logged in → show the page
  return children;
}
