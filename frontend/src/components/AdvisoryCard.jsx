import React, { useState } from 'react';
import { IconShield, IconSparkles, IconCheckCircle, IconAlertTriangle, IconRefreshCw } from './Icons';

export const AdvisoryCard = ({ risk, advisory, profile, onSimulate, isGenerating }) => {
  const [showSimulator, setShowSimulator] = useState(false);
  const [simAqi, setSimAqi] = useState(220);
  const [simTemp, setSimTemp] = useState(38);

  const riskLevel = risk?.risk_level || 'moderate';
  const badge = risk?.badge || 'Moderate Risk';
  const color = risk?.color || '#f59e0b';
  const bgColor = risk?.bg_color || 'rgba(245, 158, 11, 0.15)';
  const isEscalated = risk?.is_escalated;
  const escalationReasons = risk?.escalation_reasons || [];
  const actionItems = advisory?.action_items || [];

  const handleRunSimulation = () => {
    onSimulate({
      simulate_aqi: Number(simAqi),
      simulate_temp: Number(simTemp),
    });
  };

  const handleResetSimulation = () => {
    onSimulate({});
    setShowSimulator(false);
  };

  return (
    <div className="glass-card advisory-card" style={{ borderColor: `${color}40`, boxShadow: `0 8px 30px ${color}15` }}>
      {/* Header with Risk Level */}
      <div className="advisory-top-row">
        <div className="badge-group">
          <div className="risk-badge" style={{ color: color, background: bgColor, border: `1.5px solid ${color}60` }}>
            <span className="risk-dot" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
            <span>{badge}</span>
          </div>

          {isEscalated && (
            <div className="escalated-pill" title="Escalated from base environmental score due to personal medical risk factors">
              Personalized Multiplier Active (+{risk.escalation_count} steps)
            </div>
          )}
        </div>

        <div className="ai-model-tag">
          <IconSparkles size={14} color="#38bdf8" />
          <span>{advisory?.model_used || 'Personalized AI Engine'}</span>
        </div>
      </div>

      {/* Main Headline & Advisory Text */}
      <div className="advisory-content">
        <h3 className="advisory-headline">{advisory?.headline || 'Health Action Advisory'}</h3>
        <p className="advisory-text">{advisory?.advisory_text || 'Synthesizing tailored clinical guidance...'}</p>
      </div>

      {/* Explainability Section: Why this person? */}
      {escalationReasons.length > 0 && (
        <div className="explainability-box">
          <div className="explain-header">
            <IconAlertTriangle size={14} color="#fbbf24" />
            <span>Why this rating for your profile:</span>
          </div>
          <div className="reasons-list">
            {escalationReasons.map((reason, idx) => (
              <div key={idx} className="reason-item">
                <span className="bullet-dot" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items Checklist */}
      {actionItems.length > 0 && (
        <div className="actions-section">
          <div className="actions-header">Recommended Action Checklist:</div>
          <div className="action-cards-grid">
            {actionItems.map((item, idx) => (
              <div key={idx} className="action-card">
                <IconCheckCircle size={18} color="#38bdf8" className="check-icon" />
                <span className="action-text">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer with What-If Simulator Toggle */}
      <div className="advisory-footer">
        <button
          className="sim-toggle-btn"
          onClick={() => setShowSimulator(!showSimulator)}
        >
          {showSimulator ? 'Close Scenario Simulator' : '⚡ Test "What-If" Scenario (Spike AQI / Heat)'}
        </button>
      </div>

      {/* Interactive What-If Scenario Drawer */}
      {showSimulator && (
        <div className="simulator-panel">
          <div className="sim-title">Interactive Stress-Test Simulator</div>
          <div className="sim-subtitle">
            Simulate an environmental spike to test how the deterministic engine protects this user persona:
          </div>

          <div className="sim-controls">
            <div className="sim-control-group">
              <label>Simulated AQI: <strong>{simAqi}</strong></label>
              <input
                type="range"
                min="40"
                max="400"
                value={simAqi}
                onChange={(e) => setSimAqi(e.target.value)}
                className="range-slider"
              />
              <div className="slider-labels">
                <span>Good (50)</span>
                <span>Unhealthy (180)</span>
                <span>Hazardous (350+)</span>
              </div>
            </div>

            <div className="sim-control-group">
              <label>Simulated Temp: <strong>{simTemp}°C</strong></label>
              <input
                type="range"
                min="20"
                max="46"
                value={simTemp}
                onChange={(e) => setSimTemp(e.target.value)}
                className="range-slider"
              />
              <div className="slider-labels">
                <span>Mild (24°C)</span>
                <span>Warm (32°C)</span>
                <span>Severe Heat (42°C)</span>
              </div>
            </div>
          </div>

          <div className="sim-btn-row">
            <button
              className="run-sim-btn"
              onClick={handleRunSimulation}
              disabled={isGenerating}
            >
              {isGenerating ? 'Simulating...' : 'Apply Scenario & Regenerate Advisory'}
            </button>
            <button
              className="reset-sim-btn"
              onClick={handleResetSimulation}
            >
              Reset to Real Conditions
            </button>
          </div>
        </div>
      )}

      <style>{`
        .advisory-card {
          grid-column: span 2;
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: linear-gradient(145deg, rgba(17, 24, 39, 0.85), rgba(15, 23, 42, 0.95));
        }
        @media (max-width: 960px) {
          .advisory-card {
            grid-column: span 1;
          }
        }
        .advisory-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .badge-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .risk-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.88rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 6px 14px;
          border-radius: var(--radius-full);
        }
        .risk-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .escalated-pill {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          background: rgba(244, 63, 94, 0.15);
          color: #fb7185;
          border: 1px solid rgba(244, 63, 94, 0.3);
        }
        .ai-model-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 10px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-subtle);
        }
        .advisory-content {
          margin-top: 4px;
        }
        .advisory-headline {
          font-size: 1.35rem;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 10px;
          letter-spacing: -0.01em;
        }
        .advisory-text {
          font-size: 1.05rem;
          line-height: 1.65;
          color: #e2e8f0;
          font-weight: 400;
        }
        .explainability-box {
          background: rgba(245, 158, 11, 0.06);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: var(--radius-md);
          padding: 14px 16px;
        }
        .explain-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #fbbf24;
          margin-bottom: 8px;
        }
        .reasons-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .reason-item {
          display: flex;
          align-items: baseline;
          gap: 10px;
          font-size: 0.84rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .bullet-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #fbbf24;
          flex-shrink: 0;
          position: relative;
          top: -2px;
        }
        .actions-section {
          margin-top: 4px;
        }
        .actions-header {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          margin-bottom: 10px;
        }
        .action-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 10px;
        }
        .action-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
        }
        .check-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }
        .action-text {
          font-size: 0.88rem;
          color: var(--text-primary);
          line-height: 1.4;
          font-weight: 500;
        }
        .advisory-footer {
          display: flex;
          justify-content: flex-end;
          padding-top: 10px;
          border-top: 1px solid var(--border-subtle);
        }
        .sim-toggle-btn {
          font-size: 0.82rem;
          font-weight: 600;
          color: #38bdf8;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          background: rgba(56, 189, 248, 0.1);
          border: 1px solid rgba(56, 189, 248, 0.25);
        }
        .sim-toggle-btn:hover {
          background: rgba(56, 189, 248, 0.2);
        }
        .simulator-panel {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(56, 189, 248, 0.3);
          border-radius: var(--radius-md);
          padding: 18px;
          margin-top: 8px;
        }
        .sim-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #38bdf8;
        }
        .sim-subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 4px 0 16px;
        }
        .sim-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 600px) {
          .sim-controls { grid-template-columns: 1fr; }
        }
        .sim-control-group label {
          display: block;
          font-size: 0.82rem;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }
        .range-slider {
          width: 100%;
          accent-color: #38bdf8;
        }
        .slider-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .sim-btn-row {
          display: flex;
          gap: 12px;
          margin-top: 18px;
        }
        .run-sim-btn {
          padding: 8px 18px;
          background: #38bdf8;
          color: #0b0f17;
          border-radius: var(--radius-md);
          font-weight: 700;
          font-size: 0.85rem;
        }
        .reset-sim-btn {
          padding: 8px 18px;
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
          border-radius: var(--radius-md);
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
};
