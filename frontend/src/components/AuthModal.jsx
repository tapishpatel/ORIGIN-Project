import React, { useState, useEffect } from 'react';
import { api, setAuthToken } from '../api/client';

const DEMO_PERSONAS = [
  {
    id: 'demo-asthma-worker',
    name: 'Aditi Sharma',
    role: 'Asthma · Outdoor Worker',
    city: 'Bhopal',
    badge: '🫁 Asthma',
    badgeColor: '#ef4444',
  },
  {
    id: 'demo-senior-cardiac',
    name: 'Rajiv Verma',
    role: 'Senior (60+) · Cardiac',
    city: 'New Delhi',
    badge: '❤️ Cardiac',
    badgeColor: '#dc2626',
  },
  {
    id: 'demo-child-asthma',
    name: 'Aarav Patel',
    role: 'Child Asthma · Pediatric',
    city: 'Bengaluru',
    badge: '🧒 Pediatric',
    badgeColor: '#f59e0b',
  },
  {
    id: 'demo-office-healthy',
    name: 'Karan Malhotra',
    role: 'Office Worker · Healthy',
    city: 'Mumbai',
    badge: '💼 Baseline',
    badgeColor: '#10b981',
  },
];

const AVAILABLE_CONDITIONS = [
  { id: 'asthma', label: '🫁 Asthma / Reactive Airway' },
  { id: 'allergies', label: '🌿 Allergies / Hay Fever' },
  { id: 'heart_disease', label: '❤️ Heart Disease' },
  { id: 'hypertension', label: '🩺 Hypertension / High BP' },
  { id: 'pregnant', label: '🤰 Pregnancy' },
  { id: 'none', label: '✨ Healthy / No Prior Conditions' },
];

const OCCUPATIONS = [
  { id: 'office', label: 'Office / Indoor Work' },
  { id: 'outdoor_worker', label: 'Outdoor Construction / Traffic / Field' },
  { id: 'athlete', label: 'Athlete / High Cardio Runner' },
  { id: 'student', label: 'Student / Campus' },
  { id: 'retired', label: 'Retired / Senior' },
  { id: 'other', label: 'General / Home' },
];

