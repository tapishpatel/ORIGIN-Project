import React, { useState } from 'react';
import { IconActivity, IconShield, IconBell } from './Icons';

export const HistoryTrends = ({ historyData }) => {
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'alerts'
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const snapshots = historyData?.snapshots || [];
  const alerts = historyData?.alerts || [];

  // Prepare SVG chart coordinates
  const width = 760;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(200, ...snapshots.map(s => s.aqi || 0)) * 1.1;

  const getX = (idx) => {
    if (snapshots.length <= 1) return padding.left;
    return padding.left + (idx / (snapshots.length - 1)) * chartW;
  };

  const getY = (val) => {
    return padding.top + chartH - (val / maxVal) * chartH;
  };

  const pointsAqi = snapshots.map((s, idx) => `${getX(idx)},${getY(s.aqi || 0)}`).join(' ');
  const pointsPm25 = snapshots.map((s, idx) => `${getX(idx)},${getY((s.pm2_5 || 0) * 2)}`).join(' '); // scaled for visibility

  return (
    <div className="glass-card history-card">
      <div className="history-header">
        <div className="header-left">
          <IconActivity size={18} color="#38bdf8" />
          <span>7-Day Retrospective & Trends</span>
        </div>

        <div className="tab-buttons">
          <button 
            className={`tab-btn ${activeTab === 'chart' ? 'active' : ''}`}
            onClick={() => setActiveTab('chart')}
          >
            Trend Visualization
          </button>
          <button 
            className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            Advisory Log ({alerts.length})
          </button>
        </div>
      </div>

      {activeTab === 'chart' ? (
        <div className="chart-wrapper">
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#38bdf8' }} />
              <span>AQI Trajectory</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#f43f5e' }} />
              <span>PM 2.5 (x2 scale)</span>
            </div>
            <div className="legend-item">
              <span className="threshold-line-indicator" />
              <span>EPA 100 Moderate Threshold</span>
            </div>
          </div>

          <div className="svg-container">
            <svg viewBox={`0 0 ${width} ${height}`} className="trend-svg">
              {/* Threshold Guide Line: 100 AQI */}
              <line
                x1={padding.left}
                y1={getY(100)}
                x2={width - padding.right}
                y2={getY(100)}
                stroke="rgba(245, 158, 11, 0.4)"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />
              <text x={padding.left + 5} y={getY(100) - 6} fill="#f59e0b" fontSize="10" fontWeight="600">
                100 Caution Threshold
              </text>

              {/* Threshold Guide Line: 150 Unhealthy */}
              <line
                x1={padding.left}
                y1={getY(150)}
                x2={width - padding.right}
                y2={getY(150)}
                stroke="rgba(239, 68, 68, 0.35)"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />

              {/* Y Axis Grid Lines */}
              {[0, 50, 100, 150, 200].map((tick) => (
                <g key={tick}>
                  <text x={padding.left - 8} y={getY(tick) + 4} fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="end">
                    {tick}
                  </text>
                  <line
                    x1={padding.left}
                    y1={getY(tick)}
                    x2={width - padding.right}
                    y2={getY(tick)}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="1"
                  />
                </g>
              ))}

              {/* PM2.5 Line */}
              {snapshots.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2"
                  strokeOpacity="0.8"
                  points={pointsPm25}
                />
              )}

              {/* AQI Line */}
              {snapshots.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pointsAqi}
                />
              )}

              {/* Points & Hover Targets */}
              {snapshots.map((s, idx) => {
                const cx = getX(idx);
                const cy = getY(s.aqi || 0);
                const isHovered = hoveredIndex === idx;

                return (
                  <g key={idx} onMouseEnter={() => setHoveredIndex(idx)} onMouseLeave={() => setHoveredIndex(null)}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 6 : 4}
                      fill={isHovered ? '#fff' : '#38bdf8'}
                      stroke="#0f172a"
                      strokeWidth="2"
                      style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                    />
                    <text
                      x={cx}
                      y={height - 10}
                      fill={isHovered ? '#38bdf8' : 'rgba(255,255,255,0.4)'}
                      fontSize="11"
                      fontWeight={isHovered ? '700' : '500'}
                      textAnchor="middle"
                    >
                      {s.day || `D${idx + 1}`}
                    </text>
                  </g>
                );
              })}
            </svg>

            {hoveredIndex !== null && snapshots[hoveredIndex] && (
              <div className="hover-tooltip" style={{ left: `${(hoveredIndex / (snapshots.length - 1)) * 80 + 10}%` }}>
                <div className="tooltip-day">{snapshots[hoveredIndex].timestamp}</div>
                <div className="tooltip-val aqi-val">AQI: {Math.round(snapshots[hoveredIndex].aqi)}</div>
                <div className="tooltip-val pm-val">PM2.5: {snapshots[hoveredIndex].pm2_5} µg/m³</div>
                <div className="tooltip-val temp-val">Temp: {snapshots[hoveredIndex].temp_c}°C</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="alerts-history-list">
          {alerts.length === 0 ? (
            <div className="empty-alerts">No alerts recorded yet in this time window.</div>
          ) : (
            alerts.map((a, i) => (
              <div key={a.id || i} className="alert-item">
                <div className="alert-meta">
                  <span className={`alert-badge ${a.risk_level}`}>{a.risk_level}</span>
                  <span className="alert-time">{a.timestamp}</span>
                  {a.channel_sent && (
                    <span className="channel-pill">
                      Dispatched via {a.channel_sent.join(', ')}
                    </span>
                  )}
                </div>
                <h4 className="alert-headline">{a.headline}</h4>
                <p className="alert-text">{a.advisory_text}</p>
                {a.action_items && a.action_items.length > 0 && (
                  <div className="alert-actions-compact">
                    {a.action_items.map((act, ai) => (
                      <span key={ai} className="compact-action-pill">• {act}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <style>{`
        .history-card {
          margin-top: 24px;
        }
        .history-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-primary);
        }
        .tab-buttons {
          display: flex;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-full);
          padding: 3px;
        }
        .tab-btn {
          padding: 6px 14px;
          border-radius: var(--radius-full);
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .tab-btn.active {
          background: rgba(56, 189, 248, 0.2);
          color: #38bdf8;
        }
        .chart-legend {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
          margin-bottom: 12px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .threshold-line-indicator {
          width: 14px;
          height: 0;
          border-top: 2px dashed #f59e0b;
        }
        .svg-container {
          position: relative;
          width: 100%;
          overflow-x: auto;
        }
        .trend-svg {
          width: 100%;
          height: auto;
          min-width: 580px;
        }
        .hover-tooltip {
          position: absolute;
          top: 10px;
          transform: translateX(-50%);
          background: #0f172a;
          border: 1px solid rgba(56, 189, 248, 0.4);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
          pointer-events: none;
          z-index: 20;
          white-space: nowrap;
        }
        .tooltip-day {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 600;
          margin-bottom: 2px;
        }
        .tooltip-val {
          font-size: 0.78rem;
          font-weight: 700;
        }
        .aqi-val { color: #38bdf8; }
        .pm-val { color: #f43f5e; }
        .temp-val { color: #fbbf24; }

        .alerts-history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 400px;
          overflow-y: auto;
        }
        .alert-item {
          padding: 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
        }
        .alert-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }
        .alert-badge {
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }
        .alert-badge.severe { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); }
        .alert-badge.high { background: rgba(249, 115, 22, 0.2); color: #f97316; border: 1px solid rgba(249, 115, 22, 0.4); }
        .alert-badge.moderate { background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4); }
        .alert-badge.low { background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.4); }
        .alert-time {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .channel-pill {
          font-size: 0.7rem;
          color: #93c5fd;
          background: rgba(59, 130, 246, 0.1);
          padding: 2px 8px;
          border-radius: 4px;
        }
        .alert-headline {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .alert-text {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .alert-actions-compact {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }
        .compact-action-pill {
          font-size: 0.72rem;
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.1);
          padding: 2px 8px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};
