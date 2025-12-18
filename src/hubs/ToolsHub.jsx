// src/hubs/ToolsHub.jsx
// Tools Hub - Advanced features like Video Analysis and AI Chat
// Navigation restructure: combines advanced/power-user features

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import {
  Video, MessageSquare, Sparkles, ChevronRight, Play, Clock,
  User, Loader2, Upload, Brain, Zap, Star, ExternalLink
} from 'lucide-react';
import { formatDateSafe } from '../utils/dateUtils';

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

// Feature Card
function FeatureCard({ icon: Icon, title, description, color, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className={`w-full bg-gradient-to-br ${color} text-white rounded-xl p-5 text-left hover:shadow-lg transition-all group relative overflow-hidden`}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Icon size={24} />
          </div>
          {badge && (
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium">
              {badge}
            </span>
          )}
        </div>
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-sm opacity-80 mt-1">{description}</p>
      </div>
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
    </button>
  );
}

export default function ToolsHub({ 
  swimmers = [],
  navigateTo,
  onStartAnalysis,
  onOpenAIChat,
  onViewAnalysis
}) {
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalAnalyses: 0 });

  useEffect(() => {
    fetchRecentAnalyses();
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

  return (
    <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Tools</h1>
        <p className="text-slate-500">Advanced analysis and AI-powered features</p>
      </div>

      {/* Main Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <FeatureCard
          icon={Video}
          title="AI Video Analysis"
          description="Upload swim videos for AI-powered stroke analysis and feedback"
          color="from-blue-500 to-indigo-600"
          onClick={onStartAnalysis}
          badge="Powered by Gemini"
        />
        <FeatureCard
          icon={MessageSquare}
          title="AI Data Assistant"
          description="Chat with your team data - ask questions, get insights"
          color="from-violet-500 to-purple-600"
          onClick={onOpenAIChat}
          badge="Beta"
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

      {/* Recent Analyses */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Video size={18} className="text-blue-600" />
            Recent Analyses
          </h3>
          <button
            onClick={onStartAnalysis}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <Upload size={14} />
            New Analysis
          </button>
        </div>
        
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-blue-500" size={24} />
            </div>
          ) : recentAnalyses.length > 0 ? (
            <div className="space-y-3">
              {recentAnalyses.map(analysis => (
                <AnalysisCard 
                  key={analysis.id}
                  analysis={analysis}
                  onView={onViewAnalysis}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Video size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600 font-medium">No analyses yet</p>
              <p className="text-slate-500 text-sm mt-1">Upload a video to get AI-powered feedback</p>
              <button
                onClick={onStartAnalysis}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Start First Analysis
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

