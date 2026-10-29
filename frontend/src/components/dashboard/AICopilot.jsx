import React, { useState, useRef } from 'react';
import { Send, Bot, User, Sparkles, Wrench, BookOpen } from 'lucide-react';
import ErrorBanner from '../ui/ErrorBanner';
import EmptyState from '../ui/EmptyState';

const SESSION_KEY = 'globex_copilot_session_id';
const MOCK_MODE_MARKER = '(Mock Mode)';

// One stable session id per browser, so the agent keeps conversation context
// across messages and page reloads.
function getOrCreateSessionId() {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    // localStorage unavailable (private mode etc.) - fall back to in-memory id.
    return crypto.randomUUID();
  }
}

export default function AICopilot({ onRequireAuth }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      text: 'Hello! I am your GlobeX Trade Copilot. I can help you find buyers, analyze tariffs, or generate outreach emails. What would you like to do today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState(null);
  const [lastQuestion, setLastQuestion] = useState(null);
  const sessionIdRef = useRef(getOrCreateSessionId());

  const hasToken = () => Boolean(localStorage.getItem('token'));

  const sendToCopilot = async (question) => {
    const token = localStorage.getItem('token');
    if (!token) {
      onRequireAuth?.();
      return;
    }

    setIsThinking(true);
    setError(null);

    let res;
    const payload = { session_id: sessionIdRef.current, message: question };
    const requestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    };

    try {
      try {
        res = await fetch('/api/v1/chat', requestInit);
      } catch {
        res = await fetch('http://localhost:3000/api/v1/chat', requestInit);
      }
    } catch (err) {
      setError(err.message || 'Could not connect to the chat service');
      setIsThinking(false);
      return;
    }

    if (res.status === 401) {
      onRequireAuth?.();
      setIsThinking(false);
      return;
    }

    let json;
    try {
      json = await res.json();
    } catch {
      setError('The chat service returned an unreadable response');
      setIsThinking(false);
      return;
    }

    if (!res.ok || !json?.success || !json?.data) {
      setError(json?.message || `Chat request failed (HTTP ${res.status})`);
      setIsThinking(false);
      return;
    }

    const data = json.data;
    const replyText = typeof data.response === 'string' ? data.response : '';

    // The backend falls back to a mock string when the AI agent is down.
    // Surface that honestly as a service state, never as an answer.
    if (replyText.includes(MOCK_MODE_MARKER)) {
      setError('The AI agent service is unavailable right now, so I could not get a real answer. Please try again shortly.');
      setIsThinking(false);
      return;
    }

    setMessages(prev => [
      ...prev,
      {
        id: Date.now() + 1,
        type: 'ai',
        text: replyText || 'I did not get a response from the agent. Please try again.',
        toolsUsed: Array.isArray(data.tools_used) ? data.tools_used : [],
        ragUsed: Boolean(data.rag_used)
      }
    ]);
    setIsThinking(false);
  };

  const handleSend = (e) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || isThinking) return;

    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: question }]);
    setInput('');
    setLastQuestion(question);
    sendToCopilot(question);
  };

  if (!hasToken()) {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)] bg-white border border-line rounded-xl shadow-sm animate-fade-in overflow-hidden">
        <EmptyState
          icon={Bot}
          title="Sign in to use the Trade Copilot"
          description="The Copilot answers through the live GlobeX AI agent, which needs your account session."
          actionLabel="Sign in"
          onAction={() => onRequireAuth?.()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white border border-line rounded-xl shadow-sm animate-fade-in overflow-hidden">

      {/* Header */}
      <div className="p-5 border-b border-line flex items-center gap-3 bg-page">
        <div className="w-10 h-10 rounded-full bg-blue-pale flex items-center justify-center text-blue">
          <Bot size={20} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-navy font-heading">Trade Copilot</h1>
          <p className="text-sm text-muted">Powered by GlobeX Intelligence</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {error && (
          <ErrorBanner
            message={error}
            onRetry={lastQuestion ? () => sendToCopilot(lastQuestion) : undefined}
            retryLabel="Retry"
          />
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 max-w-[80%] ${msg.type === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.type === 'user' ? 'bg-line text-soft' : 'bg-blue-pale text-blue'}`}>
              {msg.type === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.type === 'user'
                ? 'bg-blue text-white rounded-tr-sm'
                : 'bg-surface text-navy rounded-tl-sm'
            }`}>
              {msg.text}
              {msg.type === 'ai' && ((msg.toolsUsed && msg.toolsUsed.length > 0) || msg.ragUsed) && (
                <div className="mt-3 pt-2 border-t border-line flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                  {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Wrench size={11} />
                      Tools: {msg.toolsUsed.join(', ')}
                    </span>
                  )}
                  {msg.ragUsed && (
                    <span className="inline-flex items-center gap-1">
                      <BookOpen size={11} />
                      Knowledge base
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator while the agent reply is pending */}
        {isThinking && (
          <div className="flex gap-4 max-w-[80%]">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-blue-pale text-blue">
              <Bot size={14} />
            </div>
            <div className="p-4 rounded-2xl rounded-tl-sm bg-surface flex items-center gap-1.5" role="status" aria-label="Copilot is typing">
              <span className="w-1.5 h-1.5 rounded-full bg-faint animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-faint animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-faint animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-line bg-white">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about tariffs, buyers, or compliance..."
            className="w-full pl-5 pr-12 py-3 bg-page border border-line rounded-full text-sm focus:outline-none focus:border-blue focus:ring-1 focus:ring-blue"
          />
          <button
            type="submit"
            disabled={isThinking}
            className="absolute right-2 p-2 bg-blue hover:bg-blue-dark text-white rounded-full transition-colors disabled:opacity-50"
            aria-label="Send message"
          >
            <Send size={16} />
          </button>
        </form>
        <div className="flex gap-2 mt-3 pl-2 overflow-x-auto">
          <button onClick={() => setInput("Find buyers for cotton in Germany")} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-pale text-blue rounded-full text-xs font-medium hover:bg-blue-border whitespace-nowrap">
            <Sparkles size={12} /> Find buyers for cotton in Germany
          </button>
          <button onClick={() => setInput("What are the US import tariffs for spices?")} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-pale text-blue rounded-full text-xs font-medium hover:bg-blue-border whitespace-nowrap">
            <Sparkles size={12} /> What are the US import tariffs for spices?
          </button>
        </div>
      </div>

    </div>
  );
}
