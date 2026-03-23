import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import GroupChat from './pages/GroupChat';
import FindStranger from './pages/FindStranger';

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
      </Router>
    </AuthProvider>
  );
}

export default App;
