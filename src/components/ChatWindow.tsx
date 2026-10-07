import { useEffect, useRef, useState } from 'react';
import type { Message } from '../types/chat';
import { msgKey } from '../hooks/useMessageReactions';
import ChatMessage from './ChatMessage';
import LoadingIndicator from './LoadingIndicator';
import HolocronCube from './HolocronCube';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  reactions: Map<string, string>;
  onReact: (key: string, reactionId: string, contentPreview: string) => void;
}

export default function ChatWindow({ messages, isLoading, reactions, onReact }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showWarp, setShowWarp] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isLoading) return;
    setShowWarp(true);
    const timer = setTimeout(() => setShowWarp(false), 700);
    return () => clearTimeout(timer);
  }, [isLoading]);

  const visibleMessages = messages.filter(
    (m) => m.role !== 'system' && !(m.role === 'assistant' && m.content === '' && !m.imageStatus),
  );

  return (
    <div className="chat-window" role="log" aria-label="Conversation" aria-live="polite">
      {showWarp && <div className="chat-window__warp" aria-hidden="true" />}
      {visibleMessages.length === 0 && (
        <div className="chat-window__empty">
          <HolocronCube size={56} projected />
          <p>The Force awaits your query, young Padawan.<span className="blink-cursor" aria-hidden="true" /></p>
          <p className="chat-window__empty-sub">Transmit a message to consult the Holocron.</p>
        </div>
      )}
      {visibleMessages.map((msg, index) => {
        const key = msg.role === 'assistant' ? msgKey(msg.content) : undefined;
        return (
          <ChatMessage
            key={index}
            message={msg}
            activeReactionId={key ? (reactions.get(key) ?? null) : undefined}
            onReact={key ? (reactionId) => onReact(key, reactionId, msg.content) : undefined}
          />
        );
      })}
      {isLoading && <LoadingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
}
