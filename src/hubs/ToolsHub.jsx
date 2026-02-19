// src/hubs/ToolsHub.jsx
// Tools Hub - Advanced features like Video Analysis and AI Chat
// Navigation restructure: combines advanced/power-user features

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import {
  Video, MessageSquare, Sparkles, ChevronRight, Play, Clock,
  User, Loader2, Upload, Brain, Zap, Star, ExternalLink, Lock, Crown, Bot
} from 'lucide-react';
import { formatDateSafe } from '../utils/dateUtils';
import { FeatureGate, useFeatureGate } from '../components/gates';
import { useSubscription } from '../hooks/useSubscription';
import { getTierDisplayName } from '../config/features';

// Recent Analysis Card
function AnalysisCard({ analysis, onView }) {
  return (
    <button
      onClick={() => onView?.(analysis)}
      className="w-full bg-white border border-slate-200 rounded-xl p-4 text-left hover:shadow-md hover:border-blue-200 transition-all group"
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail placeholder */}
        <div className="w-20 h-14 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 transition-colors">
          <Play size={20} className="text-slate-400 group-hover:text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-slate-800 truncate">
            {analysis.json_data?.title || 'Untitled Analysis'}
          </h4>
          <p className="text-sm text-slate-500 mt-0.5">
            {analysis.swimmers?.name || 'Unknown Swimmer'}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
            <Clock size={12} />
            {formatDateSafe(analysis.created_at, { month: 'short', day: 'numeric' })}
            {analysis.json_data?.stroke && (
              <>
                <span>•</span>
                <span className="capitalize">{analysis.json_data.stroke}</span>
              </>
            )}
          </div>
        </div>
        <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 mt-1" />
      </div>
    </button>
  );
}

// Feature Card - with optional locked state
function FeatureCard({ icon: Icon, title, description, color, onClick, badge, isLocked, requiredTier }) {
  const handleClick = () => {
    if (isLocked) {
      // Navigate to billing when locked
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'billing' }));
    } else {
      onClick?.();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full bg-gradient-to-br ${color} text-white rounded-xl p-5 ${isLocked ? 'pb-24' : ''} text-left hover:shadow-lg transition-all group relative overflow-hidden`}
    >
      {/* Locked banner (keeps underlying text readable) */}
      {isLocked && (
        <div className="absolute inset-x-0 bottom-0 z-20 p-4">
          <div className="flex items-center justify-between gap-3 bg-white/90 text-slate-900 rounded-xl px-4 py-3 shadow-lg border border-white/30 backdrop-blur-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-slate-900/5 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lock size={16} className="text-slate-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">Locked</p>
                <p className="text-xs text-slate-600 truncate">
                  Upgrade to {getTierDisplayName(requiredTier)}
                </p>
              </div>
            </div>
            <div className="text-xs font-semibold text-blue-700 whitespace-nowrap flex items-center gap-1">
              View plans <ChevronRight size={14} />
            </div>
          </div>
        </div>
      )}
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Icon size={24} />
          </div>
          <div className="flex items-center gap-2">
            {isLocked && requiredTier && (
              <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${
                requiredTier === 'club' ? 'bg-purple-500/30' : 'bg-blue-500/30'
              }`}>
                <Crown size={12} />
                {requiredTier === 'club' ? 'Club' : 'Pro'}
              </span>
            )}
            {badge && !isLocked && (
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">
                {badge}
              </span>
            )}
          </div>
        </div>
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-sm opacity-80 mt-1">{description}</p>
      </div>
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
    </button>
  );
}

// Chat History Card
function ChatHistoryCard({ conversation, onOpen }) {
  const timeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDateSafe(dateStr, { month: 'short', day: 'numeric' });
  };

  return (
    <button
      onClick={() => onOpen?.(conversation.id)}
      className="w-full bg-white border border-slate-200 rounded-xl p-4 text-left hover:shadow-md hover:border-purple-200 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
          <Bot size={18} className="text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-slate-800 truncate text-sm">
            {conversation.title || 'New Conversation'}
          </h4>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
            <Clock size={11} />
            {timeAgo(conversation.updated_at || conversation.created_at)}
            {conversation.message_count > 0 && (
              <>
                <span>•</span>
                <span>{conversation.message_count} messages</span>
              </>
            )}
          </div>
        </div>
        <ChevronRight size={14} className="text-slate-300 group-hover:text-purple-500 mt-1" />
      </div>
    </button>
  );
}

