import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'IN', name: 'India' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'BR', name: 'Brazil' },
  { code: 'JP', name: 'Japan' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' },
];

export default function Onboarding() {
  const { session, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [username, setUsername] = useState(profile?.username || '');
  const [gender, setGender] = useState(profile?.gender || '');
  const [community, setCommunity] = useState(profile?.community || '');
  const [country, setCountry] = useState(profile?.country || '');

  useEffect(() => {
    if (profile?.username && profile?.gender && profile?.community && profile?.country) {
      navigate('/chat', { replace: true });
    }
  }, [profile, navigate]);

  const handleNext = () => {
    setError('');
    if (step === 1 && !username.trim()) return setError('Please choose a username.');
    if (step === 2 && (!gender || !community)) return setError('Please select both your gender and community.');
    setStep(s => s + 1);
  };

  const handleBack = () => { setError(''); setStep(s => s - 1); };

  const handleSubmit = async () => {
    if (!username || !gender || !community || !country) return setError('Please complete all fields.');
    setLoading(true); setError('');

    const updates = { username: username.trim(), gender, community, country };
    const { error: dbError } = await supabase.from('profiles').update(updates).eq('id', session.user.id);

    if (dbError) { setError(dbError.message); setLoading(false); } 
    else { await refreshProfile(); navigate('/chat', { replace: true }); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-base)', padding: 24 }}>
      <div className="glass-panel slide-in" style={{ width: '100%', maxWidth: 460, borderRadius: 24, padding: '40px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: s <= step ? 'var(--color-accent)' : 'var(--color-surface)',
              boxShadow: s <= step ? '0 0 10px rgba(0,212,255,0.4)' : 'none'
            }} />
          ))}
        </div>

        {step === 1 && (
          <StepContainer title="Choose a Username" subtitle="This is how others will see you in the void.">
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. shadow_ninja" style={inputStyle}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--color-accent)'} onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'} />
          </StepContainer>
        )}

        {step === 2 && (
          <StepContainer title="Your Identity" subtitle="These help us place you in the right community rooms.">
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Gender</label>
              <div style={{ display: 'flex', gap: 12 }}>
                <SelectCard label="👨 Male" value="male" selected={gender} onSelect={setGender} />
                <SelectCard label="👩 Female" value="female" selected={gender} onSelect={setGender} />
                <SelectCard label="🌀 Other" value="other" selected={gender} onSelect={setGender} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Community</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {['straight', 'gay', 'bi', 'vers', 'queer'].map(c => (
                  <SelectCard key={c} label={c.charAt(0).toUpperCase() + c.slice(1)} value={c} selected={community} onSelect={setCommunity} />
                ))}
              </div>
            </div>
          </StepContainer>
        )}

        {step === 3 && (
          <StepContainer title="Your Region" subtitle="Represent your country in international channels.">
            <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="" disabled>Select a country</option>
              {COUNTRIES.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                <option key={c.code} value={c.code} style={{ background: '#1a1f2e' }}>{c.name}</option>
              ))}
            </select>
          </StepContainer>
        )}

        {error && (
          <div style={{ marginTop: 24, fontSize: 13, color: '#FF6B6B', background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.3)', borderRadius: 12, padding: '12px 16px' }}>
            {error}
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: 16, marginTop: 40 }}>
          {step > 1 && (
            <button onClick={handleBack} style={{ flex: 1, padding: '14px 16px', background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: 14, fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'var(--color-surface)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-secondary)'; e.currentTarget.style.background = 'transparent'; }}>
              Back
            </button>
          )}
          <button onClick={step === 3 ? handleSubmit : handleNext} disabled={loading}
            style={{ flex: 2, padding: '14px 16px', background: loading ? 'var(--color-surface)' : 'var(--color-accent)', color: loading ? 'rgba(255,255,255,0.5)' : '#000', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: loading ? 'none' : '0 0 15px rgba(0, 212, 255, 0.4)' }}
            onMouseEnter={e => { if(!loading) e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={e => { if(!loading) e.currentTarget.style.transform = 'scale(1)'; }}>
            {loading ? 'Entering...' : step === 3 ? 'Complete Setup' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepContainer({ title, subtitle, children }) {
  return (
    <div className="fade-in">
      <h2 style={{ fontSize: 28, fontWeight: 700, color: '#fff', margin: '0 0 8px', fontFamily: 'var(--font-display)' }}>{title}</h2>
      <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '0 0 32px' }}>{subtitle}</p>
      {children}
    </div>
  );
}

function SelectCard({ label, value, selected, onSelect }) {
  const isSelected = selected === value;
  return (
    <div onClick={() => onSelect(value)}
      style={{
        padding: '12px 20px',
        background: isSelected ? 'var(--color-accent-ghost)' : 'rgba(0,0,0,0.2)',
        border: `1px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius: 14, fontSize: 14, fontWeight: 600, color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)',
        cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.19, 1, 0.22, 1)', userSelect: 'none',
        transform: isSelected ? 'scale(1.05)' : 'none',
        boxShadow: isSelected ? '0 0 15px rgba(0, 212, 255, 0.15)' : 'none'
      }}
      onMouseEnter={e => { if(!isSelected) e.currentTarget.style.background = 'var(--color-surface)'; }}
      onMouseLeave={e => { if(!isSelected) e.currentTarget.style.background = 'rgba(0,0,0,0.2)'; }}
    >
      {label}
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12, fontFamily: 'var(--font-display)' };
const inputStyle = { width: '100%', padding: '14px 16px', fontSize: 16, color: '#fff', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--color-border)', borderRadius: 14, fontFamily: 'inherit', outline: 'none', appearance: 'none', transition: 'all 0.2s' };
