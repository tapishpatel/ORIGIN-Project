import React from 'react';
import { IconWind, IconAlertTriangle } from './Icons';

export const AQIGauge = ({ aqiData }) => {
  const aqi = aqiData?.aqi ?? 0;
  const pm25 = aqiData?.pm2_5 ?? 0;
  const pm10 = aqiData?.pm10 ?? 0;
  const category = aqiData?.category || 'Moderate';
  const color = aqiData?.color || '#f59e0b';
  const bgColor = aqiData?.bg_color || 'rgba(245, 158, 11, 0.15)';
  const description = aqiData?.description || 'Air quality is acceptable for healthy individuals.';

  // Arc calculations for SVG gauge
  const radius = 80;
  const circumference = Math.PI * radius; // Half circle
  const progressPercent = Math.min(1, aqi / 300);
  const strokeDashoffset = circumference - (progressPercent * circumference);

  return (
    <div className="glass-card aqi-card">
      <div className="card-header">
        <div className="header-title">
          <IconWind size={18} color="#38bdf8" />
          <span>Air Quality Index (AQI)</span>
        </div>
        <div className="category-pill" style={{ color: color, background: bgColor, border: `1px solid ${color}40` }}>
          {category}
        </div>
      </div>

      <div className="gauge-section">
        <div className="gauge-container">
          <svg className="gauge-svg" width="200" height="120" viewBox="0 0 200 120">
            {/* Background Arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="16"
              strokeLinecap="round"
            />
            {/* Value Arc */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={color}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.8s ease-out, stroke 0.4s' }}
            />
          </svg>

          <div className="gauge-center-text">
            <span className="aqi-number" style={{ color: color }}>{Math.round(aqi)}</span>
            <span className="aqi-unit">US AQI</span>
          </div>
        </div>

        <p className="aqi-desc">{description}</p>
      </div>

      <div className="pollutant-row">
        <div className="pollutant-box">
          <div className="poll-name">PM 2.5</div>
          <div className="poll-val-group">
            <span className="poll-val">{pm25}</span>
            <span className="poll-unit">µg/m³</span>
          </div>
          <div className="poll-status" style={{ color: pm25 > 60 ? '#ef4444' : pm25 > 35 ? '#f97316' : '#10b981' }}>
            {pm25 > 60 ? 'Unhealthy' : pm25 > 35 ? 'Moderate' : 'Safe'}
          </div>
        </div>

        <div className="pollutant-box">
          <div className="poll-name">PM 10</div>
          <div className="poll-val-group">
            <span className="poll-val">{pm10}</span>
            <span className="poll-unit">µg/m³</span>
          </div>
          <div className="poll-status" style={{ color: pm10 > 100 ? '#ef4444' : pm10 > 50 ? '#f97316' : '#10b981' }}>
            {pm10 > 100 ? 'Elevated' : pm10 > 50 ? 'Moderate' : 'Safe'}
          </div>
        </div>
      </div>

      <style>{`
        .aqi-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .category-pill {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: var(--radius-full);
        }
        .gauge-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px 0;
        }
        .gauge-container {
          position: relative;
          width: 200px;
          height: 110px;
          display: flex;
          justify-content: center;
        }
        .gauge-svg {
          overflow: visible;
        }
        .gauge-center-text {
          position: absolute;
          bottom: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1;
        }
        .aqi-number {
          font-family: var(--font-display);
          font-size: 2.75rem;
          font-weight: 800;
        }
        .aqi-unit {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 4px;
        }
        .aqi-desc {
          font-size: 0.82rem;
          color: var(--text-secondary);
          text-align: center;
          max-width: 320px;
          margin-top: 8px;
          line-height: 1.4;
        }
        .pollutant-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          border-top: 1px solid var(--border-subtle);
          padding-top: 18px;
        }
        .pollutant-box {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 12px;
        }
        .poll-name {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .poll-val-group {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin: 4px 0;
        }
        .poll-val {
          font-family: var(--font-display);
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .poll-unit {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .poll-status {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
};
