import React from 'react';
import { IconShield, IconBell, IconSettings, IconActivity } from './Icons';

export const Navbar = ({ user, profile, onOpenProfile, onToggleNotifications, onLogout, unreadCount = 0 }) => {
  return (
    <header className="navbar-container">
      <div className="navbar-brand">
        <div className="brand-logo">
          <IconShield size={24} color="#38bdf8" />
        </div>
        <div>
          <div className="brand-name">AeroHealth</div>
          <div className="brand-tagline">Personalized Weather-Health Intelligence</div>
        </div>
      </div>

      <div className="navbar-right">
        <div className="api-badge">
          <span className="live-dot" />
          <span>Open-Meteo Live API</span>
        </div>

        <button 
          className="icon-btn" 
          onClick={onToggleNotifications}
          title="Notification Alerts"
        >
          <IconBell size={18} />
          {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
        </button>

        <button 
          className="profile-btn"
          onClick={onOpenProfile}
          title="Health Profile Settings"
        >
          <img 
            src={user?.picture || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'} 
            alt={user?.name || 'User'} 
            className="user-avatar"
          />
          <span className="user-name">{user?.name || 'Health Profile'}</span>
          <IconSettings size={16} color="var(--text-muted)" />
        </button>

        <button 
          className="logout-btn" 
          onClick={onLogout}
          title="Sign Out"
        >
          Sign Out
        </button>
      </div>

      <style>{`
        .navbar-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border-subtle);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .navbar-brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .brand-logo {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(16, 185, 129, 0.2));
          border: 1px solid rgba(56, 189, 248, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.2);
        }
        .brand-name {
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          background: linear-gradient(to right, #f8fafc, #38bdf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .brand-tagline {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        .navbar-right {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .api-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
          color: #34d399;
        }
        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }
        .icon-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .notif-badge {
          position: absolute;
          top: -3px;
          right: -3px;
          background: #ef4444;
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 999px;
          border: 2px solid #0f172a;
        }
        .profile-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 5px 14px 5px 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-full);
          color: var(--text-primary);
        }
        .profile-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .user-avatar {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1.5px solid #38bdf8;
          background: #1e293b;
        }
        .user-name {
          font-size: 0.85rem;
          font-weight: 600;
        }
        .logout-btn {
          background: transparent;
          border: 1px solid #ef4444;
          color: #ef4444;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }
        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.1);
        }
        @media (max-width: 768px) {
          .api-badge { display: none; }
          .user-name { display: none; }
        }
      `}</style>
    </header>
  );
};
