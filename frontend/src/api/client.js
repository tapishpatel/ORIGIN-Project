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
  if (token) {
    localStorage.setItem('aero_auth_token', token);
  } else {
    localStorage.removeItem('aero_auth_token');
  }
};

export const getAuthToken = () => {
  if (!authToken) {
    authToken = localStorage.getItem('aero_auth_token') || null;
  }
  return authToken;
};

const request = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || err.error || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error(`API error on ${endpoint}:`, error);
    throw error;
  }
};

export const api = {
  // Authentication & Demo Personas
  signup: (userData) =>
    request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  demoLogin: (personaId) =>
    request('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ persona_id: personaId }),
    }),
  getPersonas: () => request('/auth/personas'),
  logout: () => {
    setAuthToken('');
  },

  // Dashboard & Real-Time Data with Fallback Simulation Flag
  getDashboard: (lat, lon, label, forceFallback = false) => {
    let url = '/api/dashboard';
    const params = new URLSearchParams();
    if (lat !== undefined && lon !== undefined) {
      params.append('lat', lat);
      params.append('lon', lon);
    }
    if (label) params.append('label', label);
    if (forceFallback) params.append('force_fallback', '1');
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

  // Live Gmail SMTP Verified Test Dispatch
  sendTestEmail: (recipient = 'tornovdutta@gmail.com') =>
    request('/api/notifications/test-email', {
      method: 'POST',
      body: JSON.stringify({ recipient }),
    }),

  // Geolocation & Fast2SMS / Email OTP
  autoDetectLocation: () => request('/api/geocode/auto'),
  reverseGeocode: (lat, lon) => request(`/api/geocode/reverse?lat=${lat}&lon=${lon}`),
  sendEmailOtp: (email) =>
    request('/api/email/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  verifyEmailOtp: (email, otp) =>
    request('/api/email/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    }),
  sendSmsOtp: (phone, email) =>
    request('/api/sms/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, email }),
    }),
  verifySmsOtp: (phone, otp) =>
    request('/api/sms/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    }),

  // AI Health Copilot, Email & SMS Dispatch
  queryAiChat: (question) =>
    request('/api/ai-chat', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
  draftEmail: () =>
    request('/api/advisory/draft-email', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  sendCustomEmail: (email, subject, message) =>
    request('/api/notifications/send-custom-email', {
      method: 'POST',
      body: JSON.stringify({ email, subject, message }),
    }),
  draftSms: () =>
    request('/api/advisory/draft-sms', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  sendCustomSms: (phone, message) =>
    request('/api/notifications/send-custom-sms', {
      method: 'POST',
      body: JSON.stringify({ phone, message }),
    }),
};
