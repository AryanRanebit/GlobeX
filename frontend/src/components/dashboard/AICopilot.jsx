import React, { useState } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';

export default function AICopilot() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      text: 'Hello! I am your GlobeX Trade Copilot. I can help you find buyers, analyze tariffs, or generate outreach emails. What would you like to do today?'
    }
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userMsg = { id: Date.now(), type: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    // Mock AI response
    setTimeout(() => {
      setMessages(prev => [
        ...prev, 
        { 
          id: Date.now(), 
          type: 'ai', 
          text: 'I can certainly help with that! However, this is a demo environment for the hackathon, so my live AI capabilities are currently running in simulated mode. Is there a specific market you are looking at?'
        }
      ]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white border border-[#E2E8F0] rounded-xl shadow-sm animate-fade-in overflow-hidden">
      
      {/* Header */}
      <div className="p-5 border-b border-[#E2E8F0] flex items-center gap-3 bg-[#F8FAFC]">
        <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
          <Bot size={20} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#0F172A]">Trade Copilot</h1>
          <p className="text-sm text-[#64748B]">Powered by GlobeX Intelligence</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 max-w-[80%] ${msg.type === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.type === 'user' ? 'bg-[#E2E8F0] text-[#475569]' : 'bg-[#EFF6FF] text-[#2563EB]'}`}>
              {msg.type === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
              msg.type === 'user' 
                ? 'bg-[#2563EB] text-white rounded-tr-sm' 
                : 'bg-[#F1F5F9] text-[#0F172A] rounded-tl-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#E2E8F0] bg-white">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about tariffs, buyers, or compliance..."
            className="w-full pl-5 pr-12 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full text-sm focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
          />
          <button 
            type="submit"
            className="absolute right-2 p-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-full transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
        <div className="flex gap-2 mt-3 pl-2 overflow-x-auto">
          <button onClick={() => setInput("Find buyers for cotton in Germany")} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF6FF] text-[#2563EB] rounded-full text-xs font-medium hover:bg-[#DBEAFE] whitespace-nowrap">
            <Sparkles size={12} /> Find buyers for cotton in Germany
          </button>
          <button onClick={() => setInput("What are the US import tariffs for spices?")} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFF6FF] text-[#2563EB] rounded-full text-xs font-medium hover:bg-[#DBEAFE] whitespace-nowrap">
            <Sparkles size={12} /> What are the US import tariffs for spices?
          </button>
        </div>
      </div>
      
    </div>
  );
}
