import React, { useState, useRef, useEffect } from 'react';

/* ─────────────────────────────────────────────────────
   Colour helpers
───────────────────────────────────────────────────── */
const EXPOSURE_META = {
  low:      { label: 'Low Exposure',      emoji: '🟢', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', bar: '#10b981' },
  moderate: { label: 'Moderate Exposure', emoji: '🟡', color: '#d97706', bg: '#fffbeb', border: '#fde68a', bar: '#f59e0b' },
  high:     { label: 'High Exposure',     emoji: '🟠', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', bar: '#f97316' },
  severe:   { label: 'Very High',         emoji: '🔴', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', bar: '#ef4444' },
};

const aqiColor = (v) =>
  v > 200 ? '#b91c1c' : v > 150 ? '#ef4444' : v > 100 ? '#f97316' : v > 50 ? '#f59e0b' : '#10b981';

const MODES = [
  {
    id: 'walking',
    label: 'Walking',
    icon: '🚶',
    desc: 'Slowest · Direct outdoor exposure · Elevated breathing',
    speedKmh: 5,
    ventFactor: 1.0,
    breathRate: 1.4,
  },
  {
    id: 'cycling',
    label: 'Cycling',
    icon: '🚴',
    desc: 'Moderate speed · Open air · High exertion breathing',
    speedKmh: 15,
    ventFactor: 1.0,
    breathRate: 1.7,
  },
  {
    id: 'auto_rickshaw',
    label: 'Auto / E-Rick',
    icon: '🛺',
    desc: 'Open sides · No filtration · Medium speed',
    speedKmh: 22,
    ventFactor: 0.75,
    breathRate: 1.0,
  },
  {
    id: 'bus',
    label: 'Bus / Metro',
    icon: '🚌',
    desc: 'Enclosed · Partial filtration · Fixed route',
    speedKmh: 25,
    ventFactor: 0.5,
    breathRate: 1.0,
  },
  {
    id: 'car',
    label: 'Car (AC)',
    icon: '🚗',
    desc: 'Enclosed · Cabin air filter · Fastest personal mode',
    speedKmh: 40,
    ventFactor: 0.25,
    breathRate: 1.0,
  },
];

/* ─────────────────────────────────────────────────────
   City autocomplete dropdown
───────────────────────────────────────────────────── */
function CityInput({ label, placeholder, value, onChange, onSelect }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleOut = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOut);
    return () => document.removeEventListener('mousedown', handleOut);
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    clearTimeout(timerRef.current);
    if (!v.trim()) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/search-cities?query=${encodeURIComponent(v)}`);
        const data = await res.json();
        setResults(data || []);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 380);
  };

  const pick = (item) => {
    onChange(item.label);
    onSelect(item);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
      <label style={{
        fontSize: '0.72rem', fontWeight: 700, color: '#64748b',
        textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px'
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          value={value}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          style={{
            width: '100%', padding: '10px 36px 10px 14px', borderRadius: '12px',
            border: '1.5px solid #e2e8f0', fontSize: '0.88rem', fontWeight: 500,
            color: '#0f172a', background: '#ffffff', outline: 'none',
            boxSizing: 'border-box', transition: 'border-color 0.2s',
          }}
          onFocus={e => e.target.style.borderColor = '#0284c7'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />
        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', pointerEvents: 'none' }}>
          {loading ? '⏳' : '🔍'}
        </span>
      </div>
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
          background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(15,23,42,0.12)', zIndex: 200, overflow: 'hidden',
        }}>
          {results.map((r, i) => (
            <button key={i} onClick={() => pick(r)} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: '0.84rem', color: '#0f172a', fontWeight: 500,
              borderBottom: i < results.length - 1 ? '1px solid #f1f5f9' : 'none',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              📍 {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Exposure Bar Card
───────────────────────────────────────────────────── */
function ModeCard({ mode, result, isRecommended }) {
  const meta = EXPOSURE_META[result.exposure_level] || EXPOSURE_META.moderate;
  const pct = Math.min(100, Math.round(result.exposure_score));

  return (
    <div
      style={{
        background: isRecommended ? '#f0fdf4' : '#ffffff',
        border: `1.5px solid ${isRecommended ? '#86efac' : '#e2e8f0'}`,
        borderRadius: '16px', padding: '18px 20px', position: 'relative',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(15,23,42,0.09)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
    >
      {isRecommended && (
        <div style={{
          position: 'absolute', top: '-1px', right: '14px',
          background: '#059669', color: '#fff', fontSize: '0.62rem', fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase',
          padding: '2px 10px', borderRadius: '0 0 8px 8px',
        }}>
          ★ Best Option
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <span style={{ fontSize: '1.6rem' }}>{mode.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{mode.label}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>{mode.desc}</div>
        </div>
        <div style={{
          background: meta.bg, border: `1px solid ${meta.border}`,
          borderRadius: '999px', padding: '4px 12px', fontSize: '0.72rem', fontWeight: 700,
          color: meta.color, display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap',
        }}>
          {meta.emoji} {meta.label}
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b', marginBottom: '5px' }}>
          <span>Exposure Score</span>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{Math.round(result.exposure_score)} / 100</span>
        </div>
        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`, background: meta.bar,
            borderRadius: '99px', transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '12px' }}>
        {[
          { label: 'Travel Time',   value: `~${result.duration_min} min` },
          { label: 'Avg AQI',       value: Math.round(result.avg_aqi) },
          { label: 'PM2.5 Inhaled', value: `${result.pm25_inhaled} µg` },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: '#f8fafc', borderRadius: '10px', padding: '8px 10px',
            border: '1px solid #f1f5f9', textAlign: 'center',
          }}>
            <div style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginTop: '2px', letterSpacing: '-0.01em' }}>{value}</div>
          </div>
        ))}
      </div>

      {result.health_tip && (
        <div style={{
          marginTop: '12px', padding: '9px 12px', background: '#f8fafc',
          borderRadius: '10px', border: '1px solid #f1f5f9',
          fontSize: '0.77rem', color: '#475569', lineHeight: 1.45,
        }}>
          💡 {result.health_tip}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   AQI Zone Strip
───────────────────────────────────────────────────── */
function AqiZoneStrip({ originAqi, destAqi, originLabel, destLabel }) {
  return (
    <div style={{
      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 18px'
    }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
        🗺️ AQI Zone Map — Route Corridor
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>📍 Origin</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>{originLabel}</div>
          <div style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: '999px',
            background: aqiColor(originAqi) + '22', border: `1px solid ${aqiColor(originAqi)}55`,
            color: aqiColor(originAqi), fontSize: '0.85rem', fontWeight: 700,
          }}>
            AQI {Math.round(originAqi)}
          </div>
        </div>

        <div style={{ flex: 2, position: 'relative', height: '44px' }}>
          <div style={{
            position: 'absolute', top: '50%', left: 0, right: 0, height: '6px',
            transform: 'translateY(-50%)',
            background: `linear-gradient(90deg, ${aqiColor(originAqi)}, ${aqiColor(destAqi)})`,
            borderRadius: '99px', opacity: 0.7,
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: '13px', height: '13px', borderRadius: '50%',
            background: aqiColor((originAqi + destAqi) / 2),
            border: '2px solid #fff', transform: 'translate(-50%, -50%)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }} />
          <div style={{
            position: 'absolute', top: '2px', left: '50%', transform: 'translateX(-50%)',
            fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap',
          }}>
            Mid AQI {Math.round((originAqi + destAqi) / 2)}
          </div>
        </div>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>🏁 Destination</div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>{destLabel}</div>
          <div style={{
            display: 'inline-block', padding: '4px 12px', borderRadius: '999px',
            background: aqiColor(destAqi) + '22', border: `1px solid ${aqiColor(destAqi)}55`,
            color: aqiColor(destAqi), fontSize: '0.85rem', fontWeight: 700,
          }}>
            AQI {Math.round(destAqi)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────── */
export function SmartRouteExposure({ profile }) {
  const [originText, setOriginText] = useState('');
  const [destText,   setDestText]   = useState('');
  const [originCity, setOriginCity] = useState(null);
  const [destCity,   setDestCity]   = useState(null);
  const [distanceKm, setDistanceKm] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');
  const [selectedModes, setSelectedModes] = useState(new Set(['walking', 'bus', 'car']));

  const toggleMode = (id) => {
    setSelectedModes(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
  };

  const handleAnalyze = async () => {
    if (!originCity || !destCity) {
      setError('Please select both origin and destination cities from the dropdown list.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const params = new URLSearchParams({
        origin_lat:   originCity.lat,
        origin_lon:   originCity.lon,
        origin_label: originCity.label || originCity.city || 'Origin',
        dest_lat:     destCity.lat,
        dest_lon:     destCity.lon,
        dest_label:   destCity.label || destCity.city || 'Destination',
        distance_km:  distanceKm,
        modes:        [...selectedModes].join(','),
      });
      const res = await fetch(`http://127.0.0.1:8000/api/route-exposure?${params.toString()}`);
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(`Analysis failed: ${e.message}. Make sure the backend is running.`);
    } finally {
      setLoading(false);
    }
  };

  const modeResults   = result?.modes || [];
  const sortedModes   = [...modeResults].sort((a, b) => a.exposure_score - b.exposure_score);
  const bestModeId    = sortedModes[0]?.mode_id;
  const bestModeInfo  = MODES.find(m => m.id === bestModeId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>
            🛣️ Smart Route Exposure
          </h1>
          <p style={{ fontSize: '0.84rem', color: '#64748b', margin: '4px 0 0' }}>
            Estimate your pollution intake across different travel modes — no GPS required.
          </p>
        </div>
        {result && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#ecfdf5', border: '1px solid #a7f3d0',
            padding: '7px 14px', borderRadius: '999px',
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065f46' }}>Live AQI Analysis</span>
          </div>
        )}
      </div>

      {/* Input Panel */}
      <div className="premium-card" style={{ padding: '22px 24px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
          📍 Route Configuration
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px' }}>
          <CityInput
            label="Origin (Start)"
            placeholder="e.g. New Delhi, India"
            value={originText}
            onChange={setOriginText}
            onSelect={setOriginCity}
          />
          <div style={{ paddingBottom: '8px', fontSize: '1.2rem', color: '#94a3b8' }}>→</div>
          <CityInput
            label="Destination (End)"
            placeholder="e.g. Noida, India"
            value={destText}
            onChange={setDestText}
            onSelect={setDestCity}
          />
        </div>

        {/* Distance slider */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Estimated Route Distance: <span style={{ color: '#0f172a' }}>{distanceKm} km</span>
          </label>
          <input
            type="range" min={1} max={50} step={1} value={distanceKm}
            onChange={e => setDistanceKm(Number(e.target.value))}
            style={{ width: '100%', marginTop: '8px', accentColor: '#0284c7' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#94a3b8', marginTop: '2px' }}>
            <span>1 km (Walking)</span><span>25 km</span><span>50 km (Long Commute)</span>
          </div>
        </div>

        {/* Mode toggles */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
            Transport Modes to Compare
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {MODES.map(m => {
              const active = selectedModes.has(m.id);
              return (
                <button key={m.id} onClick={() => toggleMode(m.id)} style={{
                  padding: '7px 14px', borderRadius: '999px',
                  border: `1.5px solid ${active ? '#0284c7' : '#e2e8f0'}`,
                  background: active ? '#e0f2fe' : '#f8fafc',
                  color: active ? '#0369a1' : '#475569',
                  fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s',
                }}>
                  {m.icon} {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div style={{
            marginBottom: '12px', padding: '10px 14px', borderRadius: '10px',
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            fontSize: '0.82rem', fontWeight: 500,
          }}>
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={loading || !originCity || !destCity}
          style={{
            width: '100%', padding: '12px 24px', borderRadius: '12px',
            background: loading || !originCity || !destCity ? '#94a3b8' : '#0f172a',
            color: '#ffffff', fontSize: '0.9rem', fontWeight: 700,
            border: 'none', cursor: loading || !originCity || !destCity ? 'not-allowed' : 'pointer',
            letterSpacing: '-0.01em', transition: 'background 0.2s',
          }}
        >
          {loading ? '⏳ Analysing Route Exposure…' : '🛣️ Analyse Exposure Now'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <>
          <AqiZoneStrip
            originAqi={result.origin_aqi}
            destAqi={result.dest_aqi}
            originLabel={result.origin_label}
            destLabel={result.dest_label}
          />

          {/* Recommendation banner */}
          <div style={{
            background: '#f0f9ff', border: '1px solid #bae6fd',
            borderRadius: '14px', padding: '16px 20px',
            display: 'flex', gap: '14px', alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '1.5rem' }}>🏆</span>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0c4a6e', marginBottom: '3px' }}>
                Best Option: {bestModeInfo ? `${bestModeInfo.icon} ${bestModeInfo.label}` : ''}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#0369a1', lineHeight: 1.5 }}>
                {result.recommendation}
              </div>
              {profile?.conditions?.filter(c => c !== 'none').length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '0.76rem', color: '#0369a1', fontWeight: 600 }}>
                  ⚕️ Personalised for: {profile.conditions.filter(c => c !== 'none').join(', ')}
                </div>
              )}
            </div>
          </div>

          {/* Mode cards sorted by exposure (best first) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Exposure Comparison · {result.distance_km} km route
            </div>
            {sortedModes.map((r) => {
              const modeInfo = MODES.find(m => m.id === r.mode_id);
              if (!modeInfo) return null;
              return (
                <ModeCard
                  key={r.mode_id}
                  mode={modeInfo}
                  result={r}
                  isRecommended={r.mode_id === bestModeId}
                />
              );
            })}
          </div>

          {/* Methodology note */}
          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px',
            padding: '14px 18px', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.55,
          }}>
            <strong style={{ color: '#0f172a' }}>How it's calculated:</strong> Exposure Score = Avg AQI × Ventilation Factor × Breathing Rate × (Duration/60).
            Normalised 0–100. Inhaled PM2.5 uses WHO tidal volume (0.5L/breath) × breathing rate × PM2.5 concentration × duration.
            AQI data fetched live from WAQI stations near each location. Lower score = better commute choice.
          </div>
        </>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div className="premium-card" style={{ padding: '40px 24px', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🗺️</div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a', marginBottom: '6px' }}>
            Plan your safest commute
          </div>
          <div style={{ fontSize: '0.84rem', maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
            Enter your start and end locations, adjust the distance, pick your travel modes, and get personalised pollution exposure estimates in seconds.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px', flexWrap: 'wrap' }}>
            {['👨‍🎓 Students', '🏢 Office Workers', '🏃 Runners', '🤒 Sensitive Groups'].map(tag => (
              <span key={tag} style={{
                padding: '5px 14px', borderRadius: '999px', background: '#f1f5f9',
                border: '1px solid #e2e8f0', fontSize: '0.78rem', fontWeight: 600, color: '#475569',
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
