import React, { useState } from 'react';

export const HistoryTrends = ({ historyData }) => {
  const [selectedMetric, setSelectedMetric] = useState('risk');

  const metrics = [
    { id: 'risk', label: 'Personal Risk' },
    { id: 'aqi', label: 'AQI' },
    { id: 'pm25', label: 'PM2.5' },
    { id: 'temp', label: 'Temperature' },
    { id: 'humidity', label: 'Humidity' }
  ];

  const pointsData = [
    { label: 'Mon 1', x: 60, y: 180, val: 24 },
    { label: 'Tue 2', x: 160, y: 162, val: 32 },
    { label: 'Wed 3', x: 260, y: 150, val: 40 },
    { label: 'Thu 4', x: 360, y: 120, val: 56 },
    { label: 'Fri 5', x: 460, y: 70, val: 82, isPeak: true },
    { label: 'Sat 6', x: 560, y: 85, val: 74 },
    { label: 'Sun 7', x: 660, y: 140, val: 48 }
  ];

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
            Your Health Week
          </h1>
          <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
            How environmental conditions affect your health.
          </p>
        </div>

        <div style={{
          padding: '6px 14px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '999px',
          fontSize: '0.8rem',
          fontWeight: 500,
          color: '#334155'
        }}>
          📅 Sep 01 – Sep 07, 2026 ⌵
        </div>
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {metrics.map(m => {
          const isActive = selectedMetric === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedMetric(m.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: isActive ? 600 : 500,
                background: isActive ? '#0f172a' : '#ffffff',
                color: isActive ? '#ffffff' : '#475569',
                border: '1px solid',
                borderColor: isActive ? '#0f172a' : '#e2e8f0',
                cursor: 'pointer'
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="premium-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.015em' }}>
            Personal Risk Trend
          </h2>
          <span style={{
            fontSize: '0.74rem',
            color: '#9a3412',
            background: '#fff7ed',
            padding: '3px 10px',
            borderRadius: '999px',
            fontWeight: 600,
            border: '1px solid #fed7aa'
          }}>
            ↗ +41% vs last week
          </span>
        </div>

        <div style={{ overflowX: 'auto', padding: '10px 0' }}>
          <svg viewBox="0 0 760 220" style={{ width: '100%', minWidth: '600px', height: 'auto', display: 'block' }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            <line x1="50" y1="90" x2="710" y2="90" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.5" />
            <text x="714" y="94" fill="#d97706" fontSize="10" fontWeight="700">Threshold</text>

            <line x1="50" y1="40" x2="710" y2="40" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="50" y1="140" x2="710" y2="140" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="50" y1="190" x2="710" y2="190" stroke="#f1f5f9" strokeWidth="1" />

            <path
              d="M 60 180 Q 160 160 260 150 T 460 70 T 560 85 T 660 140 L 660 200 L 60 200 Z"
              fill="url(#areaGradient)"
            />

            <path
              d="M 60 180 Q 160 160 260 150 T 460 70 T 560 85 T 660 140"
              fill="none"
              stroke="#f97316"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {pointsData.map((pt, pti) => (
              <g key={pti}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={pt.isPeak ? 6 : 4}
                  fill={pt.isPeak ? '#ef4444' : '#ffffff'}
                  stroke={pt.isPeak ? '#ffffff' : '#f97316'}
                  strokeWidth="2.5"
                />
                <text x={pt.x} y="215" fill="#64748b" fontSize="10" textAnchor="middle" fontWeight="500">
                  {pt.label}
                </text>
                {pt.isPeak && (
                  <g>
                    <rect x={pt.x - 32} y={pt.y - 32} width="64" height="22" rx="6" fill="#0f172a" />
                    <text x={pt.x} y={pt.y - 18} fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle">
                      Fri · Risk 82
                    </text>
                  </g>
                )}
              </g>
            ))}
          </svg>
        </div>

        <div style={{
          marginTop: '14px',
          padding: '10px 14px',
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>💡</span>
          <div style={{ fontSize: '0.8rem', color: '#92400e', lineHeight: 1.4 }}>
            <strong>Peak Friday</strong> · compounded PM2.5 + heat spike.
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
          Key Environmental Factors
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <FactorCard icon="💨" label="PM2.5" value="+58%" sub="vs last week" color="#f97316" />
          <FactorCard icon="🌡️" label="Temperature" value="+2°C" sub="Warmer" color="#0f172a" />
          <FactorCard icon="💧" label="Humidity" value="-14%" sub="Drier" color="#10b981" />
          <FactorCard icon="☀️" label="UV Index" value="+22%" sub="Higher" color="#f59e0b" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div className="premium-card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 14px 0', letterSpacing: '-0.015em' }}>
            Risk Distribution
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
            <div style={{ width: '100px', height: '100px', position: 'relative' }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="5" strokeDasharray="28 72" strokeDashoffset="0" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="5" strokeDasharray="42 58" strokeDashoffset="-28" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#f97316" strokeWidth="5" strokeDasharray="15 85" strokeDashoffset="-70" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#ef4444" strokeWidth="5" strokeDasharray="15 85" strokeDashoffset="-85" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
              <DonutRow color="#10b981" label="2 days Low" />
              <DonutRow color="#f59e0b" label="3 days Moderate" />
              <DonutRow color="#f97316" label="1 day High" />
              <DonutRow color="#ef4444" label="1 day Severe" />
            </div>
          </div>
        </div>

        <div className="premium-card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: '0 0 12px 0', letterSpacing: '-0.015em' }}>
            Weekly Insights
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <InsightRow icon="📈" title="Risk +18%" sub="Agricultural biomass particulates." />
            <InsightRow icon="☀️" title="Best days: Wed & Sat AM" sub="Cleanest air for outdoor exercise." />
            <InsightRow icon="🛡️" title="4 peak periods avoided" sub="Compliance score this week." />
          </div>
        </div>
      </div>

      <div style={{
        textAlign: 'center',
        padding: '20px 0',
        color: '#64748b',
        fontSize: '0.84rem',
        fontStyle: 'italic',
        fontFamily: 'var(--font-script)',
        fontSize: '1.2rem',
        letterSpacing: '0'
      }}>
        Awareness today, a healthier tomorrow. — <strong style={{ fontFamily: 'var(--font-sans)', fontStyle: 'normal', fontSize: '0.84rem' }}>AeroHealth</strong>
      </div>
    </div>
  );
};

const FactorCard = ({ icon, label, value, sub, color }) => (
  <div className="premium-card" style={{ padding: '14px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
      <span style={{ fontSize: '0.95rem' }}>{icon}</span>
      <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b' }}>{label}</span>
    </div>
    <div style={{ fontSize: '1.3rem', fontWeight: 700, color, letterSpacing: '-0.025em' }}>{value}</div>
    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{sub}</div>
  </div>
);

const DonutRow = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
    <span style={{ color: '#334155' }}>{label}</span>
  </div>
);

const InsightRow = ({ icon, title, sub }) => (
  <div style={{
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 12px',
    background: '#f8fafc',
    borderRadius: '10px'
  }}>
    <span>{icon}</span>
    <div>
      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', letterSpacing: '-0.01em' }}>{title}</div>
      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{sub}</div>
    </div>
  </div>
);