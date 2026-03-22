import Avatar from './Avatar';

export default function MessageBubble({ message, isOwn }) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isOwn) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <div style={{ maxWidth: '72%' }}>
          <div
            style={{
              background: 'var(--accent-light)',
              border: '1px solid #D4E2FC',
              borderRadius: '16px 4px 16px 16px',
              padding: '10px 14px',
              fontSize: 14,
              color: 'var(--text-primary)',
              lineHeight: 1.5,
              wordBreak: 'break-word',
            }}
          >
            {message.content}
          </div>
          <div style={{ textAlign: 'right', marginTop: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
            {time}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
      <Avatar url={message.avatar_url} username={message.username} size="sm" />
      <div style={{ maxWidth: '72%' }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 3 }}>
          {message.username}
        </div>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '4px 16px 16px 16px',
            padding: '10px 14px',
            fontSize: 14,
            color: 'var(--text-primary)',
            lineHeight: 1.5,
            wordBreak: 'break-word',
            boxShadow: 'var(--shadow)',
          }}
        >
          {message.content}
        </div>
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
          {time}
        </div>
      </div>
    </div>
  );
}
