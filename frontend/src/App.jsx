import React, { useState, useEffect } from 'react';
import { api, setAuthToken, getAuthToken } from './api/client';
import { Navbar } from './components/Navbar';
import { LocationSelector } from './components/LocationSelector';
import { WeatherCard } from './components/WeatherCard';
import { AQIGauge } from './components/AQIGauge';
import { AdvisoryCard } from './components/AdvisoryCard';
import { HistoryTrends } from './components/HistoryTrends';
import { ProfileModal } from './components/ProfileModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { OnboardingForm } from './components/OnboardingForm';

export function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [dashboardData, setDashboardData] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [activePersonaId, setActivePersonaId] = useState('');
  const [historyData, setHistoryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isForcedFallback, setIsForcedFallback] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  if (window.location.pathname === '/form') {
    return <OnboardingForm />;
  }

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const loadData = async (tokenOverride = null, forceFallback = isForcedFallback) => {
    try {
      if (tokenOverride) setAuthToken(tokenOverride);

      const [pList, data, hData] = await Promise.all([
        api.getPersonas().catch(() => []),
        api.getDashboard(undefined, undefined, undefined, forceFallback),
        api.getHistory(7).catch(() => null)
      ]);

      setPersonas(pList || []);
      setDashboardData(data);
      setHistoryData(hData);
    } catch (err) {
      console.error('Initial data load failed:', err);
      showToast('Error connecting to backend engine');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tok = urlParams.get('token');
    if (tok) {
      const name = urlParams.get('name') || 'Google User';
      showToast(`Welcome ${name}`);
      loadData(tok);
    } else {
      loadData();
    }
  }, []);

  const handleSelectPersona = async (personaId) => {
    setActivePersonaId(personaId);
    setIsRefreshing(true);
    try {
      const loginRes = await api.demoLogin(personaId);
      setAuthToken(loginRes.access_token);
      await loadData(loginRes.access_token);
      showToast(`Switched to ${loginRes.user.name}`);
    } catch (err) {
      console.error('Persona switch failed', err);
      showToast('Failed to switch persona');
      setIsRefreshing(false);
    }
  };

  const handleToggleFallback = async () => {
    const next = !isForcedFallback;
    setIsForcedFallback(next);
    setIsRefreshing(true);
    await loadData(null, next);
    showToast(next ? 'Fallback simulation active' : 'Live Open-Meteo feeds active');
  };

  const handleLocationSelect = async (loc) => {
    setIsRefreshing(true);
    try {
      await api.updateLocation({
        lat: loc.lat,
        lon: loc.lon,
        label: loc.label,
      });
      const data = await api.getDashboard(loc.lat, loc.lon, loc.label, isForcedFallback);
      setDashboardData(data);
      showToast(`Location set to ${loc.label}`);
    } catch (err) {
      console.error('Location update failed', err);
      showToast('Error updating location');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    showToast('Data refreshed');
  };

  const handleSaveProfile = async (updatedData) => {
    try {
      await api.updateProfile(updatedData);
      setIsProfileOpen(false);
      handleRefresh();
      showToast('Profile saved · Risk recalculated');
    } catch (err) {
      console.error('Save profile failed', err);
      showToast('Failed to save profile');
    }
  };

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
      showToast('Scenario simulated');
      return res;
    } catch (err) {
      console.error('Simulation failed', err);
      showToast('Simulation failed');
      return null;
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTriggerScheduler = async () => {
    try {
      await api.triggerScheduler();
      const hData = await api.getHistory(7);
      setHistoryData(hData);
      showToast('Background check fired');
    } catch (err) {
      console.error('Scheduler trigger failed', err);
      showToast('Scheduler trigger failed');
    }
  };

  const handleSendTestEmail = async () => {
    try {
      showToast('Dispatching via Gmail SMTP…');
      const res = await api.sendTestEmail('tornovdutta@gmail.com');
      if (res?.dispatch?.status?.includes('delivered')) {
        showToast(`Delivered to ${res.dispatch.recipient}`);
      } else {
        showToast(`Email status: ${res?.dispatch?.status || 'sent'}`);
      }
      const hData = await api.getHistory(7);
      setHistoryData(hData);
    } catch (err) {
      console.error('Email dispatch failed', err);
      showToast('Email dispatch failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('aero_auth_token');
    window.location.href = '/';
  };

  if (isLoading && !dashboardData) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        background: '#f8fafc',
        color: '#0f172a'
      }}>
        <div style={{
          width: '28px',
          height: '28px',
          border: '2.5px solid #e2e8f0',
          borderTopColor: '#0f172a',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: '0.95rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Loading AeroHealth…</span>
      </div>
    );
  }

  const weather = dashboardData?.weather || {};
  const aqi = dashboardData?.aqi || {};
  const risk = dashboardData?.risk || {};
  const adv = dashboardData?.advisory || {};
  const user = dashboardData?.user || {};
  const profile = dashboardData?.profile || {};
  const loc = dashboardData?.location || {};

  const currentTemp = Math.round(weather?.temperature || 31);
  const currentAqi = Math.round(aqi?.aqi || 147);

  const hourlyData = [
    { time: 'Now', temp: currentTemp, aqi: currentAqi, icon: '⛅', isCurrent: true },
    { time: '12 PM', temp: currentTemp + 2, aqi: currentAqi + 18, icon: '☀️' },
    { time: '1 PM', temp: currentTemp + 3, aqi: currentAqi + 26, icon: '☀️' },
    { time: '2 PM', temp: currentTemp + 4, aqi: currentAqi + 32, icon: '☀️' },
    { time: '3 PM', temp: currentTemp + 3, aqi: currentAqi + 28, icon: '☀️' },
    { time: '4 PM', temp: currentTemp + 2, aqi: currentAqi + 14, icon: '⛅' },
    { time: '5 PM', temp: currentTemp, aqi: currentAqi - 8, icon: '⛅' },
    { time: '6 PM', temp: currentTemp - 2, aqi: currentAqi - 22, icon: '🌙' },
  ];

  const dailyForecast = [
    { day: 'Today', high: currentTemp + 3, low: currentTemp - 6, aqi: currentAqi, icon: '⛅' },
    { day: 'Sat', high: currentTemp + 2, low: currentTemp - 5, aqi: 112, icon: '☀️' },
    { day: 'Sun', high: currentTemp + 4, low: currentTemp - 4, aqi: 98, icon: '⛅' },
    { day: 'Mon', high: currentTemp + 1, low: currentTemp - 7, aqi: 86, icon: '🌧️' },
    { day: 'Tue', high: currentTemp, low: currentTemp - 6, aqi: 74, icon: '⛅' },
    { day: 'Wed', high: currentTemp + 2, low: currentTemp - 5, aqi: 68, icon: '☀️' },
    { day: 'Thu', high: currentTemp + 3, low: currentTemp - 4, aqi: 72, icon: '☀️' },
  ];

  const alertsList = historyData?.alerts || historyData?.audit_notifications || [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <Navbar
        user={user}
        profile={profile}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenProfile={() => setIsProfileOpen(true)}
        onToggleNotifications={() => setIsDrawerOpen(true)}
        unreadCount={alertsList.length}
        onLogout={getAuthToken() ? handleLogout : undefined}
      />

      <main className="app-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {activeTab === 'home' && (
          <>
            <WeatherCard
              weather={weather}
              location={loc}
              user={user}
              isForcedFallback={isForcedFallback}
              onToggleFallback={handleToggleFallback}
            />

            <LocationSelector
              currentLocation={loc}
              onLocationSelect={handleLocationSelect}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
              <AdvisoryCard
                mode="compact"
                risk={risk}
                advisory={adv}
                profile={profile}
                location={loc}
                aqiData={aqi}
                weather={weather}
                onViewAdvisory={() => setActiveTab('advisory')}
              />
              <AQIGauge aqiData={aqi} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <div className="premium-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>Hourly Forecast</h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Next 8 hours →</span>
                </div>
                <div className="horizontal-scroll">
                  {hourlyData.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        minWidth: '72px',
                        background: h.isCurrent ? '#ffffff' : '#f8fafc',
                        border: h.isCurrent ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '12px 8px',
                        textAlign: 'center',
                        flexShrink: 0
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', color: h.isCurrent ? '#0f172a' : '#64748b', fontWeight: h.isCurrent ? 700 : 600, marginBottom: '6px' }}>
                        {h.time}
                      </div>
                      <div style={{ fontSize: '1.2rem', marginBottom: '6px' }}>{h.icon}</div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px', letterSpacing: '-0.02em' }}>
                        {h.temp}°
                      </div>
                      <div style={{
                        fontSize: '0.66rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '999px',
                        background: h.aqi > 150 ? '#fef2f2' : h.aqi > 100 ? '#fffbeb' : '#ecfdf5',
                        color: h.aqi > 150 ? '#991b1b' : h.aqi > 100 ? '#92400e' : '#065f46'
                      }}>
                        AQI {h.aqi}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="premium-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>7-Day Forecast</h3>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Weekly →</span>
                </div>
                <div className="horizontal-scroll">
                  {dailyForecast.map((d, di) => (
                    <div
                      key={di}
                      style={{
                        minWidth: '66px',
                        background: di === 0 ? '#ecfdf5' : '#f8fafc',
                        border: di === 0 ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '10px 6px',
                        textAlign: 'center',
                        flexShrink: 0
                      }}
                    >
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>{d.day}</div>
                      <div style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{d.icon}</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                        {d.high}° <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>{d.low}°</span>
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#059669', fontWeight: 700, marginTop: '4px' }}>
                        AQI {d.aqi}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.01em' }}>Today's Insight</h3>
                  <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45, margin: 0 }}>
                    Air quality improving over the next 3 days with increased wind circulation.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '40px' }}>
                    <div style={{ width: '8px', height: '36px', background: '#f59e0b', borderRadius: '3px' }} />
                    <div style={{ width: '8px', height: '28px', background: '#38bdf8', borderRadius: '3px' }} />
                    <div style={{ width: '8px', height: '22px', background: '#10b981', borderRadius: '3px' }} />
                    <div style={{ width: '8px', height: '16px', background: '#10b981', borderRadius: '3px' }} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#059669', lineHeight: 1, letterSpacing: '-0.02em' }}>↓ 32%</div>
                    <div style={{ fontSize: '0.66rem', color: '#64748b' }}>vs last week</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              background: '#ffffff',
              border: '1px solid var(--border-card)',
              borderRadius: 'var(--radius-xl)',
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.2rem' }}>🌿</span>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>Small changes. Healthier tomorrows.</div>
                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>Personalized environmental guidance for a more resilient you.</div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('advisory')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '999px',
                  background: '#f1f5f9',
                  color: '#0f172a',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Explore Advisory →
              </button>
            </div>
          </>
        )}

        {activeTab === 'advisory' && (
          <AdvisoryCard
            mode="full"
            risk={risk}
            advisory={adv}
            profile={profile}
            location={loc}
            aqiData={aqi}
            weather={weather}
            onSimulate={handleSimulateScenario}
            isGenerating={isRefreshing}
          />
        )}

        {activeTab === 'trends' && (
          <HistoryTrends historyData={historyData} />
        )}

        {activeTab === 'alerts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>
                  Alert Timeline
                </h1>
                <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
                  Automated clinical evaluations.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleTriggerScheduler}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '999px',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Trigger Background Check
                </button>
                <button
                  onClick={handleSendTestEmail}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '999px',
                    background: '#f1f5f9',
                    color: '#0f172a',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer'
                  }}
                >
                  Dispatch Email
                </button>
              </div>
            </div>

            {alertsList.length === 0 ? (
              <div className="premium-card" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📬</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>No automated alerts dispatched yet</div>
                <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                  Trigger a background check or dispatch a test alert.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {alertsList.map((item, idx) => (
                  <div key={idx} className="premium-card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '999px',
                          background: item.channel === 'sms' ? '#ecfdf5' : '#eff6ff',
                          color: item.channel === 'sms' ? '#065f46' : '#1d4ed8',
                          border: item.channel === 'sms' ? '1px solid #a7f3d0' : '1px solid #bfdbfe',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}>
                          {item.channel || 'EMAIL'}
                        </span>
                        <span style={{ fontSize: '0.76rem', color: '#64748b' }}>{item.time || 'Today'}</span>
                      </div>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#059669',
                        background: '#ecfdf5',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        border: '1px solid #a7f3d0'
                      }}>
                        ✓ Delivered
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#0f172a', marginBottom: '14px', letterSpacing: '-0.015em' }}>
                      {item.subject || 'Aero Health Alert'}
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                          What happened
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>
                          {item.preview || item.message || 'AQI exceeded clinical threshold.'}
                        </div>
                      </div>
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                          Why it matters
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>
                          Compounded sensitivity increases symptom risk.
                        </div>
                      </div>
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                          What to do
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4 }}>
                          Shift outdoor exertion from 11 AM – 4 PM.
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginTop: '12px' }}>
                      <span>Trigger: clinical threshold</span>
                      <span>{item.recipient || 'tornovdutta@gmail.com'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={profile}
        onSave={handleSaveProfile}
        isSaving={isRefreshing}
      />

      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        auditLogs={alertsList}
        onTriggerScheduler={handleTriggerScheduler}
        isTriggering={isRefreshing}
        onSendTestEmail={handleSendTestEmail}
        onViewAlertsTab={() => setActiveTab('alerts')}
      />

      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#0f172a',
          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.25)',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: '999px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.82rem',
          fontWeight: 500,
          zIndex: 2000,
          animation: 'toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;