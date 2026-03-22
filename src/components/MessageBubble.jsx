import Avatar from './Avatar';

export default function MessageBubble({ message, isOwn }) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isOwn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, padding: '0 8px' }}>
        <div
          style={{
            maxWidth: '85%',
            minWidth: '70px',
            background: 'var(--accent-light)',
            borderRadius: '8px 0px 8px 8px', /* WhatsApp tail effect on own message */
            padding: '6px 7px 8px 9px',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Optional: Add a small SVG tail here if you want an exact WhatsApp replica, 
              but the border-radius trick creates a clean, modern chat bubble look natively. */}
          <div style={{ 
            fontSize: 14.2, 
            lineHeight: 1.3, 
            wordBreak: 'break-word', 
            paddingRight: '40px', /* space for timestamp to float right */
            paddingBottom: '2px'
          }}>
            {message.content}
          </div>
          <div style={{ 
            fontSize: 11, 
            color: 'var(--text-secondary)',
            position: 'absolute',
            bottom: '4px',
            right: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            {time}
            <svg viewBox="0 0 16 15" width="16" height="15">
              <path fill="#53bdeb" d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"></path>
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8, padding: '0 8px' }}>
      <Avatar url={message.avatar_url} username={message.username} size="sm" />
      <div
        style={{
          maxWidth: '85%',
          minWidth: '100px',
          background: 'var(--bubble-other)',
          borderRadius: '0px 8px 8px 8px', /* WhatsApp tail effect on other message */
          padding: '6px 7px 8px 9px',
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: getUsernameColor(message.username) }}>{message.username}</span>
        </div>
        <div style={{ 
          fontSize: 14.2, 
          lineHeight: 1.3, 
          wordBreak: 'break-word',
          paddingRight: '36px',
        }}>
          {message.content}
        </div>
        <div style={{ 
          fontSize: 11, 
          color: 'var(--text-secondary)',
          position: 'absolute',
          bottom: '4px',
          right: '8px',
        }}>
          {time}
        </div>
      </div>
    </div>
  );
}

// WhatsApp gives each user a deterministic color in group chats
function getUsernameColor(username) {
  const colors = [
    '#35CD96', '#6BCB77', '#FF6B6B', '#4D96FF', 
    '#9D4EDD', '#F9A826', '#FF9F1C', '#E63946',
    '#118AB2', '#06D6A0'
  ];
  if (!username) return colors[0];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
