export const NotificationDrawer = ({
  isOpen,
  onClose,
  auditLogs = [],
  onTriggerScheduler,
  isTriggering,
  onSendTestEmail,
  onViewAlertsTab
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.35)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '400px',
          maxWidth: '92vw',
          height: '100%',
          background: '#ffffff',
          boxShadow: '-8px 0 24px rgba(15, 23, 42, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--border-card)'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔔</span>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.015em' }}>
              Alerts
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#f1f5f9',
              border: 'none',
              fontSize: '0.95rem',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '16px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>

          {onViewAlertsTab && (
            <button
              onClick={() => { onViewAlertsTab(); onClose(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: '#f1f5f9',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                color: '#0f172a',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <span>Open Full Alerts Timeline</span>
              <span>→</span>
            </button>
          )}

          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '12px',
            padding: '14px'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#065f46', marginBottom: '4px' }}>
              📧 Dispatch live alert
            </div>
            <p style={{ fontSize: '0.74rem', color: '#047857', lineHeight: 1.4, margin: '0 0 10px 0' }}>
              Send verified Gmail SMTP alert to <strong>tornovdutta@gmail.com</strong>.
            </p>
            <button
              onClick={onSendTestEmail}
              style={{
                width: '100%',
                padding: '8px',
                background: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Send Alert →
            </button>
          </div>

          <div style={{
            background: '#f8fafc',
            border: '1px solid var(--border-card)',
            borderRadius: '12px',
            padding: '14px'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
              ⏱ Background evaluator
            </div>
            <p style={{ fontSize: '0.74rem', color: '#475569', lineHeight: 1.4, margin: '0 0 10px 0' }}>
              Run 15-min background check vs live thresholds.
            </p>
            <button
              onClick={onTriggerScheduler}
              disabled={isTriggering}
              style={{
                width: '100%',
                padding: '8px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: isTriggering ? 'not-allowed' : 'pointer'
              }}
            >
              {isTriggering ? 'Running…' : 'Trigger Check'}
            </button>
          </div>

          <div>
            <div style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#64748b',
              marginBottom: '8px'
            }}>
              Recent ({auditLogs.length})
            </div>

            {auditLogs.length === 0 ? (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #f1f5f9',
                borderRadius: '10px',
                padding: '20px 14px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '0.78rem'
              }}>
                No dispatches today.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {auditLogs.map((log, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#ffffff',
                      border: '1px solid var(--border-card)',
                      borderRadius: '10px',
                      padding: '10px 12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: log.channel === 'email' ? '#eff6ff' : '#ecfdf5',
                        color: log.channel === 'email' ? '#1d4ed8' : '#065f46'
                      }}>
                        {log.channel || 'EMAIL'}
                      </span>
                      <span style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                        {log.time || 'Just now'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', marginBottom: '2px', letterSpacing: '-0.01em' }}>
                      {log.subject || 'Aero Health Alert'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.35, marginBottom: '4px' }}>
                      {log.preview || log.message}
                    </div>
                    <div style={{ fontSize: '0.66rem', color: '#94a3b8' }}>
                      → {log.recipient} · <span style={{ color: '#059669', fontWeight: 600 }}>Delivered</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};