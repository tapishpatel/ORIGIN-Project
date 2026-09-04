import React from 'react';

export const AQIGauge = ({ aqiData }) => {
  const aqi = aqiData?.aqi ?? 0;
  const pm25 = aqiData?.pm2_5 ?? 0;
  const pm10 = aqiData?.pm10 ?? 0;
  const no2 = aqiData?.nitrogen_dioxide ?? 0;
  const o3 = aqiData?.ozone ?? 0;
  const category = aqiData?.category || 'Moderate';
  const isFallback = Boolean(aqiData?.is_fallback || aqiData?.source === 'fallback');

  const currentAqi = Math.round(aqi);
  const maxAqi = 300;
  const clampedAqi = Math.min(maxAqi, Math.max(0, currentAqi));
  const progressRatio = clampedAqi / maxAqi;
  const halfCircumference = 251.2;
  const strokeDashoffset = halfCircumference - (progressRatio * halfCircumference);

  const categoryColor = currentAqi > 200 ? '#b91c1c' : currentAqi > 150 ? '#ef4444' : currentAqi > 100 ? '#f97316' : currentAqi > 50 ? '#f59e0b' : '#10b981';

  return (
    <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.015em' }}>
            Air Quality
          </h2>
          {isFallback ? (
            <span style={{
              fontSize: '0.66rem',
              fontWeight: 700,
              color: '#b91c1c',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              padding: '3px 9px',
              borderRadius: '999px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              Fallback
            </span>
          ) : (
            <span style={{
              fontSize: '0.66rem',
              fontWeight: 700,
              color: '#065f46',
              background: '#ecfdf5',
              padding: '3px 9px',
              borderRadius: '999px',
              border: '1px solid #a7f3d0',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              ● Live
            </span>
          )}
        </div>

        <div style={{ textAlign: 'center', position: 'relative', margin: '6px 0 8px' }}>
          <svg viewBox="0 0 200 110" style={{ width: '200px', height: 'auto', margin: '0 auto', display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id="aqiArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="35%" stopColor="#f59e0b" />
                <stop offset="70%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#aqiArcGrad)"
              strokeWidth="14"
              strokeDasharray={halfCircumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          </svg>

          <div style={{ marginTop: '-40px' }}>
            <div style={{ fontSize: '2.4rem', fontWeight: 700, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.035em' }}>
              {currentAqi}
            </div>
            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>
              US AQI
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: categoryColor, marginTop: '4px' }}>
              {category}
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px',
          textAlign: 'center',
          marginTop: '18px',
          paddingTop: '14px',
          borderTop: '1px solid #f1f5f9'
        }}>
          <PollutantTile label="PM2.5" value={pm25} />
          <PollutantTile label="PM10" value={pm10} />
          <PollutantTile label="NO₂" value={no2} />
          <PollutantTile label="O₃" value={o3} />
        </div>
      </div>
    </div>
  );
};

const PollutantTile = ({ label, value }) => (
  <div style={{ background: '#f8fafc', padding: '8px 4px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
    <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 600 }}>{label}</div>
    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>{Math.round(value)}</div>
    <div style={{ fontSize: '0.58rem', color: '#94a3b8' }}>µg/m³</div>
  </div>
);