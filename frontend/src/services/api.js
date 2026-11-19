import axios from 'axios';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const API_BASE_URL = '/api';

// No default Content-Type: axios sets JSON for objects and the multipart
// boundary for FormData. Forcing JSON here would serialise uploads as JSON.
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor — attach the current Firebase ID token.
api.interceptors.request.use(
  async (config) => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 (expired/invalid token).
// Sign out rather than hard-navigating to /login: a full reload keeps the stale
// Firebase session, so /login bounces straight back to /dashboard, which 401s
// again and reloads forever. Signing out lets ProtectedRoute redirect normally.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && auth.currentUser) {
      signOut(auth).catch(() => {});
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err.response?.data?.message) return err.response.data.message;
  if (!err.response) return 'Cannot reach the DigiCloset server. Is the backend running?';
  return fallback;
}

export default api;
