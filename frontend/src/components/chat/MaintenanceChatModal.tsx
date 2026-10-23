import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  AlertTriangle,
  BookOpen,
  Bot,
  User,
  Loader2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { api } from '../../api/client';
import { ChatMessage } from '../../types';

interface MaintenanceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId?: string;
  workOrderId?: string;
}

export const MaintenanceChatModal: React.FC<MaintenanceChatModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  workOrderId,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content:
        'Hello! I am your AI Maintenance Assistant. I answer questions about maintenance policies, resident vs manager responsibilities, and equipment operating guidelines strictly using authorized property documents. How can I help you today?',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setLoading(true);

    try {
      const data = await api.post('/api/maintenance-chat', {
        message: currentInput,
        propertyId,
        workOrderId,
      });

      const assistantMessage: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        content: data.reply || data.answer || "I'm sorry, I could not generate a response.",
        citations: data.citations || [],
        isEmergencyAlert: data.isEmergencyAlert || false,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        content: `Error: ${err.message || 'Unable to connect to AI assistant. Please ensure Ollama is running.'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Maintenance Policy & Equipment AI Assistant"
      subtitle="Grounded document retrieval powered by MongoDB Atlas Vector Search & Ollama"
      maxWidth="2xl"
    >
      <div className="flex flex-col h-[520px]">
        {/* Chat message stream */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 text-sm ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-850 border border-slate-800 text-slate-200 rounded-bl-none'
                }`}
              >
                {/* Emergency banner */}
                {msg.isEmergencyAlert && (
                  <div className="flex items-center gap-2 p-2.5 mb-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                    <span>EMERGENCY PROTOCOL DETECTED — CONTACT DISPATCH IMMEDIATELY</span>
                  </div>
                )}

                <div className="whitespace-pre-line leading-relaxed text-xs sm:text-sm">
                  {msg.content}
                </div>

                {/* Citations block */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-400 mb-1.5 uppercase tracking-wider">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Verified Document Citations:</span>
                    </div>
                    <div className="space-y-1">
                      {msg.citations.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300"
                        >
                          <span className="font-medium truncate max-w-[280px]">
                            {c.documentTitle || c.source}
                          </span>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            Chunk #{c.chunkIndex}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 text-sm justify-start">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="rounded-2xl p-4 bg-slate-850 border border-slate-800 text-slate-300 rounded-bl-none flex items-center gap-2 text-xs">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>Searching authorized property policies & generating grounded answer...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Questions */}
        <div className="pt-3 pb-2 flex gap-1.5 overflow-x-auto text-[11px] text-slate-400">
          <button
            onClick={() => {
              setInput('Who is responsible for fixing a leaking pipe under the sink?');
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 truncate"
          >
            "Who fixes leaking pipes?"
          </button>
          <button
            onClick={() => {
              setInput('What is the minimum temperature setting for the summer AC thermostat?');
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 truncate"
          >
            "Summer AC thermostat limit"
          </button>
          <button
            onClick={() => {
              setInput('Can I rewire my own circuit breaker box?');
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 truncate"
          >
            "Can I rewire circuit breakers?"
          </button>
        </div>

        {/* Input form */}
        <form onSubmit={handleSend} className="pt-2 flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a maintenance or policy question..."
            disabled={loading}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white transition-all text-xs sm:text-sm font-medium flex items-center gap-1.5 shadow-md shadow-purple-600/30"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </Modal>
  );
};
