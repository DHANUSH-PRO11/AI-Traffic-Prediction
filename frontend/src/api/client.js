import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const trafficApi = {
  // Traffic
  getCurrentTraffic: () => api.get('/traffic/current').then(res => res.data),
  getTrafficHistory: () => api.get('/traffic/history').then(res => res.data),
  predictTraffic: (data) => api.post('/traffic/predict', data).then(res => res.data),

  // Routes
  calculateRoute: (data) => api.post('/routes/calculate', data).then(res => res.data),

  // Roads & Nodes
  getRoads: () => api.get('/roads/').then(res => res.data),
  getNodes: () => api.get('/roads/nodes').then(res => res.data),
  getRoadById: (id) => api.get(`/roads/${id}`).then(res => res.data),

  // Weather
  getWeather: () => api.get('/weather/').then(res => res.data),
  updateWeather: (data) => api.post('/weather/update', data).then(res => res.data),

  // Accidents / Incidents
  getAccidents: () => api.get('/accidents/').then(res => res.data),
  reportAccident: (data) => api.post('/accidents/', data).then(res => res.data),
  resolveAccident: (roadId) => api.delete(`/accidents/${roadId}`).then(res => res.data),
  clearAllAccidents: () => api.delete('/accidents/clear/all').then(res => res.data),

  // User Trips
  getTrips: () => api.get('/trips/').then(res => res.data),
  recordTrip: (data) => api.post('/trips/', data).then(res => res.data),

  // ML Lifecycle
  getModelInfo: () => api.get('/ml/model').then(res => res.data),
  getModelMetrics: () => api.get('/ml/metrics').then(res => res.data),
  getModelVersions: () => api.get('/ml/versions').then(res => res.data),
  triggerRetraining: (data) => api.post('/ml/train', data).then(res => res.data),

  // Analytics
  getTrafficAnalytics: () => api.get('/analytics/traffic').then(res => res.data),
  getRoutesAnalytics: () => api.get('/analytics/routes').then(res => res.data),
};

export default api;
