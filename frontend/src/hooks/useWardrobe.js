import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// `error` only reflects loading the list; mutations throw so callers can show
// the failure next to the action that caused it.
export default function useWardrobe({ autoFetch = true } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get('/wardrobe', { params });
      setItems(data.data.items);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load wardrobe.');
    } finally {
      setLoading(false);
    }
  }, []);

  const addItem = useCallback(async (itemData) => {
    const { data } = await api.post('/wardrobe', itemData);
    setItems((prev) => [data.data.item, ...prev]);
    return data;
  }, []);

  const updateItem = useCallback(async (id, itemData) => {
    const { data } = await api.put(`/wardrobe/${id}`, itemData);
    setItems((prev) => prev.map((i) => (i._id === id ? data.data.item : i)));
    return data;
  }, []);

  const deleteItem = useCallback(async (id) => {
    await api.delete(`/wardrobe/${id}`);
    setItems((prev) => prev.filter((item) => item._id !== id));
  }, []);

  const uploadImage = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post('/wardrobe/upload-image', formData);
    return data.data;
  }, []);

  const classifyImage = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post('/wardrobe/classify', formData);
    return data.data.suggestion;
  }, []);

  useEffect(() => {
    if (autoFetch) fetchItems();
  }, [autoFetch, fetchItems]);

  return { items, loading, error, addItem, updateItem, deleteItem, uploadImage, classifyImage, fetchItems };
}
