import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Avatar from './Avatar';
import { MessageSquare, Users, LogOut } from 'lucide-react';

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{
      width: 80,
      height: '100dvh',
      background: 'var(--color-base)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 0',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <Link to="/chat" style={{ 
        textDecoration: 'none', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        width: 48,
        height: 48,
        borderRadius: 16,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-accent)',
        marginBottom: 32,
        transition: 'all 0.2s'
      }}>
        <div style={{ fontSize: 24, lineHeight: 1, filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.5))' }}>◈</div>
      </Link>

      {/* Nav Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
        <SidebarLink to="/chat" active={isActive('/chat')} icon={<MessageSquare size={22} />} tooltip="Group Chat" />
        <SidebarLink to="/find" active={isActive('/find')} icon={<Users size={22} />} tooltip="Find Stranger" />
      </div>

      {/* User Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
        <button
          onClick={handleSignOut}
          title="Sign out"
          style={{
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-secondary)',
            background: 'transparent',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#FF6B6B'; e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={20} />
        </button>

        <Avatar url={profile?.avatar_url} username={profile?.username} size="md" isOnline={true} />
      </div>
    </nav>
  );
}

function SidebarLink({ to, active, icon, tooltip }) {
  return (
    <Link
      to={to}
      title={tooltip}
      style={{
        width: 48,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        background: active ? 'var(--color-accent-ghost)' : 'transparent',
        borderRadius: 14,
        textDecoration: 'none',
        transition: 'all 0.2s',
        position: 'relative',
      }}
      className={active ? 'glow-cyan' : ''}
    >
      {active && (
        <div style={{ position: 'absolute', left: -16, width: 4, height: 24, background: 'var(--color-accent)', borderRadius: '0 4px 4px 0' }} />
      )}
      {icon}
    </Link>
  );
}
