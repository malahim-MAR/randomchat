import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import MessageBubble from '../components/MessageBubble';

const TIMEOUT_SECS = 60;

export default function FindStranger() {
  const { session, profile } = useAuth();

  // States: 'idle' | 'searching' | 'matched'
  const [state, setState] = useState('idle');
  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [timeoutMsg, setTimeoutMsg] = useState('');
  const [searchSeconds, setSearchSeconds] = useState(0);

  const channelRef = useRef(null);
  const searchIntervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const bottomRef = useRef(null);
  const matchedRef = useRef(false);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const cleanupSearch = async () => {
    clearInterval(searchIntervalRef.current);
    clearTimeout(timeoutRef.current);
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    // Remove from queue
    if (session?.user) {
      await supabase.from('matching_queue').delete().eq('user_id', session.user.id);
    }
  };

  const startSearch = async () => {
    if (!profile) return;
    setTimeoutMsg('');
    matchedRef.current = false;
    setSearchSeconds(0);
    setState('searching');

    // Upsert into queue
    await supabase.from('matching_queue').upsert({
      user_id: session.user.id,
      status: 'waiting',
      room_id: null,
    }, { onConflict: 'user_id' });

    // Search countdown
    searchIntervalRef.current = setInterval(() => {
      setSearchSeconds(s => s + 1);
    }, 1000);

    // 60s timeout
    timeoutRef.current = setTimeout(async () => {
      if (!matchedRef.current) {
        await cleanupSearch();
        setState('idle');
        setTimeoutMsg('No one around right now. Try again in a bit. 🌙');
      }
    }, TIMEOUT_SECS * 1000);

    // Subscribe to own queue row for match
    const queueChannel = supabase.channel(`queue-${session.user.id}`);
    channelRef.current = queueChannel;

    queueChannel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matching_queue',
        filter: `user_id=eq.${session.user.id}`,
      }, async (payload) => {
        if (payload?.new?.status === 'matched' && payload?.new?.room_id) {
          matchedRef.current = true;
          clearInterval(searchIntervalRef.current);
          clearTimeout(timeoutRef.current);
          await queueChannel.unsubscribe();
          channelRef.current = null;
          enterChat(payload.new.room_id);
          return;
        }
      })
      .subscribe(async () => {
        // After subscribing, try to find a waiting peer and match
        await tryMatch();
      });
  };

  const tryMatch = async () => {
    // Find another waiting user (not ourselves)
    const { data: peers } = await supabase
      .from('matching_queue')
      .select('user_id')
      .eq('status', 'waiting')
      .neq('user_id', session.user.id)
      .limit(1);

    if (!peers || peers.length === 0) return;

    const peerId = peers[0].user_id;
    const newRoomId = crypto.randomUUID();

    // Update both rows (race condition: only one client will "win" fully, both will see matched)
    await supabase.from('matching_queue').update({ status: 'matched', room_id: newRoomId }).eq('user_id', peerId).eq('status', 'waiting');
    await supabase.from('matching_queue').update({ status: 'matched', room_id: newRoomId }).eq('user_id', session.user.id);
    // The realtime listener will pick up our own update and call enterChat
  };

  const enterChat = (rid) => {
    setRoomId(rid);
    setMessages([]);
    setState('matched');

    // Subscribe to private_messages for this room
    const pmChannel = supabase.channel(`room-${rid}`);
    channelRef.current = pmChannel;

    pmChannel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'private_messages',
        filter: `room_id=eq.${rid}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .subscribe();
  };

  const leaveChat = async () => {
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    await supabase.from('matching_queue').delete().eq('user_id', session.user.id);
    setRoomId(null);
    setMessages([]);
    setState('idle');
    setTimeoutMsg('');
  };

  const cancelSearch = async () => {
    await cleanupSearch();
    setState('idle');
    setTimeoutMsg('');
  };

  const sendPrivate = async () => {
    const text = input.trim();
    if (!text || sending || !profile || !roomId) return;

    setSending(true);
    setInput('');

    await supabase.from('private_messages').insert({
      room_id: roomId,
      user_id: session.user.id,
      username: profile.username,
      avatar_url: profile.avatar_url,
      content: text,
    });

    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendPrivate();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupSearch();
    };
  }, []);

  if (state === 'idle') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Navbar />
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 20,
          background: 'var(--bg)',
        }}>
          <div style={{ 
            textAlign: 'center', 
            maxWidth: 380,
            background: 'var(--surface)',
            padding: '40px',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-md)',
          }}>
            <div style={{ fontSize: 52, marginBottom: 20, lineHeight: 1 }}>🎲</div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Stranger Match
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28 }}>
              Get paired with a random person for a private 1-on-1 chat.
            </p>

            {timeoutMsg && (
              <div style={{
                fontSize: 13,
                color: '#fff',
                background: '#4DB6A4',
                borderRadius: 10,
                padding: '10px 16px',
                marginBottom: 20,
              }}>
                {timeoutMsg}
              </div>
            )}

            <button
              onClick={startSearch}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s',
                boxShadow: 'var(--shadow-md)'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
            >
              Find a Stranger
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'searching') {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Navbar />
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          padding: 24,
          background: 'var(--bg)',
        }}>
          <Spinner />
          <div style={{ 
            textAlign: 'center',
            background: 'var(--surface)',
            padding: '24px 40px',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-md)', 
          }}>
            <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Looking for someone…
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              {searchSeconds}s elapsed · timeout in {TIMEOUT_SECS - searchSeconds}s
            </p>
            <button
              onClick={cancelSearch}
              style={{
                width: '100%',
                padding: '10px 20px',
                background: 'transparent',
                color: '#E63946',
                border: '1px solid #E63946',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              Cancel Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Matched — private chat
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
                width: 44, height: 44, borderRadius: '50%', backgroundColor: '#6C7EE1', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20
              }}>
                😎
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Stranger</h2>
                <p style={{ fontSize: 13, color: 'var(--accent)' }}>Online</p>
              </div>
            </div>
            <button
              onClick={leaveChat}
              style={{
                padding: '8px 16px',
                background: '#FFEBEB',
                color: '#E63946',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#ffdada'}
              onMouseLeave={e => e.currentTarget.style.background = '#FFEBEB'}
            >
              Leave
            </button>
          </div>

          {/* Messages */}
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
                fontWeight: 500,
                textAlign: 'center'
              }}>
                🔒 You're connected! Say hello.
              </div>
            )}
            {messages.map((msg, i) => {
              const isOwn = msg.user_id === session?.user?.id;
              return <MessageBubble key={msg.id || i} message={msg} isOwn={isOwn} isAdmin={profile?.is_admin} />;
            })}
            <div ref={bottomRef} style={{ float: "left", clear: "both", paddingBottom: 10 }} />
          </div>

          {/* Input */}
          <div style={{ 
            padding: '12px 16px', 
            background: '#F0F2F5', 
            zIndex: 10,
            display: 'flex',
            flexDirection: 'row',
            gap: 10,
            alignItems: 'flex-end',
            borderTop: '1px solid var(--border)'
          }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              placeholder="Type a message"
              rows={1}
              style={{
                flex: 1,
                padding: '14px 20px',
                fontSize: 15,
                color: 'var(--text-primary)',
                background: '#FFFFFF',
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
            <button
              onClick={sendPrivate}
              disabled={sending || !input.trim()}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: sending || !input.trim() ? '#A0B8F5' : 'var(--accent)',
                color: '#fff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s, transform 0.1s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                flexShrink: 0
              }}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" style={{ marginLeft: -2, marginTop: 2 }}>
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

}

function Spinner() {
  return (
    <div style={{
      width: 44,
      height: 44,
      border: '3px solid var(--border)',
      borderTop: '3px solid var(--accent)',
      borderRadius: '50%',
      animation: 'spin 0.85s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
