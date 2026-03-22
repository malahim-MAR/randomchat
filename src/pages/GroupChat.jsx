import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import MessageBubble from '../components/MessageBubble';

const COOLDOWN = 10;

export default function GroupChat() {
  const { session, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [onlineCount, setOnlineCount] = useState(1);
  const bottomRef = useRef(null);
  const cooldownInterval = useRef(null);
  const channelRef = useRef(null);

  // Load last 50 messages
  useEffect(() => {
    supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) setMessages(data);
      });
  }, []);

  // Realtime messages + Presence
  useEffect(() => {
    if (!profile) return;

    const channel = supabase.channel('group-chat', {
      config: { presence: { key: session.user.id } },
    });

    channelRef.current = channel;

    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        setMessages(prev => {
          // avoid duplicate if already added optimistically
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ username: profile.username });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [profile, session]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cooldown timer
  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN);
    cooldownInterval.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownInterval.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => clearInterval(cooldownInterval.current), []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending || cooldown > 0 || !profile) return;

    setSending(true);
    setInput('');

    const { error } = await supabase.from('messages').insert({
      user_id: session.user.id,
      username: profile.username,
      avatar_url: profile.avatar_url,
      content: text,
    });

    if (error) {
      console.error(error);
      alert('Send failed: ' + error.message);
    }

    setSending(false);
    if (!error) startCooldown();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const cooldownProgress = cooldown > 0 ? ((COOLDOWN - cooldown) / COOLDOWN) * 100 : 100;
  const isDisabled = sending || cooldown > 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 720, width: '100%', margin: '0 auto', padding: '0 16px' }}>
        {/* Header */}
        <div style={{
          padding: '16px 0 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Group Chat</h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Open to everyone</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4DB89E', display: 'inline-block' }} />
            <span>{onlineCount} online</span>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 0',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          maxHeight: 'calc(100vh - 220px)',
        }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, paddingTop: 48 }}>
              No messages yet. Say hello! 👋
            </div>
          )}
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.user_id === session?.user?.id}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{ paddingBottom: 20 }}>
          {/* Cooldown progress bar */}
          <div style={{
            height: 2,
            background: 'var(--border)',
            borderRadius: 2,
            marginBottom: 8,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${cooldownProgress}%`,
              background: cooldown > 0 ? 'var(--accent)' : 'transparent',
              borderRadius: 2,
              transition: cooldown > 0 ? 'width 1s linear' : 'none',
            }} />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                id="group-chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isDisabled}
                placeholder={cooldown > 0 ? `Wait ${cooldown}s before sending...` : 'Type a message…'}
                rows={1}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  background: isDisabled ? '#F9FAFC' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'none',
                  lineHeight: 1.5,
                  transition: 'border-color 0.15s',
                  opacity: isDisabled ? 0.7 : 1,
                }}
              />
            </div>
            <button
              id="send-message-btn"
              onClick={sendMessage}
              disabled={isDisabled || !input.trim()}
              style={{
                padding: '11px 18px',
                background: isDisabled || !input.trim() ? '#A0B8F5' : 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 500,
                cursor: isDisabled || !input.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s',
              }}
            >
              {cooldown > 0 ? `${cooldown}s` : 'Send'}
            </button>
          </div>
          {cooldown > 0 && (
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, textAlign: 'center' }}>
              Cooldown active — {cooldown} second{cooldown !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
