import React, { useState } from 'react';

export const AdvisoryCard = ({
  risk,
  advisory,
  profile,
  location,
  aqiData,
  weather,
  onSimulate,
  isGenerating,
  onViewAdvisory,
  mode = 'full'
}) => {
  const [simAqi, setSimAqi] = useState(220);
  const [simTemp, setSimTemp] = useState(38);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);

  const riskScore = Math.round(risk?.numeric_score ?? 62);
  const riskLevel = risk?.risk_level || 'moderate';
  const badge = risk?.badge || 'Moderate Risk';

  const riskColor = riskLevel === 'severe' ? '#ef4444' : riskLevel === 'high' ? '#f97316' : riskLevel === 'moderate' ? '#f59e0b' : '#10b981';
  const riskBg = riskLevel === 'severe' ? '#fef2f2' : riskLevel === 'high' ? '#fff7ed' : riskLevel === 'moderate' ? '#fffbeb' : '#ecfdf5';
  const riskBorder = riskLevel === 'severe' ? '#fecaca' : riskLevel === 'high' ? '#fed7aa' : riskLevel === 'moderate' ? '#fde68a' : '#a7f3d0';
  const riskText = riskLevel === 'severe' ? '#991b1b' : riskLevel === 'high' ? '#9a3412' : riskLevel === 'moderate' ? '#92400e' : '#065f46';

  const actionItems = advisory?.action_items || [
    'Limit strenuous outdoor activity 11 AM – 4 PM.',
    'Keep rescue inhaler accessible if commuting.',
    'Use N95 mask during peak roadside exposure.'
  ];

  const currentAqiVal = Math.round(aqiData?.aqi || 147);
  const currentTempVal = Math.round(weather?.temperature || 29);

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = Math.min(100, Math.max(0, riskScore)) / 100;
  const strokeDashoffset = circumference - (progressRatio * circumference);

  const handleRunSimulation = async () => {
    setSimLoading(true);
    try {
      if (onSimulate) {
        const res = await onSimulate({
          simulate_aqi: Number(simAqi),
          simulate_temp: Number(simTemp)
        });
        if (res) setSimResult(res);
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimLoading(false);
    }
  };

  if (mode === 'compact') {
    return (
      <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.015em' }}>
              Your Health Today
            </h2>
            <span style={{
              fontSize: '0.66rem',
              fontWeight: 700,
              color: '#0369a1',
              background: '#e0f2fe',
              padding: '3px 8px',
              borderRadius: '999px',
              border: '1px solid #bae6fd',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              Personalized
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '118px', height: '118px', flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="none" />
                <circle
                  cx="50" cy="50" r="40"
                  stroke={riskColor}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
              </svg>
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: '1.7rem', fontWeight: 700, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.03em' }}>
                  {riskScore}
                </span>
                <span style={{ fontSize: '0.66rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>/ 100</span>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{
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
              }}>
                {badge}
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', margin: '0 0 4px 0', lineHeight: 1.3, letterSpacing: '-0.015em' }}>
                Today's air may affect you more.
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.45, margin: 0 }}>
                Elevated PM2.5 with your {profile?.conditions?.[0]?.replace('_', ' ') || 'sensitivity'} increases irritation.
              </p>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: '18px',
          paddingTop: '14px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
            {risk?.is_escalated ? `Multiplier +${risk.escalation_count}` : 'Baseline'}
          </span>
          <button
            onClick={onViewAdvisory}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#0f172a',
              background: '#f1f5f9',
              padding: '6px 14px',
              borderRadius: '999px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            View Advisory →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>
            Personal Advisory
          </h1>
          <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
            {location?.label || 'Bhopal'} · Today's tailored guidance
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: riskBg,
          border: `1px solid ${riskBorder}`,
          padding: '6px 14px',
          borderRadius: '999px'
        }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 700, color: riskText, letterSpacing: '-0.02em' }}>{riskScore}</span>
          <span style={{ fontSize: '0.8rem', color: riskText, fontWeight: 600 }}>/ 100 · {badge}</span>
        </div>
      </div>

      <div className="premium-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.015em' }}>
            Action Timeline
          </h2>
        </div>

        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '14px',
          padding: '14px 18px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#b91c1c' }}>
              Avoid window
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#991b1b', marginTop: '2px' }}>
              11:00 AM – 4:00 PM
            </div>
          </div>
          <div style={{ background: '#ffffff', padding: '6px 14px', borderRadius: '10px', border: '1px solid #fca5a5', textAlign: 'right' }}>
            <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.04em' }}>BETTER WINDOW</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#059669' }}>6:30 PM – 8:30 PM</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
          {actionItems.slice(0, 3).map((item, idx) => (
            <div key={idx} style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.7rem',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                {idx + 1}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#1e293b', fontWeight: 500, lineHeight: 1.4, letterSpacing: '-0.01em' }}>
                {item}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="premium-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.015em' }}>
            Why is my risk different?
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Environmental
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <FactorRow label="Fine Particulates" impact="HIGH" color="#f97316" bg="#fff7ed" border="#fed7aa" />
              <FactorRow label="Ambient AQI" impact="MODERATE" color="#f59e0b" bg="#fffbeb" border="#fde68a" />
              <FactorRow label="Solar UV" impact="LOW" color="#10b981" bg="#ecfdf5" border="#a7f3d0" />
              <FactorRow label="Heat & Humidity" impact="MODERATE" color="#f59e0b" bg="#fffbeb" border="#fde68a" />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Personal Multipliers
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <MultiplierRow
                label="Asthma"
                active={profile?.conditions?.includes('asthma')}
                value={profile?.conditions?.includes('asthma') ? '+50%' : '1.0×'}
              />
              <MultiplierRow
                label="Outdoor Exposure"
                active={profile?.occupation === 'outdoor_worker'}
                value={profile?.occupation === 'outdoor_worker' ? '+25%' : '1.0×'}
              />
              <MultiplierRow
                label="Age"
                active={profile?.age_group === '60+'}
                value={profile?.age_group === '60+' ? '+30%' : '1.0×'}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="premium-card">
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Same air. Different risk.
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 4px', letterSpacing: '-0.02em' }}>
            Personalized vulnerability
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
            Under AQI {currentAqiVal}, {currentTempVal}°C — watch how risk diverges per profile:
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          <PersonaCard
            name="Karan Malhotra"
            subtitle="26 · Healthy · Office"
            level="low"
            score={38}
            description="Lungs resilient. Normal activity can proceed."
          />
          <PersonaCard
            name="Rajiv Verma"
            subtitle="68 · Heart disease"
            level="severe"
            score={88}
            description="Particulates trigger acute cardiovascular strain."
          />
        </div>
      </div>

      <div className="premium-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.015em' }}>
            What if conditions change?
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
              <span>AQI</span>
              <span style={{ color: '#0284c7' }}>{simAqi}</span>
            </div>
            <input
              type="range" min="30" max="380" value={simAqi}
              onChange={e => setSimAqi(e.target.value)}
              style={{ width: '100%', accentColor: '#0284c7' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, marginTop: '14px', marginBottom: '6px' }}>
              <span>Temperature</span>
              <span style={{ color: '#f97316' }}>{simTemp}°C</span>
            </div>
            <input
              type="range" min="15" max="46" value={simTemp}
              onChange={e => setSimTemp(e.target.value)}
              style={{ width: '100%', accentColor: '#f97316' }}
            />

            <button
              onClick={handleRunSimulation}
              disabled={simLoading || isGenerating}
              style={{
                marginTop: '16px',
                width: '100%',
                padding: '10px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '999px',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              {simLoading || isGenerating ? 'Recalculating…' : 'Recalculate Risk →'}
            </button>
          </div>

          <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '14px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Current → Simulated
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', margin: '12px 0' }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#64748b', letterSpacing: '-0.02em' }}>{riskScore}</div>
                <div style={{ fontSize: '0.62rem', color: '#94a3b8', letterSpacing: '0.05em' }}>NOW</div>
              </div>
              <span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>→</span>
              <div>
                <div style={{
                  fontSize: '1.9rem',
                  fontWeight: 700,
                  color: simResult?.risk?.risk_level === 'severe' ? '#ef4444' : '#f97316',
                  letterSpacing: '-0.03em'
                }}>
                  {simResult ? Math.round(simResult.risk?.numeric_score) : Math.round(Number(simAqi) * 0.45)}
                </div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#dc2626', letterSpacing: '0.05em' }}>
                  {simResult?.risk?.badge || 'EVALUATE'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#334155', fontStyle: 'normal' }}>
              {simResult?.advisory?.headline || 'Adjust sliders and recalculate.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FactorRow = ({ label, impact, color, bg, border }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: bg,
    borderRadius: '10px',
    border: `1px solid ${border}`,
    fontSize: '0.82rem'
  }}>
    <span style={{ color: '#334155', fontWeight: 500 }}>{label}</span>
    <span style={{ fontWeight: 700, color: color, fontSize: '0.7rem', letterSpacing: '0.04em' }}>{impact}</span>
  </div>
);

