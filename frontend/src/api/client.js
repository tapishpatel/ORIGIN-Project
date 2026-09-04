const API_BASE_URL = 'http://127.0.0.1:8000';

// Check if token was passed via cookie (from Google OAuth redirect)
const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const cookieToken = getCookie('aero_auth_token');
if (cookieToken) {
  localStorage.setItem('aero_auth_token', cookieToken);
  // Clear the cookie so it doesn't linger
  document.cookie = 'aero_auth_token=; Max-Age=0; path=/;';
}

let authToken = localStorage.getItem('aero_auth_token') || null;

export const setAuthToken = (token) => {
  authToken = token;
  localStorage.setItem('aero_auth_token', token);
};

// Safety check: clear old demo token if it somehow persisted
if (authToken && authToken.startsWith('token-demo')) {
  authToken = null;
  localStorage.removeItem('aero_auth_token');
}

export const getAuthToken = () => authToken;

const request = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`API error on ${endpoint}:`, error);
    throw error;
  }
};

export const api = {
  // Dashboard & Real-Time Data
  getDashboard: (lat, lon, label) => {
    let url = '/api/dashboard';
    const params = new URLSearchParams();
    if (lat !== undefined && lon !== undefined) {
      params.append('lat', lat);
      params.append('lon', lon);
    }
    if (label) params.append('label', label);
    const qs = params.toString();
    return request(qs ? `${url}?${qs}` : url);
  },

  // User & Profile
  getMe: () => request('/api/me'),
  updateProfile: (profileData) =>
    request('/api/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    }),
  updateNotifications: (notifData) =>
    request('/api/notifications', {
      method: 'PUT',
      body: JSON.stringify(notifData),
    }),
  updateLocation: (locData) =>
    request('/api/location', {
      method: 'POST',
      body: JSON.stringify(locData),
    }),

  // City Search
  searchCities: (query) =>
    request(`/api/search-cities?query=${encodeURIComponent(query)}`),

  // Advisory Generation & What-If Simulation
  generateAdvisory: (simulationOverrides = {}) =>
    request('/api/advisory/generate', {
      method: 'POST',
      body: JSON.stringify(simulationOverrides),
    }),

  // History & Scheduling
  getHistory: (days = 7) => request(`/api/history?days=${days}`),
  triggerScheduler: () =>
    request('/api/scheduler/trigger', {
      method: 'POST',
    }),
};