export default function ToolsHub({ 
  swimmers = [],
  navigateTo,
  onStartAnalysis,
  onOpenAIChat,
  onOpenConversation,
  onViewAnalysis
}) {
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [recentChats, setRecentChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [stats, setStats] = useState({ totalAnalyses: 0 });
  
  // Check feature access
  const aiVideoAccess = useFeatureGate('ai_video_analysis');
  const aiChatAccess = useFeatureGate('ai_chat');

  useEffect(() => {
    fetchRecentAnalyses();
    fetchRecentChats();
  }, []);

  const fetchRecentAnalyses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error, count } = await supabase
        .from('video_analyses')
        .select('*, swimmers(name)', { count: 'exact' })
        .eq('coach_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentAnalyses(data || []);
      setStats({ totalAnalyses: count || 0 });
    } catch (err) {
      console.error('Error fetching analyses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentChats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentChats(data || []);
    } catch (err) {
      console.error('Error fetching chat history:', err);
    } finally {
      setChatsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Tools</h1>
        <p className="text-slate-500">Advanced analysis and AI-powered features</p>
      </div>

      {/* Main Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="relative w-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl p-5 text-left overflow-hidden opacity-80">
          <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[2px] bg-white/5">
            <div className="flex items-center gap-2 bg-white/90 border border-slate-200 rounded-full px-4 py-2 text-sm font-bold text-slate-700 shadow-lg">
              <Clock size={16} className="text-blue-600" />
              Coming Soon — Q2 2026
            </div>
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Video size={24} />
              </div>
            </div>
            <h3 className="font-bold text-lg">Video Analysis Suite</h3>
            <p className="text-sm opacity-80 mt-1">Upload swim videos, annotate, and get AI-powered stroke analysis</p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full"></div>
        </div>
        <FeatureCard
          icon={MessageSquare}
          title="AI Data Assistant"
          description="Chat with your team data - ask questions, get insights"
          color="from-violet-500 to-purple-600"
          onClick={onOpenAIChat}
          badge="Beta"
          isLocked={!aiChatAccess.isUnlocked}
          requiredTier={aiChatAccess.requiredTier}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Video size={20} className="text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{stats.totalAnalyses}</div>
              <div className="text-xs text-slate-500">Total Analyses</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <User size={20} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{swimmers.length}</div>
              <div className="text-xs text-slate-500">Swimmers</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <Brain size={20} className="text-violet-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">AI</div>
              <div className="text-xs text-slate-500">Powered</div>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Zap size={20} className="text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">Fast</div>
              <div className="text-xs text-slate-500">Analysis</div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Analysis Coming Soon */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Video size={18} className="text-blue-600" />
            Video Analysis Suite
          </h3>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Coming Q2 2026</span>
        </div>
        
        <div className="p-6 text-center">
          <Video size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">Video Analysis is coming soon</p>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            Upload swimmer footage, add timestamps, draw annotations, record voiceovers, and get AI-powered stroke analysis — launching Q2 2026.
          </p>
        </div>
      </div>

      {/* Chat History */}
      <div className="mt-6 bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare size={18} className="text-purple-600" />
            Chat History
          </h3>
          <button
            onClick={onOpenAIChat}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
          >
            <Bot size={14} />
            New Chat
          </button>
        </div>

        <div className="p-4">
          {chatsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-purple-500" size={24} />
            </div>
          ) : recentChats.length > 0 ? (
            <div className="space-y-2">
              {recentChats.map(chat => (
                <ChatHistoryCard
                  key={chat.id}
                  conversation={chat}
                  onOpen={onOpenConversation}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">No conversations yet</p>
              <p className="text-slate-500 text-sm mt-1">Start a chat with your AI Data Assistant</p>
              <button
                onClick={onOpenAIChat}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Start Chatting
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tips Card */}
      <div className="mt-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles size={24} className="text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2">Tips for Best Results</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <Star size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                Record videos from the side for best stroke analysis
              </li>
              <li className="flex items-start gap-2">
                <Star size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                Ensure good lighting and minimal splashing in frame
              </li>
              <li className="flex items-start gap-2">
                <Star size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                Keep videos under 30 seconds for faster processing
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

