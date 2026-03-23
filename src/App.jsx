import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import GroupChat from './pages/GroupChat';
import FindStranger from './pages/FindStranger';
import { LogOut } from 'lucide-react';

// Global Floating Sign Out Button
function GlobalSignOutButton() {
  const { session, signOut } = useAuth();
  
  // Don't show if not logged in
  if (!session) return null;

  return (
    <button
      onClick={() => {
        if(window.confirm('Are you sure you want to log out from this session?')) {
          signOut();
          window.location.href = '/login';
        }
      }}
      title="Global Sign Out"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '50%',
        width: 52,
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FF6B6B',
        cursor: 'pointer',
        boxShadow: '0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(16px)',
        transition: 'all 0.2s cubic-bezier(0.19, 1, 0.22, 1)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'scale(1.1) translateY(-4px)';
        e.currentTarget.style.background = 'var(--color-surface-hover)';
        e.currentTarget.style.borderColor = 'rgba(255, 107, 107, 0.4)';
        e.currentTarget.style.boxShadow = '0 16px 48px rgba(255,107,107,0.2)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1) translateY(0)';
        e.currentTarget.style.background = 'var(--color-surface)';
        e.currentTarget.style.borderColor = 'var(--color-border)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)';
      }}
    >
      <LogOut size={22} style={{ marginLeft: -2 }} />
    </button>
  );
}

// Auth Guard — checks mock session and profile completeness
function ProtectedRoute({ children, allowIncomplete = false }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!session) return <Navigate to="/login" replace />;
  
  if (profile?.is_banned) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#E05252' }}>
        <h2>Access Denied</h2>
        <p>You have been banned from StrangerChat.</p>
      </div>
    );
  }

  const isComplete = profile?.username && profile?.gender && profile?.community && profile?.country;
  if (!isComplete && !allowIncomplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

// Redirect root
function RootRedirect() {
  const { session, profile, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  
  const isComplete = profile?.username && profile?.gender && profile?.community && profile?.country;
  if (!isComplete) return <Navigate to="/onboarding" replace />;
  
  return <Navigate to="/chat" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<ProtectedRoute allowIncomplete={true}><Onboarding /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><GroupChat /></ProtectedRoute>} />
      <Route path="/find" element={<ProtectedRoute><FindStranger /></ProtectedRoute>} />
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <GlobalSignOutButton />
      </Router>
    </AuthProvider>
  );
}

export default App;
