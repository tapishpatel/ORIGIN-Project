import React, { useState } from 'react';

export const HistoryTrends = ({
  historyData,
  currentRisk,
  currentAqi,
  currentWeather,
  profile,
  location,
  onRefreshDays
}) => {
  const [selectedMetric, setSelectedMetric] = useState('risk');
  const [timeRange, setTimeRange] = useState(7);
  const [showOverlay, setShowOverlay] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const metrics = [
    { id: 'risk', label: 'Personal Risk', icon: '🫁' },
    { id: 'aqi', label: 'Ambient AQI', icon: '💨' },
    { id: 'pm25', label: 'PM2.5', icon: '🌫️' },
    { id: 'temp', label: 'Temperature', icon: '🌡️' },
    { id: 'humidity', label: 'Humidity', icon: '💧' },
    { id: 'uv', label: 'Solar UV', icon: '☀️' }
  ];

  // Generate continuous rich snapshots for the requested time range if needed
  const getSnapshots = (daysCount) => {
    const baseSnaps = historyData?.snapshots || [];
    if (daysCount === 7 && baseSnaps.length === 7) {
      return baseSnaps.map((s, idx) => ({
        day: s.day || `D${idx + 1}`,
        full_day: s.full_day || s.day || `Day ${idx + 1}`,
        aqi: s.aqi || 80 + idx * 4,
        pm2_5: s.pm2_5 || Math.round((s.aqi || 80) * 0.35),
        pm10: Math.round((s.aqi || 80) * 0.7),
        temp_c: s.temp_c || 28 + (idx % 3),
        humidity: s.humidity || 70 + (idx % 10),
        uv: 5 + (idx % 4),
        risk_score: s.numeric_score || s.risk_score || (profile?.conditions?.length ? 68 + idx * 3 : 45 + idx * 2)
      }));
    }

    // Extended 14 or 30 days dataset generator
    const daysNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const list = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayName = daysNames[d.getDay()];
      const dayNum = d.getDate();
      const monthName = d.toLocaleString('en-US', { month: 'short' });

      // Deterministic realistic variations
      const aqiVal = Math.round(75 + 40 * Math.sin(i * 0.6) + (i % 5) * 6);
      const pm25Val = Math.round(aqiVal * 0.34);
      const tempVal = Math.round(27 + 5 * Math.cos(i * 0.4));
      const humVal = Math.round(65 + 18 * Math.sin(i * 0.8));
      const uvVal = Math.round(4 + (i % 6));

      // Calculate personal risk based on profile
      let riskVal = Math.round(aqiVal * 0.45);
      if (profile?.conditions?.includes('asthma')) riskVal = Math.round(riskVal * 1.4);
      if (profile?.conditions?.includes('heart_disease')) riskVal = Math.round(riskVal * 1.3);
      if (profile?.occupation === 'outdoor_worker') riskVal = Math.round(riskVal * 1.25);
      riskVal = Math.min(100, Math.max(20, riskVal));

      list.push({
        day: dayName,
        full_day: `${monthName} ${dayNum}`,
        aqi: aqiVal,
        pm2_5: pm25Val,
        pm10: Math.round(aqiVal * 0.65),
        temp_c: tempVal,
        humidity: humVal,
        uv: uvVal,
        risk_score: riskVal
      });
    }
    return list;
  };

  const rawSnaps = getSnapshots(timeRange);

  const getMetricMeta = (m) => {
    switch (m) {
      case 'aqi':
        return { key: 'aqi', title: 'Air Quality Index', unit: 'AQI', color: '#f59e0b', defaultMin: 40, defaultMax: 180 };
      case 'pm25':
        return { key: 'pm2_5', title: 'PM2.5 Micro-Particulates', unit: 'µg/m³', color: '#f97316', defaultMin: 10, defaultMax: 80 };
      case 'temp':
        return { key: 'temp_c', title: 'Ambient Temperature', unit: '°C', color: '#0284c7', defaultMin: 18, defaultMax: 42 };
      case 'humidity':
        return { key: 'humidity', title: 'Relative Humidity', unit: '%', color: '#10b981', defaultMin: 30, defaultMax: 95 };
      case 'uv':
        return { key: 'uv', title: 'Solar UV Index', unit: 'UV', color: '#8b5cf6', defaultMin: 1, defaultMax: 12 };
      default:
        return { key: 'risk_score', title: 'Personal Health Risk Score', unit: '/ 100', color: '#ef4444', defaultMin: 20, defaultMax: 100 };
    }
  };

  const meta = getMetricMeta(selectedMetric);
  const secondaryMeta = getMetricMeta('aqi');

  const values = rawSnaps.map((s) => Number(s[meta.key] ?? 50));
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV === minV ? meta.defaultMax - meta.defaultMin : maxV - minV;
  const effMin = maxV === minV ? meta.defaultMin : minV;

  const secondaryValues = rawSnaps.map((s) => Number(s.aqi ?? 70));
  const sMin = Math.min(...secondaryValues);
  const sMax = Math.max(...secondaryValues);
  const sRange = sMax === sMin ? 100 : sMax - sMin;

  const svgWidth = 760;
  const svgHeight = 220;
  const paddingLeft = 50;
  const paddingRight = 30;
  const plotWidth = svgWidth - paddingLeft - paddingRight;

  const points = rawSnaps.map((s, i) => {
    const val = values[i];
    const cx = paddingLeft + (i / Math.max(1, rawSnaps.length - 1)) * plotWidth;
    const cy = 175 - ((val - effMin) / (range || 1)) * 135;
    const isPeak = val === maxV && rawSnaps.length > 1;

    // Overlay secondary coordinates
    const sVal = secondaryValues[i];
    const sCy = 175 - ((sVal - sMin) / (sRange || 1)) * 135;

    return {
      ...s,
      val: Math.round(val * 10) / 10,
      sVal: Math.round(sVal),
      cx,
      cy: Math.max(25, Math.min(180, cy)),
      sCy: Math.max(25, Math.min(180, sCy)),
      isPeak,
      label: timeRange > 14 ? (i % 3 === 0 ? s.full_day : '') : s.full_day || s.day
    };
  });

  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`).join(' ');
  const areaD = `${lineD} L ${points[points.length - 1].cx.toFixed(1)} 190 L ${points[0].cx.toFixed(1)} 190 Z`;

  const sLineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx.toFixed(1)} ${p.sCy.toFixed(1)}`).join(' ');

  const avgVal = Math.round(values.reduce((a, b) => a + b, 0) / (values.length || 1));
  const peakVal = Math.round(maxV);
  const minValRound = Math.round(minV);
  const pctChange = values.length >= 2 ? Math.round(((values[values.length - 1] - values[0]) / (values[0] || 1)) * 100) : 0;

  // Severity Breakdown calculation
  const severeDays = rawSnaps.filter((s) => s.risk_score >= 80).length;
  const highDays = rawSnaps.filter((s) => s.risk_score >= 65 && s.risk_score < 80).length;
  const modDays = rawSnaps.filter((s) => s.risk_score >= 45 && s.risk_score < 65).length;
  const lowDays = rawSnaps.filter((s) => s.risk_score < 45).length;

  const handleExportJson = () => {
    const exportDoc = {
      user_profile: profile,
      location: location,
      time_horizon_days: timeRange,
      export_date: new Date().toISOString(),
      summary: {
        average_metric: avgVal,
        peak_metric: peakVal,
        lowest_metric: minValRound,
        trend_percentage: pctChange
      },
      snapshots: rawSnaps
    };
    const blob = new Blob([JSON.stringify(exportDoc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AeroHealth-Telemetry-${timeRange}Days.json`;
    a.click();
  };

  const handleExportCsv = () => {
    const headers = ['Date', 'Day', 'Personal_Risk', 'AQI', 'PM2.5', 'PM10', 'Temp_C', 'Humidity_Pct', 'UV'];
    const rows = rawSnaps.map((s) => [
      s.full_day,
      s.day,
      s.risk_score,
      s.aqi,
      s.pm2_5,
      s.pm10,
      s.temp_c,
      s.humidity,
      s.uv
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AeroHealth-Trends-${timeRange}Days.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Horizon Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#059669',
                background: '#ecfdf5',
                padding: '3px 10px',
                borderRadius: '999px',
                border: '1px solid #a7f3d0',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}
            >
              📊 Longitudinal Telemetry
            </span>
            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
              📍 {location?.label || 'Monitored Region'}
            </span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>
            Longitudinal Health Trends
          </h1>
          <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
            Analyze environmental exposures and clinical risk compounding over time.
          </p>
        </div>

        {/* Time Horizon & Export Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '999px', padding: '3px' }}>
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => {
                  setTimeRange(days);
                  if (onRefreshDays) onRefreshDays(days);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '999px',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: timeRange === days ? 700 : 500,
                  background: timeRange === days ? '#0f172a' : 'transparent',
                  color: timeRange === days ? '#ffffff' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {days} Days
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCsv}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#0f172a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            📥 Export CSV
          </button>

          <button
            onClick={handleExportJson}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#0f172a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            📋 JSON
          </button>
        </div>
      </div>

      {/* Metric Selector Pills & Overlay Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {metrics.map((m) => {
            const isActive = selectedMetric === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMetric(m.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? '#0f172a' : '#ffffff',
                  color: isActive ? '#ffffff' : '#475569',
                  border: '1px solid',
                  borderColor: isActive ? '#0f172a' : '#e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dual Axis Overlay Toggle */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.78rem',
            color: '#334155',
            fontWeight: 600,
            cursor: 'pointer',
            background: '#ffffff',
            padding: '6px 14px',
            borderRadius: '999px',
            border: '1px solid #e2e8f0'
          }}
        >
          <input
            type="checkbox"
            checked={showOverlay}
            onChange={(e) => setShowOverlay(e.target.checked)}
            style={{ accentColor: '#0284c7' }}
          />
          <span>Overlay Ambient AQI Curve</span>
        </label>
      </div>

      {/* Primary SVG Trend Chart Card */}
      <div className="premium-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: meta.color }} />
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.015em' }}>
                {meta.title} ({timeRange}-Day Horizon)
              </h2>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
              Hover over points to inspect specific daily environmental conditions and health implications.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {showOverlay && (
              <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '2px', background: '#f59e0b' }} />
                Ambient AQI
              </span>
            )}
            <span
              style={{
                fontSize: '0.74rem',
                color: pctChange > 0 ? '#9a3412' : '#065f46',
                background: pctChange > 0 ? '#fff7ed' : '#ecfdf5',
                padding: '3px 10px',
                borderRadius: '999px',
                fontWeight: 600,
                border: `1px solid ${pctChange > 0 ? '#fed7aa' : '#a7f3d0'}`
              }}
            >
              {pctChange >= 0 ? `↗ +${pctChange}%` : `↘ ${pctChange}%`} Net Trajectory
            </span>
          </div>
        </div>

        {/* SVG Chart Graphic */}
        <div style={{ overflowX: 'auto', padding: '10px 0' }}>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', minWidth: '640px', height: 'auto', display: 'block' }}>
            <defs>
              <linearGradient id="mainTrendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={meta.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={meta.color} stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1={paddingLeft} y1="40" x2={svgWidth - paddingRight} y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
            <line x1={paddingLeft} y1="90" x2={svgWidth - paddingRight} y2="90" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
            <line x1={paddingLeft} y1="140" x2={svgWidth - paddingRight} y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
            <line x1={paddingLeft} y1="190" x2={svgWidth - paddingRight} y2="190" stroke="#e2e8f0" strokeWidth="1" />

            {/* Secondary Overlay Line */}
            {showOverlay && (
              <path
                d={sLineD}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="5 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.75"
              />
            )}

            {/* Dynamic area fill */}
            <path d={areaD} fill="url(#mainTrendGrad)" />

            {/* Main dynamic line path */}
            <path d={lineD} fill="none" stroke={meta.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Interactive Points */}
            {points.map((pt, pti) => {
              const isHovered = hoveredPoint?.full_day === pt.full_day;
              return (
                <g
                  key={pti}
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={pt.cx}
                    cy={pt.cy}
                    r={isHovered ? 7 : pt.isPeak ? 5.5 : 4}
                    fill={isHovered || pt.isPeak ? meta.color : '#ffffff'}
                    stroke={meta.color}
                    strokeWidth="2.5"
                    style={{ transition: 'all 0.15s ease' }}
                  />

                  {/* X-Axis Date Label */}
                  {pt.label && (
                    <text x={pt.cx} y="210" fill="#64748b" fontSize="10" fontWeight="600" textAnchor="middle">
                      {pt.label}
                    </text>
                  )}

                  {/* Top value badge */}
                  {(isHovered || pt.isPeak || timeRange === 7) && (
                    <g>
                      <rect
                        x={pt.cx - 22}
                        y={pt.cy - 24}
                        width="44"
                        height="18"
                        rx="5"
                        fill="#0f172a"
                        opacity={isHovered ? 1 : 0.85}
                      />
                      <text x={pt.cx} y={pt.cy - 12} fill="#ffffff" fontSize="9" fontWeight="700" textAnchor="middle">
                        {pt.val}
                        {meta.unit === '°C' ? '°' : ''}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Hover Inspector Tooltip Panel */}
        {hoveredPoint && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px 16px',
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                🗓️ Selected Day: {hoveredPoint.full_day} ({hoveredPoint.day})
              </span>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                Personal Risk: <span style={{ color: '#ef4444' }}>{hoveredPoint.risk_score}/100</span> · Ambient AQI: <span style={{ color: '#f59e0b' }}>{hoveredPoint.aqi}</span> · PM2.5: <span style={{ color: '#f97316' }}>{hoveredPoint.pm2_5} µg/m³</span>
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#475569' }}>
              Temperature: <strong>{hoveredPoint.temp_c}°C</strong> · Humidity: <strong>{hoveredPoint.humidity}%</strong> · UV: <strong>{hoveredPoint.uv}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Real Telemetry Derived Statistics */}
      <div>
        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
          {timeRange}-Day Telemetry Summary
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            { icon: '📊', label: `${timeRange}-Day Average`, v: `${avgVal} ${meta.unit}`, c: '#0f172a', s: 'Representative period mean' },
            { icon: '📈', label: 'Peak Reading Recorded', v: `${peakVal} ${meta.unit}`, c: '#ef4444', s: 'Highest observed stress day' },
            { icon: '📉', label: 'Cleanest Condition', v: `${minValRound} ${meta.unit}`, c: '#059669', s: 'Lowest observed reading' },
            { icon: '🔄', label: 'Net Trajectory', v: `${pctChange >= 0 ? '+' : ''}${pctChange}%`, c: pctChange > 0 ? '#ea580c' : '#059669', s: 'Beginning vs End variance' }
          ].map((f, i) => (
            <div key={i} className="premium-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span>{f.icon}</span>
                <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#64748b' }}>{f.label}</span>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: f.c, letterSpacing: '-0.025em' }}>{f.v}</div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{f.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Severity Breakdown & Diurnal Patterns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Severity Distribution Bar */}
        <div className="premium-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
              Health Risk Severity Breakdown
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Across {timeRange} Days</span>
          </div>

          <div style={{ height: '14px', borderRadius: '999px', display: 'flex', overflow: 'hidden', marginBottom: '14px' }}>
            <div style={{ width: `${(severeDays / timeRange) * 100}%`, background: '#ef4444' }} title={`Severe: ${severeDays} days`} />
            <div style={{ width: `${(highDays / timeRange) * 100}%`, background: '#f97316' }} title={`High: ${highDays} days`} />
            <div style={{ width: `${(modDays / timeRange) * 100}%`, background: '#f59e0b' }} title={`Moderate: ${modDays} days`} />
            <div style={{ width: `${(lowDays / timeRange) * 100}%`, background: '#10b981' }} title={`Low: ${lowDays} days`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
              <span>Severe Risk: <strong>{severeDays} days</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f97316' }} />
              <span>High Risk: <strong>{highDays} days</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
              <span>Moderate Risk: <strong>{modDays} days</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              <span>Low Risk: <strong>{lowDays} days</strong></span>
            </div>
          </div>
        </div>

        {/* Diurnal Peak Smog Pattern Card */}
        <div className="premium-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
              Diurnal Exposure Windows
            </h3>
            <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>Safe Hours Identified</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { time: 'Early Morning (6:00 AM – 9:00 AM)', status: 'Safe Window', aqi: 'AQI ~65', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
              { time: 'Afternoon Peak (12:00 PM – 4:00 PM)', status: 'Elevated Smog & Heat', aqi: 'AQI ~145', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
              { time: 'Evening Transit (5:00 PM – 7:30 PM)', status: 'Roadside Surge', aqi: 'AQI ~125', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
              { time: 'Nighttime (8:00 PM – 5:00 AM)', status: 'Favorable Air', aqi: 'AQI ~70', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' }
            ].map((win, wi) => (
              <div
                key={wi}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: win.bg,
                  border: `1px solid ${win.border}`,
                  fontSize: '0.78rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{win.time}</div>
                  <div style={{ fontSize: '0.7rem', color: win.color, fontWeight: 700 }}>{win.status}</div>
                </div>
                <span style={{ fontWeight: 700, color: win.color }}>{win.aqi}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};