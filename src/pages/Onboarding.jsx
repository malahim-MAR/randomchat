import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function Onboarding() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { session, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || loading) return;
    setError('');
    setLoading(true);

    try {
      const cleaned = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (cleaned.length < 3) {
        throw new Error('Username must be at least 3 characters.');
      }

      const { error: insertError } = await supabase.from('profiles').upsert({
        id: session.user.id,
        username: cleaned,
        avatar_url: session.user.user_metadata?.avatar_url || null,
      }, { onConflict: 'id' });

      if (insertError) throw insertError;

      // Force a profile refresh and wait for it
      await refreshProfile();
      
      // Navigate to chat
      navigate('/chat', { replace: true });
    } catch (err) {
      console.error("Onboarding error:", err);
      setError(err.message.includes('unique') ? 'That username is taken. Try another.' : err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '40px 36px',
        boxShadow: 'var(--shadow-md)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>👋</div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          Choose a username
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>
          This is how others will see you in chat.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            id="username-input"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="e.g. cool_wanderer"
            autoFocus
            maxLength={24}
            style={{
              width: '100%',
              padding: '11px 14px',
              fontSize: 15,
              color: 'var(--text-primary)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              fontFamily: 'inherit',
              outline: 'none',
              textAlign: 'center',
              letterSpacing: '0.5px',
            }}
          />

          {error && (
            <div style={{ fontSize: 13, color: '#E05252', background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: 8, padding: '8px 12px' }}>
              {error}
            </div>
          )}

          <button
            id="confirm-username"
            type="submit"
            disabled={loading || !username.trim()}
            style={{
              padding: '11px',
              background: !username.trim() || loading ? '#A0B8F5' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: !username.trim() || loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Setting up...' : 'Get Started →'}
          </button>
        </form>
      </div>
    </div>
  );
}
