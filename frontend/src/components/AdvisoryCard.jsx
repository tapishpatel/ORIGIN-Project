import React, { useState } from 'react';

export const AdvisoryCard = ({
  risk,
  advisory,
  profile,
  location,
  aqiData,
  weather,
  historyData,
  onSimulate,
  onRegenerateAdvisory,
  onDispatchAlert,
  onSendCustomSms,
  isGenerating = false,
  onViewAdvisory,
  mode = 'full'
}) => {
  const [simAqi, setSimAqi] = useState(220);
  const [simTemp, setSimTemp] = useState(38);
  const [simUv, setSimUv] = useState(7);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [checkedActions, setCheckedActions] = useState({});
  const [activeHistoryFilter, setActiveHistoryFilter] = useState('all');
  const [activePreset, setActivePreset] = useState(null);

  const riskScore = Math.round(risk?.numeric_score ?? 62);
  const riskLevel = risk?.risk_level || 'moderate';
  const badge = risk?.badge || 'Moderate Risk';

  const riskColor =
    riskLevel === 'severe'
      ? '#ef4444'
      : riskLevel === 'high'
      ? '#f97316'
      : riskLevel === 'moderate'
      ? '#f59e0b'
      : '#10b981';

  const riskBg =
    riskLevel === 'severe'
      ? '#fef2f2'
      : riskLevel === 'high'
      ? '#fff7ed'
      : riskLevel === 'moderate'
      ? '#fffbeb'
      : '#ecfdf5';

  const riskBorder =
    riskLevel === 'severe'
      ? '#fecaca'
      : riskLevel === 'high'
      ? '#fed7aa'
      : riskLevel === 'moderate'
      ? '#fde68a'
      : '#a7f3d0';

  const riskText =
    riskLevel === 'severe'
      ? '#991b1b'
      : riskLevel === 'high'
      ? '#9a3412'
      : riskLevel === 'moderate'
      ? '#92400e'
      : '#065f46';

  const actionItems =
    advisory?.action_items && advisory.action_items.length > 0
      ? advisory.action_items
      : [
          'Limit strenuous outdoor activity during peak smog hours (11 AM – 4 PM).',
          'Keep rescue medication or maintenance inhaler accessible if commuting.',
          'Use certified N95 or KN95 respirator during prolonged roadside exposure.',
          'Maintain indoor air circulation with sealed windows and HEPA filtration.'
        ];

  const currentAqiVal = Math.round(aqiData?.aqi || 140);
  const currentTempVal = Math.round(weather?.temperature || 29);
  const currentPm25Val = Math.round(aqiData?.pm2_5 || 32);
  const currentUvVal = Math.round(weather?.uv_index || 5);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.min(100, Math.max(0, riskScore)) / 100;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const toggleAction = (idx) => {
    setCheckedActions((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const completedCount = Object.values(checkedActions).filter(Boolean).length;
  const checklistProgress = Math.round((completedCount / (actionItems.length || 1)) * 100);

  const handleRunSimulation = async (customAqi = simAqi, customTemp = simTemp, customUv = simUv) => {
    setSimLoading(true);
    try {
      if (onSimulate) {
        const res = await onSimulate({
          simulate_aqi: Number(customAqi),
          simulate_temp: Number(customTemp),
          simulate_uv: Number(customUv)
        });
        if (res) {
          setSimResult(res);
        }
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimLoading(false);
    }
  };

  const applyPreset = (presetName, aqi, temp, uv) => {
    setActivePreset(presetName);
    setSimAqi(aqi);
    setSimTemp(temp);
    setSimUv(uv);
    handleRunSimulation(aqi, temp, uv);
  };

  // Compact card view for dashboard home
  if (mode === 'compact') {
    return (
      <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.015em' }}>
              Your Health Risk Today
            </h2>
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                color: '#0369a1',
                background: '#e0f2fe',
                padding: '3px 8px',
                borderRadius: '999px',
                border: '1px solid #bae6fd',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}
            >
              {advisory?.engine_mode ? '✨ AI Intelligence' : 'Personalized'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '118px', height: '118px', flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={riskColor}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span style={{ fontSize: '1.7rem', fontWeight: 700, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.03em' }}>
                  {riskScore}
                </span>
                <span style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>/ 100</span>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: '180px' }}>
              <div
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: riskBg,
                  border: `1px solid ${riskBorder}`,
                  color: riskText,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '8px'
                }}
              >
                {badge}
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0', lineHeight: 1.3, letterSpacing: '-0.015em' }}>
                {advisory?.headline || "Today's air may affect you more."}
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.45, margin: 0 }}>
                {advisory?.advisory_text
                  ? advisory.advisory_text.slice(0, 140) + '…'
                  : `Elevated PM2.5 (${currentPm25Val} µg/m³) with your ${
                      profile?.conditions?.[0]?.replace('_', ' ') || 'sensitivity'
                    } increases irritation.`}
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: '18px',
            paddingTop: '14px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            {advisory?.engine_mode || 'Clinical Intelligence Feed'}
          </span>
          <button
            onClick={onViewAdvisory}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#0f172a',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '6px 12px',
              borderRadius: '999px',
              cursor: 'pointer'
            }}
          >
            View Full Advisory →
          </button>
        </div>
      </div>
    );
  }

  // Full Advisory View
  const alertsList = historyData?.alerts || [
    {
      id: 'init-1',
      timestamp: new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      place: location?.label || 'Bhopal, Madhya Pradesh',
      risk_level: riskLevel,
      headline: advisory?.headline || 'Active Health Advisory Dispatch',
      advisory_text: advisory?.advisory_text || 'Ambient air conditions evaluated against personal health profile.',
      channel_sent: ['email', 'sms', 'in-app']
    }
  ];

  const filteredAlerts = alertsList.filter((a) => {
    if (activeHistoryFilter === 'all') return true;
    if (activeHistoryFilter === 'email') return a.channel_sent?.includes('email') || a.channel === 'email';
    if (activeHistoryFilter === 'sms') return a.channel_sent?.includes('sms') || a.channel === 'sms';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner & Action Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#0369a1',
                background: '#e0f2fe',
                padding: '3px 10px',
                borderRadius: '999px',
                border: '1px solid #bae6fd',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}
            >
              {advisory?.engine_mode || '✨ AI Public Health Intelligence'}
            </span>
            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
              📍 {location?.label || 'Current Location'}
            </span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>
            Personalized Clinical Advisory
          </h1>
          <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
            Dynamic environmental health assessment computed from live atmospheric telemetry and your physiological vulnerabilities.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {onRegenerateAdvisory && (
            <button
              onClick={onRegenerateAdvisory}
              disabled={isGenerating}
              style={{
                padding: '8px 16px',
                borderRadius: '999px',
                background: '#f1f5f9',
                color: '#0f172a',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isGenerating ? '⚡ Regenerating…' : '🔄 Regenerate AI Advisory'}
            </button>
          )}

          {onDispatchAlert && (
            <button
              onClick={onDispatchAlert}
              disabled={isGenerating}
              style={{
                padding: '8px 18px',
                borderRadius: '999px',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)'
              }}
            >
              {isGenerating ? '⚡ Dispatching…' : '📢 Dispatch Alert to Email'}
            </button>
          )}
        </div>
      </div>

      {/* Main Clinical Advisory Hero Card */}
      <div
        className="premium-card"
        style={{
          border: `1.5px solid ${riskBorder}`,
          background: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
          padding: '24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '96px', height: '96px', flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="none" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={riskColor}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.03em' }}>
                  {riskScore}
                </span>
                <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600 }}>/ 100</span>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '999px',
                    background: riskBg,
                    border: `1px solid ${riskBorder}`,
                    color: riskText,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  {badge}
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  {risk?.is_escalated ? `Multiplier +${risk.escalation_count} Level` : 'Baseline Risk'}
                </span>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                {advisory?.headline || 'Active Health Advisory'}
              </h2>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '8px 14px',
              borderRadius: '12px'
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>🌡️</span>
            <div style={{ fontSize: '0.76rem', color: '#334155' }}>
              <strong>{currentTempVal}°C</strong> · AQI <strong>{currentAqiVal}</strong> · PM2.5 <strong>{currentPm25Val} µg/m³</strong> · UV <strong>{currentUvVal}</strong>
            </div>
          </div>
        </div>

        {/* Advisory Narrative */}
        <div
          style={{
            background: riskBg,
            border: `1.5px solid ${riskBorder}`,
            borderRadius: '14px',
            padding: '16px 20px',
            marginBottom: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: riskText, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📢 Clinical Health Evaluation
            </span>
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                background: '#ffffff',
                color: riskText,
                padding: '2px 8px',
                borderRadius: '999px',
                border: `1px solid ${riskBorder}`
              }}
            >
              {advisory?.model_used || advisory?.engine_mode || 'AI Clinical Engine'}
            </span>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#1e293b', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
            {advisory?.advisory_text ||
              'Based on your health profile and live ambient measurements, fine micro-particulates are compounding your respiratory sensitivity. Follow the recommended precautions below.'}
          </p>
        </div>

        {/* Interactive Actionable Precautions Checklist */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                Recommended Health Precautions ({completedCount}/{actionItems.length} Completed)
              </h3>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Check off items as you implement them to protect your respiratory health.
              </span>
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: checklistProgress === 100 ? '#059669' : '#0284c7',
                background: checklistProgress === 100 ? '#ecfdf5' : '#f0f9ff',
                padding: '3px 10px',
                borderRadius: '999px',
                border: `1px solid ${checklistProgress === 100 ? '#a7f3d0' : '#bae6fd'}`
              }}
            >
              {checklistProgress}% Completed
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', marginBottom: '14px' }}>
            <div
              style={{
                height: '100%',
                width: `${checklistProgress}%`,
                background: checklistProgress === 100 ? '#10b981' : '#0284c7',
                transition: 'width 0.4s ease'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            {actionItems.map((action, idx) => {
              const isChecked = !!checkedActions[idx];
              return (
                <div
                  key={idx}
                  onClick={() => toggleAction(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: isChecked ? '#ecfdf5' : '#f8fafc',
                    border: `1.5px solid ${isChecked ? '#a7f3d0' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    style={{
                      marginTop: '3px',
                      accentColor: '#10b981',
                      cursor: 'pointer',
                      width: '16px',
                      height: '16px'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: isChecked ? '#065f46' : '#0f172a',
                        textDecoration: isChecked ? 'line-through' : 'none',
                        lineHeight: 1.4
                      }}
                    >
                      {action}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Multi-Dimension Vulnerability Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div className="premium-card">
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
            Environmental Factors Today
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <FactorRow
              label="Fine Particulates (PM2.5)"
              val={`${currentPm25Val} µg/m³`}
              impact={currentPm25Val > 35 ? 'HIGH' : currentPm25Val > 20 ? 'MODERATE' : 'LOW'}
              color={currentPm25Val > 35 ? '#ea580c' : '#f59e0b'}
              bg={currentPm25Val > 35 ? '#fff7ed' : '#fffbeb'}
              border={currentPm25Val > 35 ? '#fed7aa' : '#fde68a'}
            />
            <FactorRow
              label="Ambient AQI"
              val={`AQI ${currentAqiVal}`}
              impact={currentAqiVal > 150 ? 'UNHEALTHY' : currentAqiVal > 100 ? 'MODERATE' : 'GOOD'}
              color={currentAqiVal > 150 ? '#ef4444' : currentAqiVal > 100 ? '#f59e0b' : '#10b981'}
              bg={currentAqiVal > 150 ? '#fef2f2' : currentAqiVal > 100 ? '#fffbeb' : '#ecfdf5'}
              border={currentAqiVal > 150 ? '#fecaca' : currentAqiVal > 100 ? '#fde68a' : '#a7f3d0'}
            />
            <FactorRow
              label="Solar UV Index"
              val={`UV ${currentUvVal}`}
              impact={currentUvVal >= 7 ? 'HIGH' : currentUvVal >= 4 ? 'MODERATE' : 'LOW'}
              color={currentUvVal >= 7 ? '#ea580c' : '#10b981'}
              bg={currentUvVal >= 7 ? '#fff7ed' : '#ecfdf5'}
              border={currentUvVal >= 7 ? '#fed7aa' : '#a7f3d0'}
            />
            <FactorRow
              label="Ambient Temperature"
              val={`${currentTempVal}°C`}
              impact={currentTempVal > 35 ? 'HIGH HEAT' : 'NORMAL'}
              color={currentTempVal > 35 ? '#ef4444' : '#0284c7'}
              bg={currentTempVal > 35 ? '#fef2f2' : '#f0f9ff'}
              border={currentTempVal > 35 ? '#fecaca' : '#bae6fd'}
            />
          </div>
        </div>

        <div className="premium-card">
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
            Personal Health Multipliers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <MultiplierRow
              label="Respiratory / Asthma"
              active={profile?.conditions?.includes('asthma')}
              value={profile?.conditions?.includes('asthma') ? '+50% Sensitivity' : '1.0×'}
            />
            <MultiplierRow
              label="Cardiovascular / Heart Disease"
              active={profile?.conditions?.includes('heart_disease') || profile?.conditions?.includes('hypertension')}
              value={profile?.conditions?.includes('heart_disease') || profile?.conditions?.includes('hypertension') ? '+40% Vascular Load' : '1.0×'}
            />
            <MultiplierRow
              label="Outdoor Exertion / Occupation"
              active={profile?.occupation === 'outdoor_worker' || profile?.occupation === 'athlete'}
              value={profile?.occupation === 'outdoor_worker' || profile?.occupation === 'athlete' ? '+25% Inhalation Multiplier' : '1.0×'}
            />
            <MultiplierRow
              label="Vulnerable Age Cohort"
              active={profile?.age_group === '60+' || profile?.age_group === '<18'}
              value={profile?.age_group === '60+' || profile?.age_group === '<18' ? '+30% Compounded Risk' : '1.0×'}
            />
          </div>
        </div>
      </div>

      {/* Live "What-If" Scenario Lab */}
      <div className="premium-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Interactive Clinical Simulation
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px', letterSpacing: '-0.02em' }}>
              What-If Environmental Scenario Lab
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Adjust AQI, Temperature, and UV to simulate acute environmental spikes and observe how your health risk shifts.
            </p>
          </div>

          {/* Quick Scenario Presets */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'smog', label: 'Severe Smog (AQI 320)', aqi: 320, temp: 22, uv: 4 },
              { id: 'heatwave', label: 'Heatwave (42°C, AQI 170)', aqi: 170, temp: 42, uv: 10 },
              { id: 'clean', label: 'Clean Post-Rain (AQI 45)', aqi: 45, temp: 25, uv: 4 }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id, p.aqi, p.temp, p.uv)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: activePreset === p.id ? 700 : 500,
                  background: activePreset === p.id ? '#0f172a' : '#f8fafc',
                  color: activePreset === p.id ? '#ffffff' : '#334155',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'center' }}>
          <div>
            {/* AQI Slider */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                <span style={{ color: '#0f172a' }}>Simulated AQI</span>
                <span style={{ color: simAqi > 200 ? '#ef4444' : simAqi > 100 ? '#ea580c' : '#059669', fontWeight: 700 }}>
                  AQI {simAqi}
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="450"
                value={simAqi}
                onChange={(e) => {
                  setSimAqi(e.target.value);
                  setActivePreset(null);
                }}
                style={{ width: '100%', accentColor: '#0284c7' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8' }}>
                <span>Good (30)</span>
                <span>Moderate (100)</span>
                <span>Unhealthy (200)</span>
                <span>Hazardous (450)</span>
              </div>
            </div>

            {/* Temperature Slider */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                <span style={{ color: '#0f172a' }}>Simulated Temperature</span>
                <span style={{ color: simTemp > 38 ? '#ef4444' : '#f97316', fontWeight: 700 }}>
                  {simTemp}°C
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="48"
                value={simTemp}
                onChange={(e) => {
                  setSimTemp(e.target.value);
                  setActivePreset(null);
                }}
                style={{ width: '100%', accentColor: '#f97316' }}
              />
            </div>

            {/* UV Index Slider */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                <span style={{ color: '#0f172a' }}>Simulated Solar UV</span>
                <span style={{ color: simUv > 7 ? '#ea580c' : '#10b981', fontWeight: 700 }}>
                  UV {simUv}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                value={simUv}
                onChange={(e) => {
                  setSimUv(e.target.value);
                  setActivePreset(null);
                }}
                style={{ width: '100%', accentColor: '#10b981' }}
              />
            </div>

            <button
              onClick={() => handleRunSimulation()}
              disabled={simLoading || isGenerating}
              style={{
                width: '100%',
                padding: '11px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '999px',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {simLoading ? '⚡ Recalculating Clinical Risk…' : 'Run Scenario Simulation →'}
            </button>
          </div>

          {/* Simulation Result Comparison Box */}
          <div
            style={{
              background: '#f8fafc',
              padding: '20px',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Current Telemetry → Simulated Outcome
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', margin: '16px 0' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#64748b', letterSpacing: '-0.02em' }}>
                  {riskScore}
                </div>
                <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>
                  CURRENT ({riskLevel.toUpperCase()})
                </div>
              </div>

              <span style={{ fontSize: '1.4rem', color: '#94a3b8' }}>→</span>

              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '2.1rem',
                    fontWeight: 700,
                    color:
                      simResult?.risk?.risk_level === 'severe'
                        ? '#ef4444'
                        : simResult?.risk?.risk_level === 'high'
                        ? '#f97316'
                        : simResult?.risk?.risk_level === 'moderate'
                        ? '#f59e0b'
                        : '#10b981',
                    letterSpacing: '-0.03em'
                  }}
                >
                  {simResult ? Math.round(simResult.risk?.numeric_score) : Math.round(Number(simAqi) * 0.45)}
                </div>
                <div
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color:
                      simResult?.risk?.risk_level === 'severe'
                        ? '#dc2626'
                        : simResult?.risk?.risk_level === 'high'
                        ? '#ea580c'
                        : '#0284c7',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase'
                  }}
                >
                  {simResult?.risk?.badge || 'SIMULATED RATING'}
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 14px',
                textAlign: 'left'
              }}
            >
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                {simResult?.advisory?.headline || 'Hypothetical Scenario Impact'}
              </div>
              <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45, margin: 0 }}>
                {simResult?.advisory?.advisory_text ||
                  `At AQI ${simAqi} and ${simTemp}°C, your personal multipliers would elevate pulmonary irritation by +${Math.round(
                    Number(simAqi) * 0.25
                  )} points.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Persona Side-by-Side Comparison */}
      <div className="premium-card">
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.015em' }}>
            Persona Comparison: Same Air, Different Risk
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0 0' }}>
            Comparing how today's atmospheric readings (AQI {currentAqiVal}, {currentTempVal}°C) impact different health profiles.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <PersonaCard
            name="Aditi Sharma"
            subtitle="Asthma · Outdoor Worker (Age 28)"
            level="severe"
            score={Math.min(96, Math.round(currentAqiVal * 0.65))}
            description="High bronchial irritation; deep breathing during outdoor shifts pulls micro-particulates into alveoli."
          />
          <PersonaCard
            name="Ramesh Patel"
            subtitle="Senior · Cardiac History (Age 68)"
            level="high"
            score={Math.min(88, Math.round(currentAqiVal * 0.55))}
            description="Elevated PM2.5 constricts systemic micro-vessels, increasing cardiovascular load and blood pressure."
          />
          <PersonaCard
            name="Aarav Verma"
            subtitle="Healthy Adult · Office Worker (Age 24)"
            level="moderate"
            score={Math.min(48, Math.round(currentAqiVal * 0.32))}
            description="Standard baseline; indoor filtration provides adequate protection for routine work schedules."
          />
        </div>
      </div>

      {/* Chronological Advisory & Alert Audit Log */}
      <div className="premium-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.015em' }}>
              Advisory & Alert Dispatch History
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '3px 0 0' }}>
              Audit trail of evaluated conditions, date, time, and verified delivery channels.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {['all', 'email', 'sms'].map((f) => (
              <button
                key={f}
                onClick={() => setActiveHistoryFilter(f)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: activeHistoryFilter === f ? 700 : 500,
                  background: activeHistoryFilter === f ? '#0f172a' : '#f8fafc',
                  color: activeHistoryFilter === f ? '#ffffff' : '#64748b',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredAlerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.84rem' }}>
              No alerts found for this filter.
            </div>
          ) : (
            filteredAlerts.map((al, ai) => {
              const aLevel = al.risk_level || 'moderate';
              const aBorder = aLevel === 'severe' ? '#fca5a5' : aLevel === 'high' ? '#fdba74' : aLevel === 'moderate' ? '#fde68a' : '#a7f3d0';
              const aBg = aLevel === 'severe' ? '#fef2f2' : aLevel === 'high' ? '#fff7ed' : aLevel === 'moderate' ? '#fffbeb' : '#ecfdf5';
              const aColor = aLevel === 'severe' ? '#991b1b' : aLevel === 'high' ? '#9a3412' : aLevel === 'moderate' ? '#92400e' : '#065f46';

              return (
                <div
                  key={al.id || ai}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    border: '1px solid #e2e8f0',
                    borderLeft: `4px solid ${aColor}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: aBg,
                          color: aColor,
                          border: `1px solid ${aBorder}`,
                          textTransform: 'uppercase'
                        }}
                      >
                        {aLevel}
                      </span>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>{al.headline}</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 500 }}>
                      🗓️ {al.timestamp || al.date || 'Recent'} · 📍 {al.place || al.city || location?.label}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.81rem', color: '#334155', lineHeight: 1.45, margin: '6px 0 10px' }}>
                    {al.advisory_text || al.custom_alert_message || 'Personalized environmental alert evaluated against active profile.'}
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid #f1f5f9',
                      fontSize: '0.72rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#64748b' }}>Dispatched via:</span>
                      {(al.channel_sent || ['email']).map((ch, ci) => (
                        <span key={ci} style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, color: '#334155' }}>
                          {ch === 'sms' ? '📱 SMS' : ch === 'email' ? '✉️ Email' : '🔔 In-App'}
                        </span>
                      ))}
                    </div>
                    <span style={{ color: '#059669', fontWeight: 600 }}>✓ Verified Delivery</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const FactorRow = ({ label, val, impact, color, bg, border }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 12px',
      background: bg,
      borderRadius: '10px',
      border: `1px solid ${border}`,
      fontSize: '0.82rem'
    }}
  >
    <span style={{ color: '#334155', fontWeight: 500 }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.78rem' }}>{val}</span>
      <span style={{ fontWeight: 700, color: color, fontSize: '0.68rem', letterSpacing: '0.04em' }}>{impact}</span>
    </div>
  </div>
);

const MultiplierRow = ({ label, active, value }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 12px',
      background: active ? '#fff7ed' : '#f8fafc',
      borderRadius: '10px',
      border: '1px solid #f1f5f9',
      fontSize: '0.82rem'
    }}
  >
    <span style={{ color: '#334155', fontWeight: 500 }}>{label}</span>
    <span style={{ fontWeight: 700, color: active ? '#9a3412' : '#64748b' }}>
      {active ? `${value} (Active)` : `${value} Baseline`}
    </span>
  </div>
);

const PersonaCard = ({ name, subtitle, level, score, description }) => {
  const bg = level === 'severe' ? '#fef2f2' : level === 'high' ? '#fff7ed' : '#ecfdf5';
  const border = level === 'severe' ? '#fecaca' : level === 'high' ? '#fed7aa' : '#a7f3d0';
  const textColor = level === 'severe' ? '#991b1b' : level === 'high' ? '#9a3412' : '#065f46';
  return (
    <div style={{ background: '#ffffff', borderRadius: '14px', padding: '16px', border: `1.5px solid ${border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', letterSpacing: '-0.015em' }}>{name}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{subtitle}</div>
        </div>
        <span
          style={{
            fontSize: '0.66rem',
            fontWeight: 700,
            color: textColor,
            background: bg,
            padding: '3px 8px',
            borderRadius: '999px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}
        >
          {level}
        </span>
      </div>
      <div style={{ margin: '12px 0', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px' }}>
        <div style={{ fontSize: '0.64rem', color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Personalized Risk Rating
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: textColor, letterSpacing: '-0.02em' }}>
          {score}/100
        </div>
      </div>
      <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.4 }}>{description}</p>
    </div>
  );
};