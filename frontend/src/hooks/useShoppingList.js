import { useState, useCallback, useEffect } from 'react';
import api, { getErrorMessage } from '../services/api';

export default function useShoppingList() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState(null);

  const fetchLists = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/shopping/saved');
      setLists(data.data.lists);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load shopping lists.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const plan = useCallback(async (payload) => {
    try {
      setPlanning(true);
      setError(null);
      const { data } = await api.post('/shopping/plan', payload);
      setLists((prev) => [data.data.shoppingList, ...prev]);
      return data.data;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to build a shopping plan.'));
      throw err;
    } finally {
      setPlanning(false);
    }
  }, []);

  const deleteList = useCallback(async (id) => {
    await api.delete(`/shopping/saved/${id}`);
    setLists((prev) => prev.filter((l) => l._id !== id));
  }, []);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  return { lists, loading, planning, error, plan, deleteList, fetchLists };
}