export function AuthModal({ isOpen, onClose, initialMode = 'login', onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageGroup, setAgeGroup] = useState('18-40');
  const [selectedConditions, setSelectedConditions] = useState(['none']);
  const [occupation, setOccupation] = useState('office');
  const [cityLabel, setCityLabel] = useState('New Delhi, Delhi, India');
  const [coords, setCoords] = useState({ lat: 28.6139, lon: 77.2090 });
  const [phone, setPhone] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setError('');
  }, [initialMode, isOpen]);

  // Auto detect user location for new signup prefill
  const handleAutoDetect = async () => {
    setDetectingLocation(true);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const { latitude, longitude } = pos.coords;
            const geo = await api.reverseGeocode(latitude, longitude).catch(() => null);
            setCoords({ lat: latitude, lon: longitude });
            setCityLabel(geo?.label || `${geo?.city || 'Your Location'}, ${geo?.country || 'India'}`);
            setDetectingLocation(false);
          },
          async () => {
            const auto = await api.autoDetectLocation().catch(() => null);
            if (auto && auto.lat) {
              setCoords({ lat: auto.lat, lon: auto.lon });
              setCityLabel(auto.label || 'New Delhi, Delhi');
            }
            setDetectingLocation(false);
          },
          { timeout: 4000 }
        );
      }
    } catch {
      setDetectingLocation(false);
    }
  };

  const toggleCondition = (condId) => {
    if (condId === 'none') {
      setSelectedConditions(['none']);
      return;
    }
    let next = selectedConditions.filter((c) => c !== 'none');
    if (next.includes(condId)) {
      next = next.filter((c) => c !== condId);
      if (next.length === 0) next = ['none'];
    } else {
      next.push(condId);
    }
    setSelectedConditions(next);
  };

  const handleDemoPersonaLogin = async (personaId) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.demoLogin(personaId);
      if (res && res.access_token) {
        setAuthToken(res.access_token);
        if (onAuthSuccess) onAuthSuccess(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to sign in with demo persona.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Please fill in both email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.login(loginEmail.trim(), loginPassword.trim());
      if (res && res.access_token) {
        setAuthToken(res.access_token);
        if (onAuthSuccess) onAuthSuccess(res);
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: name.trim() || email.split('@')[0],
        email: email.trim().toLowerCase(),
        password: password.trim(),
        age_group: ageGroup,
        conditions: selectedConditions,
        occupation,
        location: {
          lat: coords.lat,
          lon: coords.lon,
          label: cityLabel,
          city: cityLabel.split(',')[0].trim(),
          country: 'India',
        },
        phone: phone.trim(),
        notify_email: notifyEmail,
        notify_sms: notifySms && Boolean(phone.trim()),
        alert_sensitivity: 'normal',
      };

      const res = await api.signup(payload);
      if (res && res.access_token) {
        setAuthToken(res.access_token);
        if (onAuthSuccess) onAuthSuccess(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: mode === 'signup' ? '580px' : '460px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          position: 'relative',
          padding: '32px',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '1.2rem',
            color: '#64748b',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#f1f5f9')}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '6px 14px',
              borderRadius: '999px',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>🌿</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e40af' }}>
              AeroHealth Advisory
            </span>
          </div>
          <h2
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.025em',
              margin: '0 0 6px 0',
            }}
          >
            {mode === 'login' ? 'Welcome Back' : 'Create Your Health Profile'}
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
            {mode === 'login'
              ? 'Sign in to access your personalized real-time environmental advisory.'
              : 'Tailor air quality intelligence to your personal physiology & lifestyle.'}
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '14px',
            marginBottom: '22px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: mode === 'login' ? '#ffffff' : 'transparent',
              color: mode === 'login' ? '#0f172a' : '#64748b',
              boxShadow: mode === 'login' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: mode === 'signup' ? '#ffffff' : 'transparent',
              color: mode === 'signup' ? '#0f172a' : '#64748b',
              boxShadow: mode === 'signup' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            Create Account
          </button>
        </div>

        {/* 1-Click Clinical Demo Personas Shortcut */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '14px 16px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              ⚡ Instant 1-Click Demo Profiles
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Zero Password Required</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {DEMO_PERSONAS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleDemoPersonaLogin(p.id)}
                disabled={loading}
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#93c5fd';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                    {p.name.split(' ')[0]}
                  </span>
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      color: p.badgeColor,
                      background: `${p.badgeColor}15`,
                      padding: '1px 6px',
                      borderRadius: '999px',
                    }}
                  >
                    {p.city}
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.badge}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '10px 14px',
              color: '#991b1b',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px',
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* SIGN IN FORM */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.92rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#0284c7')}
                onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#334155',
                  }}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.76rem',
                    color: '#0284c7',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.92rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#0284c7')}
                onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '6px',
                padding: '14px',
                borderRadius: '14px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1e293b')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#0f172a')}
            >
              {loading ? 'Authenticating…' : 'Sign In to Dashboard →'}
            </button>
          </form>
        ) : (
          /* CREATE ACCOUNT FORM */
          <form onSubmit={handleSignupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aditi Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                  Password *
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', fontSize: '0.72rem', color: '#0284c7', cursor: 'pointer', fontWeight: 600 }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Choose a password (min 4 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.86rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Age Group */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Age Group (Vulnerability Factor)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {['under_18', '18-40', '40-60', '60+'].map((ag) => (
                  <button
                    key={ag}
                    type="button"
                    onClick={() => setAgeGroup(ag)}
                    style={{
                      padding: '7px 4px',
                      borderRadius: '8px',
                      border: ageGroup === ag ? '2px solid #0284c7' : '1px solid #e2e8f0',
                      background: ageGroup === ag ? '#eff6ff' : '#f8fafc',
                      color: ageGroup === ag ? '#1e40af' : '#475569',
                      fontWeight: ageGroup === ag ? 700 : 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    {ag === 'under_18' ? '< 18 Yrs' : ag}
                  </button>
                ))}
              </div>
            </div>

            {/* Health Conditions */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Health Conditions & Sensitivities (Multi-select)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {AVAILABLE_CONDITIONS.map((c) => {
                  const isChecked = selectedConditions.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCondition(c.id)}
                      style={{
                        textAlign: 'left',
                        padding: '7px 10px',
                        borderRadius: '8px',
                        border: isChecked ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                        background: isChecked ? '#eff6ff' : '#ffffff',
                        color: isChecked ? '#1e40af' : '#334155',
                        fontWeight: isChecked ? 700 : 500,
                        fontSize: '0.76rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{c.label}</span>
                      {isChecked && <span style={{ color: '#0284c7', fontWeight: 800 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Occupation */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                Daily Activity & Work Environment
              </label>
              <select
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  outline: 'none',
                  background: '#ffffff',
                }}
              >
                {OCCUPATIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                  Monitored City / Location
                </label>
                <button
                  type="button"
                  onClick={handleAutoDetect}
                  disabled={detectingLocation}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.72rem',
                    color: '#0284c7',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  📍 {detectingLocation ? 'Locating…' : 'Auto-detect GPS'}
                </button>
              </div>
              <input
                type="text"
                value={cityLabel}
                onChange={(e) => setCityLabel(e.target.value)}
                placeholder="e.g. Bhopal, MP or New Delhi"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Notification Channels */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                Automated Health Alert Preferences
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                  />
                  <span>Dispatch critical advisories to my Email (Gmail SMTP)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={notifySms}
                    onChange={(e) => setNotifySms(e.target.checked)}
                  />
                  <span>Send urgent SMS alerts (Fast2SMS Gateway)</span>
                </label>
                {notifySms && (
                  <input
                    type="tel"
                    placeholder="10-digit Indian Mobile Number (+91)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '4px',
                padding: '14px',
                borderRadius: '14px',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.3)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#0369a1')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#0284c7')}
            >
              {loading ? 'Creating Profile…' : 'Complete Setup & Launch Dashboard 🚀'}
            </button>
          </form>
        )}

        {/* Footer switch & Google fallback */}
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            textAlign: 'center',
          }}
        >
          <a
            href="http://localhost:8000/auth/google/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontSize: '0.82rem',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#f8fafc')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google Account</span>
          </a>

          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {mode === 'login' ? (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError('');
                  }}
                  style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Create one here
                </button>
              </span>
            ) : (
              <span>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  style={{ background: 'none', border: 'none', color: '#0284c7', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Sign in here
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
