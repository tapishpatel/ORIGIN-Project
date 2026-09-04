import React, { useState } from 'react';

export const ProfileModal = ({ isOpen, onClose, profile, onSave, isSaving }) => {
  if (!isOpen) return null;

  const [step, setStep] = useState(1);
  const [ageGroup, setAgeGroup] = useState(profile?.age_group || '18-40');
  const [conditions, setConditions] = useState(profile?.conditions || ['none']);
  const [occupation, setOccupation] = useState(profile?.occupation || 'office');
  const [sensitivity, setSensitivity] = useState(profile?.alert_sensitivity || 'normal');
  const [notifyEmail, setNotifyEmail] = useState(profile?.notify_email ?? true);
  const [notifySms, setNotifySms] = useState(profile?.notify_sms ?? false);
  const [phone, setPhone] = useState(profile?.phone || '');

  const availableConditions = [
    { id: 'asthma', label: 'Asthma' },
    { id: 'heart_disease', label: 'Cardiovascular' },
    { id: 'hypertension', label: 'Hypertension' },
    { id: 'pregnant', label: 'Pregnancy' },
    { id: 'copd', label: 'COPD' },
    { id: 'allergies', label: 'Severe Allergies' },
    { id: 'none', label: 'None (Healthy)' },
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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSave({
      age_group: ageGroup,
      conditions,
      occupation,
      alert_sensitivity: sensitivity,
      notify_email: notifyEmail,
      notify_sms: notifySms,
      phone,
    });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.4)',
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
          width: '520px',
          maxWidth: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)',
          border: '1px solid var(--border-card)'
        }}
      >
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.1rem' }}>🌿</span>
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.015em' }}>
                  Health Profile
                </h2>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Step {step} of 3
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

          <div style={{ display: 'flex', gap: '4px', marginTop: '14px' }}>
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

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                  Age
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
                  Daily exposure
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
                  <option value="outdoor_worker">Outdoor Worker</option>
                  <option value="office">Office / Indoor</option>
                  <option value="student">Student</option>
                  <option value="athlete">Athlete</option>
                  <option value="other">Mixed</option>
                </select>
              </div>

              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '12px 14px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>Google OAuth</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Sync across devices</div>
                </div>
                <a
                  href="/auth/google"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '999px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: '#0f172a',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <span>G</span>
                  <span>Connect</span>
                </a>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a' }}>
                  Conditions
                </label>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Multi-select</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
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
                        padding: '10px 12px',
                        background: isChecked ? '#e0f2fe' : '#f8fafc',
                        border: '1px solid',
                        borderColor: isChecked ? '#7dd3fc' : '#e2e8f0',
                        borderRadius: '10px',
                        cursor: 'pointer'
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

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                  Alert sensitivity
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
                    Normal
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
                    High (early)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                  Channels
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.checked)}
                      style={{ accentColor: '#059669' }}
                    />
                    <span>Email · Gmail SMTP</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={notifySms}
                      onChange={(e) => setNotifySms(e.target.checked)}
                      style={{ accentColor: '#059669' }}
                    />
                    <span>SMS · Emergency push</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '999px',
                  background: '#f1f5f9',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                ← Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '999px',
                  background: '#f1f5f9',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                style={{
                  flex: 2,
                  padding: '10px',
                  borderRadius: '999px',
                  background: '#0f172a',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                Continue →
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSaving}
                style={{
                  flex: 2,
                  padding: '10px',
                  borderRadius: '999px',
                  background: '#0f172a',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: isSaving ? 'not-allowed' : 'pointer'
                }}
              >
                {isSaving ? 'Saving…' : 'Save & Recalculate ✓'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};