import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../types/chat';
import { REACTIONS } from '../constants/config';

interface ChatMessageProps {
  message: Message;
  activeReactionId?: string | null;
  onReact?: (reactionId: string) => void;
}

export default function ChatMessage({ message, activeReactionId, onReact }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isUser = message.role === 'user';
  const isImageMessage = !!message.imageStatus;
  const showReactions = !isUser && !isImageMessage && !!message.content && onReact !== undefined;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore
    }
  };

  // ── User /image command bubble ──────────────────────────────
  if (isUser && message.content.startsWith('/image ')) {
    const prompt = message.content.slice(7);
    return (
      <div className="chat-message chat-message--user">
        <div className="chat-message__label">You</div>
        <div className="chat-message__bubble-wrapper">
          <div className="chat-message__bubble chat-message__bubble--image-cmd">
            <span className="chat-message__image-cmd-icon" aria-hidden="true">⬡</span>
            <span className="chat-message__image-cmd-text">{prompt}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Assistant image result bubble ───────────────────────────
  if (isImageMessage) {
    return (
      <div className="chat-message chat-message--assistant">
        <div className="chat-message__label">Holocron</div>
        <div className="chat-message__bubble-wrapper">
          <div className="chat-message__bubble chat-message__bubble--image">
            {message.imageStatus === 'loading' && (
              <div className="chat-message__image-loading" aria-label="Generating image…">
                <span className="chat-message__image-loading-icon" aria-hidden="true">⬡</span>
                <span>Channelling the Force into pixels…</span>
              </div>
            )}
            {message.imageStatus === 'done' && message.imageUrl && !imgError && (
              <img
                className="chat-message__image"
                src={message.imageUrl}
                alt={message.imagePrompt ?? 'Generated image'}
                onError={() => setImgError(true)}
              />
            )}
            {(message.imageStatus === 'error' || imgError) && (
              <div className="chat-message__image-error">
                <span aria-hidden="true">⊗</span>{' '}
                {imgError ? 'Image failed to load.' : message.content}
              </div>
            )}
            {message.imageStatus === 'done' && message.imageUrl && !imgError && (
              <p className="chat-message__image-prompt">{message.imagePrompt}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Standard text bubble ────────────────────────────────────
  return (
    <div className={`chat-message chat-message--${isUser ? 'user' : 'assistant'}`}>
      <div className="chat-message__label">{isUser ? 'You' : 'Holocron'}</div>
      <div className="chat-message__bubble-wrapper">
        <div className="chat-message__bubble">
          {isUser ? (
            <p className="chat-message__text">{message.content}</p>
          ) : (
            <div className="chat-message__markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <button
          className="chat-message__copy"
          onClick={handleCopy}
          title="Copy to clipboard"
          aria-label={copied ? 'Copied!' : 'Copy message'}
        >
          {copied ? '✓' : '⎘'}
        </button>
      </div>
      {showReactions && (
        <div className="chat-message__reactions" role="group" aria-label="Rate this response">
          {REACTIONS.map((r) => {
            const isActive = activeReactionId === r.id;
            return (
              <button
                key={r.id}
                className={`chat-message__reaction${isActive ? ' chat-message__reaction--active' : ''}`}
                onClick={() => onReact(r.id)}
                title={r.title}
                aria-label={r.title}
                aria-pressed={isActive}
              >
                <span className="chat-message__reaction-symbol" aria-hidden="true">{r.symbol}</span>
                <span className="chat-message__reaction-label">{r.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

