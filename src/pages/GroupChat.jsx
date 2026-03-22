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
    <div className="page-wrapper">
      <Navbar />
      
      <div className="chat-wrapper">
        <div className="chat-container">
          <div className="chat-bg" />

          {/* Header */}
          <div style={{
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            borderBottom: '1px solid var(--border)',
            zIndex: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ 
                width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--accent)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20
              }}>
                🌍
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Global Lobby</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {onlineCount} {onlineCount === 1 ? 'participant' : 'participants'} online
                </p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="hide-scrollbar" style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1,
          }}>
            {messages.length === 0 && (
              <div style={{ 
                alignSelf: 'center', 
                background: '#FFF3CD', 
                color: '#856404', 
                padding: '8px 16px', 
                borderRadius: 8, 
                fontSize: 13,
                marginTop: 20,
                boxShadow: 'var(--shadow)',
                fontWeight: 500
              }}>
                🔒 Messages are public. Be kind and say hello!
              </div>
            )}
            {messages.map((msg, i) => {
              const isOwn = msg.user_id === session?.user?.id;
              return <MessageBubble key={msg.id || i} message={msg} isOwn={isOwn} />;
            })}
            <div ref={bottomRef} style={{ float: "left", clear: "both", paddingBottom: 10 }} />
          </div>

          {/* Input Area */}
          <div style={{ 
            padding: '12px 16px', 
            background: '#F0F2F5', 
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            borderTop: '1px solid var(--border)'
          }}>
            {/* Cooldown progress bar */}
            <div style={{
              height: 3,
              background: 'rgba(0,0,0,0.05)',
              borderRadius: 3,
              overflow: 'hidden',
              marginBottom: 4,
            }}>
              <div style={{
                height: '100%',
                width: `${cooldownProgress}%`,
                background: cooldown > 0 ? 'var(--accent)' : 'transparent',
                borderRadius: 3,
                transition: cooldown > 0 ? 'width 1s linear' : 'none',
              }} />
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isDisabled}
                  placeholder={cooldown > 0 ? `Wait ${cooldown}s...` : 'Type a message'}
                  rows={1}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    fontSize: 15,
                    color: 'var(--text-primary)',
                    background: isDisabled ? '#E9EDEF' : '#FFFFFF',
                    border: 'none',
                    borderRadius: 24,
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'none',
                    minHeight: 48,
                    maxHeight: 120,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                />
              </div>
              
              <button
                onClick={sendMessage}
                disabled={isDisabled || !input.trim()}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: isDisabled || !input.trim() ? '#A0B8F5' : 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isDisabled || !input.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s, transform 0.1s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  flexShrink: 0
                }}
              >
                {cooldown > 0 ? (
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{cooldown}s</span>
                ) : (
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" style={{ marginLeft: -2, marginTop: 2 }}>
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
