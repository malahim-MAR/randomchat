import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginMock } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password || !username) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);

    // Use mock login
    setTimeout(async () => {
      await loginMock(email, username);
      navigate('/chat');
      setLoading(false);
    }, 500);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div className="glass-panel slide-in" style={{
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        padding: '48px 40px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ 
            fontSize: 28, 
            lineHeight: 1, 
            color: 'var(--color-accent)', 
            marginBottom: 16,
            filter: 'drop-shadow(0 0 10px rgba(0,212,255,0.5))'
          }}>
            ◈
          </div>
          <h1 className="text-gradient" style={{ fontSize: 26, fontWeight: 700, margin: '0 0 8px' }}>
            StrangerChat
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
            Enter the void.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="choose a handle"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
            />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
            />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: '#FF6B6B', background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.3)', borderRadius: 12, padding: '12px 16px', marginTop: 8 }}>
              {error}
            </div>
          )}

          <button
             type="submit"
             disabled={loading}
             style={{
               width: '100%',
               padding: '14px 16px',
               background: loading ? 'var(--color-surface)' : 'var(--color-accent)',
               color: loading ? 'rgba(255,255,255,0.5)' : '#000',
               border: 'none',
               borderRadius: 14,
               fontSize: 16,
               fontWeight: 700,
               cursor: loading ? 'not-allowed' : 'pointer',
               fontFamily: 'inherit',
               transition: 'all 0.2s',
               boxShadow: loading ? 'none' : '0 0 15px rgba(0, 212, 255, 0.4)',
               marginTop: 12,
             }}
             onMouseEnter={e => { if(!loading) e.currentTarget.style.transform = 'scale(1.02)'; }}
             onMouseLeave={e => { if(!loading) e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {loading ? 'Authenticating...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = { 
  fontSize: 13, 
  fontWeight: 600, 
  color: 'var(--color-text-secondary)', 
  display: 'block', 
  marginBottom: 8,
  fontFamily: 'var(--font-display)' 
};

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  fontSize: 15,
  color: '#fff',
  background: 'rgba(0,0,0,0.2)',
  border: '1px solid var(--color-border)',
  borderRadius: 14,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};
