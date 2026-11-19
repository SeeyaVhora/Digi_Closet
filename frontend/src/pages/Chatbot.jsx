import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Plus, History, Trash2, Bot, X } from 'lucide-react';
import useChat from '../hooks/useChat';
import useWardrobe from '../hooks/useWardrobe';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import Input from '../components/Input';
import ChatBubble, { ChatTypingIndicator } from '../components/ChatBubble';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';

const SUGGESTED_QUESTIONS = [
  'What should I wear today?',
  'Suggest an outfit for a date.',
  'How can I style my black jeans?',
  'Which accessories match my outfit?',
  'What should I buy next?',
  'Suggest an outfit within ₹2,000',
  'What is missing from my wardrobe?',
];

export default function Chatbot() {
  const navigate = useNavigate();
  const {
    messages, conversationId, conversations, sending, error,
    sendMessage, loadConversation, deleteConversation, clearHistory, newConversation,
  } = useChat();
  const { items: wardrobeItems, loading: wardrobeLoading } = useWardrobe();

  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = (e) => {
    e?.preventDefault();
    if (!input.trim() || sending) return;
    sendMessage(input);
    setInput('');
  };

  const handleClear = async () => {
    await clearHistory();
    setConfirmClear(false);
  };

  const wardrobeCount = wardrobeItems.length;
  const subtitle = wardrobeLoading
    ? 'Loading your wardrobe…'
    : wardrobeCount > 0
      ? `Answers are based on your ${wardrobeCount} wardrobe item${wardrobeCount === 1 ? '' : 's'}, preferences and today's weather.`
      : 'Add clothes to your wardrobe for advice based on what you own.';

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="AI Studio"
        title="Your personal style conversation."
        subtitle={subtitle}
        action={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="outline" size="sm" className="chatbot-history-toggle-btn" onClick={() => setShowHistory(!showHistory)}>
              <History size={16} /> History ({conversations.length})
            </Button>
            <Button size="sm" onClick={newConversation}>
              <Plus size={16} /> New chat
            </Button>
          </div>
        }
      />

      <div className="chatbot-container">
        <aside className={`chatbot-history-sidebar custom-scrollbar ${showHistory ? 'chatbot-history-sidebar--mobile-open' : ''}`}>
          <div className="chatbot-history-header">
            <span className="chatbot-history-title"><History size={14} /> Previous chats</span>
            {showHistory && (
              <button className="chatbot-history-item__delete" style={{ display: 'block' }} onClick={() => setShowHistory(false)} aria-label="Close history">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="chatbot-history-list custom-scrollbar">
            {conversations.length === 0 ? (
              <p className="chat-history-empty">No past conversations yet.</p>
            ) : (
              conversations.map((c) => (
                <div
                  key={c._id}
                  className={`chatbot-history-item ${c._id === conversationId ? 'chatbot-history-item--active' : ''}`}
                  onClick={() => { loadConversation(c._id); setShowHistory(false); }}
                >
                  <span className="chatbot-history-item__text" title={c.title}>{c.title || 'Styling chat'}</span>
                  <button
                    className="chatbot-history-item__delete"
                    onClick={(e) => { e.stopPropagation(); deleteConversation(c._id); }}
                    aria-label="Delete chat"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          {conversations.length > 0 && (
            <Button variant="ghost" size="sm" className="chat-history-clear" onClick={() => setConfirmClear(true)}>
              <Trash2 size={14} /> Clear history
            </Button>
          )}
        </aside>

        <main className="chatbot-main-area">
          <div className="chatbot-messages-wrap custom-scrollbar">
            {messages.length === 0 ? (
              <div className="chat-empty">
                <EmptyState
                  icon={Bot}
                  title="What can I help you wear?"
                  description="Ask about outfits for an occasion, how to style a piece you own, or what to buy next."
                />
                <p className="chat-empty__label">Try asking</p>
                <div className="chat-empty__chips">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button key={q} className="chatbot-chip" onClick={() => sendMessage(q)} disabled={sending}>{q}</button>
                  ))}
                </div>
                {!wardrobeLoading && wardrobeCount === 0 && (
                  <p className="chat-empty__note">
                    Your wardrobe is empty, so answers will be general.{' '}
                    <button className="chat-empty__link" onClick={() => navigate('/wardrobe')}>Add clothes</button>
                  </p>
                )}
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <ChatBubble
                    key={`${i}-${m.createdAt}`}
                    role={m.role}
                    content={m.content}
                    createdAt={m.createdAt}
                    failed={m.failed}
                    onRetry={() => sendMessage(m.content)}
                  />
                ))}
                {sending && <ChatTypingIndicator />}
                <div ref={scrollRef} />
              </>
            )}
          </div>

          {error && <p className="chat-error" role="alert">{error}</p>}

          <form onSubmit={handleSend} className="chat-input-bar">
            <Input
              placeholder="Ask your stylist, e.g. how can I style my black jeans?"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              disabled={sending}
              aria-label="Message"
            />
            <Button type="submit" loading={sending} disabled={!input.trim()} aria-label="Send message">
              <Send size={16} />
            </Button>
          </form>
        </main>
      </div>

      <ConfirmDialog
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={handleClear}
        title="Clear chat history?"
        message="All of your past conversations will be permanently deleted."
        confirmLabel="Clear history"
      />
    </div>
  );
}
