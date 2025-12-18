// src/AIChat.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import { Send, Bot, User, Loader2, ChevronLeft, Sparkles } from 'lucide-react';

export default function AIChat({ onBack }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'model', text: "Hi Coach! I have read your entire database. Ask me anything about your roster, times, or standards." }
  ]);
  const [loading, setLoading] = useState(false);
  const [contextData, setContextData] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const scrollRef = useRef(null);

  // 1. LOAD DATABASE CONTEXT
  useEffect(() => {
    const loadContext = async () => {
      // Fetch Roster
      const { data: swimmers } = await supabase.from('swimmers').select('id, name, age, gender, group_name');
      
      // Fetch Standards (Just names and times to save space, or full if needed)
      const { data: standards } = await supabase.from('time_standards').select('name, event, gender, age_min, age_max, time_seconds');

      // Fetch Recent Results (Limit to last 2000 to fit context comfortably)
      // Ideally we sort by date desc to get newest info
      const { data: results } = await supabase
        .from('results')
        .select('swimmer_id, event, time, date')
        .order('date', { ascending: false })
        .limit(2000);

      // Construct the "Brain"
      const context = {
        roster: swimmers,
        standards_reference: standards,
        recent_results: results
      };

      setContextData(JSON.stringify(context));
      setInitializing(false);
    };

    loadContext();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !contextData) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
        // 2. CONSTRUCT PROMPT
        // We feed the data + the question into Gemini
        const prompt = `
        You are an expert Swimming Data Analyst assistant.
        
        Here is the current database in JSON format:
        ${contextData}
        
        INSTRUCTIONS:
        1. Answer the user's question based ONLY on the data provided above.
        2. If you calculate stats (like counts or averages), explain your math briefly.
        3. When referring to swimmers, use their names.
        4. If the answer isn't in the data, say "I don't see that in the current records."
        
        USER QUESTION: "${userMsg}"
        `;

        // 3. CALL GEMINI API (3.0 Pro Preview)
        // Replace with your actual API Key handling
        const apiKey = window.prompt("Please confirm your Google API Key for this session:");
        if (!apiKey) {
            setLoading(false);
            return;
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        const reply = data.candidates[0].content.parts[0].text;
        setMessages(prev => [...prev, { role: 'model', text: reply }]);

    } catch (error) {
        console.error(error);
        setMessages(prev => [...prev, { role: 'model', text: "Error: " + error.message }]);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-4 shadow-sm shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <ChevronLeft size={24}/>
        </button>
        <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="text-purple-600" size={20} fill="currentColor" fillOpacity={0.2} /> 
                AI Data Assistant
            </h2>
            <p className="text-xs text-slate-500">Powered by Gemini 1.5 Pro</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {initializing && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Loader2 size={32} className="animate-spin mb-2" />
                <p>Reading database records...</p>
            </div>
        )}

        {!initializing && messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center shrink-0 text-white">
                        <Bot size={16} />
                    </div>
                )}
                
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                    msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                }`}>
                    {msg.text}
                </div>

                {msg.role === 'user' && (
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center shrink-0 text-slate-500">
                        <User size={16} />
                    </div>
                )}
            </div>
        ))}
        
        {loading && (
            <div className="flex gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center shrink-0 text-white">
                    <Bot size={16} />
                </div>
                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm">
                    <div className="flex gap-1">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t shrink-0">
        <div className="flex gap-2">
            <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Ask about 'A' cuts, time drops, or roster stats..."
                className="flex-1 bg-slate-100 border-0 rounded-xl px-4 focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                disabled={loading || initializing}
            />
            <button 
                onClick={handleSend}
                disabled={loading || initializing}
                className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl disabled:opacity-50 transition-colors"
            >
                <Send size={20} />
            </button>
        </div>
      </div>
    </div>
  );
}
