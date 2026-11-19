import { useState, useCallback, useEffect } from 'react';
import api, { getErrorMessage } from '../services/api';

export default function useChat() {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(data.data.conversations || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not load chat history.'));
    }
  }, []);

  const loadConversation = useCallback(async (id) => {
    try {
      setError(null);
      const { data } = await api.get(`/chat/conversations/${id}`);
      setConversationId(data.data.conversation._id);
      setMessages(data.data.conversation.messages || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load conversation.'));
    }
  }, []);

  const deleteConversation = useCallback(async (id) => {
    try {
      await api.delete(`/chat/conversations/${id}`);
      setConversations((prev) => prev.filter((c) => c._id !== id));
      if (conversationId === id) {
        setConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete conversation.'));
    }
  }, [conversationId]);

  const clearHistory = useCallback(async () => {
    try {
      await api.delete('/chat/conversations');
      setConversations([]);
      setConversationId(null);
      setMessages([]);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to clear chat history.'));
    }
  }, []);

  const newConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  // The backend only stores an exchange once Gemini has replied, so a failed
  // message stays local, marked as failed, until the user retries it.
  const sendMessage = useCallback(async (messageText) => {
    const text = messageText.trim();
    if (!text) return;

    setMessages((prev) => [
      ...prev.filter((m) => !m.failed),
      { role: 'user', content: text, createdAt: new Date().toISOString() },
    ]);
    setSending(true);
    setError(null);

    try {
      const { data } = await api.post('/chat', { message: text, conversationId });
      setConversationId(data.data.conversationId);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.data.reply, createdAt: new Date().toISOString() },
      ]);
      fetchConversations();
    } catch (err) {
      setError(getErrorMessage(err, 'Your message could not be sent.'));
      setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, failed: true } : m)));
    } finally {
      setSending(false);
    }
  }, [conversationId, fetchConversations]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    messages,
    conversationId,
    conversations,
    sending,
    error,
    sendMessage,
    loadConversation,
    deleteConversation,
    clearHistory,
    newConversation,
  };
}
