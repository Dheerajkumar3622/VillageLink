
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, X, Bot, Volume2, ShieldCheck } from 'lucide-react';
import { processNaturalLanguageQuery } from '../services/mlService';
import { ChatMessage } from '../types';

interface SarpanchBotProps {
  onNavigate: (tab: string) => void;
}

export const SarpanchBot: React.FC<SarpanchBotProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', text: "Pranaam Didi! Hum Sarpanch AI bani. Safe bus khoje ke ba? (Greetings! Need a safe bus?)", sender: 'BOT', timestamp: Date.now() }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const speakLocal = (text: string) => {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'hi-IN';
        utterance.pitch = 0.9;
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), text: input, sender: 'USER', timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    const botResponse = await processNaturalLanguageQuery(input);
    setMessages(prev => [...prev, botResponse]);
    speakLocal(botResponse.text);

    // Auto-Navigation trigger
    if (botResponse.actionLink) {
        // Optional: Could auto-trigger after delay
    }
  };

  const handleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
       alert("Voice not supported"); return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setInput(text);
        setIsListening(false);
        // Optional: Auto-send if voice
        // handleSend();
    };
    recognition.start();
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 w-14 h-14 bg-gradient-to-br from-brand-600 to-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white z-50 hover:scale-110 transition-transform ring-4 ring-white dark:ring-slate-900"
      >
        <Bot size={28} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 w-80 h-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-10">
      <div className="bg-brand-600 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
            <Bot size={20} />
            <div>
                <span className="font-bold block text-sm">Sarpanch AI</span>
                <span className="text-[9px] opacity-80">Bhojpuri/Hindi Support</span>
            </div>
        </div>
        <button onClick={() => setIsOpen(false)}><X size={20} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950">
        {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.sender === 'USER' ? 'bg-brand-500 text-white rounded-br-none' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-none'}`}>
                    <p className="dark:text-white">{msg.text}</p>
                    {msg.actionLink && (
                        <button 
                            onClick={() => { onNavigate(msg.actionLink!.tab); setIsOpen(false); }}
                            className="mt-2 text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded font-bold hover:bg-brand-200 block w-full text-center"
                        >
                            {msg.actionLink.label}
                        </button>
                    )}
                </div>
            </div>
        ))}
        {/* Quick Actions */}
        <div className="flex gap-2 justify-start mt-2">
            <button onClick={() => setInput("Maike")} className="text-[10px] border border-slate-200 bg-slate-50 text-slate-600 px-2 py-1 rounded-full hover:bg-slate-100">
                Go Home
            </button>
        </div>
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
         <button onClick={handleVoice} className={`p-2 rounded-full ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:bg-slate-100'}`}>
            <Mic size={20} />
         </button>
         <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Bhojpuri me boli..."
            className="flex-1 bg-transparent outline-none text-sm dark:text-white"
         />
         <button onClick={handleSend} className="p-2 text-brand-600 hover:bg-brand-50 rounded-full">
            <Send size={20} />
         </button>
      </div>
    </div>
  );
};
