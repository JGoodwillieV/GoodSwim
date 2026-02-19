// src/AIChat.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './supabase';
import {
  Send, Bot, User, Loader2, ChevronLeft, Sparkles, Plus,
  HelpCircle, MessageSquare, Clock, X, TrendingUp, Calendar,
  Users, Lightbulb
} from 'lucide-react';
import { FeatureGate } from './components/gates';

const EXAMPLE_CATEGORIES = [
  {
    category: 'Performance & Times',
    icon: TrendingUp,
    color: 'blue',
    questions: [
      'Which swimmers have improved the most this season?',
      'What are the best 100 Free times for our 12-year-old girls?',
      'Based on our Silver swimmers, what strokes should we focus on next month?',
      'Who is closest to qualifying for their next time standard?',
    ]
  },
  {
    category: 'Schedule & Staff',
    icon: Calendar,
    color: 'emerald',
    questions: [
      "What's the practice schedule for Gold group this week?",
      'Which coaches are assigned to each group?',
      'Are there any upcoming schedule exceptions or cancellations?',
      "When is a coach's next scheduled day off?",
    ]
  },
  {
    category: 'Team Overview',
    icon: Users,
    color: 'violet',
    questions: [
      'Give me a summary of our roster by group',
      'How many swimmers do we have in each age group?',
      'What meets do we have coming up?',
      'What have our recent practice focus areas been?',
    ]
  }
];

const CATEGORY_COLORS = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', hover: 'hover:bg-blue-100' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', hover: 'hover:bg-emerald-100' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'text-violet-600', hover: 'hover:bg-violet-100' },
};

