import { useState } from 'react';
import Avatar from './Avatar';
import { supabase } from '../lib/supabase';
import { CheckCheck, SmilePlus } from 'lucide-react';

export default function MessageBubble({ message, isOwn, isAdmin, onAvatarClick }) {
  const [showReactions, setShowReactions] = useState(false);
  const [reactions, setReactions] = useState([]); // Mock reactions for preview
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleBan = async () => {
    const confirmBan = window.confirm(`Are you sure you want to ban ${message.username}?`);
    if (!confirmBan) return;
    const { error } = await supabase.from('profiles').update({ is_banned: true }).eq('id', message.user_id);
    if (error) alert('Failed to ban: ' + error.message);
  };

  const toggleReaction = (emoji) => {
    setReactions(prev => 
      prev.includes(emoji) ? prev.filter(e => e !== emoji) : [...prev, emoji]
    );
    setShowReactions(false);
  };

  const reactionOptions = ['🔥', '😂', '❤️', '👀', '👍'];

  return (
    <div 
      style={{ 
        display: 'flex', 
        justifyContent: isOwn ? 'flex-end' : 'flex-start', 
        marginBottom: 16, 
        padding: '0 24px',
        position: 'relative'
      }}
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
    >
      {!isOwn && (
        <div style={{ marginRight: 12, marginTop: 4 }}>
          <Avatar 
            url={message.avatar_url} 
            username={message.username} 
            size="sm" 
            onClick={() => onAvatarClick(message)}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', maxWidth: '75%', position: 'relative' }}>
        
        {!isOwn && (
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span onClick={() => onAvatarClick(message)} style={{ cursor: 'pointer', transition: 'color 0.15s' }} onMouseEnter={e => e.target.style.color='var(--color-accent)'} onMouseLeave={e => e.target.style.color='var(--color-text-secondary)'}>
              {message.username}
            </span>
            {isAdmin && (
              <button onClick={handleBan} style={{ background: 'rgba(255,107,107,0.1)', color: '#FF6B6B', border: 'none', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer' }}>
                BAN
              </button>
            )}
          </div>
        )}

        <div
          style={{
            background: isOwn ? 'rgba(0, 212, 255, 0.15)' : 'var(--color-surface)',
            border: `1px solid ${isOwn ? 'rgba(0, 212, 255, 0.3)' : 'var(--color-border)'}`,
            borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            padding: '10px 14px',
            color: 'var(--color-text-primary)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            minWidth: 80,
            backdropFilter: 'blur(16px)',
            position: 'relative',
          }}
        >
          <div style={{ fontSize: 15, lineHeight: 1.4, wordBreak: 'break-word', color: isOwn ? '#fff' : 'var(--color-text-primary)' }}>
            {message.content}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: isOwn ? 'rgba(255,255,255,0.6)' : 'var(--color-text-muted)' }}>{time}</span>
            {isOwn && <CheckCheck size={14} color="var(--color-accent)" strokeWidth={2.5} />}
          </div>
        </div>

        {/* Reaction Chips Below Bubble */}
        {reactions.length > 0 && (
          <div style={{
            display: 'flex', gap: 4, marginTop: -8, zIndex: 2, background: 'var(--color-base)', padding: '2px', borderRadius: 12, border: '1px solid var(--color-border)'
          }}>
            {reactions.map((r, i) => (
               <span key={i} style={{ fontSize: 12, background: 'var(--color-surface)', padding: '2px 6px', borderRadius: 10, cursor: 'pointer' }} onClick={() => toggleReaction(r)}>
                 {r}
               </span>
            ))}
          </div>
        )}

        {/* Hover Emoji Tray */}
        <div style={{
          position: 'absolute',
          [isOwn ? 'right' : 'left']: isOwn ? 'calc(100% + 8px)' : 'calc(100% + 8px)',
          top: 0,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 24,
          padding: '4px',
          display: 'flex',
          gap: 2,
          opacity: showReactions ? 1 : 0,
          visibility: showReactions ? 'visible' : 'hidden',
          transition: 'all 0.2s cubic-bezier(0.19, 1, 0.22, 1)',
          transform: showReactions ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.9)',
          backdropFilter: 'blur(16px)',
          zIndex: 10,
        }}>
          {reactionOptions.map(r => (
            <button key={r} onClick={() => toggleReaction(r)} style={{
              background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer', padding: '4px 8px', borderRadius: '50%', transition: 'transform 0.1s'
            }}
             onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
             onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
