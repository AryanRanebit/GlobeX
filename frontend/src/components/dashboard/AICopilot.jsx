import React, { useState } from 'react';
import { Send, Bot, User, Sparkles, FlaskConical } from 'lucide-react';

export default function AICopilot() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      text: 'Hello! I am your GlobeX Trade Copilot. I can help you find buyers, analyze tariffs, or generate outreach emails. What would you like to do today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const userMsg = { id: Date.now(), type: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    // Canned demo reply - not backed by the AI service yet.
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'ai',
          text: 'I can certainly help with that! However, this is a demo environment, so my live AI capabilities are currently running in simulated mode. Is there a specific market you are looking at?'
        }
      ]);
      setIsThinking(false);
    }, 1000);
  };

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
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent-text bg-accent-subtle border border-accent-border px-2 py-1 rounded-full">
          <FlaskConical size={12} />
          Demo - simulated replies
        </span>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 max-w-[80%] ${msg.type === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.type === 'user' ? 'bg-line text-soft' : 'bg-blue-pale text-blue'}`}>
              {msg.type === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
              msg.type === 'user'
                ? 'bg-blue text-white rounded-tr-sm'
                : 'bg-surface text-navy rounded-tl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}

        {/* Typing indicator while the (simulated) reply is pending */}
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
