import React from 'react';
import { IconSparkles } from './Icons';

export const DemoUserBanner = ({ activePersonaId, personas, onSelectPersona, isLoading }) => {
  return (
    <div className="demo-banner">
      <div className="demo-header">
        <div className="demo-title">
          <IconSparkles size={16} color="#38bdf8" />
          <span>Hackathon Demo Switcher: Test Real-Time Health Profile Differences</span>
        </div>
        <div className="demo-subtext">
          Select a persona to see how the exact same AQI & weather changes risk levels and plain-English medical actions:
        </div>
      </div>

      <div className="persona-pills">
        {personas.map((p) => {
          const isActive = p.id === activePersonaId;
          const conditionLabel = p.conditions?.includes('none') 
            ? 'Healthy Baseline' 
            : p.conditions?.map(c => c.replace('_', ' ')).join(', ');
          const occupationLabel = p.occupation?.replace('_', ' ');

          return (
            <button
              key={p.id}
              className={`persona-pill ${isActive ? 'active' : ''}`}
              onClick={() => onSelectPersona(p.id)}
              disabled={isLoading}
            >
              <img src={p.picture} alt={p.name} className="persona-avatar" />
              <div className="persona-info">
                <div className="persona-name-row">
                  <span className="p-name">{p.name}</span>
                  {isActive && <span className="active-tag">Active</span>}
                </div>
                <div className="p-details">
                  <span className="p-tag condition-tag">{conditionLabel}</span>
                  <span className="p-tag occ-tag">{occupationLabel}</span>
                  <span className="p-tag age-tag">{p.age_group}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <style>{`
        .demo-banner {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
          border: 1px solid rgba(56, 189, 248, 0.25);
          border-radius: var(--radius-lg);
          padding: 16px 20px;
          margin-top: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .demo-header {
          margin-bottom: 12px;
        }
        .demo-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #38bdf8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .demo-subtext {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 2px;
        }
        .persona-pills {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 12px;
        }
        .persona-pill {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          text-align: left;
          color: var(--text-primary);
          transition: all 0.2s ease;
        }
        .persona-pill:hover {
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(56, 189, 248, 0.4);
          transform: translateY(-2px);
        }
        .persona-pill.active {
          background: rgba(56, 189, 248, 0.12);
          border-color: #38bdf8;
          box-shadow: 0 0 16px rgba(56, 189, 248, 0.25);
        }
        .persona-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: #0f172a;
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
        }
        .persona-pill.active .persona-avatar {
          border-color: #38bdf8;
        }
        .persona-info {
          flex: 1;
          min-width: 0;
        }
        .persona-name-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }
        .p-name {
          font-size: 0.88rem;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .active-tag {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          background: #38bdf8;
          color: #0b0f17;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .p-details {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 4px;
        }
        .p-tag {
          font-size: 0.68rem;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-muted);
          text-transform: capitalize;
        }
        .condition-tag {
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.1);
        }
        .occ-tag {
          color: #93c5fd;
        }
      `}</style>
    </div>
  );
};
