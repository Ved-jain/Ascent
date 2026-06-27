import axios from 'axios';

// Base API URL pointing to Express server
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const BASE_URL = `${API_URL}/api`;

// Create central axios instance
const http = axios.create({ baseURL: BASE_URL });

// Request interceptor to automatically add the JWT token to request headers
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('ascent_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralized API endpoints
const api = {
  // Auth endpoints
  register: (data) => http.post('/auth/register', data).then(r => r.data),
  login:    (data) => http.post('/auth/login',    data).then(r => r.data),

  // Profile endpoints
  getProfile:    ()     => http.get('/profile').then(r => r.data),
  updateProfile: (data) => http.put('/profile', data).then(r => r.data),

  // CF Data (cached endpoints)
  getCFData:          (handle)          => http.get(`/cf/${handle}`).then(r => r.data),
  getCFStruggles:     (handle)          => http.get(`/cf/${handle}/struggles`).then(r => r.data),
  getCompare:         (myH, friendH)    => http.get(`/compare/${myH}/${friendH}`).then(r => r.data),
  getRecommendations: (handle)          => http.get(`/cf/${handle}/recommendations`).then(r => r.data),

  // Friends endpoints
  getFriends:    ()       => http.get('/friends').then(r => r.data),
  addFriend:     (handle) => http.post('/friends', { handle }).then(r => r.data),
  removeFriend:  (handle) => http.delete(`/friends/${handle}`).then(r => r.data),

  // Notes endpoints
  getNotes:  ()     => http.get('/notes').then(r => r.data),
  addNote:   (text) => http.post('/notes', { text }).then(r => r.data),

  // AI endpoints
  getAICoach:   (data) => http.post('/ai/coach', data).then(r => r.data),
  getAIRivalry: (data) => http.post('/ai/rivalry', data).then(r => r.data),

  // Predictor
  getPrediction: (handle) => http.get(`/predict/${handle}`).then(r => r.data),

  // Journey
  getJourneyTimeline: (handle) => http.get(`/journey/${handle}/timeline`).then(r => r.data),
  getJourneyCompare:  (myH, peerH) => http.get(`/journey/compare/${myH}/${peerH}`).then(r => r.data),
  getJourneyPrediction: (myH, peerH, target) => http.get(`/journey/predict/${myH}/${peerH}/${target}`).then(r => r.data),
  getJourneyStruggles: (myH, peerH) => http.get(`/journey/struggles/${myH}/${peerH}`).then(r => r.data),
};

export default api;
