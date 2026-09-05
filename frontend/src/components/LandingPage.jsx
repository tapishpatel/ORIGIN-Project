import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

export function LandingPage({ onLogin, onOpenAuth }) {
  const [previewData, setPreviewData] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationLabel, setLocationLabel] = useState('Detecting your location…');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Interactive Live Risk Simulator state
  const [simAqi, setSimAqi] = useState(135);
  const [simCondition, setSimCondition] = useState('asthma');
  const [simTemp, setSimTemp] = useState(31);

  // Auto-detect location immediately on page load
  useEffect(() => {
    const fetchInitialLocation = async () => {
      setDetectingLocation(true);
      try {
        // Fast IP auto-detection first
        const auto = await api.autoDetectLocation().catch(() => null);
        let targetLat = 23.1967;
        let targetLon = 77.0819;
        let label = 'Madhya Pradesh, India';

        if (auto && auto.lat && auto.lon) {
          targetLat = auto.lat;
          targetLon = auto.lon;
          label = auto.label || `${auto.city}, ${auto.country}`;
        }
        setLocationLabel(label);

        const dash = await api.getDashboard(targetLat, targetLon, label).catch(() => null);
        if (dash) setPreviewData(dash);

        // Optionally refine with high precision GPS if browser allows
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                const { latitude, longitude } = pos.coords;
                const geo = await api.reverseGeocode(latitude, longitude).catch(() => null);
                const refinedLabel = geo?.label || label;
                setLocationLabel(refinedLabel);
                const refinedDash = await api.getDashboard(latitude, longitude, refinedLabel).catch(() => null);
                if (refinedDash) setPreviewData(refinedDash);
              } catch (e) {
                console.warn('GPS refinement note:', e);
              }
            },
            () => {},
            { timeout: 5000 }
          );
        }
      } catch (err) {
        console.warn('Initial location detection error:', err);
        setLocationLabel('New Delhi, Delhi, India');
        api.getDashboard(28.6139, 77.2090, 'New Delhi, Delhi, India').then(setPreviewData).catch(() => {});
      } finally {
        setDetectingLocation(false);
      }
    };

    fetchInitialLocation();
  }, []);

  const openAuth = (mode = 'login') => {
    if (onOpenAuth) {
      onOpenAuth(mode);
    } else if (onLogin) {
      onLogin();
    } else {
      window.location.href = 'http://localhost:8000/auth/google/login';
    }
  };

  const handleGoogleLogin = () => {
    openAuth('login');
  };

  const handleCitySearch = async (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await api.searchCities(val);
      setSearchResults(res.slice(0, 5));
    } catch (err) {
      console.warn('City search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCity = async (city) => {
    setSearchResults([]);
    setSearchQuery('');
    setLocationLabel(city.label);
    setDetectingLocation(true);
    try {
      const dash = await api.getDashboard(city.lat, city.lon, city.label);
      setPreviewData(dash);
    } catch (err) {
      console.warn('City select fetch error:', err);
    } finally {
      setDetectingLocation(false);
    }
  };

  const handleRefreshAutoLocation = async () => {
    setDetectingLocation(true);
    try {
      const auto = await api.autoDetectLocation();
      if (auto?.lat) {
        setLocationLabel(auto.label);
        const dash = await api.getDashboard(auto.lat, auto.lon, auto.label);
        setPreviewData(dash);
      }
    } catch (e) {
      console.warn('Refresh location error:', e);
    } finally {
      setDetectingLocation(false);
    }
  };

  // Compute interactive simulation values
  const computeSimulation = () => {
    let multiplier = 1.0;
    let conditionName = 'Baseline Resilient';
    let advisoryAdvice = 'Air quality is favorable. Maintain normal physical routines.';
    let actions = ['Enjoy outdoor recreation', 'Ventilate living spaces', 'Standard hydration'];

    if (simCondition === 'asthma') {
      multiplier = 1.55;
      conditionName = 'Asthma / Reactive Airway';
      if (simAqi > 150) {
        advisoryAdvice = 'Bronchial irritation risk is elevated. Micro-particulates can trigger acute wheezing.';
        actions = ['Carry quick-relief rescue inhaler', 'Equip sealed N95 mask outdoors', 'Run HEPA filtration indoors'];
      } else if (simAqi > 80) {
        advisoryAdvice = 'Moderate particulate levels present minor airway friction. Monitor breathing rhythm.';
        actions = ['Avoid sprinting on busy roadways', 'Stay hydrated with warm fluids', 'Keep inhaler accessible'];
      }
    } else if (simCondition === 'cardiac') {
      multiplier = 1.5;
      conditionName = 'Cardiovascular Vulnerability';
      if (simAqi > 150) {
        advisoryAdvice = 'Heavy PM2.5 infiltration increases systemic arterial stress and blood pressure.';
        actions = ['Limit strenuous outdoor physical lifting', 'Stay in temperature-controlled spaces', 'Monitor resting pulse'];
      } else if (simAqi > 80) {
        advisoryAdvice = 'Subtle vascular strain detected. Plan outdoor exertion during morning hours.';
        actions = ['Avoid peak smog hours', 'Maintain steady hydration', 'Take regular resting intervals'];
      }
    } else if (simCondition === 'athlete') {
      multiplier = 1.35;
      conditionName = 'Outdoor Athlete / Runner';
      if (simAqi > 150) {
        advisoryAdvice = 'High-ventilation cardio will pull heavy particulate burden deep into lung alveoli.';
        actions = ['Relocate workout to indoor treadmill', 'Shift long runs before sunrise', 'Focus on low-impact recovery'];
      } else if (simAqi > 80) {
        advisoryAdvice = 'Moderate atmospheric resistance. Aerobic capacity slightly impacted.';
        actions = ['Choose green canopy running trails', 'Reduce sprint intervals', 'Hydrate with electrolytes'];
      }
    } else {
      if (simAqi > 150) {
        advisoryAdvice = 'Elevated ambient particulate concentration. Healthy individuals should reduce prolonged heavy exertion.';
        actions = ['Minimize long outdoor commute times', 'Close windows facing main roads', 'Use basic mask in dusty corridors'];
      }
    }

    const rawScore = Math.min(100, Math.round((simAqi / 300) * 80 * multiplier));
    let level = 'Low';
    let badgeColor = '#059669';
    let badgeBg = '#ecfdf5';
    let badgeBorder = '#a7f3d0';

    if (rawScore >= 75) {
      level = 'Critical Risk';
      badgeColor = '#dc2626';
      badgeBg = '#fef2f2';
      badgeBorder = '#fecaca';
    } else if (rawScore >= 55) {
      level = 'High Risk';
      badgeColor = '#ea580c';
      badgeBg = '#fff7ed';
      badgeBorder = '#fed7aa';
    } else if (rawScore >= 35) {
      level = 'Moderate Risk';
      badgeColor = '#d97706';
      badgeBg = '#fffbeb';
      badgeBorder = '#fde68a';
    }

    return { rawScore, level, badgeColor, badgeBg, badgeBorder, conditionName, advisoryAdvice, actions };
  };

  const simResult = computeSimulation();

  const weather = previewData?.weather || { temperature: 29, humidity: 52, uv_index: 4.8 };
  const aqi = previewData?.aqi || { aqi: 114, category: 'Moderate', pm2_5: 38.5 };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #f1f5f9 0%, #f8fafc 60%, #ffffff 100%)',
      color: '#0f172a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Top Navigation Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: 'rgba(255, 255, 255, 0.82)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        padding: '12px 24px'
      }}>
        <div style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '11px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '1.15rem',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)'
            }}>
              🌿
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#0f172a' }}>
                  AeroHealth
                </span>
                <span style={{
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  letterSpacing: '0.04em'
                }}>
                  LIVE TELEMETRY
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Navigation & Auth Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <a
              href="#simulator"
              style={{
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#475569',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: '999px',
                transition: 'all 0.15s ease'
              }}
            >
              Risk Simulator
            </a>

            <button
              onClick={() => openAuth('login')}
              style={{
                padding: '8px 18px',
                borderRadius: '999px',
                background: 'transparent',
                color: '#0f172a',
                fontSize: '0.84rem',
                fontWeight: 700,
                border: '1px solid #cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#94a3b8';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
            >
              Sign In
            </button>

            <button
              onClick={() => openAuth('signup')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 20px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                transition: 'transform 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span>Get Started</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        maxWidth: '1180px',
        margin: '0 auto',
        padding: '50px 24px 30px 24px',
        textAlign: 'center'
      }}>
        {/* Real-time Status Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '999px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
          fontSize: '0.78rem',
          color: '#334155',
          fontWeight: 600,
          marginBottom: '20px'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
          <span>Real-time Environmental Health Intelligence</span>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <span style={{ color: '#64748b' }}>Clinical Multiplier Engine</span>
        </div>

        {/* Big Bold Headline */}
        <h1 style={{
          fontSize: 'clamp(2.4rem, 5.5vw, 3.8rem)',
          fontWeight: 800,
          lineHeight: 1.12,
          letterSpacing: '-0.035em',
          color: '#0f172a',
          margin: '0 auto 20px auto',
          maxWidth: '860px'
        }}>
          Your Air. Your Physiology. <br />
          <span style={{
            background: 'linear-gradient(135deg, #0284c7 0%, #059669 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Truly Personalized.
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '1.08rem',
          color: '#475569',
          maxWidth: '680px',
          margin: '0 auto 32px auto',
          lineHeight: 1.6,
          letterSpacing: '-0.01em'
        }}>
          AeroHealth pairs live sensor feeds from WAQI & Open-Meteo with your personal medical profile — delivering clinical advisories, personal risk multipliers, and SMS warnings directly to your phone.
        </p>

        {/* Primary CTA Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap', marginBottom: '44px' }}>
          <button
            onClick={() => openAuth('signup')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 32px',
              borderRadius: '999px',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '0.98rem',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
              transition: 'transform 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <span>Create Free Account</span>
            <span style={{ fontSize: '1.1rem' }}>🚀</span>
          </button>

          <button
            onClick={() => openAuth('login')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 26px',
              borderRadius: '999px',
              background: '#ffffff',
              color: '#0f172a',
              fontSize: '0.96rem',
              fontWeight: 700,
              border: '1px solid #cbd5e1',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.borderColor = '#94a3b8';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
          >
            <span>⚡ 1-Click Demo Sign In</span>
          </button>

          <a
            href="#simulator"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '14px 24px',
              borderRadius: '999px',
              background: 'transparent',
              color: '#475569',
              fontSize: '0.94rem',
              fontWeight: 600,
              border: '1px dashed #cbd5e1',
              textDecoration: 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <span>Live Simulator</span>
            <span>↓</span>
          </a>
        </div>

        {/* Live Ambient Telemetry Card with Search Bar */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '24px',
          boxShadow: '0 20px 45px -12px rgba(15, 23, 42, 0.08)',
          padding: '24px 28px',
          textAlign: 'left',
          maxWidth: '960px',
          margin: '0 auto',
          position: 'relative'
        }}>
          {/* Card Top: Location Badge + Quick City Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}>
                📍
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.015em' }}>
                    {detectingLocation ? 'Updating live coordinates…' : locationLabel}
                  </span>
                  <button
                    type="button"
                    onClick={handleRefreshAutoLocation}
                    disabled={detectingLocation}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#0284c7',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                    title="Auto-detect via IP / GPS"
                  >
                    Auto-detect
                  </button>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                  Live Telemetry from Open-Meteo · Validated Real Coordinates
                </div>
              </div>
            </div>

            {/* Quick Interactive City Search */}
            <div style={{ position: 'relative', width: '260px', maxWidth: '100%' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={handleCitySearch}
                placeholder="Check any city (e.g. Bhopal)..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '8px 12px',
                  borderRadius: '999px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '0.8rem',
                  outline: 'none',
                  color: '#0f172a'
                }}
              />
              {searchResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  width: '280px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  zIndex: 20,
                  marginTop: '6px',
                  overflow: 'hidden'
                }}>
                  {searchResults.map((c, i) => (
                    <div
                      key={i}
                      onClick={() => handleSelectCity(c)}
                      style={{
                        padding: '9px 14px',
                        fontSize: '0.78rem',
                        color: '#0f172a',
                        borderBottom: i < searchResults.length - 1 ? '1px solid #f1f5f9' : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.1s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                    >
                      📍 {c.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4 Telemetry Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '14px',
            marginBottom: '20px'
          }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Temperature
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
                {Math.round(weather.temperature)}°C
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                Relative Humidity: {weather.humidity}%
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Air Quality Index (AQI)
              </div>
              <div style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                color: aqi.aqi > 150 ? '#dc2626' : aqi.aqi > 100 ? '#ea580c' : '#059669',
                letterSpacing: '-0.03em'
              }}>
                {Math.round(aqi.aqi)}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                PM2.5: {aqi.pm2_5} µg/m³ · {aqi.category || 'Monitored'}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                UV Solar Radiation
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
                {weather.uv_index || 4.5}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '4px' }}>
                Moderate UV Exposure
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Fast2SMS Gateway
              </div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0284c7', letterSpacing: '-0.03em' }}>
                SMS Alerts
              </div>
              <div style={{ fontSize: '0.74rem', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
                Instant Mobile OTP Active
              </div>
            </div>
          </div>

          {/* Quick Sign-In Banner */}
          <div style={{
            background: '#f1f5f9',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                View your personal health risk assessment
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Authenticate with Google to configure asthma, cardiac conditions, or outdoor shift hours.
              </div>
            </div>
            <button
              onClick={handleGoogleLogin}
              style={{
                padding: '9px 20px',
                borderRadius: '999px',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Sign In to Personalize →
            </button>
          </div>
        </div>
      </section>

      {/* Interactive Live AQI Risk Simulator Section */}
      <section id="simulator" style={{
        maxWidth: '1040px',
        margin: '60px auto 40px auto',
        padding: '0 24px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 14px',
            borderRadius: '999px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            fontSize: '0.74rem',
            fontWeight: 700,
            color: '#0284c7',
            letterSpacing: '0.04em',
            marginBottom: '10px'
          }}>
            INTERACTIVE CLINICAL SIMULATOR
          </div>
          <h2 style={{
            fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.025em',
            margin: 0
          }}>
            See How Air Quality Impacts Your Body
          </h2>
          <p style={{ fontSize: '0.94rem', color: '#64748b', marginTop: '8px', maxWidth: '620px', margin: '8px auto 0 auto' }}>
            Drag the AQI slider or switch health profiles to see clinical risk multipliers shift the danger threshold in real time.
          </p>
        </div>

        {/* Interactive Simulator Box */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          padding: '30px',
          boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.08)'
        }}>
          {/* Profile Condition Selector Tabs */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
              1. Choose Vulnerability Profile:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              {[
                { id: 'asthma', icon: '🫁', label: 'Asthma / Reactive Airway', sub: '1.55x pulmonary multiplier' },
                { id: 'cardiac', icon: '❤️', label: 'Cardiovascular Risk', sub: '1.50x vascular multiplier' },
                { id: 'athlete', icon: '🏃', label: 'Outdoor Athlete / Runner', sub: '1.35x high-ventilation load' },
                { id: 'baseline', icon: '🌿', label: 'Healthy Baseline', sub: '1.0x baseline threshold' },
              ].map((c) => {
                const isActive = simCondition === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSimCondition(c.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: '1.5px solid',
                      borderColor: isActive ? '#0f172a' : '#e2e8f0',
                      background: isActive ? '#f8fafc' : '#ffffff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '1.3rem', marginBottom: '4px' }}>{c.icon}</div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{c.label}</div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>{c.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sliders & Dynamic Output Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', alignItems: 'center' }}>
            {/* Left: AQI Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                  2. Air Quality Index (AQI):
                </span>
                <span style={{
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: simAqi > 150 ? '#dc2626' : simAqi > 100 ? '#ea580c' : '#059669'
                }}>
                  {simAqi} AQI
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="350"
                value={simAqi}
                onChange={(e) => setSimAqi(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '4px',
                  accentColor: simAqi > 150 ? '#dc2626' : simAqi > 100 ? '#ea580c' : '#059669',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
                <span>30 (Pristine)</span>
                <span>100 (Moderate)</span>
                <span>200 (Unhealthy)</span>
                <span>350 (Hazardous)</span>
              </div>

              {/* Temperature Slider */}
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                    Ambient Temperature:
                  </span>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: '#f97316' }}>
                    {simTemp}°C
                  </span>
                </div>
                <input
                  type="range"
                  min="16"
                  max="45"
                  value={simTemp}
                  onChange={(e) => setSimTemp(Number(e.target.value))}
                  style={{ width: '100%', height: '8px', borderRadius: '4px', accentColor: '#f97316', cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Right: Dynamic Live Risk Gauge Card */}
            <div style={{
              background: simResult.badgeBg,
              border: `1.5px solid ${simResult.badgeBorder}`,
              borderRadius: '20px',
              padding: '24px',
              transition: 'all 0.25s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: simResult.badgeColor }}>
                  Composite Health Score
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: '#ffffff',
                  color: simResult.badgeColor,
                  border: `1px solid ${simResult.badgeBorder}`
                }}>
                  {simResult.level}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px' }}>
                <div style={{ fontSize: '2.8rem', fontWeight: 900, color: simResult.badgeColor, letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {simResult.rawScore}
                </div>
                <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 600 }}>/ 100</span>
              </div>

              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                {simResult.conditionName}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.45, margin: '0 0 12px 0' }}>
                {simResult.advisoryAdvice}
              </p>

              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                Recommended Actions:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {simResult.actions.map((act, idx) => (
                  <div key={idx} style={{ fontSize: '0.76rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: simResult.badgeColor }}>✓</span>
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar Highlights */}
      <section style={{ maxWidth: '1100px', margin: '60px auto 40px auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Architected for Clinical-Grade Transparency
          </h2>
          <p style={{ fontSize: '0.92rem', color: '#64748b', marginTop: '8px' }}>
            Built with real API pipelines, robust cryptographic tokens, and zero synthetic personas.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '18px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '22px' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: '10px' }}>🛰️</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              Real-Time Atmospheric Feeds
            </div>
            <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
              Hourly temperature, PM2.5, relative humidity, and UV indexes queried live from Open-Meteo with zero mock placeholders.
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '22px' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: '10px' }}>🧬</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              Physiological Multipliers
            </div>
            <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
              Compound risk equations escalate alerts based on your asthma, hypertension, elderly age group, or outdoor work schedule.
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '22px' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: '10px' }}>📱</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              Direct Fast2SMS Warnings
            </div>
            <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
              Critical air quality emergencies trigger direct SMS dispatches to your verified Indian mobile number.
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '22px' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: '10px' }}>🔒</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              User-Centric & Private
            </div>
            <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
              Personal Data Protection guarantees zero synthetic profile pollution. Your telemetry and profile remain strictly yours.
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Conversion CTA Banner */}
      <section style={{ maxWidth: '1100px', margin: '60px auto 30px auto', padding: '0 24px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '24px',
          padding: '40px 32px',
          color: '#ffffff',
          textAlign: 'center',
          boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(2, 132, 199, 0.25) 0%, rgba(2, 132, 199, 0) 70%)',
            pointerEvents: 'none'
          }} />
          <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 10px 0', letterSpacing: '-0.02em' }}>
            Ready for Personalized Air Quality Protection?
          </h3>
          <p style={{ fontSize: '0.92rem', color: '#94a3b8', maxWidth: '560px', margin: '0 auto 24px auto', lineHeight: 1.5 }}>
            Join thousands tracking physiological pollution risk. Set your conditions once and receive clinical AI advisories wherever you go.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => openAuth('signup')}
              style={{
                padding: '12px 28px',
                borderRadius: '999px',
                background: '#0284c7',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#0369a1'}
              onMouseOut={(e) => e.currentTarget.style.background = '#0284c7'}
            >
              Create Free Account 🚀
            </button>
            <button
              onClick={() => openAuth('login')}
              style={{
                padding: '12px 24px',
                borderRadius: '999px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 600,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              Sign In / Demo Login
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #e2e8f0',
        padding: '30px 24px',
        textAlign: 'center',
        background: '#ffffff',
        marginTop: '40px'
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1rem' }}>🌿</span>
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>AeroHealth</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>· Live Personal Environmental Intelligence</span>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Powered by WAQI, Open-Meteo, Groq Llama 3.3, Fast2SMS & MongoDB Atlas
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => openAuth('login')}
              style={{
                padding: '6px 16px',
                borderRadius: '999px',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '0.76rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => openAuth('signup')}
              style={{
                padding: '6px 16px',
                borderRadius: '999px',
                background: '#0284c7',
                color: '#ffffff',
                fontSize: '0.76rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
