import React, { useState, useEffect, useRef } from 'react';
import { IconMapPin, IconRefreshCw } from './Icons';
import { api } from '../api/client';

export const LocationSelector = ({ currentLocation, onLocationSelect, onRefresh, isRefreshing }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [geoError, setGeoError] = useState('');
  const searchTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);

  const presetCities = [
    { label: 'New Delhi, India', lat: 28.6139, lon: 77.2090 },
    { label: 'Bhopal, India', lat: 23.2547, lon: 77.4029 },
    { label: 'Mumbai, India', lat: 19.0760, lon: 72.8777 },
    { label: 'Bengaluru, India', lat: 12.9716, lon: 77.5946 },
    { label: 'New York, US', lat: 40.7128, lon: -74.0060 },
    { label: 'London, UK', lat: 51.5074, lon: -0.1278 },
  ];

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          const res = await api.searchCities(searchQuery);
          setSearchResults(res || []);
          setIsDropdownOpen(true);
        } catch (e) {
          console.error('City search failed', e);
        } finally {
          setIsSearching(false);
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
      setGeoError('Geolocation not supported by browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        onLocationSelect({
          lat: Number(lat.toFixed(4)),
          lon: Number(lon.toFixed(4)),
          label: `GPS Location (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
        });
      },
      (err) => {
        setGeoError('GPS access denied or unavailable');
      }
    );
  };

  const handleSelectCity = (city) => {
    onLocationSelect(city);
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  return (
    <div className="location-bar">
      <div className="location-left">
        <div className="current-loc-badge">
          <IconMapPin size={18} color="#38bdf8" />
          <span className="loc-label">{currentLocation?.label || 'Bhopal, MP'}</span>
        </div>

        <button className="gps-btn" onClick={handleUseGPS} title="Detect Current GPS Location">
          Use My GPS
        </button>

        {geoError && <span className="geo-error">{geoError}</span>}
      </div>

      <div className="location-center" ref={dropdownRef}>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search any global city (e.g., Delhi, Tokyo)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setIsDropdownOpen(true)}
            className="search-input"
          />
          {isSearching && <span className="search-spinner" />}
        </div>

        {isDropdownOpen && searchResults.length > 0 && (
          <div className="search-dropdown">
            {searchResults.map((r, i) => (
              <button
                key={i}
                className="dropdown-item"
                onClick={() => handleSelectCity(r)}
              >
                <IconMapPin size={14} color="var(--text-muted)" />
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="location-right">
        <div className="preset-chips">
          {presetCities.map((c, i) => (
            <button
              key={i}
              className={`preset-chip ${currentLocation?.label?.includes(c.label.split(',')[0]) ? 'active' : ''}`}
              onClick={() => handleSelectCity(c)}
            >
              {c.label.split(',')[0]}
            </button>
          ))}
        </div>

        <button 
          className="refresh-btn" 
          onClick={onRefresh} 
          disabled={isRefreshing}
          title="Force refresh live weather & advisory"
        >
          <IconRefreshCw size={16} className={isRefreshing ? 'spinning' : ''} />
          <span>{isRefreshing ? 'Updating...' : 'Refresh'}</span>
        </button>
      </div>

      <style>{`
        .location-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 24px;
          padding: 14px 20px;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(14px);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
        }
        .location-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .current-loc-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 0.92rem;
          color: var(--text-primary);
        }
        .gps-btn {
          font-size: 0.75rem;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          background: rgba(56, 189, 248, 0.15);
          color: #38bdf8;
          border: 1px solid rgba(56, 189, 248, 0.3);
          font-weight: 600;
        }
        .gps-btn:hover {
          background: rgba(56, 189, 248, 0.25);
        }
        .geo-error {
          font-size: 0.75rem;
          color: #f87171;
        }
        .location-center {
          flex: 1;
          min-width: 260px;
          max-width: 420px;
          position: relative;
        }
        .search-box {
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-input {
          width: 100%;
          padding: 8px 14px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .search-input:focus {
          border-color: #38bdf8;
        }
        .search-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 6px;
          background: #111827;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          z-index: 50;
          max-height: 220px;
          overflow-y: auto;
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 14px;
          text-align: left;
          font-size: 0.82rem;
          color: var(--text-primary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        .dropdown-item:hover {
          background: rgba(56, 189, 248, 0.15);
        }
        .location-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .preset-chips {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .preset-chip {
          font-size: 0.72rem;
          padding: 4px 9px;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
        }
        .preset-chip:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
        }
        .preset-chip.active {
          background: rgba(56, 189, 248, 0.2);
          border-color: #38bdf8;
          color: #38bdf8;
          font-weight: 600;
        }
        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .refresh-btn:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
