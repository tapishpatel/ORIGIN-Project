import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';

export const LocationSelector = ({ currentLocation, onLocationSelect, onRefresh, isRefreshing }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [geoError, setGeoError] = useState('');
  const searchTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);

  const presetCities = [
    { label: 'Bhopal, India', lat: 23.2547, lon: 77.4029 },
    { label: 'New Delhi, India', lat: 28.6139, lon: 77.2090 },
    { label: 'Mumbai, India', lat: 19.0760, lon: 72.8777 },
    { label: 'Bengaluru, India', lat: 12.9716, lon: 77.5946 },
    { label: 'London, UK', lat: 51.5074, lon: -0.1278 },
  ];

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await api.searchCities(searchQuery);
          setSearchResults(res || []);
          setIsDropdownOpen(true);
        } catch (e) {
          console.error('City search failed', e);
        }
      }, 350);
    } else {
      setSearchResults([]);
      setIsDropdownOpen(false);
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const handleUseGPS = () => {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Geolocation unavailable');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        onLocationSelect({
          lat: Number(lat.toFixed(4)),
          lon: Number(lon.toFixed(4)),
          label: `GPS (${lat.toFixed(1)}°, ${lon.toFixed(1)}°)`,
        });
      },
      () => {
        setGeoError('GPS denied');
      }
    );
  };

  const handleSelectCity = (city) => {
    onLocationSelect(city);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '10px',
      background: '#ffffff',
      border: '1px solid var(--border-card)',
      borderRadius: 'var(--radius-lg)',
      padding: '8px 14px',
      boxShadow: 'var(--shadow-subtle)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '999px',
          fontSize: '0.78rem',
          fontWeight: 600,
          color: '#0f172a'
        }}>
          <span>📍</span>
          <span>{currentLocation?.label || 'Bhopal, India'}</span>
        </div>

        <button
          onClick={handleUseGPS}
          style={{
            padding: '4px 10px',
            borderRadius: '999px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            fontSize: '0.72rem',
            fontWeight: 500,
            color: '#475569',
            cursor: 'pointer'
          }}
        >
          GPS
        </button>

        {geoError && (
          <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>{geoError}</span>
        )}
      </div>

      <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '320px' }} ref={dropdownRef}>
        <input
          type="text"
          placeholder="Search city…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchResults.length > 0 && setIsDropdownOpen(true)}
          style={{
            width: '100%',
            padding: '6px 12px',
            borderRadius: '999px',
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            fontSize: '0.8rem',
            color: '#0f172a',
            outline: 'none'
          }}
        />

        {isDropdownOpen && searchResults.length > 0 && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            border: '1px solid var(--border-card)',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.1)',
            zIndex: 50,
            overflow: 'hidden'
          }}>
            {searchResults.map((r, i) => (
              <button
                key={i}
                onClick={() => handleSelectCity(r)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid #f1f5f9',
                  textAlign: 'left',
                  fontSize: '0.78rem',
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
              >
                <span>📍</span>
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {presetCities.map((c, i) => {
          const isMatch = currentLocation?.label?.includes(c.label.split(',')[0]);
          return (
            <button
              key={i}
              onClick={() => handleSelectCity(c)}
              style={{
                padding: '3px 9px',
                borderRadius: '999px',
                fontSize: '0.7rem',
                fontWeight: isMatch ? 600 : 500,
                background: isMatch ? '#0f172a' : '#f8fafc',
                color: isMatch ? '#ffffff' : '#475569',
                border: '1px solid',
                borderColor: isMatch ? '#0f172a' : '#e2e8f0',
                cursor: 'pointer'
              }}
            >
              {c.label.split(',')[0]}
            </button>
          );
        })}

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 12px',
            borderRadius: '999px',
            background: '#f1f5f9',
            border: 'none',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: '#0f172a',
            cursor: isRefreshing ? 'not-allowed' : 'pointer'
          }}
        >
          <span style={{ fontSize: '0.85rem' }}>⟳</span>
          <span>{isRefreshing ? '…' : 'Refresh'}</span>
        </button>
      </div>
    </div>
  );
};