import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Sidebar from '../components/Navbar';
import MessageBubble from '../components/MessageBubble';
import { Send, Smile, X, Dice5 } from 'lucide-react';

const TIMEOUT_SECS = 60;

export default function FindStranger() {
  const { session, profile } = useAuth();

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

    await supabase.from('matching_queue').upsert({
      user_id: session.user.id,
      status: 'waiting',
      room_id: null,
    }, { onConflict: 'user_id' });

    searchIntervalRef.current = setInterval(() => {
      setSearchSeconds(s => s + 1);
    }, 1000);

    timeoutRef.current = setTimeout(async () => {
      if (!matchedRef.current) {
        await cleanupSearch();
        setState('idle');
        setTimeoutMsg('No one around right now. Try again in a bit. 🌙');
      }
    }, TIMEOUT_SECS * 1000);

    const queueChannel = supabase.channel(`queue-${session.user.id}`);
    channelRef.current = queueChannel;

    queueChannel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matching_queue', filter: `user_id=eq.${session.user.id}` }, async (payload) => {
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
      .subscribe(async () => await tryMatch());
  };

  const tryMatch = async () => {
    const { data: peers } = await supabase
      .from('matching_queue')
      .select('user_id')
      .eq('status', 'waiting')
      .neq('user_id', session.user.id)
      .limit(1);

    if (!peers || peers.length === 0) return;

    const peerId = peers[0].user_id;
    const newRoomId = crypto.randomUUID();

    await supabase.from('matching_queue').update({ status: 'matched', room_id: newRoomId }).eq('user_id', peerId).eq('status', 'waiting');
    await supabase.from('matching_queue').update({ status: 'matched', room_id: newRoomId }).eq('user_id', session.user.id);
  };

  const enterChat = (rid) => {
    setRoomId(rid);
    setMessages([]);
    setState('matched');

    const pmChannel = supabase.channel(`room-${rid}`);
    channelRef.current = pmChannel;

    pmChannel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages', filter: `room_id=eq.${rid}` }, (payload) => {
        setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
      })
      .subscribe();
  };

  const leaveChat = async () => {
    if (channelRef.current) { await channelRef.current.unsubscribe(); channelRef.current = null; }
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
    setSending(true); setInput('');
    await supabase.from('private_messages').insert({ room_id: roomId, user_id: session.user.id, username: profile.username, avatar_url: profile.avatar_url, content: text });
    setSending(false);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPrivate(); } };

  useEffect(() => () => cleanupSearch(), []);

  // Shared Layout Wrapper
  const Layout = ({ children }) => (
    <div style={{ display: 'flex', width: '100%', minHeight: '100dvh', background: 'var(--color-base)' }}>
      <Sidebar />
      <div style={{ marginLeft: 80, display: 'flex', flex: 1, flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );

  if (state === 'idle') {
    return (
      <Layout>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="glass-panel slide-in" style={{ padding: '60px 48px', borderRadius: 24, textAlign: 'center', maxWidth: 460, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: 'var(--color-accent-ghost)', border: '1px solid rgba(0,212,255,0.3)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 20px rgba(0, 212, 255, 0.2)' }}>
               <Dice5 size={40} />
            </div>
            <h1 className="text-gradient" style={{ fontSize: 28, fontWeight: 700, margin: '0 0 12px' }}>Stranger Match</h1>
            <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: 40 }}>
              Get miraculously paired with a random person from the community for a private, anonymous 1-on-1 chat. 
            </p>

            {timeoutMsg && (
              <div style={{ fontSize: 13, color: '#FF9F1C', background: 'rgba(255, 159, 28, 0.1)', border: '1px solid rgba(255, 159, 28, 0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 24 }}>
                {timeoutMsg}
              </div>
            )}

            <button
              onClick={startSearch}
              style={{
                width: '100%', padding: '16px 24px', background: 'var(--color-accent)', color: '#000', border: 'none', borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 0 15px rgba(0, 212, 255, 0.4)'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Find a Stranger
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (state === 'searching') {
    return (
      <Layout>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="glass-panel" style={{ padding: '48px', borderRadius: 24, textAlign: 'center', maxWidth: 400, border: '1px solid rgba(124, 92, 252, 0.3)', boxShadow: '0 0 40px rgba(124, 92, 252, 0.15)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid var(--color-surface)', borderTopColor: 'var(--color-secondary)', animation: 'spin 1s linear infinite', margin: '0 auto 24px' }} />
            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>Scanning for peers...</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 32 }}>{searchSeconds}s elapsed · timeout in {TIMEOUT_SECS - searchSeconds}s</p>
            
            <button
              onClick={cancelSearch}
              style={{ width: '100%', padding: '14px 24px', background: 'transparent', color: '#FF6B6B', border: '1px solid #FF6B6B', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,107,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Cancel Search
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </Layout>
    );
  }

  // Matched
  return (
    <Layout>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', width: '100%', maxWidth: 900, margin: '0 auto' }}>
        
        {/* Header */}
        <div className="glass-panel" style={{ height: 76, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
             <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--color-surface)', border: '1px solid rgba(124, 92, 252, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-secondary)', boxShadow: '0 0 10px rgba(124, 92, 252, 0.2)' }}>
                <Dice5 size={24} />
             </div>
             <div>
               <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>Your Match</h2>
               <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                 <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff5cfc', boxShadow: '0 0 8px #ff5cfc' }} />
                 <span style={{ fontSize: 13, color: '#ff5cfc' }}>Connected Securely</span>
               </div>
             </div>
          </div>
          <button onClick={leaveChat} style={{ background: 'rgba(255,107,107,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,107,107,0.2)', borderRadius: 12, padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,107,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,107,107,0.1)'}>
            Disconnect
          </button>
        </div>

        {/* Messages */}
        <div className="hide-scrollbar" style={{ flex: 1, padding: '24px 0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }} />
          {messages.length === 0 && (
             <div style={{ textAlign: 'center', margin: 'auto', opacity: 0.5, maxWidth: 300 }}>
                <div style={{ background: 'var(--color-surface)', padding: 16, borderRadius: 20, border: '1px solid var(--color-border)' }}>
                   <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-primary)' }}>You're connected! Say hello. 🍻</p>
                </div>
             </div>
          )}
          {messages.map((msg, i) => (
             <MessageBubble key={msg.id || i} message={msg} isOwn={msg.user_id === session?.user?.id} onAvatarClick={() => {}} />
          ))}
          <div ref={bottomRef} style={{ height: 20 }} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '20px 24px', background: 'var(--color-base)', borderTop: '1px solid var(--color-border)' }}>
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'flex-end', gap: 12, padding: '12px', borderRadius: 24, border: '1px solid rgba(255,255,255,0.1)' }}>
            <button title="Emojis" style={{ width: 44, height: 44, borderRadius: '50%', background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s', flexShrink: 0 }} onMouseEnter={e => e.currentTarget.style.color = 'var(--color-accent)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}>
              <Smile size={24} />
            </button>
            <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={sending} placeholder="Type a message..." rows={1} style={{ flex: 1, padding: '12px 0 12px 4px', fontSize: 16, color: '#fff', background: 'transparent', border: 'none', resize: 'none', outline: 'none', minHeight: 44, maxHeight: 120, fontFamily: 'var(--font-body)', opacity: sending ? 0.5 : 1 }} />
            <button onClick={sendPrivate} disabled={sending || !input.trim()} style={{ width: 48, height: 48, borderRadius: '50%', background: sending || !input.trim() ? 'var(--color-surface)' : 'var(--color-accent)', color: sending || !input.trim() ? 'rgba(255,255,255,0.3)' : '#000', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: sending || !input.trim() ? 'none' : '0 0 15px rgba(0, 212, 255, 0.5)', flexShrink: 0 }} onMouseEnter={e => { if(!sending && input.trim()) e.currentTarget.style.transform = 'scale(1.05)'; }} onMouseLeave={e => { if(!sending && input.trim()) e.currentTarget.style.transform = 'scale(1)'; }}>
              <Send size={20} style={{ marginLeft: 3, marginTop: 2 }} />
            </button>
          </div>
        </div>

      </div>
    </Layout>
  );
}
