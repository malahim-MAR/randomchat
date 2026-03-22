import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing session
    const saved = localStorage.getItem('strangerchat_mock_user');
    if (saved) {
      const { email, username, id } = JSON.parse(saved);
      setSession({ user: { id, email } });
      setProfile({ id, username, avatar_url: null });
    }
    setLoading(false);
  }, []);

  const loginMock = async (email, username) => {
    const id = crypto.randomUUID();
    const mockUser = { id, email, username };
    
    // Ensure the profile exists in the DB so messages can be sent
    await supabase.from('profiles').upsert(mockUser, { onConflict: 'id' });
    
    localStorage.setItem('strangerchat_mock_user', JSON.stringify(mockUser));
    setSession({ user: { id, email } });
    setProfile({ id, username, avatar_url: null });
  };

  const signOut = () => {
    localStorage.removeItem('strangerchat_mock_user');
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => profile;

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, refreshProfile, loginMock }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