const MultiplierRow = ({ label, active, value }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: active ? '#fff7ed' : '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #f1f5f9',
    fontSize: '0.82rem'
  }}>
    <span style={{ color: '#334155', fontWeight: 500 }}>{label}</span>
    <span style={{ fontWeight: 700, color: active ? '#9a3412' : '#64748b' }}>
      {active ? `${value} (Active)` : `${value} Baseline`}
    </span>
  </div>
);

const PersonaCard = ({ name, subtitle, level, score, description }) => {
  const bg = level === 'severe' ? '#fef2f2' : '#ecfdf5';
  const border = level === 'severe' ? '#fecaca' : '#a7f3d0';
  const textColor = level === 'severe' ? '#991b1b' : '#065f46';
  return (
    <div style={{ background: '#ffffff', borderRadius: '14px', padding: '16px', border: `1.5px solid ${border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', letterSpacing: '-0.015em' }}>{name}</div>
          <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{subtitle}</div>
        </div>
        <span style={{
          fontSize: '0.66rem',
          fontWeight: 700,
          color: textColor,
          background: bg,
          padding: '3px 8px',
          borderRadius: '999px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase'
        }}>
          {level === 'severe' ? 'High' : 'Low'}
        </span>
      </div>
      <div style={{ margin: '12px 0', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px' }}>
        <div style={{ fontSize: '0.66rem', color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Same Air · AQI {score}</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: textColor, letterSpacing: '-0.02em' }}>
          {score}/100
        </div>
      </div>
      <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, lineHeight: 1.4 }}>
        {description}
      </p>
    </div>
  );
};