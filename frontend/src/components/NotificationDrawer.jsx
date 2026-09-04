import React from 'react';
import { IconBell, IconCheckCircle, IconRefreshCw } from './Icons';

export const NotificationDrawer = ({ isOpen, onClose, auditLogs, onTriggerScheduler, isTriggering }) => {
  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title">
            <IconBell size={18} color="#38bdf8" />
            <span>Alert Pipeline & Dispatches</span>
          </div>
          <button className="drawer-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="drawer-content">
          {/* Hackathon Demo Trigger */}
          <div className="demo-trigger-box">
            <div className="trigger-title">APScheduler Background Evaluator</div>
            <p className="trigger-desc">
              In production, APScheduler evaluates users every 15 mins. For this hackathon presentation, click below to trigger the evaluation job immediately:
            </p>
            <button
              className="trigger-run-btn"
              onClick={onTriggerScheduler}
              disabled={isTriggering}
            >
              <IconRefreshCw size={14} className={isTriggering ? 'spinning' : ''} />
              <span>{isTriggering ? 'Running Background Evaluation...' : 'Simulate Background Poll Now'}</span>
            </button>
          </div>

          {/* Audit History */}
          <div className="audit-section">
            <div className="audit-section-title">Recent Automated Dispatches</div>
            {(!auditLogs || auditLogs.length === 0) ? (
              <div className="empty-audit">No background dispatches recorded yet. Click above to test.</div>
            ) : (
              <div className="audit-list">
                {auditLogs.map((log, idx) => (
                  <div key={idx} className="audit-card">
                    <div className="audit-top">
                      <span className={`channel-badge ${log.channel}`}>{log.channel}</span>
                      <span className="audit-time">{log.time}</span>
                    </div>
                    <div className="audit-subject">{log.subject}</div>
                    <div className="audit-preview">{log.preview}</div>
                    <div className="audit-recipient">To: {log.recipient} • Status: <span className="status-ok">{log.status}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <style>{`
          .drawer-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(6px);
            z-index: 1000;
            display: flex;
            justify-content: flex-end;
          }
          .drawer-panel {
            width: 400px;
            max-width: 90vw;
            height: 100%;
            background: #0f172a;
            border-left: 1px solid var(--border-subtle);
            box-shadow: -10px 0 30px rgba(0, 0, 0, 0.6);
            display: flex;
            flex-direction: column;
            animation: slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          }
          @keyframes slideLeft {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          .drawer-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px;
            border-bottom: 1px solid var(--border-subtle);
          }
          .drawer-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 1rem;
            font-weight: 700;
            color: var(--text-primary);
          }
          .drawer-close-btn {
            font-size: 1.5rem;
            line-height: 1;
            color: var(--text-muted);
          }
          .drawer-content {
            padding: 20px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 20px;
          }
          .demo-trigger-box {
            background: rgba(56, 189, 248, 0.08);
            border: 1px solid rgba(56, 189, 248, 0.25);
            border-radius: var(--radius-md);
            padding: 16px;
          }
          .trigger-title {
            font-size: 0.85rem;
            font-weight: 700;
            color: #38bdf8;
            margin-bottom: 6px;
          }
          .trigger-desc {
            font-size: 0.78rem;
            color: var(--text-secondary);
            line-height: 1.4;
            margin-bottom: 14px;
          }
          .trigger-run-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
            padding: 10px;
            background: #38bdf8;
            color: #0b0f17;
            border-radius: var(--radius-md);
            font-size: 0.82rem;
            font-weight: 700;
          }
          .audit-section-title {
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            margin-bottom: 12px;
          }
          .empty-audit {
            font-size: 0.82rem;
            color: var(--text-muted);
            font-style: italic;
          }
          .audit-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .audit-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            padding: 12px;
          }
          .audit-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 6px;
          }
          .channel-badge {
            font-size: 0.65rem;
            font-weight: 700;
            text-transform: uppercase;
            padding: 2px 6px;
            border-radius: 4px;
          }
          .channel-badge.email {
            background: rgba(59, 130, 246, 0.2);
            color: #60a5fa;
          }
          .channel-badge.sms {
            background: rgba(16, 185, 129, 0.2);
            color: #34d399;
          }
          .audit-time {
            font-size: 0.72rem;
            color: var(--text-muted);
          }
          .audit-subject {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 4px;
          }
          .audit-preview {
            font-size: 0.78rem;
            color: var(--text-secondary);
            line-height: 1.4;
            margin-bottom: 6px;
          }
          .audit-recipient {
            font-size: 0.72rem;
            color: var(--text-muted);
          }
          .status-ok {
            color: #34d399;
            font-weight: 600;
            text-transform: capitalize;
          }
        `}</style>
      </div>
    </div>
  );
};
