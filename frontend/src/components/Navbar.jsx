import React from 'react';

export const Navbar = ({
  user,
  profile,
  activeTab = 'home',
  onTabChange,
  onOpenProfile,
  onToggleNotifications,
  unreadCount = 0,
  onLogout
}) => {
  return (
    <header style={{
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: '1320px',
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => onTabChange && onTabChange('home')}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '9px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.95rem'
            }}>
              🌿
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em', color: '#0f172a' }}>
              AeroHealth
            </div>
          </div>

          <nav style={{
            display: 'flex',
            background: '#f1f5f9',
            borderRadius: '999px',
            padding: '3px',
            border: '1px solid #e2e8f0'
          }}>
            {[
              { id: 'home', label: 'Home' },
              { id: 'advisory', label: 'Advisory' },
              { id: 'trends', label: 'Trends' },
              { id: 'alerts', label: 'Alerts' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange && onTabChange(tab.id)}
                style={{
                  padding: '6px 16px',
                  fontSize: '0.84rem',
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  color: activeTab === tab.id ? '#0f172a' : '#475569',
                  background: activeTab === tab.id ? '#ffffff' : 'transparent',
                  border: 'none',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  boxShadow: activeTab === tab.id ? '0 1px 3px rgba(15, 23, 42, 0.06)' : 'none',
                  letterSpacing: '-0.01em'
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '999px',
            fontSize: '0.72rem',
            color: '#065f46',
            fontWeight: 600,
            letterSpacing: '0.02em'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            Live
          </div>



          <button
            onClick={onToggleNotifications}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              position: 'relative',
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
            title="Notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                width: '15px',
                height: '15px',
                borderRadius: '50%',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '0.6rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenProfile}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '3px 12px 3px 4px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '999px',
              cursor: 'pointer'
            }}
            title="Profile"
          >
            <img
              src={user?.picture || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'}
              alt={user?.name || 'User'}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#f1f5f9'
              }}
            />
            <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', letterSpacing: '-0.01em' }}>
                {user?.name?.split(' ')[0] || 'User'}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'capitalize' }}>
                {profile?.conditions?.[0]?.replace('_', ' ') || 'Normal'}
              </div>
            </div>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                padding: '5px 12px',
                borderRadius: '999px',
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                fontSize: '0.74rem',
                fontWeight: 600,
                color: '#64748b',
                cursor: 'pointer'
              }}
              title="Sign Out"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </header>
  );
};