import React from 'react';
import { 
  IconSun, IconCloudSun, IconCloud, IconCloudRain, 
  IconCloudLightning, IconDroplets, IconWind, IconActivity 
} from './Icons';

export const WeatherCard = ({ weather }) => {
  const getConditionIcon = (iconName) => {
    switch (iconName) {
      case 'Sun': return <IconSun size={36} color="#fbbf24" />;
      case 'SunDim': return <IconSun size={36} color="#f59e0b" />;
      case 'CloudSun': return <IconCloudSun size={36} color="#38bdf8" />;
      case 'Cloud': return <IconCloud size={36} color="#94a3b8" />;
      case 'CloudRain': return <IconCloudRain size={36} color="#60a5fa" />;
      case 'CloudLightning': return <IconCloudLightning size={36} color="#f43f5e" />;
      default: return <IconCloudSun size={36} color="#38bdf8" />;
    }
  };

  const getUVBadge = (uv) => {
    if (uv >= 8) return { label: 'Very High', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
    if (uv >= 6) return { label: 'High', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' };
    if (uv >= 3) return { label: 'Moderate', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
    return { label: 'Low', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
  };

  const uvMeta = getUVBadge(weather?.uv_index || 0);

  return (
    <div className="glass-card weather-card">
      <div className="card-header">
        <div className="header-title">
          <IconActivity size={18} color="#38bdf8" />
          <span>Atmospheric Parameters</span>
        </div>
        <span className="live-pill">Live Forecast</span>
      </div>

      <div className="weather-hero">
        <div className="temp-display">
          <span className="temp-val">{weather?.temperature ?? '--'}</span>
          <span className="temp-unit">°C</span>
        </div>
        <div className="condition-info">
          <div className="condition-icon-box">
            {getConditionIcon(weather?.icon)}
          </div>
          <div className="condition-label">{weather?.condition_label || 'Partly Cloudy'}</div>
        </div>
      </div>

      <div className="weather-grid">
        <div className="metric-box">
          <div className="metric-label">
            <IconDroplets size={16} color="#38bdf8" />
            <span>Relative Humidity</span>
          </div>
          <div className="metric-value">{weather?.humidity ?? '--'}%</div>
          <div className="metric-bar">
            <div className="bar-fill" style={{ width: `${Math.min(100, weather?.humidity || 0)}%`, background: '#38bdf8' }} />
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-label">
            <IconSun size={16} color="#fbbf24" />
            <span>Solar UV Index</span>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{weather?.uv_index ?? '--'}</span>
            <span className="uv-badge" style={{ color: uvMeta.color, background: uvMeta.bg }}>
              {uvMeta.label}
            </span>
          </div>
          <div className="metric-bar">
            <div className="bar-fill" style={{ width: `${Math.min(100, ((weather?.uv_index || 0) / 12) * 100)}%`, background: uvMeta.color }} />
          </div>
        </div>

        <div className="metric-box">
          <div className="metric-label">
            <IconWind size={16} color="#34d399" />
            <span>Wind Speed</span>
          </div>
          <div className="metric-value">{weather?.wind_speed ?? '--'} <span className="sub-unit">km/h</span></div>
          <div className="metric-bar">
            <div className="bar-fill" style={{ width: `${Math.min(100, ((weather?.wind_speed || 0) / 40) * 100)}%`, background: '#34d399' }} />
          </div>
        </div>
      </div>

      <style>{`
        .weather-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .header-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-secondary);
        }
        .live-pill {
          font-size: 0.7rem;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-muted);
          font-weight: 600;
        }
        .weather-hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0 24px;
        }
        .temp-display {
          display: flex;
          align-items: baseline;
        }
        .temp-val {
          font-family: var(--font-display);
          font-size: 4rem;
          font-weight: 800;
          line-height: 1;
          color: var(--text-primary);
        }
        .temp-unit {
          font-size: 1.8rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-left: 4px;
        }
        .condition-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }
        .condition-icon-box {
          filter: drop-shadow(0 0 16px rgba(56, 189, 248, 0.3));
        }
        .condition-label {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .weather-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          border-top: 1px solid var(--border-subtle);
          padding-top: 18px;
        }
        .metric-box {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 12px;
        }
        .metric-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }
        .metric-value-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .metric-value {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .sub-unit {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-muted);
        }
        .uv-badge {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .metric-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 2px;
          margin-top: 8px;
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.5s ease-out;
        }
        @media (max-width: 640px) {
          .weather-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
