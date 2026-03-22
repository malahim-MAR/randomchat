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
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 20,
        }}>
          <div style={{ textAlign: 'center', maxWidth: 380 }}>
            <div style={{ fontSize: 52, marginBottom: 20, lineHeight: 1 }}>🎲</div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Find a Stranger
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28 }}>
              Get matched with a random person for a private one-on-one conversation. Say hi, talk about anything.
            </p>

            {timeoutMsg && (
              <div style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '10px 16px',
                marginBottom: 20,
              }}>
                {timeoutMsg}
              </div>
            )}

            <button
              id="find-stranger-btn"
              onClick={startSearch}
              style={{
                padding: '13px 32px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
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
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          padding: 24,
        }}>
          <Spinner />
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
              Looking for someone…
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {searchSeconds}s elapsed · timeout in {TIMEOUT_SECS - searchSeconds}s
            </p>
          </div>
          <button
            id="cancel-search-btn"
            onClick={cancelSearch}
            style={{
              padding: '8px 20px',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Matched — private chat
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
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
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
              💬 Chatting with a Stranger
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Private conversation</p>
          </div>
          <button
            id="leave-chat-btn"
            onClick={leaveChat}
            style={{
              padding: '6px 14px',
              background: 'transparent',
              color: '#E05252',
              border: '1px solid #FFCDD2',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            Leave
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 0',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 220px)',
        }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, paddingTop: 48 }}>
              ✨ You're connected! Say hello.
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

        {/* Input */}
        <div style={{ paddingBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              id="private-chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              placeholder="Type a message…"
              rows={1}
              style={{
                flex: 1,
                padding: '11px 14px',
                fontSize: 14,
                color: 'var(--text-primary)',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'none',
                lineHeight: 1.5,
              }}
            />
            <button
              id="send-private-btn"
              onClick={sendPrivate}
              disabled={sending || !input.trim()}
              style={{
                padding: '11px 18px',
                background: sending || !input.trim() ? '#A0B8F5' : 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 500,
                cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
            >
              Send
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
