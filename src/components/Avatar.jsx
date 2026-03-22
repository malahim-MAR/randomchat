import { clsx } from 'clsx';

export default function Avatar({ url, username, size = 'md' }) {
  const sizes = {
    sm: { outer: 28, font: 11 },
    md: { outer: 36, font: 14 },
    lg: { outer: 48, font: 18 },
  };
  const { outer, font } = sizes[size] || sizes.md;

  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : '?';

  // Deterministic color from username
  const colors = [
    '#5B8DEF', '#6C7EE1', '#8B7EDE', '#A06DCA',
    '#5BA4C8', '#4DB6A4', '#6BAE7A', '#E0835A',
  ];
  const colorIndex = username
    ? username.charCodeAt(0) % colors.length
    : 0;
  const bgColor = colors[colorIndex];

  if (url) {
    return (
      <img
        src={url}
        alt={username}
        style={{ width: outer, height: outer, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }

  return (
    <div
      style={{
        width: outer,
        height: outer,
        borderRadius: '50%',
        background: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: font,
        fontWeight: 600,
        flexShrink: 0,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {initials}
    </div>
  );
}
