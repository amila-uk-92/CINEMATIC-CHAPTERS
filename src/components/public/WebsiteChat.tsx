'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, AlertCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'visitor' | 'team';
  message_text: string;
  created_at: string;
}

export function WebsiteChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [visitorToken, setVisitorToken] = useState<string>('');
  const [visitorName, setVisitorName] = useState<string>('');
  const [messageText, setMessageText] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [telegramConfigured, setTelegramConfigured] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize visitor token
  useEffect(() => {
    let token = localStorage.getItem('cc_visitor_chat_token');
    if (!token) {
      token = 'vis_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('cc_visitor_chat_token', token);
    }
    setVisitorToken(token);
  }, []);

  // Poll for messages when chat panel is open
  useEffect(() => {
    if (!isOpen || !visitorToken) return;

    let isMounted = true;
    async function loadMessages() {
      try {
        const res = await fetch(`/api/chat/messages?token=${visitorToken}`);
        const data = await res.json();
        if (isMounted) {
          if (data.messages) setMessages(data.messages);
          if (data.telegramConfigured !== undefined) {
            setTelegramConfigured(data.telegramConfigured);
          }
        }
      } catch (err) {
        console.error('Chat load error:', err);
      }
    }

    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, visitorToken]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !visitorToken || loading) return;

    setLoading(true);
    const textToSend = messageText;
    setMessageText('');

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: visitorToken,
          name: visitorName || 'Website Visitor',
          message: textToSend,
        }),
      });

      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chat Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-[#C8AD7F] text-[#0D0C0A] shadow-[0_4px_25px_rgba(200,173,127,0.4)] hover:bg-[#DFC7A0] transition-all duration-300 hover:scale-105 focus:outline-none"
        aria-label="Open studio chat"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {/* Slide-out Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-80 sm:w-96 rounded-2xl glass-card-smoky border border-[#C8AD7F]/40 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
          {/* Header */}
          <div className="bg-[#191713] p-4 border-b border-[#302921] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="font-headline text-base uppercase tracking-wider text-[#F2EDE4]">
                  Photographer Chat
                </h4>
              </div>
              <p className="text-[11px] text-[#806849]">Connected directly with Alex & Elena</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#806849] hover:text-[#F2EDE4]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Honest Integration Fallback Notice if Telegram is unconfigured */}
          {!telegramConfigured && (
            <div className="bg-[#1D170E] px-4 py-2 text-[11px] text-[#C8AD7F] border-b border-[#302921] flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#C8AD7F]" />
              <span>Direct Telegram bridge not configured yet. Messages are delivered to studio dashboard.</span>
            </div>
          )}

          {/* Messages Thread */}
          <div className="p-4 h-72 overflow-y-auto space-y-3 bg-[#0D0C0A]/60">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <p className="text-xs text-[#B7AEA2] font-light">
                  Ask about location availability, custom durations, or creative ideas.
                </p>
                <span className="text-[10px] text-[#806849] mt-2 font-mono">
                  Replies appear live in this window
                </span>
              </div>
            ) : (
              messages.map((msg) => {
                const isVisitor = msg.sender === 'visitor';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isVisitor ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        isVisitor
                          ? 'bg-[#C8AD7F] text-[#0D0C0A] font-medium'
                          : 'bg-[#191713] text-[#F2EDE4] border border-[#302921]'
                      }`}
                    >
                      {msg.message_text}
                    </div>
                    <span className="text-[9px] text-[#806849] mt-1 px-1 font-mono">
                      {isVisitor ? 'You' : 'Studio'} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input & Send Form */}
          <form onSubmit={handleSendMessage} className="p-3 bg-[#14120E] border-t border-[#302921] space-y-2">
            {!messages.some((m) => m.sender === 'visitor') && (
              <input
                type="text"
                placeholder="Your Name (Optional)"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                className="w-full bg-[#0D0C0A] border border-[#302921] rounded-lg px-3 py-1.5 text-xs text-[#F2EDE4] placeholder-[#806849] focus:outline-none focus:border-[#C8AD7F]"
              />
            )}
            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 bg-[#0D0C0A] border border-[#302921] rounded-lg px-3 py-2 text-xs text-[#F2EDE4] placeholder-[#806849] focus:outline-none focus:border-[#C8AD7F]"
              />
              <button
                type="submit"
                disabled={loading || !messageText.trim()}
                className="p-2 rounded-lg bg-[#C8AD7F] text-[#0D0C0A] hover:bg-[#DFC7A0] disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
