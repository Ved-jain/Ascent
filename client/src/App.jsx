import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import Compare from './pages/Compare.jsx';
import Friends from './pages/Friends.jsx';
import Topics from './pages/Topics.jsx';
import Problems from './pages/Problems.jsx';
import Profile from './pages/Profile.jsx';
import Upsolve from './pages/Upsolve.jsx';
import SkillTree from './pages/SkillTree.jsx';
import Insights from './pages/Insights.jsx';
import ContestHub from './pages/ContestHub.jsx';

/**
 * Application Entry router component.
 * Configures public routes (Login, Register) and JWT protected routes.
 * Catch-all route redirects back to the main dashboard.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Authentication routes */}
          <Route path="/landing"  element={<Landing />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes requiring valid JWT */}
          <Route path="/"        element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/compare"  element={<ProtectedRoute><Compare /></ProtectedRoute>} />
          <Route path="/friends"  element={<ProtectedRoute><Friends /></ProtectedRoute>} />
          <Route path="/topics"   element={<ProtectedRoute><Topics /></ProtectedRoute>} />
          <Route path="/problems" element={<ProtectedRoute><Problems /></ProtectedRoute>} />
          <Route path="/profile"  element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/upsolve"  element={<ProtectedRoute><Upsolve /></ProtectedRoute>} />
          <Route path="/skilltree" element={<ProtectedRoute><SkillTree /></ProtectedRoute>} />
          <Route path="/insights"  element={<ProtectedRoute><Insights /></ProtectedRoute>} />
          <Route path="/contesthub" element={<ProtectedRoute><ContestHub /></ProtectedRoute>} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
