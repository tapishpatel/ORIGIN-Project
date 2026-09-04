import React, { useState } from 'react';
import { IconSettings, IconShield, IconHeart } from './Icons';

export const ProfileModal = ({ isOpen, onClose, profile, onSave, isSaving }) => {
  if (!isOpen) return null;

  const [ageGroup, setAgeGroup] = useState(profile?.age_group || '18-40');
  const [conditions, setConditions] = useState(profile?.conditions || ['none']);
  const [occupation, setOccupation] = useState(profile?.occupation || 'office');
  const [sensitivity, setSensitivity] = useState(profile?.alert_sensitivity || 'normal');
  const [notifyEmail, setNotifyEmail] = useState(profile?.notify_email ?? true);
  const [notifySms, setNotifySms] = useState(profile?.notify_sms ?? false);
  const [phone, setPhone] = useState(profile?.phone || '');

  const availableConditions = [
    { id: 'asthma', label: 'Asthma / Bronchial Sensitivity' },
    { id: 'heart_disease', label: 'Cardiovascular / Heart Disease' },
    { id: 'hypertension', label: 'Hypertension' },
    { id: 'pregnant', label: 'Pregnancy' },
    { id: 'copd', label: 'COPD / Emphysema' },
    { id: 'allergies', label: 'Severe Airborne Allergies' },
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <IconShield size={20} color="#38bdf8" />
            <span>Personal Health & Risk Profile</span>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleFormSubmit} className="modal-body">
          {/* Age Group */}
          <div className="form-group">
            <label className="form-label">Age Demographic</label>
            <div className="radio-pill-group">
              {['under-18', '18-40', '41-60', '60+'].map((ag) => (
                <button
                  type="button"
                  key={ag}
                  className={`pill-btn ${ageGroup === ag ? 'active' : ''}`}
                  onClick={() => setAgeGroup(ag)}
                >
                  {ag === 'under-18' ? 'Under 18' : ag === '60+' ? 'Senior (60+)' : ag}
                </button>
              ))}
            </div>
          </div>

          {/* Conditions Multi-select */}
          <div className="form-group">
            <label className="form-label">Health & Respiratory Conditions</label>
            <div className="checkbox-grid">
              {availableConditions.map((c) => {
                const isChecked = conditions.includes(c.id);
                return (
                  <label key={c.id} className={`checkbox-card ${isChecked ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleConditionToggle(c.id)}
                      className="hidden-checkbox"
                    />
                    <span className="check-box-indicator" />
                    <span className="check-label">{c.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Occupation */}
          <div className="form-group">
            <label className="form-label">Daily Occupation / Exposure Profile</label>
            <select
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              className="form-select"
            >
              <option value="outdoor_worker">Outdoor Worker (Delivery, Traffic, Construction, Field)</option>
              <option value="office">Office / Desk Worker (Indoor AC)</option>
              <option value="student">Student / Campus</option>
              <option value="athlete">Athlete / Outdoor Fitness Trainer</option>
              <option value="other">Other / Mixed</option>
            </select>
          </div>

          {/* Alert Sensitivity */}
          <div className="form-group">
            <label className="form-label">Notification Sensitivity Threshold</label>
            <div className="radio-pill-group">
              <button
                type="button"
                className={`pill-btn ${sensitivity === 'normal' ? 'active' : ''}`}
                onClick={() => setSensitivity('normal')}
              >
                Normal (Alerts on High/Severe)
              </button>
              <button
                type="button"
                className={`pill-btn ${sensitivity === 'high' ? 'active' : ''}`}
                onClick={() => setSensitivity('high')}
              >
                High (Alerts early on Moderate)
              </button>
            </div>
          </div>

          {/* Channel Toggles */}
          <div className="form-group">
            <label className="form-label">Dispatched Alert Channels</label>
            <div className="channel-toggles">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                />
                <span>Email Notifications</span>
              </label>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={notifySms}
                  onChange={(e) => setNotifySms(e.target.checked)}
                />
                <span>SMS Notifications</span>
              </label>
            </div>

            {notifySms && (
              <div className="phone-input-box">
                <input
                  type="tel"
                  placeholder="Enter Mobile (+91...)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                />
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="save-btn" disabled={isSaving}>
              {isSaving ? 'Saving Profile...' : 'Save & Recalculate Advisory'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-dialog {
          background: #0f172a;
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: var(--radius-lg);
          max-width: 580px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          border-bottom: 1px solid var(--border-subtle);
        }
        .modal-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .close-btn {
          font-size: 1.5rem;
          line-height: 1;
          color: var(--text-muted);
        }
        .close-btn:hover { color: var(--text-primary); }
        .modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .form-label {
          font-size: 0.82rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }
        .radio-pill-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .pill-btn {
          flex: 1;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-align: center;
        }
        .pill-btn.active {
          background: rgba(56, 189, 248, 0.15);
          border-color: #38bdf8;
          color: #38bdf8;
        }
        .checkbox-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        @media (max-width: 500px) {
          .checkbox-grid { grid-template-columns: 1fr; }
        }
        .checkbox-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
        }
        .checkbox-card.checked {
          background: rgba(56, 189, 248, 0.1);
          border-color: rgba(56, 189, 248, 0.4);
        }
        .hidden-checkbox { display: none; }
        .check-box-indicator {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1.5px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .checkbox-card.checked .check-box-indicator {
          background: #38bdf8;
          border-color: #38bdf8;
        }
        .check-label {
          font-size: 0.8rem;
          color: var(--text-primary);
          line-height: 1.3;
        }
        .form-select, .form-input {
          width: 100%;
          padding: 10px 14px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          font-size: 0.88rem;
          color: var(--text-primary);
          outline: none;
        }
        .form-select:focus, .form-input:focus {
          border-color: #38bdf8;
        }
        .channel-toggles {
          display: flex;
          gap: 20px;
        }
        .toggle-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.84rem;
          color: var(--text-primary);
          cursor: pointer;
        }
        .phone-input-box {
          margin-top: 8px;
        }
        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 10px;
          padding-top: 16px;
          border-top: 1px solid var(--border-subtle);
        }
        .cancel-btn {
          padding: 10px 18px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          font-weight: 600;
        }
        .save-btn {
          padding: 10px 22px;
          background: linear-gradient(135deg, #38bdf8, #06b6d4);
          color: #0b0f17;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
};
