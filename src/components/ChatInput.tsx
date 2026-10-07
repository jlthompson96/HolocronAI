import React, { useState } from 'react';
import { MAX_INPUT_LENGTH, WARN_INPUT_LENGTH } from '../constants/config';

interface ChatInputProps {
  onSend: (content: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSend = () => {
    if (!input.trim()) {
      setValidationError('You must transmit a message, young Padawan.');
      return;
    }
    if (input.length > MAX_INPUT_LENGTH) {
      setValidationError(`Your message exceeds the ${MAX_INPUT_LENGTH}-character holocron limit.`);
      return;
    }
    setValidationError('');
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isOverLimit = input.length > MAX_INPUT_LENGTH;
  const isNearLimit = input.length >= WARN_INPUT_LENGTH;
  const counterClass = isOverLimit
    ? 'chat-input__counter chat-input__counter--over'
    : isNearLimit
    ? 'chat-input__counter chat-input__counter--warn'
    : 'chat-input__counter';

  return (
    <div className="chat-input">
      <div className="chat-input__row">
        <textarea
          className={`chat-input__field ${validationError ? 'chat-input__field--error' : ''}`}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (validationError) setValidationError('');
          }}
          onKeyDown={handleKeyDown}
          placeholder="Transmit your query… or /image <prompt> to generate art (Enter to send, Shift+Enter for new line)"
          rows={2}
          aria-label="Message input"
          aria-describedby={validationError ? 'chat-input-error' : undefined}
          disabled={isLoading}
        />
        <button
          className="btn btn--gold btn--transmit"
          onClick={handleSend}
          disabled={isLoading || isOverLimit}
          aria-label="Send message"
        >
          {isLoading ? '...' : 'Transmit'}
        </button>
      </div>
      <div className="chat-input__meta">
        {validationError && (
          <p id="chat-input-error" className="chat-input__validation" role="alert">
            {validationError}
          </p>
        )}
        <span className={counterClass} aria-live="polite">
          {input.length} / {MAX_INPUT_LENGTH}
        </span>
      </div>
    </div>
  );
}
