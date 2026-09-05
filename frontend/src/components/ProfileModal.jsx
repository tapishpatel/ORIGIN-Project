import React, { useState } from 'react';
import { api } from '../api/client';

export const ProfileModal = ({ isOpen, onClose, profile, user, onSave, isSaving, onLogout }) => {
  if (!isOpen) return null;

  const [step, setStep] = useState(1);
  const [ageGroup, setAgeGroup] = useState(profile?.age_group || '18-40');
  const [conditions, setConditions] = useState(profile?.conditions || ['none']);
  const [occupation, setOccupation] = useState(profile?.occupation || 'office');
  const [sensitivity, setSensitivity] = useState(profile?.alert_sensitivity || 'normal');
  const [notifyEmail, setNotifyEmail] = useState(profile?.notify_email ?? true);
  const [notifySms, setNotifySms] = useState(profile?.notify_sms ?? false);
  const [phone, setPhone] = useState(profile?.phone ? profile.phone.replace(/^\+91/, '') : '');
  const [phoneVerified, setPhoneVerified] = useState(profile?.phone_verified || false);
  const [location, setLocation] = useState(profile?.location || {
    lat: 28.6139,
    lon: 77.2090,
    label: 'New Delhi, Delhi',
    city: 'New Delhi',
    country: 'India'
  });

  // Fast2SMS OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [fast2smsOtpCode, setFast2smsOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpFeedback, setOtpFeedback] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const availableConditions = [
    { id: 'asthma', label: 'Asthma / Reactive Airway' },
    { id: 'heart_disease', label: 'Cardiovascular Vulnerability' },
    { id: 'hypertension', label: 'Hypertension' },
    { id: 'pregnant', label: 'Pregnancy Sensitivity' },
    { id: 'copd', label: 'COPD' },
    { id: 'allergies', label: 'Airborne Allergies' },
    { id: 'none', label: 'None (Healthy Baseline)' },
  ];

  const handleConditionToggle = (cId) => {
    if (cId === 'none') {
      setConditions(['none']);
      return;
    }
    const filtered = conditions.filter(c => c !== 'none');
    if (filtered.includes(cId)) {
      const next = filtered.filter(c => c !== cId);
      setConditions(next.length ? next : ['none']);
    } else {
      setConditions([...filtered, cId]);
    }
  };

  const fallbackAutoIp = async () => {
    try {
      const auto = await api.autoDetectLocation();
      if (auto?.label) {
        const newLoc = {
          lat: auto.lat,
          lon: auto.lon,
          label: auto.label,
          city: auto.city,
          country: auto.country,
        };
        setLocation(newLoc);
        setOtpFeedback(`📍 Auto-detected via network: ${newLoc.label}`);
      } else {
        setOtpFeedback('Unable to resolve location.');
      }
    } catch (e) {
      setOtpFeedback('Location service unavailable.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleDetectLocation = () => {
    setIsDetectingLocation(true);
    setOtpFeedback('Detecting precise location…');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const geo = await api.reverseGeocode(latitude, longitude);
            const newLoc = {
              lat: latitude,
              lon: longitude,
              label: geo.label || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
              city: geo.city || 'Current Location',
              country: geo.country || 'India',
            };
            setLocation(newLoc);
            setOtpFeedback(`📍 Detected: ${newLoc.label}`);
          } catch (err) {
            console.warn('Geolocation reverse fail, trying auto-IP:', err);
            await fallbackAutoIp();
          } finally {
            setIsDetectingLocation(false);
          }
        },
        async (err) => {
          console.warn('Geolocation denied or timed out, trying auto-IP:', err);
          await fallbackAutoIp();
        },
        { timeout: 5000 }
      );
    } else {
      fallbackAutoIp();
    }
  };

  const handleSendOtp = async () => {
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.length !== 10) {
      setOtpFeedback('Please enter a valid 10-digit Indian phone number.');
      return;
    }
    setOtpLoading(true);
    setOtpFeedback('Dispatching verification code…');
    try {
      const res = await api.sendSmsOtp(clean, user?.email);
      if (res.success) {
        setOtpSent(true);
        if (res.otp) {
          setFast2smsOtpCode(res.otp);
        }
        if (res.sms_delivered) {
          setOtpFeedback(`✓ Verification code sent via Fast2SMS to +91 ${clean}`);
        } else {
          setOtpFeedback(res.gateway_status || 'Fast2SMS notice: ₹100 wallet recharge needed for mobile SMS.');
        }
      } else {
        setOtpFeedback(res.error || 'Failed to send OTP. Check Fast2SMS credentials.');
      }
    } catch (err) {
      setOtpFeedback(err.message || 'Error communicating with SMS service.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length < 4) {
      setOtpFeedback('Please enter the verification code received.');
      return;
    }
    setOtpLoading(true);
    setOtpFeedback('Verifying code…');
    try {
      const res = await api.verifySmsOtp(phone, otpCode);
      if (res.success) {
        setPhoneVerified(true);
        setNotifySms(true);
        setOtpSent(false);
        setFast2smsOtpCode('');
        setOtpFeedback('✅ Phone verified! SMS health alerts are now active.');
      } else {
        setOtpFeedback(res.error || 'Incorrect verification code. Please check and try again.');
      }
    } catch (err) {
      setOtpFeedback(err.message || 'Verification failed. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSave({
      age_group: ageGroup,
      conditions,
      occupation,
      location,
      alert_sensitivity: sensitivity,
      notify_email: notifyEmail,
      notify_sms: notifySms,
      phone: phone ? (phone.startsWith('+91') ? phone : `+91${phone.replace(/[^0-9]/g, '')}`) : '',
      phone_verified: phoneVerified,
    });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '540px',
          maxWidth: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.2)',
          border: '1px solid #e2e8f0'
        }}
      >
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem'
              }}>
                🌿
              </div>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.015em' }}>
                  Your Health Profile
                </h2>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  {step === 1 ? 'Demographics & Location' : step === 2 ? 'Clinical Vulnerabilities' : 'Notifications & SMS Verification'}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#f1f5f9',
                border: 'none',
                fontSize: '1rem',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px', marginTop: '14px' }}>
            {[1, 2, 3].map(s => (
              <div
                key={s}
                onClick={() => setStep(s)}
                style={{
                  flex: 1,
                  height: '3px',
                  borderRadius: '2px',
                  background: step >= s ? '#0f172a' : '#e2e8f0',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
              />
            ))}
          </div>
        </div>

        <form onSubmit={handleFormSubmit} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* User Account Card (Instagram Style) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#f8fafc',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={user?.picture || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(user?.name || 'User')}
                alt={user?.name || 'User'}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#e2e8f0',
                  objectFit: 'cover'
                }}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', lineHeight: 1.2 }}>
                  {user?.name || 'Personalized Health Account'}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  {user?.email || 'Google Account Linked'}
                </div>
              </div>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  border: '1px solid #fed7aa',
                  background: '#fff7ed',
                  color: '#c2410c',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Sign out of this session"
              >
                Sign Out
              </button>
            )}
          </div>

          {/* STEP 1: Demographics & GPS Location */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                  Age Bracket
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {['under-18', '18-40', '41-60', '60+'].map((ag) => {
                    const isActive = ageGroup === ag;
                    return (
                      <button
                        type="button"
                        key={ag}
                        onClick={() => setAgeGroup(ag)}
                        style={{
                          padding: '9px 6px',
                          borderRadius: '10px',
                          fontSize: '0.78rem',
                          fontWeight: isActive ? 600 : 500,
                          background: isActive ? '#0f172a' : '#f8fafc',
                          color: isActive ? '#ffffff' : '#475569',
                          border: '1px solid',
                          borderColor: isActive ? '#0f172a' : '#e2e8f0',
                          cursor: 'pointer'
                        }}
                      >
                        {ag === 'under-18' ? '<18' : ag === '60+' ? '60+' : ag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                  Daily Exposure & Occupation
                </label>
                <select
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    fontSize: '0.82rem',
                    color: '#0f172a'
                  }}
                >
                  <option value="office">Office / Indoor Worker</option>
                  <option value="outdoor_worker">Outdoor / Field Worker (Higher Exposure)</option>
                  <option value="student">Student / Academic</option>
                  <option value="athlete">Athlete / Frequent Outdoor Cardio</option>
                  <option value="other">Mixed / Homemaker</option>
                </select>
              </div>

              {/* Monitored Location & GPS Auto-Detection */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '14px',
                padding: '14px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Monitored Location</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{location?.label || 'Not set'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isDetectingLocation}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '999px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <span>📍</span>
                    <span>{isDetectingLocation ? 'Detecting…' : 'Auto-detect Location'}</span>
                  </button>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  Coordinates: {location.lat?.toFixed(4)}, {location.lon?.toFixed(4)} · Feeds real Open-Meteo atmospheric telemetry
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Clinical Vulnerabilities */}
          {step === 2 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
                  Health Conditions & Vulnerabilities
                </label>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Calculates risk multiplier</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                {availableConditions.map((c) => {
                  const isChecked = conditions.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleConditionToggle(c.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        background: isChecked ? '#eff6ff' : '#f8fafc',
                        border: '1px solid',
                        borderColor: isChecked ? '#93c5fd' : '#e2e8f0',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ accentColor: '#0284c7' }}
                      />
                      <span style={{ fontSize: '0.82rem', fontWeight: isChecked ? 600 : 500, color: '#0f172a' }}>
                        {c.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Notifications & Fast2SMS Verification */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                  Alert Sensitivity
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setSensitivity('normal')}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: sensitivity === 'normal' ? 600 : 500,
                      background: sensitivity === 'normal' ? '#0f172a' : '#f8fafc',
                      color: sensitivity === 'normal' ? '#ffffff' : '#475569',
                      border: '1px solid',
                      borderColor: sensitivity === 'normal' ? '#0f172a' : '#e2e8f0',
                      cursor: 'pointer'
                    }}
                  >
                    Normal (Standard limits)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSensitivity('high')}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      fontWeight: sensitivity === 'high' ? 600 : 500,
                      background: sensitivity === 'high' ? '#0f172a' : '#f8fafc',
                      color: sensitivity === 'high' ? '#ffffff' : '#475569',
                      border: '1px solid',
                      borderColor: sensitivity === 'high' ? '#0f172a' : '#e2e8f0',
                      cursor: 'pointer'
                    }}
                  >
                    High (Early warnings)
                  </button>
                </div>
              </div>

              {/* Fast2SMS Phone Verification Box */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                    Mobile Phone (Fast2SMS Gateway)
                  </label>
                  {phoneVerified ? (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#059669',
                      background: '#ecfdf5',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      border: '1px solid #a7f3d0'
                    }}>
                      ✓ VERIFIED
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      color: '#b45309',
                      background: '#fffbeb',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      border: '1px solid #fde68a'
                    }}>
                      UNVERIFIED
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#e2e8f0',
                    padding: '0 10px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#475569'
                  }}>
                    +91
                  </div>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={phone}
                    maxLength={10}
                    onChange={(e) => {
                      setPhone(e.target.value.replace(/[^0-9]/g, ''));
                      if (phoneVerified) setPhoneVerified(false);
                    }}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: '0.82rem',
                      color: '#0f172a'
                    }}
                  />
                  {!phoneVerified && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpLoading || phone.length !== 10}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: phone.length === 10 ? 'pointer' : 'not-allowed',
                        opacity: phone.length === 10 ? 1 : 0.6
                      }}
                    >
                      {otpLoading ? 'Sending…' : otpSent ? 'Resend OTP' : 'Send OTP'}
                    </button>
                  )}
                </div>

                {otpSent && !phoneVerified && (
                  <>
                    {fast2smsOtpCode && (
                      <div style={{
                        background: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        marginTop: '10px',
                        marginBottom: '6px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Security Verification Code
                          </span>
                          <button
                            type="button"
                            onClick={() => setOtpCode(fast2smsOtpCode)}
                            style={{
                              padding: '3px 10px',
                              borderRadius: '999px',
                              background: '#15803d',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Autofill Code
                          </button>
                        </div>
                        <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#166534', letterSpacing: '0.15em', margin: '4px 0' }}>
                          {fast2smsOtpCode}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#15803d', lineHeight: 1.35 }}>
                          Fast2SMS gateway status: {otpFeedback || 'Requires ₹100 wallet recharge for external mobile dispatch.'} Also dispatched to {user?.email || 'your email'}.
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <input
                        type="text"
                        placeholder="Enter 6-digit OTP code"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: '1.5px solid #0284c7',
                          background: '#ffffff',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          color: '#0f172a'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otpLoading || otpCode.length < 4}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          background: '#0284c7',
                          color: '#ffffff',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Verify Code
                      </button>
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '14px', marginTop: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notifySms}
                      onChange={(e) => setNotifySms(e.target.checked)}
                      style={{ accentColor: '#059669' }}
                    />
                    <span>SMS text alerts (Fast2SMS)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.checked)}
                      style={{ accentColor: '#059669' }}
                    />
                    <span>Email alerts (Gmail SMTP)</span>
                  </label>
                </div>
              </div>

              {otpFeedback && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: otpFeedback.includes('✅') || otpFeedback.includes('✓') || otpFeedback.includes('📍') ? '#ecfdf5' : '#fef2f2',
                  color: otpFeedback.includes('✅') || otpFeedback.includes('✓') || otpFeedback.includes('📍') ? '#065f46' : '#991b1b',
                  fontSize: '0.74rem',
                  fontWeight: 500
                }}>
                  {otpFeedback}
                </div>
              )}
            </div>
          )}

          {/* Navigation Controls */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  color: '#475569',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ← Previous
              </button>
            ) : null}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Next Step →
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSaving}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  background: '#059669',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: isSaving ? 'wait' : 'pointer',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)'
                }}
              >
                {isSaving ? 'Saving Profile…' : 'Save Health Profile'}
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};
export default ProfileModal;