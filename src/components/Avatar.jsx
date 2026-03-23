import { clsx } from 'clsx';

export default function Avatar({ url, username, size = 'md', isOnline = false, onClick, style = {} }) {
  const sizes = {
    sm: { outer: 32, font: 12, status: 8, offset: 0 },
    md: { outer: 48, font: 16, status: 12, offset: 2 },
    lg: { outer: 80, font: 28, status: 16, offset: 4 },
  };
  const { outer, font, status, offset } = sizes[size] || sizes.md;

  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : '?';

  // Deterministic color from username
  const colors = [
    '#00d4ff', '#7c5cfc', '#ff5cfc', '#5cfc8a',
    '#fca15c', '#fc5c5c', '#5ca2fc', '#fcdd5c'
  ];
  const colorIndex = username
    ? username.charCodeAt(0) % colors.length
    : 0;
  const bgColor = colors[colorIndex];
  
  // Mix color with a tiny bit of opacity to feel glassy
  const gradient = `linear-gradient(135deg, ${bgColor}CC, ${bgColor}88)`;

  return (
    <div
      onClick={onClick}
      style={{
        width: outer,
        height: outer,
        borderRadius: '50%',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        flexShrink: 0,
        ...style
      }}
    >
      {url ? (
        <img
          src={url}
          alt={username}
          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: gradient,
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: font,
            fontWeight: 700,
            fontFamily: 'var(--font-display)',
            boxShadow: `inset 0 2px 10px rgba(255,255,255,0.2), 0 4px 12px ${bgColor}40`
          }}
        >
          {initials}
        </div>
      )}

      {isOnline && (
        <div
          style={{
            position: 'absolute',
            bottom: offset,
            right: offset,
            width: status,
            height: status,
            backgroundColor: '#00d4ff',
            border: '2px solid var(--color-base)',
            borderRadius: '50%',
            boxShadow: '0 0 8px rgba(0, 212, 255, 0.8)'
          }}
        />
      )}
    </div>
  );
}