function MarkdownContent({ text }) {
  const html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/^#### (.*)$/gm, '<h5 class="font-semibold text-xs mt-2 mb-0.5 text-slate-700">$1</h5>')
    .replace(/^### (.*)$/gm, '<h4 class="font-semibold text-sm mt-3 mb-1 text-slate-800">$1</h4>')
    .replace(/^## (.*)$/gm, '<h3 class="font-semibold text-base mt-3 mb-1 text-slate-900">$1</h3>')
    .replace(/^# (.*)$/gm, '<h2 class="font-bold text-lg mt-3 mb-1 text-slate-900">$1</h2>')
    .replace(/^[*-] (.*)$/gm, '<div class="flex gap-2 ml-1"><span class="text-slate-400 select-none shrink-0">•</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.*)$/gm, '<div class="flex gap-2 ml-1"><span class="text-slate-400 font-medium select-none shrink-0 min-w-[1.2em]">$1.</span><span>$2</span></div>')
    .replace(/\n\n/g, '<div class="h-2"></div>')
    .replace(/\n/g, '<br/>');

  return <div className="leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
}

function ExampleQuestionsPanel({ onSelectQuestion, inline = false }) {
  if (inline) {
    return (
      <div className="space-y-4 px-2">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles size={28} className="text-purple-600" />
          </div>
          <h3 className="font-bold text-lg text-slate-800">What can I help with?</h3>
          <p className="text-sm text-slate-500 mt-1">
            I have access to your entire team database. Try asking about...
          </p>
        </div>
        {EXAMPLE_CATEGORIES.map((cat) => {
          const colors = CATEGORY_COLORS[cat.color];
          const Icon = cat.icon;
          return (
            <div key={cat.category}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={colors.icon} />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{cat.category}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cat.questions.map((q) => (
                  <button
                    key={q}
                    onClick={() => onSelectQuestion(q)}
                    className={`text-left text-sm p-3 rounded-xl border ${colors.border} ${colors.bg} ${colors.hover} transition-colors`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto p-4">
      <p className="text-sm text-slate-500 mb-3">Try one of these or ask your own question:</p>
      {EXAMPLE_CATEGORIES.map((cat) => {
        const colors = CATEGORY_COLORS[cat.color];
        const Icon = cat.icon;
        return (
          <div key={cat.category}>
            <div className="flex items-center gap-2 mb-1.5">
              <Icon size={12} className={colors.icon} />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{cat.category}</span>
            </div>
            <div className="space-y-1.5 mb-3">
              {cat.questions.map((q) => (
                <button
                  key={q}
                  onClick={() => onSelectQuestion(q)}
                  className={`w-full text-left text-sm p-2.5 rounded-lg border ${colors.border} ${colors.bg} ${colors.hover} transition-colors`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AIChatContent({ onBack, conversationId: initialConversationId, onConversationChange }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(initialConversationId || null);
  const [showExamplesDrawer, setShowExamplesDrawer] = useState(false);
  const [userId, setUserId] = useState(null);
  const [teamId, setTeamId] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const isNewChat = messages.length === 0 && !loading;

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const { data: membership } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .single();

        if (membership) setTeamId(membership.team_id);

        if (initialConversationId) {
          const { data: msgs } = await supabase
            .from('chat_messages')
            .select('role, content, created_at')
            .eq('conversation_id', initialConversationId)
            .order('created_at', { ascending: true });

          if (msgs && msgs.length > 0) {
            setMessages(msgs.map(m => ({ role: m.role, content: m.content })));
          }
        }
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        setInitializing(false);
      }
    };
    init();
  }, [initialConversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = useCallback(async (text) => {
    const userMsg = (text || input).trim();
    if (!userMsg || loading || !teamId || !userId) return;

    setInput('');
    setShowExamplesDrawer(false);
    const updatedMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      let convId = conversationId;

      if (!convId) {
        const { data: conv, error: convError } = await supabase
          .from('chat_conversations')
          .insert({
            team_id: teamId,
            user_id: userId,
            title: userMsg.length > 80 ? userMsg.substring(0, 77) + '...' : userMsg,
          })
          .select()
          .single();

        if (convError) throw convError;
        convId = conv.id;
        setConversationId(convId);
        onConversationChange?.(convId);
      }

      await supabase.from('chat_messages').insert({
        conversation_id: convId,
        team_id: teamId,
        role: 'user',
        content: userMsg,
      });

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: userMsg,
          conversationHistory: messages,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const reply = data.reply;
      setMessages(prev => [...prev, { role: 'model', content: reply }]);

      await supabase.from('chat_messages').insert({
        conversation_id: convId,
        team_id: teamId,
        role: 'model',
        content: reply,
      });

      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString(), message_count: updatedMessages.length + 1 })
        .eq('id', convId);

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'model',
        content: `Sorry, I ran into an error: ${error.message || 'Unknown error'}. Please try again.`
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, conversationId, teamId, userId, onConversationChange]);

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setShowExamplesDrawer(false);
    onConversationChange?.(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="text-purple-600 shrink-0" size={18} fill="currentColor" fillOpacity={0.2} />
            AI Data Assistant
          </h2>
          <p className="text-xs text-slate-500">Powered by Gemini Flash</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowExamplesDrawer(prev => !prev)}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 relative"
            title="Example questions"
          >
            <HelpCircle size={20} />
          </button>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </div>

      {/* Examples drawer */}
      {showExamplesDrawer && (
        <div className="bg-white border-b shadow-sm shrink-0 relative">
          <button
            onClick={() => setShowExamplesDrawer(false)}
            className="absolute top-2 right-2 p-1 hover:bg-slate-100 rounded-full text-slate-400 z-10"
          >
            <X size={16} />
          </button>
          <ExampleQuestionsPanel
            onSelectQuestion={(q) => {
              setShowExamplesDrawer(false);
              handleSend(q);
            }}
          />
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {initializing ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Loader2 size={32} className="animate-spin mb-2" />
            <p>Connecting to your data...</p>
          </div>
        ) : isNewChat ? (
          <ExampleQuestionsPanel
            inline
            onSelectQuestion={(q) => handleSend(q)}
          />
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                  <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center shrink-0 text-white mt-1">
                    <Bot size={16} />
                  </div>
                )}

                <div className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl text-sm shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                }`}>
                  {msg.role === 'user' ? (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  ) : (
                    <MarkdownContent text={msg.content} />
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center shrink-0 text-slate-500 mt-1">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center shrink-0 text-white mt-1">
                  <Bot size={16} />
                </div>
                <div className="bg-white p-4 rounded-2xl rounded-tl-sm border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Analyzing your data...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 bg-white border-t shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about swimmers, schedules, times, meets..."
            className="flex-1 bg-slate-100 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none text-sm"
            disabled={loading || initializing}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || initializing || !input.trim()}
            className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl disabled:opacity-50 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AIChat(props) {
  return (
    <FeatureGate feature="ai_chat" mode="replace">
      <AIChatContent {...props} />
    </FeatureGate>
  );
}
