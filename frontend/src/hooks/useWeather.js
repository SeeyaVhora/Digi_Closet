import { useState, useCallback } from 'react';
import api from '../services/api';

// Live weather via the backend's Open-Meteo proxy. When it's unavailable the
// result has found: false and the UI shows that, rather than a guessed value.
export default function useWeather() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWeather = useCallback(async (query = 'Bengaluru') => {
    const params = typeof query === 'string' ? { city: query || 'Bengaluru' } : query;
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get('/weather', { params });
      setWeather(data.data);
      return data.data;
    } catch (err) {
      const message = err.response?.data?.message || 'Live weather is unavailable right now.';
      setError(message);
      setWeather({ found: false, message });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { weather, loading, error, fetchWeather };
}
