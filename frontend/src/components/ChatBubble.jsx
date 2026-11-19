import { Sparkles, User, RotateCcw } from 'lucide-react';

function formatMessageText(text) {
  if (!text) return null;

  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();
    const isBullet = /^([-•*])\s+/.test(trimmed);
    const cleanLine = isBullet ? trimmed.replace(/^[-•*]\s+/, '') : line;

    const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);
    const parsedLine = parts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={partIdx} className="chat-bubble__bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (isBullet) {
      return (
        <div key={lineIdx} className="chat-bubble__bullet-line">
          <span className="chat-bubble__bullet-dot" />
          <span>{parsedLine}</span>
        </div>
      );
    }

    return (
      <p key={lineIdx} className="chat-bubble__paragraph">
        {parsedLine}
      </p>
    );
  });
}

export default function ChatBubble({ role, content, createdAt, failed, onRetry }) {
  const isAssistant = role === 'assistant';
  const time = createdAt
    ? new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className={`chat-bubble-row chat-bubble-row--${role}`}>
      {isAssistant && (
        <div className="chat-avatar chat-avatar--assistant" aria-hidden="true">
          <Sparkles size={14} />
        </div>
      )}

      <div className={`chat-bubble chat-bubble--${role} ${failed ? 'chat-bubble--failed' : ''}`}>
        <div className="chat-bubble__content">{formatMessageText(content)}</div>
        {time && !failed && <span className="chat-bubble__time">{time}</span>}
        {failed && (
          <button type="button" className="chat-bubble__retry" onClick={onRetry}>
            <RotateCcw size={12} /> Not sent. Retry
          </button>
        )}
      </div>

      {!isAssistant && (
        <div className="chat-avatar chat-avatar--user" aria-hidden="true">
          <User size={14} />
        </div>
      )}
    </div>
  );
}

export function ChatTypingIndicator() {
  return (
    <div className="chat-bubble-row chat-bubble-row--assistant">
      <div className="chat-avatar chat-avatar--assistant" aria-hidden="true">
        <Sparkles size={14} />
      </div>
      <div className="chat-bubble chat-bubble--assistant chat-typing">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
