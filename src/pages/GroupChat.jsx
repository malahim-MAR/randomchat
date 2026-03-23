import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import Sidebar from '../components/Navbar';
import MessageBubble from '../components/MessageBubble';
import Avatar from '../components/Avatar';
import { Send, Smile, Globe2, MapPin, Transgender, Users, Hash, X } from 'lucide-react';

const COOLDOWN = 10;

export default function GroupChat() {
  const { session, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [onlineCount, setOnlineCount] = useState(1);
  const [activeTab, setActiveTab] = useState('intl');
  
  // Typing state
  const [isTyping, setIsTyping] = useState(false);
  
  // Profile Modal State
  const [selectedUser, setSelectedUser] = useState(null);

  const bottomRef = useRef(null);
  const cooldownInterval = useRef(null);
  const channelRef = useRef(null);

  const getRoomSlug = () => {
    if (!profile) return 'intl-straight';
    switch (activeTab) {
      case 'intl': return `intl-${profile.community}`;
      case 'country': return `country-${profile.country}-${profile.community}`;
      case 'gender': return `gender-${profile.gender}`;
      default: return `intl-${profile.community}`;
    }
  };

  const activeRoomSlug = getRoomSlug();

  // Load old messages
  useEffect(() => {
    setMessages([]);
    supabase
      .from('messages')
      .select('*')
      .eq('room_slug', activeRoomSlug)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) setMessages(data);
      });
  }, [activeRoomSlug]);

  // Realtime
  useEffect(() => {
    if (!profile) return;
    const channel = supabase.channel(`room-${activeRoomSlug}`, {
      config: { presence: { key: session.user.id } },
    });
    channelRef.current = channel;

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_slug=eq.${activeRoomSlug}` }, (payload) => {
        setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ username: profile.username });
      });

    return () => channel.unsubscribe();
  }, [profile, session, activeRoomSlug]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN);
    cooldownInterval.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownInterval.current); return 0; }
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
    setIsTyping(false);

    const { error } = await supabase.from('messages').insert({
      user_id: session.user.id,
      username: profile.username,
      avatar_url: profile.avatar_url,
      content: text,
      room_slug: activeRoomSlug,
    });

    if (error) alert('Send failed: ' + error.message);
    setSending(false);
    if (!error) startCooldown();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    // Fake typing indicator for demo purposes
    if (e.target.value.length > 0 && !isTyping) {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 2000);
    }
  };

  const cooldownProgress = cooldown > 0 ? ((COOLDOWN - cooldown) / COOLDOWN) * 100 : 100;
  const isDisabled = sending || cooldown > 0;

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100dvh', background: 'var(--color-base)' }}>
      <Sidebar />
      
      {/* Content Wrapper (minus 80px sidebar width) */}
      <div style={{ marginLeft: 80, display: 'flex', flex: 1 }}>
        
        {/* ROOM LIST PANEL */}
        <div style={{ 
          width: 300, 
          borderRight: '1px solid var(--color-border)', 
          background: 'var(--color-base)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10
        }}>
          <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }} className="text-gradient">Rooms</h2>
          </div>
          <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <RoomCard 
               title="Global International" 
               subtitle={`${profile?.community || 'community'} lounge`} 
               icon={<Globe2 size={20} />} 
               active={activeTab === 'intl'} 
               onClick={() => setActiveTab('intl')} 
            />
            <RoomCard 
               title={`${profile?.country || 'Local'} Regional `} 
               subtitle="Connect with locals" 
               icon={<MapPin size={20} />} 
               active={activeTab === 'country'} 
               onClick={() => setActiveTab('country')} 
            />
            <RoomCard 
               title={`${profile?.gender || 'Gender'} Lounge`} 
               subtitle="Safe space" 
               icon={<Transgender size={20} />} 
               active={activeTab === 'gender'} 
               onClick={() => setActiveTab('gender')} 
            />
          </div>
        </div>

        {/* CHAT AREA */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          
          {/* Header */}
          <div className="glass-panel" style={{ 
            height: 76, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '0 24px', 
            borderBottom: '1px solid var(--color-border)',
            borderLeft: 'none', borderRight: 'none', borderTop: 'none',
            zIndex: 10,
            background: 'rgba(255, 255, 255, 0.02)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
                <Hash size={24} />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--color-text-primary)' }}>
                  {activeTab === 'intl' ? 'Global Room' : activeTab === 'country' ? 'Regional Room' : 'Gender Room'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-accent)', boxShadow: '0 0 8px var(--color-accent)' }} />
                  <span style={{ fontSize: 13, color: 'var(--color-accent)' }}>{onlineCount} {onlineCount === 1 ? 'person' : 'people'} online</span>
                </div>
              </div>
            </div>
            {/* Header Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
               <button style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, width: 40, height: 40, color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Users size={18} />
               </button>
            </div>
          </div>

          {/* Messages Wrapper */}
          <div className="hide-scrollbar" style={{ flex: 1, padding: '24px 0', overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            
            <div style={{ flex: 1 }} /> {/* spacer pushing messages down */}
            
             {messages.length === 0 && (
                <div style={{ textAlign: 'center', margin: 'auto', opacity: 0.5, maxWidth: 300 }}>
                  <div style={{ background: 'var(--color-surface)', padding: 16, borderRadius: 20, border: '1px solid var(--color-border)' }}>
                     <Sparkles size={24} color="var(--color-accent)" style={{ margin: '0 auto 12px' }} />
                     <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-primary)' }}>Start the conversation!</p>
                  </div>
                </div>
              )}

             {messages.map((msg, i) => (
               <MessageBubble 
                  key={msg.id || i} 
                  message={msg} 
                  isOwn={msg.user_id === session?.user?.id} 
                  isAdmin={profile?.is_admin} 
                  onAvatarClick={(user) => setSelectedUser(user)}
               />
             ))}
             
             {isTyping && (
                <div style={{ padding: '0 24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ 
                    background: 'var(--color-surface)', padding: '12px 16px', borderRadius: '16px 16px 16px 4px', 
                    border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 6
                  }}>
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
             )}

             <div ref={bottomRef} style={{ height: 20 }} />
          </div>

          {/* Input Area */}
          <div style={{ 
            padding: '20px 24px', 
            background: 'var(--color-base)', 
            borderTop: '1px solid var(--color-border)',
            position: 'relative'
          }}>
            {/* Cooldown Bar */}
            <div style={{ 
              position: 'absolute', top: -2, left: 0, right: 0, height: 2, background: 'var(--color-surface)' 
            }}>
               <div style={{ 
                 height: '100%', 
                 width: `${cooldownProgress}%`, 
                 background: cooldown > 0 ? 'var(--color-accent)' : 'transparent', 
                 transition: cooldown > 0 ? 'width 1s linear' : 'none',
                 boxShadow: '0 0 10px var(--color-accent)'
               }} />
            </div>

            <div className="glass-panel" style={{ 
              display: 'flex', alignItems: 'flex-end', gap: 12, padding: '12px', borderRadius: 24,
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              
              <button 
                title="Emojis"
                style={{
                  width: 44, height: 44, borderRadius: '50%', background: 'transparent',
                  border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s', flexShrink: 0
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-accent)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}
              >
                <Smile size={24} />
              </button>

              <textarea
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={isDisabled}
                placeholder={cooldown > 0 ? `Wait ${cooldown}s...` : 'Type a message...'}
                rows={1}
                style={{
                  flex: 1, padding: '12px 0 12px 4px', fontSize: 16, color: '#fff', background: 'transparent',
                  border: 'none', resize: 'none', outline: 'none', minHeight: 44, maxHeight: 120, fontFamily: 'var(--font-body)',
                  opacity: isDisabled ? 0.5 : 1
                }}
              />

              <button
                onClick={sendMessage}
                disabled={isDisabled || !input.trim()}
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: isDisabled || !input.trim() ? 'var(--color-surface)' : 'var(--color-accent)',
                  color: isDisabled || !input.trim() ? 'rgba(255,255,255,0.3)' : '#000',
                  border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: isDisabled || !input.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                  boxShadow: isDisabled || !input.trim() ? 'none' : '0 0 15px rgba(0, 212, 255, 0.5)',
                  flexShrink: 0
                }}
                onMouseEnter={e => { if(!isDisabled && input.trim()) e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={e => { if(!isDisabled && input.trim()) e.currentTarget.style.transform = 'scale(1)'; }}
              >
                 {cooldown > 0 ? (
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{cooldown}</span>
                 ) : (
                    <Send size={20} style={{ marginLeft: 3, marginTop: 2 }} />
                 )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Modal Overlay */}
      {selectedUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999,
          background: 'rgba(13, 15, 20, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-panel slide-in" style={{
            width: 340, borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center',
            position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}>
            <button onClick={() => setSelectedUser(null)} style={{
              position: 'absolute', top: 16, right: 16, background: 'var(--color-surface)', border: 'none', borderRadius: '50%',
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)', cursor: 'pointer'
            }}>
              <X size={16} />
            </button>
            
            <Avatar url={selectedUser.avatar_url} username={selectedUser.username} size="lg" isOnline={true} style={{ marginBottom: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }} />
            
            <h3 style={{ margin: '0 0 4px', fontSize: 22, color: '#fff' }}>{selectedUser.username}</h3>
            
             <div style={{ display: 'flex', gap: 12, marginTop: 24, width: '100%' }}>
               <button onClick={() => alert("Added to friends!")} style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'var(--color-accent)', color: '#000', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 0 10px rgba(0,212,255,0.3)' }}>
                 Add Friend
               </button>
               <button onClick={() => alert("Reported user.")} style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'var(--color-surface)', color: 'var(--color-text-secondary)', fontWeight: 600, border: '1px solid var(--color-border)', cursor: 'pointer' }}>
                 Report
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoomCard({ title, subtitle, icon, active, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={active ? 'glass-panel glow-cyan' : 'glass-panel-hover'}
      style={{
        padding: '16px',
        borderRadius: 16,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: active ? 'var(--color-surface-hover)' : 'transparent',
        border: `1px solid ${active ? 'rgba(0,212,255,0.3)' : 'var(--color-border)'}`,
        transition: 'all 0.2s cubic-bezier(0.19, 1, 0.22, 1)',
        transform: active ? 'scale(1.02)' : 'none'
      }}
    >
      <div style={{
         width: 40, height: 40, borderRadius: 12, 
         background: active ? 'var(--color-accent-ghost)' : 'var(--color-surface)',
         color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
         display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: active ? '#fff' : 'var(--color-text-primary)' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>{subtitle}</div>
      </div>
    </div>
  );
}

function Sparkles(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
