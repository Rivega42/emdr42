'use client';

import React, { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import VoiceButton, { VoiceButtonCompact } from '../VoiceButton';
import type { ChatMessage } from './types';

interface ChatPanelProps {
  messages: ChatMessage[];
  connected: boolean;
  sessionId: string | null;
  socket: Socket | null;
  inputText: string;
  setInputText: (v: string) => void;
  onSend: () => void;
  onVoiceTranscript: (text: string, isFinal: boolean) => void;
}

const MessageBubble = React.memo(function MessageBubble({ msg }: { msg: ChatMessage }) {
  return (
    <div className={`flex ${msg.role === 'patient' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
          msg.role === 'ai'
            ? 'bg-gray-100 text-gray-900 rounded-tl-sm'
            : 'bg-gray-900 text-white rounded-tr-sm'
        }`}
      >
        {msg.text}
        {msg.streaming && (
          <span className="inline-block w-1.5 h-4 ml-1 bg-gray-400 animate-pulse rounded-sm align-middle" aria-hidden="true" />
        )}
      </div>
    </div>
  );
});

export function ChatPanel({
  messages,
  connected,
  sessionId,
  socket,
  inputText,
  setInputText,
  onSend,
  onVoiceTranscript,
}: ChatPanelProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" role="log" aria-live="polite" aria-label="Chat with AI therapist">
        {messages.length === 0 && (
          <p className="text-gray-400 text-center mt-10">
            {connected ? 'Connecting to AI therapist...' : 'Waiting for connection...'}
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex gap-2 items-center">
          <VoiceButtonCompact
            socket={socket}
            sessionId={sessionId}
            disabled={!connected}
            onTranscript={onVoiceTranscript}
            onError={() => { /* fail silently — UI shows disconnected state */ }}
          />
          <label htmlFor="chat-input" className="sr-only">Message input</label>
          <input
            id="chat-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
            placeholder="Type your message..."
            className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 rounded-md px-4 py-2.5 text-sm outline-none focus:border-gray-900 transition-colors"
          />
          <button
            onClick={onSend}
            disabled={!inputText.trim()}
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:opacity-40 text-white rounded-md text-sm font-semibold transition-colors"
            aria-label="Send message"
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}
