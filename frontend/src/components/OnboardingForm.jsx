import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

export function OnboardingForm({ onComplete }) {
  const [formData, setFormData] = useState({
    age_group: '18-40',
    conditions: ['none'],
    occupation: 'office',
    location: {
      lat: 28.6139,
      lon: 77.2090,
      label: 'New Delhi, Delhi',
      city: 'New Delhi',
      country: 'India'
    },
    alert_sensitivity: 'normal',
    notify_email: true,
    notify_sms: false,
    phone: '',
    phone_verified: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Auto-detect location on initial mount if available
  useEffect(() => {
    if (navigator.geolocation) {
      setIsDetectingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const geo = await api.reverseGeocode(latitude, longitude);
            setFormData(prev => ({
              ...prev,
              location: {
                lat: latitude,
                lon: longitude,
                label: geo.label || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
                city: geo.city || 'Current Location',
                country: geo.country || 'India',
              }
            }));
            setFeedback(`📍 Auto-detected location: ${geo.label}`);
          } catch (e) {
            console.warn('Geocoding error:', e);
          } finally {
            setIsDetectingLocation(false);
          }
        },
        () => setIsDetectingLocation(false),
        { timeout: 6000 }
      );
    }
  }, []);

  const handleConditionToggle = (cId) => {
    setFormData(prev => {
      if (cId === 'none') return { ...prev, conditions: ['none'] };
      const filtered = prev.conditions.filter(c => c !== 'none');
      if (filtered.includes(cId)) {
        const next = filtered.filter(c => c !== cId);
        return { ...prev, conditions: next.length ? next : ['none'] };
      } else {
        return { ...prev, conditions: [...filtered, cId] };
      }
    });
  };

  const handleSendOtp = async () => {
    const clean = formData.phone.replace(/[^0-9]/g, '');
    if (clean.length !== 10) {
      setFeedback('Please enter a valid 10-digit Indian phone number.');
      return;
    }
    setOtpLoading(true);
    setFeedback('');
    try {
      const res = await api.sendSmsOtp(clean);
      if (res.success) {
        setOtpSent(true);
        setFeedback(`✓ Verification code sent via Fast2SMS to +91 ${clean}`);
      } else {
        setFeedback(res.error || 'Failed to send OTP.');
      }
    } catch (e) {
      setFeedback(e.message || 'SMS error.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length < 4) {
      setFeedback('Please enter the verification code.');
      return;
    }
    setOtpLoading(true);
    try {
      const res = await api.verifySmsOtp(formData.phone, otpCode);
      if (res.success) {
        setFormData(prev => ({ ...prev, phone_verified: true, notify_sms: true }));
        setOtpSent(false);
        setFeedback('✅ Mobile verified! SMS alerts enabled.');
      } else {
        setFeedback(res.error || 'Incorrect code.');
      }
    } catch (e) {
      setFeedback(e.message || 'Verification error.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        phone: formData.phone ? (formData.phone.startsWith('+91') ? formData.phone : `+91${formData.phone.replace(/[^0-9]/g, '')}`) : '',
      };
      await api.updateProfile(payload);
      if (onComplete) {
        onComplete(payload);
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      console.error(err);
      setFeedback('Failed to save profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8fafc',
      color: '#0f172a',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#ffffff',
        padding: '36px',
        borderRadius: '24px',
        maxWidth: '520px',
        width: '100%',
        border: '1px solid #e2e8f0',
        boxShadow: '0 20px 45px -15px rgba(15, 23, 42, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ fontSize: '1.4rem' }}>🌿</span>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              Welcome to AeroHealth
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Configure your clinical profile for real-time personalized alerts.
            </p>
          </div>
        </div>

        {/* Monitored Location */}
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>Monitored Location</span>
            <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>
              {isDetectingLocation ? 'Locating…' : 'GPS Synced'}
            </span>
          </div>
          <div style={{ fontSize: '0.84rem', color: '#334155', fontWeight: 600 }}>
            {formData.location.label}
          </div>
        </div>

        {/* Age & Occupation */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>Age Group</label>
            <select
              value={formData.age_group}
              onChange={(e) => setFormData({ ...formData, age_group: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '10px', background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}
            >
              <option value="under-18">Under 18</option>
              <option value="18-40">18 - 40</option>
              <option value="41-60">41 - 60</option>
              <option value="60+">60+</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>Occupation</label>
            <select
              value={formData.occupation}
              onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '10px', background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}
            >
              <option value="office">Office / Indoor</option>
              <option value="outdoor_worker">Outdoor Worker</option>
              <option value="student">Student</option>
              <option value="athlete">Athlete</option>
            </select>
          </div>
        </div>

        {/* Health Conditions */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>Health Sensitivities</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {[
              { id: 'asthma', label: 'Asthma' },
              { id: 'heart_disease', label: 'Heart Disease' },
              { id: 'hypertension', label: 'Hypertension' },
              { id: 'allergies', label: 'Allergies' },
              { id: 'none', label: 'None (Healthy)' },
            ].map(cond => {
              const isChecked = formData.conditions.includes(cond.id);
              return (
                <button
                  type="button"
                  key={cond.id}
                  onClick={() => handleConditionToggle(cond.id)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '999px',
                    background: isChecked ? '#0f172a' : '#f8fafc',
                    color: isChecked ? '#ffffff' : '#475569',
                    border: '1px solid',
                    borderColor: isChecked ? '#0f172a' : '#e2e8f0',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {cond.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Phone & Fast2SMS */}
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>Mobile (Fast2SMS Alerts)</span>
            {formData.phone_verified && (
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '999px' }}>
                ✓ VERIFIED
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#e2e8f0', padding: '0 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
              +91
            </div>
            <input
              type="tel"
              placeholder="10-digit mobile"
              maxLength={10}
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g, ''), phone_verified: false })}
              style={{ flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '0.82rem' }}
            />
            {!formData.phone_verified && (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpLoading || formData.phone.length !== 10}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: formData.phone.length === 10 ? 'pointer' : 'not-allowed',
                  opacity: formData.phone.length === 10 ? 1 : 0.6
                }}
              >
                {otpLoading ? '…' : otpSent ? 'Resend' : 'Send OTP'}
              </button>
            )}
          </div>

          {otpSent && !formData.phone_verified && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input
                type="text"
                placeholder="6-digit code"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #0284c7', background: '#ffffff', fontSize: '0.85rem', fontWeight: 700 }}
              />
              <button
                type="button"
                onClick={handleVerifyOtp}
                style={{ padding: '8px 16px', borderRadius: '8px', background: '#0284c7', color: '#ffffff', fontSize: '0.78rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                Verify
              </button>
            </div>
          )}
        </div>

        {feedback && (
          <div style={{
            padding: '8px 12px',
            borderRadius: '8px',
            marginBottom: '16px',
            background: feedback.includes('✅') || feedback.includes('✓') || feedback.includes('📍') ? '#ecfdf5' : '#fef2f2',
            color: feedback.includes('✅') || feedback.includes('✓') || feedback.includes('📍') ? '#065f46' : '#991b1b',
            fontSize: '0.74rem',
            fontWeight: 500
          }}>
            {feedback}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            background: '#0f172a',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.9rem',
            border: 'none',
            cursor: isSubmitting ? 'wait' : 'pointer'
          }}
        >
          {isSubmitting ? 'Personalizing Dashboard…' : 'Enter Dashboard →'}
        </button>
      </form>
    </div>
  );
}
export default OnboardingForm;
