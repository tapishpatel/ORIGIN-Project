import React from 'react';

export const WeatherCard = ({ weather, location, user, isForcedFallback, onToggleFallback }) => {
  const temp = Math.round(weather?.temperature ?? 31);
  const uv = weather?.uv_index ?? 7;
  const humidity = weather?.humidity ?? 62;
  const wind = weather?.wind_speed ?? 12;
  const condition = weather?.description || 'Partly cloudy';
  const name = user?.name?.split(' ')[0] || 'Aditi';
  const visibility = weather?.visibility ?? 8;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="hero-weather-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(10px)',
            borderRadius: '999px',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#334155',
            marginBottom: '14px'
          }}>
            <span>📍</span>
            <span>{location?.label || 'Bhopal, India'}</span>
            <span style={{ color: '#94a3b8', marginLeft: '4px', fontSize: '0.72rem' }}>⟳</span>
          </div>

          <h1 style={{
            fontSize: '2.3rem',
            fontWeight: 700,
            color: '#0f172a',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            margin: 0
          }}>
            {greeting}, {name}
          </h1>
          <p style={{
            fontSize: '0.95rem',
            color: '#475569',
            marginTop: '6px',
            fontWeight: 400,
            letterSpacing: '-0.01em'
          }}>
            Breathe better. Live healthier.
          </p>

          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{
              fontSize: '0.74rem',
              color: '#64748b',
              background: 'rgba(255, 255, 255, 0.6)',
              padding: '4px 10px',
              borderRadius: '999px',
              fontWeight: 500
            }}>
              ⏱ Updated just now
            </span>
            {onToggleFallback && (
              <button
                onClick={onToggleFallback}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  color: isForcedFallback ? '#ef4444' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                {isForcedFallback ? 'Exit Fallback' : 'Simulate Outage'}
              </button>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right', position: 'relative' }}>
          <div style={{
            fontFamily: 'var(--font-script)',
            fontSize: '1.3rem',
            color: '#0369a1',
            marginBottom: '-4px',
            fontWeight: 600,
            letterSpacing: '0'
          }}>
            Clearer days, healthier you
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            <span style={{ fontSize: '2.4rem' }}>⛅</span>
            <span style={{
              fontSize: '3.6rem',
              fontWeight: 700,
              letterSpacing: '-0.045em',
              color: '#0f172a',
              lineHeight: 1
            }}>
              {temp}°
            </span>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
            {condition}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
            Feels like {temp + 3}° · H {temp + 3}° · L {temp - 6}°
          </div>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '10px',
        marginTop: '24px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={chipStyle}>
          <span style={chipIconStyle}>💧</span>
          <div>
            <div style={chipLabelStyle}>Humidity</div>
            <div style={chipValueStyle}>{humidity}%</div>
          </div>
        </div>
        <div style={chipStyle}>
          <span style={chipIconStyle}>💨</span>
          <div>
            <div style={chipLabelStyle}>Wind</div>
            <div style={chipValueStyle}>{wind} km/h</div>
          </div>
        </div>
        <div style={chipStyle}>
          <span style={chipIconStyle}>☀️</span>
          <div>
            <div style={chipLabelStyle}>UV Index</div>
            <div style={chipValueStyle}>
              {uv} <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#d97706', marginLeft: '4px' }}>{uv >= 6 ? 'High' : 'Moderate'}</span>
            </div>
          </div>
        </div>
        <div style={chipStyle}>
          <span style={chipIconStyle}>👁️</span>
          <div>
            <div style={chipLabelStyle}>Visibility</div>
            <div style={chipValueStyle}>{visibility} km</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const chipStyle = {
  background: 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(8px)',
  borderRadius: '14px',
  padding: '10px 14px',
  border: '1px solid rgba(0, 0, 0, 0.04)',
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
};

const chipIconStyle = { fontSize: '1.15rem' };

const chipLabelStyle = {
  fontSize: '0.66rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#64748b',
  fontWeight: 600
};

const chipValueStyle = {
  fontSize: '1.05rem',
  fontWeight: 700,
  color: '#0f172a',
  letterSpacing: '-0.02em'
};