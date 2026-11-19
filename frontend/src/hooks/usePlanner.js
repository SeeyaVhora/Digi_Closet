import { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../services/api';

/** Outfit plans between two YYYY-MM-DD dates (inclusive), keyed by date. */
export default function usePlanner(from, to) {
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get('/planner', { params: { from, to } });
      setPlans(Object.fromEntries(data.data.plans.map((plan) => [plan.date, plan])));
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load your plan.'));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const store = (plan) => setPlans((prev) => ({ ...prev, [plan.date]: plan }));

  const assign = useCallback(async (date, outfitId, occasion) => {
    const { data } = await api.put(`/planner/${date}`, { outfitId, occasion });
    store(data.data.plan);
  }, []);

  const clear = useCallback(async (date) => {
    await api.delete(`/planner/${date}`);
    setPlans((prev) => {
      const next = { ...prev };
      delete next[date];
      return next;
    });
  }, []);

  const setWorn = useCallback(async (date, worn) => {
    const { data } = await api.put(`/planner/${date}/worn`, { worn });
    store(data.data.plan);
  }, []);

  return { plans, loading, error, fetchPlans, assign, clear, setWorn };
}
