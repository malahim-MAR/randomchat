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
  // A small subset for demo purposes; in a real app, use a complete list
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

  // Form states
  const [username, setUsername] = useState(profile?.username || '');
  const [gender, setGender] = useState(profile?.gender || '');
  const [community, setCommunity] = useState(profile?.community || '');
  const [country, setCountry] = useState(profile?.country || '');

  useEffect(() => {
    // If the profile is already complete, redirect to chat.
    if (profile?.username && profile?.gender && profile?.community && profile?.country) {
      navigate('/chat', { replace: true });
    }
  }, [profile, navigate]);

  const handleNext = () => {
    setError('');
    if (step === 1 && !username.trim()) {
      setError('Please choose a username.');
      return;
    }
    if (step === 2 && (!gender || !community)) {
      setError('Please select both your gender and community.');
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError('');
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    if (!username || !gender || !community || !country) {
      setError('Please complete all fields.');
      return;
    }
    setLoading(true);
    setError('');

    const updates = {
      username: username.trim(),
      gender,
      community,
      country,
    };

    const { error: dbError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id);

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
    } else {
      await refreshProfile();
      navigate('/chat', { replace: true });
    }
  };

  return (
    <div className="page-wrapper" style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg)' }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '36px',
        boxShadow: 'var(--shadow-md)',
        margin: '24px'
      }}>
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {[1, 2, 3].map((s) => (
            <div key={s} style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: s <= step ? 'var(--accent)' : 'var(--border)'
            }} />
          ))}
        </div>

        {step === 1 && (
          <StepContainer title="Choose a Username">
            <p style={subTextStyle}>This is how others will see you.</p>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. shadow_ninja"
              style={inputStyle}
            />
          </StepContainer>
        )}

        {step === 2 && (
          <StepContainer title="Your Identity">
            <p style={subTextStyle}>These help us place you in the right community rooms.</p>
            
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Gender</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <SelectCard label="👨 Male" value="male" selected={gender} onSelect={setGender} />
                <SelectCard label="👩 Female" value="female" selected={gender} onSelect={setGender} />
                <SelectCard label="🌀 Other" value="other" selected={gender} onSelect={setGender} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Community</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['straight', 'gay', 'bi', 'vers', 'queer'].map(c => (
                  <SelectCard 
                    key={c} 
                    label={c.charAt(0).toUpperCase() + c.slice(1)} 
                    value={c} 
                    selected={community} 
                    onSelect={setCommunity} 
                  />
                ))}
              </div>
            </div>
          </StepContainer>
        )}

        {step === 3 && (
          <StepContainer title="Your Country">
            <p style={subTextStyle}>Represent your region in international chats.</p>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="" disabled>Select a country</option>
              {COUNTRIES.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </StepContainer>
        )}

        {error && (
          <div style={{ marginTop: 16, fontSize: 13, color: '#E05252', background: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: 8, padding: '8px 12px' }}>
            {error}
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          {step > 1 && (
            <button
              onClick={handleBack}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          )}
          
          <button
            onClick={step === 3 ? handleSubmit : handleNext}
            disabled={loading}
            style={{
              flex: 2,
              padding: '12px 16px',
              background: loading ? '#A0B8F5' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            {loading ? 'Saving...' : step === 3 ? 'Complete Setup' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Subcomponents & Styles

function StepContainer({ title, children }) {
  return (
    <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
      <h2 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</h2>
      {children}
    </div>
  );
}

function SelectCard({ label, value, selected, onSelect }) {
  const isSelected = selected === value;
  return (
    <div
      onClick={() => onSelect(value)}
      style={{
        padding: '10px 14px',
        background: isSelected ? 'var(--accent-light)' : 'var(--bg)',
        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 8,
        fontSize: 14,
        fontWeight: 500,
        color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        userSelect: 'none'
      }}
    >
      {label}
    </div>
  );
}

const subTextStyle = { fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 };
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 };
const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  fontSize: 15,
  color: 'var(--text-primary)',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontFamily: 'inherit',
  outline: 'none',
  appearance: 'none'
};
