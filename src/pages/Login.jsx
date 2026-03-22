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
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '40px 36px',
        boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>◉</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            StrangerChat
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Join the conversation.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="choose a handle"
              style={inputStyle}
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
            />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: '#E05252', background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: 8, padding: '8px 12px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px 16px',
              background: loading ? '#A0B8F5' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
              marginTop: 4,
            }}
          >
            {loading ? 'Joining...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = { 
  fontSize: 12, 
  fontWeight: 500, 
  color: 'var(--text-secondary)', 
  display: 'block', 
  marginBottom: 6 
};

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  fontSize: 14,
  color: 'var(--text-primary)',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontFamily: 'inherit',
  outline: 'none',
  transition: 'border-color 0.15s',
};
