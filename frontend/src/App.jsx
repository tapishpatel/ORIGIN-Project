import React, { useState, useEffect } from 'react';
import { api, setAuthToken } from './api/client';
import { Navbar } from './components/Navbar';
import { DemoUserBanner } from './components/DemoUserBanner';
import { LocationSelector } from './components/LocationSelector';
import { WeatherCard } from './components/WeatherCard';
import { AQIGauge } from './components/AQIGauge';
import { AdvisoryCard } from './components/AdvisoryCard';
import { HistoryTrends } from './components/HistoryTrends';
import { ProfileModal } from './components/ProfileModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { IconSparkles, IconShield } from './components/Icons';

export function App() {
  const [dashboardData, setDashboardData] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [activePersonaId, setActivePersonaId] = useState('demo-asthma-worker');
  const [historyData, setHistoryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Load initial personas and dashboard
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const pList = await api.getPersonas();
        setPersonas(pList || []);

        // Load dashboard for default persona
        const data = await api.getDashboard();
        setDashboardData(data);

        // Load 7-day history
        const hData = await api.getHistory(7);
        setHistoryData(hData);
      } catch (err) {
        console.error('Initial data load failed:', err);
        showToast('Error connecting to backend API. Retrying...');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Handle switching demo personas
  const handleSelectPersona = async (personaId) => {
    setActivePersonaId(personaId);
    setIsRefreshing(true);
    try {
      const loginRes = await api.demoLogin(personaId);
      setAuthToken(loginRes.access_token);

      // Re-fetch dashboard with new profile
      const data = await api.getDashboard();
      setDashboardData(data);

      const hData = await api.getHistory(7);
      setHistoryData(hData);

      showToast(`Switched profile to ${loginRes.user.name} (${data.risk?.badge})`);
    } catch (err) {
      console.error('Persona switch failed', err);
      showToast('Failed to switch persona');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle manual location change
  const handleLocationSelect = async (loc) => {
    setIsRefreshing(true);
    try {
      await api.updateLocation({
        lat: loc.lat,
        lon: loc.lon,
        label: loc.label,
        city: loc.city,
        country: loc.country,
      });
      const data = await api.getDashboard(loc.lat, loc.lon, loc.label);
      setDashboardData(data);
      showToast(`Monitoring location updated to ${loc.label}`);
    } catch (err) {
      console.error('Location update failed', err);
      showToast('Error updating location');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await api.getDashboard();
      setDashboardData(data);
      const hData = await api.getHistory(7);
      setHistoryData(hData);
      showToast('Live weather & health risk updated');
    } catch (err) {
      console.error('Refresh failed', err);
      showToast('Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Save profile changes from modal
  const handleSaveProfile = async (updatedData) => {
    try {
      await api.updateProfile(updatedData);
      setIsProfileOpen(false);
      handleRefresh();
      showToast('Health profile saved. Advisory recalculated.');
    } catch (err) {
      console.error('Save profile failed', err);
      showToast('Failed to save profile');
    }
  };

  // Run What-If Scenario simulation
  const handleSimulateScenario = async (overrides) => {
    setIsRefreshing(true);
    try {
      const res = await api.generateAdvisory(overrides);
      setDashboardData((prev) => ({
        ...prev,
        risk: res.risk,
        advisory: res.advisory,
      }));
      const hData = await api.getHistory(7);
      setHistoryData(hData);
      showToast(res.simulated ? 'Scenario simulated successfully' : 'Reset to real live conditions');
    } catch (err) {
      console.error('Simulation failed', err);
      showToast('Simulation failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Trigger manual background scheduler check
  const handleTriggerScheduler = async () => {
    try {
      const res = await api.triggerScheduler();
      const hData = await api.getHistory(7);
      setHistoryData(hData);
      showToast('APScheduler check executed. Check alerts log.');
    } catch (err) {
      console.error('Scheduler trigger failed', err);
      showToast('Scheduler trigger failed');
    }
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <div className="loading-text">Connecting to Live Environmental Intelligence Engine...</div>
        <style>{`
          .loading-screen {
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            background: #090d16;
            color: var(--text-primary);
          }
          .loading-spinner {
            width: 44px;
            height: 44px;
            border: 3px solid rgba(56, 189, 248, 0.2);
            border-top-color: #38bdf8;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          .loading-text {
            font-size: 0.95rem;
            color: var(--text-secondary);
            font-weight: 500;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-root">
      <Navbar
        user={dashboardData?.user}
        profile={dashboardData?.profile}
        onOpenProfile={() => setIsProfileOpen(true)}
        onToggleNotifications={() => setIsDrawerOpen(true)}
        unreadCount={historyData?.audit_notifications?.length || 0}
      />

      <main className="app-container">
        {/* Hackathon Demo Switcher Banner */}
        <DemoUserBanner
          activePersonaId={activePersonaId}
          personas={personas}
          onSelectPersona={handleSelectPersona}
          isLoading={isRefreshing}
        />

        {/* Location bar with GPS & search */}
        <LocationSelector
          currentLocation={dashboardData?.location}
          onLocationSelect={handleLocationSelect}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Main Dashboard Cards */}
        <div className="dashboard-grid">
          {/* Real-time Weather Card */}
          <WeatherCard weather={dashboardData?.weather} />

          {/* Real-time AQI Gauge */}
          <AQIGauge aqiData={dashboardData?.aqi} />

          {/* Personalized Advisory & Explainability Card */}
          <AdvisoryCard
            risk={dashboardData?.risk}
            advisory={dashboardData?.advisory}
            profile={dashboardData?.profile}
            onSimulate={handleSimulateScenario}
            isGenerating={isRefreshing}
          />
        </div>

        {/* 7-Day Trend Chart & Alert History */}
        <HistoryTrends historyData={historyData} />
      </main>

      {/* Edit Health Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={dashboardData?.profile}
        onSave={handleSaveProfile}
        isSaving={isRefreshing}
      />

      {/* Notifications Drawer */}
      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        auditLogs={historyData?.audit_notifications}
        onTriggerScheduler={handleTriggerScheduler}
        isTriggering={isRefreshing}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-banner">
          <IconShield size={16} color="#38bdf8" />
          <span>{toastMessage}</span>
        </div>
      )}

      <style>{`
        .app-root {
          min-height: 100vh;
          position: relative;
        }
        .toast-banner {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #111827;
          border: 1px solid rgba(56, 189, 248, 0.4);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          color: var(--text-primary);
          padding: 12px 18px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          z-index: 2000;
          animation: toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes toastIn {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default App;
