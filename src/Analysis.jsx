// src/Analysis.jsx
import React, { useState, useRef, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  UploadCloud, ChevronLeft, Video, Camera, Waves, Play, Pause, 
  SkipBack, SkipForward, Volume2, VolumeX, Maximize, Settings,
  Mic, MicOff, PenTool, Type, Check, X, Trash2, Save, Share2,
  Sparkles, Loader2, AlertCircle, Clock, User, Tag, Film,
  ChevronDown, ChevronUp, Eye, EyeOff, Edit3, MessageSquare,
  Zap, Target, ArrowRight, RotateCcw, Download, CheckCircle2, Triangle
} from 'lucide-react';

// Video type definitions
const VIDEO_TYPES = [
  { 
    id: 'over-water', 
    label: 'Over the Water', 
    icon: Camera, 
    description: 'Deck-level or above-water footage',
    color: 'blue',
    prompts: ['stroke technique', 'head position', 'body rotation', 'arm recovery', 'breathing pattern']
  },
  { 
    id: 'underwater', 
    label: 'Underwater', 
    icon: Waves, 
    description: 'Below surface footage',
    color: 'cyan',
    prompts: ['catch position', 'pull pattern', 'kick technique', 'streamline', 'underwater dolphin kicks']
  },
  { 
    id: 'full-race', 
    label: 'Full Race/Swim', 
    icon: Film, 
    description: 'Complete race or practice swim',
    color: 'purple',
    prompts: ['start reaction', 'breakout', 'turn technique', 'underwater off walls', 'finish', 'pacing']
  }
];

// Stroke options
const STROKES = ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'IM'];

export default function Analysis({ swimmers, onBack, supabase: sb }) {
  const [step, setStep] = useState('setup'); // setup, uploading, analyzing, editor
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [saveApiKey, setSaveApiKey] = useState(!!localStorage.getItem('gemini_api_key'));
  
  // Video metadata
  const [selectedSwimmerId, setSelectedSwimmerId] = useState('');
  const [videoType, setVideoType] = useState('');
  const [stroke, setStroke] = useState('Freestyle');
  const [videoTitle, setVideoTitle] = useState('');
  
  // Upload state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  
  // Video & Analysis data
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  
  const fileInputRef = useRef(null);

  // Handle API key storage preference
  useEffect(() => {
    if (saveApiKey && apiKey) {
      localStorage.setItem('gemini_api_key', apiKey);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  }, [saveApiKey, apiKey]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      if (!videoTitle) {
        setVideoTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleStartAnalysis = async () => {
    if (!videoFile) return alert('Please select a video file.');
    if (!selectedSwimmerId) return alert('Please select a swimmer.');
    if (!videoType) return alert('Please select a video type.');
    if (!apiKey) return alert('Please enter your Gemini API key.');

    setStep('uploading');
    setUploadProgress(0);
    setProgressMessage('Preparing upload...');

    try {
      // 1. Upload to Supabase Storage
      const fileName = `${selectedSwimmerId}/${Date.now()}_${videoFile.name}`;
      
      // Simulate progress (Supabase doesn't have upload progress callback)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from('race-videos')
        .upload(fileName, videoFile);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('race-videos')
        .getPublicUrl(fileName);

      setVideoUrl(publicUrl);
      setProgressMessage('Upload complete! Starting AI analysis...');

      // 2. Start AI Analysis
      setStep('analyzing');
      setAnalysisProgress(0);

      await runAIAnalysis(publicUrl);

    } catch (error) {
      console.error(error);
      alert('Error: ' + error.message);
      setStep('setup');
    }
  };

  const runAIAnalysis = async (url) => {
    setProgressMessage('Preparing video for analysis...');
    setAnalysisProgress(10);

    try {
      // Convert video to base64 for Gemini
      const videoBlob = await fetch(videoFile ? URL.createObjectURL(videoFile) : url).then(r => r.blob());
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(videoBlob);
      });

      setProgressMessage('Sending to Gemini AI...');
      setAnalysisProgress(30);

      // Build context-aware prompt based on video type
      const videoTypeInfo = VIDEO_TYPES.find(v => v.id === videoType);
      const focusAreas = videoTypeInfo?.prompts.join(', ') || 'general technique';

      const prompt = `You are an expert swimming coach and video analyst. Analyze this ${videoType.replace('-', ' ')} video of a ${stroke} swimmer.

VIDEO TYPE: ${videoTypeInfo?.label}
STROKE: ${stroke}
FOCUS AREAS: ${focusAreas}

Please provide a detailed analysis in the following JSON format (return ONLY valid JSON, no markdown):
{
  "overallScore": <number 1-100>,
  "summary": "<2-3 sentence overview of the swimmer's technique>",
  "strengths": [
    { "title": "<strength name>", "description": "<detailed explanation>", "timestamp": <seconds or null> }
  ],
  "improvements": [
    { 
      "id": "<unique_id>",
      "title": "<issue name>", 
      "description": "<what's happening>",
      "suggestion": "<how to fix it>",
      "severity": "<High|Medium|Low>",
      "timestamp": <seconds or null>,
      "status": "pending"
    }
  ],
  "drills": [
    { "name": "<drill name>", "purpose": "<what it addresses>", "description": "<how to do it>" }
  ],
  "metrics": {
    "strokeRate": "<estimated strokes per minute or null>",
    "distancePerStroke": "<estimated if visible or null>",
    "bodyPosition": "<rating 1-10>",
    "timing": "<rating 1-10>",
    "efficiency": "<rating 1-10>"
  },
  "keyMoments": [
    { "timestamp": <seconds>, "description": "<what happens at this moment>" }
  ]
}

Be specific and actionable. Reference specific timestamps when possible. Focus on the most impactful observations for ${videoType.replace('-', ' ')} footage.`;

      setAnalysisProgress(50);
      setProgressMessage('AI is analyzing technique...');

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inlineData: { mimeType: videoFile.type, data: base64 } }
              ]
            }]
          })
        }
      );

      setAnalysisProgress(80);
      setProgressMessage('Processing results...');

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const text = data.candidates[0].content.parts[0].text;
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const analysisResult = JSON.parse(cleanJson);

      // Add IDs to improvements if not present
      analysisResult.improvements = analysisResult.improvements.map((imp, idx) => ({
        ...imp,
        id: imp.id || `ai-${idx}`,
        status: 'pending',
        isAI: true
      }));

      setAiAnalysis(analysisResult);
      setAnalysisProgress(100);
      setProgressMessage('Analysis complete!');

      // Short delay before transitioning to editor
      setTimeout(() => {
        setStep('editor');
      }, 1000);

    } catch (error) {
      console.error('AI Analysis Error:', error);
      alert('AI Analysis failed: ' + error.message);
      setStep('setup');
    }
  };

  // Render based on current step
  if (step === 'setup') {
    return (
      <SetupStep 
        swimmers={swimmers}
        selectedSwimmerId={selectedSwimmerId}
        setSelectedSwimmerId={setSelectedSwimmerId}
        videoType={videoType}
        setVideoType={setVideoType}
        stroke={stroke}
        setStroke={setStroke}
        videoTitle={videoTitle}
        setVideoTitle={setVideoTitle}
        videoFile={videoFile}
        videoUrl={videoUrl}
        apiKey={apiKey}
        setApiKey={setApiKey}
        saveApiKey={saveApiKey}
        setSaveApiKey={setSaveApiKey}
        fileInputRef={fileInputRef}
        handleFileSelect={handleFileSelect}
        handleStartAnalysis={handleStartAnalysis}
        onBack={onBack}
      />
    );
  }

  if (step === 'uploading' || step === 'analyzing') {
    return (
      <ProgressStep 
        step={step}
        uploadProgress={uploadProgress}
        analysisProgress={analysisProgress}
        progressMessage={progressMessage}
      />
    );
  }

  if (step === 'editor') {
    return (
      <EditorStep 
        videoUrl={videoUrl}
        videoTitle={videoTitle}
        setVideoTitle={setVideoTitle}
        aiAnalysis={aiAnalysis}
        setAiAnalysis={setAiAnalysis}
        selectedSwimmerId={selectedSwimmerId}
        stroke={stroke}
        videoType={videoType}
        swimmers={swimmers}
        onBack={() => setStep('setup')}
        supabase={supabase}
      />
    );
  }

  return null;
}

// ============================================
// SETUP STEP COMPONENT
// ============================================
const SetupStep = ({
  swimmers, selectedSwimmerId, setSelectedSwimmerId,
  videoType, setVideoType, stroke, setStroke,
  videoTitle, setVideoTitle, videoFile, videoUrl,
  apiKey, setApiKey, saveApiKey, setSaveApiKey,
  fileInputRef, handleFileSelect, handleStartAnalysis, onBack
}) => {
  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Video className="text-blue-600" /> Video Analysis Studio
          </h2>
          <p className="text-slate-500 text-sm">AI-powered technique analysis with coach annotations</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Video Type Selection */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Film size={18} className="text-slate-400" /> Video Type
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {VIDEO_TYPES.map(type => {
              const Icon = type.icon;
              const isSelected = videoType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setVideoType(type.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected 
                      ? `border-${type.color}-500 bg-${type.color}-50 ring-2 ring-${type.color}-200` 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                    isSelected ? `bg-${type.color}-500 text-white` : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <div className="font-bold text-slate-800">{type.label}</div>
                  <p className="text-xs text-slate-500 mt-1">{type.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Swimmer & Stroke Selection */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <User size={18} className="text-slate-400" /> Swimmer & Stroke
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Swimmer</label>
              <select
                value={selectedSwimmerId}
                onChange={e => setSelectedSwimmerId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a swimmer...</option>
                {swimmers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Stroke</label>
              <select
                value={stroke}
                onChange={e => setStroke(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {STROKES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Video Upload */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <UploadCloud size={18} className="text-slate-400" /> Video Upload
          </h3>
          
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
          />

          {!videoFile ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-500">
                <UploadCloud size={32} />
              </div>
              <h4 className="font-bold text-slate-800 text-lg mb-1">Click to upload video</h4>
              <p className="text-slate-500 text-sm">MP4, MOV, WebM up to 100MB</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Video Preview */}
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                <video 
                  src={videoUrl}
                  className="w-full h-full object-contain"
                  controls
                />
              </div>
              
              {/* Video Title */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Video Title</label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={e => setVideoTitle(e.target.value)}
                  placeholder="Enter a title for this analysis..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Change Video Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 text-sm font-medium hover:underline"
              >
                Change video
              </button>
            </div>
          )}
        </div>

        {/* API Key */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-purple-500" /> AI Configuration
          </h3>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Google Gemini API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API key..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="saveKey"
                checked={saveApiKey}
                onChange={e => setSaveApiKey(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="saveKey" className="text-sm text-slate-500">
                Remember API key for future sessions
              </label>
            </div>
          </div>
        </div>

        {/* Start Analysis Button */}
        <button
          onClick={handleStartAnalysis}
          disabled={!videoFile || !selectedSwimmerId || !videoType || !apiKey}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
        >
          <Sparkles size={20} />
          Start AI Analysis
        </button>
      </div>
    </div>
  );
};

// ============================================
// PROGRESS STEP COMPONENT
// ============================================
const ProgressStep = ({ step, uploadProgress, analysisProgress, progressMessage }) => {
  const progress = step === 'uploading' ? uploadProgress : analysisProgress;
  
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="bg-white rounded-3xl p-12 shadow-xl border border-slate-200 max-w-md w-full text-center">
        {/* Animated Icon */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle 
              cx="50" cy="50" r="45" 
              fill="none" 
              stroke="#e2e8f0" 
              strokeWidth="8"
            />
            <circle 
              cx="50" cy="50" r="45" 
              fill="none" 
              stroke="url(#gradient)" 
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${progress * 2.83} 283`}
              className="transition-all duration-500"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-slate-800">{Math.round(progress)}%</span>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-slate-800 mb-2">
          {step === 'uploading' ? 'Uploading Video' : 'AI Analysis in Progress'}
        </h3>
        <p className="text-slate-500">{progressMessage}</p>

        {step === 'analyzing' && (
          <div className="mt-6 flex items-center justify-center gap-2 text-purple-600">
            <Sparkles size={16} className="animate-pulse" />
            <span className="text-sm font-medium">Gemini is analyzing technique...</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// EDITOR STEP COMPONENT
// ============================================
// src/Analysis.jsx - EditorStep component

const EditorStep = ({ 
  videoUrl, videoTitle, setVideoTitle, 
  aiAnalysis, setAiAnalysis,
  selectedSwimmerId, stroke, videoType, swimmers,
  onBack, supabase 
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  // Drawing state - redesigned for straight lines
  const [drawingTool, setDrawingTool] = useState('none'); // 'none', 'line', 'angle'
  const [drawingColor, setDrawingColor] = useState('#ef4444');
  
  const [lineThickness, setLineThickness] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lineStart, setLineStart] = useState(null);
  const [linePreview, setLinePreview] = useState(null);
  const [anglePath, setAnglePath] = useState([]); // Array of points
  const [mousePos, setMousePos] = useState(null); // Track mouse for previews
  
  // Saved annotations (lines with timestamps)
  const [annotations, setAnnotations] = useState([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [annotationLabel, setAnnotationLabel] = useState('');
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [pendingLine, setPendingLine] = useState(null);
  
  // Display settings
  const [annotationDuration, setAnnotationDuration] = useState(3);
  const [showAllAnnotations, setShowAllAnnotations] = useState(false);
  
  // Coach annotations
  const [coachNotes, setCoachNotes] = useState('');
  const [coachFeedback, setCoachFeedback] = useState([]);
  const [newFeedbackText, setNewFeedbackText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  
  // UI state
  const [activePanel, setActivePanel] = useState('ai'); 
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // HELPER: Calculate Angle
  const calculateAngleDegrees = (p1, p2, p3) => {
    // p2 is vertex
    const a1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
    const a2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
    let angle = (a2 - a1) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    if (angle > 180) angle = 360 - angle; // Get smaller angle
    return Math.round(angle);
  };

  // Video controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const seekTo = (time) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const skip = (seconds) => {
    if (videoRef.current) {
      const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
      seekTo(newTime);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const formatTimeShort = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get canvas coordinates
  const getCanvasPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      // Also store as percentage for responsive playback
      xPercent: (clientX - rect.left) / rect.width,
      yPercent: (clientY - rect.top) / rect.height
    };
  };

  // Drawing handlers
  const handleMouseDown = (e) => {
    if (drawingTool === 'none') return;
    e.preventDefault();
    
    if (videoRef.current && isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    
    const pos = getCanvasPos(e);
    if (!pos) return;

    if (drawingTool === 'line') {
      setIsDrawing(true);
      setLineStart(pos);
      setLinePreview(null);
    } else if (drawingTool === 'angle') {
      const newPath = [...anglePath, pos];
      setAnglePath(newPath);

      // If we have 3 points, we are done
      if (newPath.length === 3) {
        const degrees = calculateAngleDegrees(newPath[0], newPath[1], newPath[2]);
        
        setPendingLine({
          id: `angle-${Date.now()}`,
          type: 'angle',
          points: newPath.map(p => ({ x: p.xPercent, y: p.yPercent })),
          color: drawingColor,
          thickness: lineThickness,
          timestamp: currentTime,
          duration: annotationDuration,
          label: `${degrees}°` // Auto-label with degrees
        });
        
        // Reset angle path immediately
        setAnglePath([]); 
        setShowAnnotationModal(true);
      }
    }
  };

  const handleMouseMove = (e) => {
    const pos = getCanvasPos(e);
    if (pos) setMousePos(pos);

    if (drawingTool === 'line' && isDrawing && lineStart) {
      e.preventDefault();
      setLinePreview(pos);
    }
  };
  
  const handleMouseUp = (e) => {
    if (drawingTool === 'line') {
      if (!isDrawing || !lineStart) {
        setIsDrawing(false);
        return;
      }
      
      const endPos = getCanvasPos(e);
      if (endPos) {
        const dx = endPos.x - lineStart.x;
        const dy = endPos.y - lineStart.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length > 20) {
          setPendingLine({
            id: `line-${Date.now()}`,
            type: 'line',
            startX: lineStart.xPercent,
            startY: lineStart.yPercent,
            endX: endPos.xPercent,
            endY: endPos.yPercent,
            color: drawingColor,
            thickness: lineThickness,
            timestamp: currentTime,
            duration: annotationDuration,
            label: ''
          });
          setAnnotationLabel('');
          setShowAnnotationModal(true);
        }
      }
      setIsDrawing(false);
      setLineStart(null);
      setLinePreview(null);
    }
  };

  // Save annotation with optional label
  const saveAnnotation = (withLabel = true) => {
    if (pendingLine) {
      const newAnnotation = {
        ...pendingLine,
        label: withLabel ? annotationLabel : (pendingLine.label || '')
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      setPendingLine(null);
      setShowAnnotationModal(false);
      setAnnotationLabel('');
    }
  };

  const cancelAnnotation = () => {
    setPendingLine(null);
    setShowAnnotationModal(false);
    setAnnotationLabel('');
  };

  const deleteAnnotation = (id) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
    if (selectedAnnotation === id) {
      setSelectedAnnotation(null);
    }
  };

  // Get visible annotations based on current time
  const getVisibleAnnotations = () => {
    if (showAllAnnotations) return annotations;
    
    return annotations.filter(ann => {
      const timeDiff = currentTime - ann.timestamp;
      return timeDiff >= 0 && timeDiff <= (ann.duration || 3);
    });
  };

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 1. DRAW SAVED ANNOTATIONS
      const visible = getVisibleAnnotations();
      visible.forEach(ann => {
        let opacity = 1;
        if (!showAllAnnotations) {
           const timeDiff = currentTime - ann.timestamp;
           const fadeStart = (ann.duration || 3) - 0.5;
           if (timeDiff > fadeStart) opacity = Math.max(0, 1 - (timeDiff - fadeStart) / 0.5);
        }
        
        ctx.save();
        ctx.globalAlpha = opacity;
        
        if (ann.type === 'angle' && ann.points && ann.points.length === 3) {
            // Draw Angle
            const p1 = { x: ann.points[0].x * canvas.width, y: ann.points[0].y * canvas.height };
            const p2 = { x: ann.points[1].x * canvas.width, y: ann.points[1].y * canvas.height }; // Vertex
            const p3 = { x: ann.points[2].x * canvas.width, y: ann.points[2].y * canvas.height };

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = ann.thickness;
            ctx.stroke();

            // Draw Label (Degrees)
            ctx.font = 'bold 16px sans-serif';
            ctx.fillStyle = ann.color;
            ctx.fillText(ann.label, p2.x + 15, p2.y - 15);
        } else {
            // Draw Line
            const startX = (ann.startX || 0) * canvas.width;
            const startY = (ann.startY || 0) * canvas.height;
            const endX = (ann.endX || 0) * canvas.width;
            const endY = (ann.endY || 0) * canvas.height;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = ann.color;
            ctx.lineWidth = ann.thickness;
            ctx.stroke();
        }
        ctx.restore();
      });

      // 2. DRAW ACTIVE TOOL PREVIEWS
      
      // Line Preview
      if (drawingTool === 'line' && isDrawing && lineStart && linePreview) {
        ctx.beginPath();
        ctx.moveTo(lineStart.x, lineStart.y);
        ctx.lineTo(linePreview.x, linePreview.y);
        ctx.strokeStyle = drawingColor;
        ctx.lineWidth = lineThickness;
        ctx.stroke();
      }

      // Angle Preview
      if (drawingTool === 'angle' && anglePath.length > 0) {
         ctx.beginPath();
         // Draw established lines
         ctx.moveTo(anglePath[0].x, anglePath[0].y);
         for(let i=1; i<anglePath.length; i++) {
             ctx.lineTo(anglePath[i].x, anglePath[i].y);
         }
         // Draw rubber band line to mouse
         if (mousePos) {
             ctx.lineTo(mousePos.x, mousePos.y);
         }
         ctx.strokeStyle = drawingColor;
         ctx.lineWidth = lineThickness;
         ctx.stroke();

         // Draw points
         [...anglePath, mousePos].filter(Boolean).forEach(p => {
             ctx.beginPath();
             ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
             ctx.fillStyle = drawingColor;
             ctx.fill();
         });
      }

      requestAnimationFrame(render);
    };
    
    const animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [annotations, currentTime, drawingTool, isDrawing, lineStart, linePreview, anglePath, mousePos, drawingColor, lineThickness, showAllAnnotations]);

  // Resize canvas to match video
  useEffect(() => {
    const resizeCanvas = () => {
      if (canvasRef.current && videoRef.current) {
        canvasRef.current.width = videoRef.current.clientWidth;
        canvasRef.current.height = videoRef.current.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    if (videoRef.current) {
      videoRef.current.addEventListener('loadeddata', resizeCanvas);
    }
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [videoUrl]);

  // Handle AI feedback status
  const updateFeedbackStatus = (id, status) => {
    setAiAnalysis(prev => ({
      ...prev,
      improvements: prev.improvements.map(imp => 
        imp.id === id ? { ...imp, status } : imp
      )
    }));
  };

  // Add coach feedback
  const addCoachFeedback = () => {
    if (!newFeedbackText.trim()) return;
    
    const newFeedback = {
      id: `coach-${Date.now()}`,
      text: newFeedbackText,
      timestamp: currentTime,
      createdAt: new Date().toISOString(),
      isCoach: true
    };
    
    setCoachFeedback(prev => [...prev, newFeedback]);
    setNewFeedbackText('');
  };

  const removeCoachFeedback = (id) => {
    setCoachFeedback(prev => prev.filter(f => f.id !== id));
  };

  // Save analysis
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const analysisData = {
        swimmer_id: selectedSwimmerId,
        video_url: videoUrl,
        json_data: {
          ...aiAnalysis,
          title: videoTitle,
          videoType: videoType,
          stroke: stroke,
          coachNotes,
          coachFeedback,
          annotations, 
          savedAt: new Date().toISOString()
        }
      };

      const { error } = await supabase
        .from('analyses')
        .insert([analysisData]);

      if (error) throw error;

      alert('Analysis saved successfully!');
    } catch (error) {
      console.error(error);
      alert('Error saving: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const swimmer = swimmers.find(s => s.id === selectedSwimmerId);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full text-slate-400">
            <ChevronLeft size={24} />
          </button>
          <div>
            {isEditingTitle ? (
              <input
                type="text"
                value={videoTitle}
                onChange={e => setVideoTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={e => e.key === 'Enter' && setIsEditingTitle(false)}
                autoFocus
                className="bg-slate-700 text-white font-bold text-lg px-2 py-1 rounded border border-slate-600 focus:border-blue-500 outline-none"
              />
            ) : (
              <h2 
                onClick={() => setIsEditingTitle(true)}
                className="text-lg font-bold cursor-pointer hover:text-blue-400 flex items-center gap-2"
              >
                {videoTitle || 'Untitled Analysis'}
                <Edit3 size={14} className="text-slate-500" />
              </h2>
            )}
            <p className="text-xs text-slate-400">
              {swimmer?.name} • {stroke} • {VIDEO_TYPES.find(v => v.id === videoType)?.label}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Drawing Tools */}
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-600 bg-slate-700">
            {/* Line Tool Button */}
            <button
              onClick={() => { 
                setDrawingTool(drawingTool === 'line' ? 'none' : 'line'); 
                setAnglePath([]); 
              }}
              className={`p-1.5 rounded ${drawingTool === 'line' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Draw Line"
            >
              <PenTool size={18} />
            </button>

            {/* Angle Tool Button */}
            <button
              onClick={() => { 
                setDrawingTool(drawingTool === 'angle' ? 'none' : 'angle'); 
                setAnglePath([]); 
              }}
              className={`p-1.5 rounded ${drawingTool === 'angle' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Measure Angle"
            >
              <Triangle size={18} />
            </button>
            
            {/* Options (Colors & Thickness) - Only show if a tool is active */}
            {drawingTool !== 'none' && (
              <>
                <div className="w-px h-5 bg-slate-600 mx-1" />
                
                {/* Colors */}
                {['#ef4444', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ffffff'].map(c => (
                  <button
                    key={c}
                    onClick={() => setDrawingColor(c)}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${drawingColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                    style={{ background: c }}
                  />
                ))}
                
                <div className="w-px h-5 bg-slate-600 mx-1" />
                
                {/* Line thickness */}
                <select
                  value={lineThickness}
                  onChange={e => setLineThickness(Number(e.target.value))}
                  className="bg-slate-600 text-white text-xs rounded px-1.5 py-1 border-0 focus:ring-0 cursor-pointer"
                >
                  <option value={2}>Thin</option>
                  <option value={3}>Medium</option>
                  <option value={5}>Thick</option>
                </select>
              </>
            )}
          </div>

          {/* Show all annotations toggle */}
          {annotations.length > 0 && (
            <button
              onClick={() => setShowAllAnnotations(!showAllAnnotations)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                showAllAnnotations 
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500' 
                  : 'bg-slate-700 text-slate-400 border border-slate-600 hover:text-white'
              }`}
              title={showAllAnnotations ? 'Show annotations at their timestamps' : 'Show all annotations'}
            >
              {showAllAnnotations ? <Eye size={14} /> : <EyeOff size={14} />}
              {showAllAnnotations ? 'All Visible' : 'Timed'}
            </button>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Panel */}
        <div className="flex-1 flex flex-col p-4">
          {/* Video Container */}
          <div className="relative bg-black rounded-xl overflow-hidden flex-1 mb-4">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onClick={() => drawingTool === 'none' && togglePlay()}
            />
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full ${drawingTool !== 'none' ? 'cursor-crosshair' : 'pointer-events-none'}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { setIsDrawing(false); setLinePreview(null); }}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            />
            
            {/* Drawing Mode Indicator */}
            {drawingTool !== 'none' && (
              <div className="absolute top-4 left-4 bg-blue-500/90 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-2 text-sm font-medium">
                {drawingTool === 'line' ? <PenTool size={14} /> : <Triangle size={14} />}
                {drawingTool === 'line' ? 'Click and drag to draw a line' : 'Click three points to measure angle'}
              </div>
            )}
            
            {/* Play/Pause Overlay */}
            {!isPlaying && drawingTool === 'none' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                  <Play size={32} className="text-white ml-1" />
                </div>
              </div>
            )}

            {/* Score Badge */}
            {aiAnalysis?.overallScore && (
              <div className="absolute top-4 right-4 bg-black/70 backdrop-blur px-4 py-2 rounded-lg">
                <div className="text-xs text-slate-400 uppercase">AI Score</div>
                <div className={`text-2xl font-bold ${
                  aiAnalysis.overallScore >= 80 ? 'text-emerald-400' :
                  aiAnalysis.overallScore >= 60 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {aiAnalysis.overallScore}
                </div>
              </div>
            )}
            
            {/* Annotations count badge */}
            {annotations.length > 0 && (
              <div className="absolute bottom-20 right-4 bg-purple-500/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold">
                {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Video Controls */}
          <div className="bg-slate-800 rounded-xl p-4">
            {/* Progress Bar with Annotation Markers */}
            <div 
              className="h-3 bg-slate-700 rounded-full mb-4 cursor-pointer relative group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                seekTo(percent * duration);
              }}
            >
              {/* Progress fill */}
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full relative"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              {/* Annotation Markers */}
              {annotations.map(ann => (
                <div
                  key={ann.id}
                  className={`absolute top-1/2 -translate-y-1/2 w-2 h-4 rounded-sm cursor-pointer hover:scale-150 transition-transform ${
                    selectedAnnotation === ann.id ? 'bg-white' : 'bg-purple-400'
                  }`}
                  style={{ 
                    left: `${(ann.timestamp / duration) * 100}%`,
                    backgroundColor: ann.color 
                  }}
                  title={ann.label || `Annotation at ${formatTimeShort(ann.timestamp)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    seekTo(ann.timestamp);
                    setSelectedAnnotation(ann.id);
                    setActivePanel('annotations');
                  }}
                />
              ))}
              
              {/* Key Moments Markers */}
              {aiAnalysis?.keyMoments?.map((moment, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-yellow-400 rounded-full cursor-pointer hover:scale-150 transition-transform"
                  style={{ left: `${(moment.timestamp / duration) * 100}%` }}
                  title={moment.description}
                  onClick={(e) => {
                    e.stopPropagation();
                    seekTo(moment.timestamp);
                  }}
                />
              ))}
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => skip(-5)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                  <SkipBack size={20} />
                </button>
                <button onClick={togglePlay} className="p-3 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                  {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                </button>
                <button onClick={() => skip(5)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                  <SkipForward size={20} />
                </button>
                
                <div className="text-sm font-mono text-slate-400 ml-2">
                  {formatTimeShort(currentTime)} / {formatTimeShort(duration)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 hover:bg-slate-700 rounded-lg text-slate-400"
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Analysis */}
        <div className="w-[420px] bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden">
          {/* Panel Tabs */}
          <div className="flex border-b border-slate-700 shrink-0">
            {[
              { id: 'ai', label: 'AI Analysis', icon: Sparkles },
              { id: 'coach', label: 'Notes', icon: MessageSquare },
              { id: 'annotations', label: `Lines${annotations.length > 0 ? ` (${annotations.length})` : ''}`, icon: PenTool },
              { id: 'drills', label: 'Drills', icon: Target }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActivePanel(tab.id)}
                  className={`flex-1 px-3 py-3 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    activePanel === tab.id 
                      ? 'text-white bg-slate-700/50 border-b-2 border-blue-500' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* AI Analysis Panel */}
            {activePanel === 'ai' && (
              <div className="space-y-6">
                {/* Summary */}
                {aiAnalysis?.summary && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-blue-400 uppercase mb-2 flex items-center gap-2">
                      <Sparkles size={14} /> AI Summary
                    </h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{aiAnalysis.summary}</p>
                  </div>
                )}

                {/* Metrics */}
                {aiAnalysis?.metrics && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Metrics</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(aiAnalysis.metrics).map(([key, value]) => (
                        value && (
                          <div key={key} className="bg-slate-700/50 rounded-lg p-3">
                            <div className="text-xs text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                            <div className="text-lg font-bold text-white">{value}</div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                {/* Strengths */}
                {aiAnalysis?.strengths?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-400" /> Strengths
                    </h4>
                    <div className="space-y-2">
                      {aiAnalysis.strengths.map((s, i) => (
                        <div key={i} className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                          <div className="font-medium text-emerald-400 text-sm">{s.title}</div>
                          <p className="text-xs text-slate-400 mt-1">{s.description}</p>
                          {s.timestamp && (
                            <button 
                              onClick={() => seekTo(s.timestamp)}
                              className="text-xs text-emerald-400 mt-2 hover:underline"
                            >
                              Jump to {formatTimeShort(s.timestamp)}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Improvements */}
                {aiAnalysis?.improvements?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                      <AlertCircle size={14} className="text-yellow-400" /> Areas for Improvement
                    </h4>
                    <div className="space-y-2">
                      {aiAnalysis.improvements.map((imp) => (
                        <div 
                          key={imp.id} 
                          className={`rounded-lg p-3 border transition-all ${
                            imp.status === 'accepted' 
                              ? 'bg-emerald-500/10 border-emerald-500/30' 
                              : imp.status === 'declined'
                                ? 'bg-slate-700/30 border-slate-600 opacity-50'
                                : 'bg-slate-700/50 border-slate-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                  imp.severity === 'High' ? 'bg-red-500/20 text-red-400' :
                                  imp.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-slate-500/20 text-slate-400'
                                }`}>
                                  {imp.severity}
                                </span>
                                <span className="font-medium text-white text-sm">{imp.title}</span>
                              </div>
                              <p className="text-xs text-slate-400 mt-1">{imp.description}</p>
                              {imp.suggestion && (
                                <p className="text-xs text-blue-400 mt-2">
                                  <span className="font-bold">Fix:</span> {imp.suggestion}
                                </p>
                              )}
                              {imp.timestamp && (
                                <button 
                                  onClick={() => seekTo(imp.timestamp)}
                                  className="text-xs text-slate-500 mt-2 hover:text-white"
                                >
                                  @ {formatTimeShort(imp.timestamp)}
                                </button>
                              )}
                            </div>
                            
                            {/* Accept/Decline Buttons */}
                            {imp.status === 'pending' && (
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => updateFeedbackStatus(imp.id, 'accepted')}
                                  className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30"
                                  title="Accept"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={() => updateFeedbackStatus(imp.id, 'declined')}
                                  className="p-1.5 bg-slate-600 text-slate-400 rounded hover:bg-slate-500"
                                  title="Decline"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            )}
                            
                            {imp.status !== 'pending' && (
                              <button
                                onClick={() => updateFeedbackStatus(imp.id, 'pending')}
                                className="text-xs text-slate-500 hover:text-white"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Coach Notes Panel */}
            {activePanel === 'coach' && (
              <div className="space-y-6">
                {/* General Notes */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">General Notes</h4>
                  <textarea
                    value={coachNotes}
                    onChange={e => setCoachNotes(e.target.value)}
                    placeholder="Add your overall observations, goals, or notes for this swimmer..."
                    className="w-full h-32 bg-slate-700 border border-slate-600 rounded-xl p-3 text-sm text-white placeholder-slate-500 resize-none focus:border-blue-500 focus:ring-0"
                  />
                </div>

                {/* Timestamped Feedback */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Timestamped Feedback</h4>
                  
                  {/* Add New Feedback */}
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newFeedbackText}
                      onChange={e => setNewFeedbackText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCoachFeedback()}
                      placeholder={`Add note at ${formatTimeShort(currentTime)}...`}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500"
                    />
                    <button
                      onClick={addCoachFeedback}
                      disabled={!newFeedbackText.trim()}
                      className="px-3 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600"
                    >
                      <Plus size={18} />
                    </button>
                  </div>

                  {/* Feedback List */}
                  <div className="space-y-2">
                    {coachFeedback.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">
                        No feedback added yet. Pause the video and add timestamped notes.
                      </p>
                    ) : (
                      coachFeedback
                        .sort((a, b) => a.timestamp - b.timestamp)
                        .map(feedback => (
                          <div 
                            key={feedback.id}
                            className="bg-slate-700/50 rounded-lg p-3 border border-slate-600 group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <button
                                  onClick={() => seekTo(feedback.timestamp)}
                                  className="text-xs font-mono text-blue-400 hover:underline mb-1"
                                >
                                  {formatTimeShort(feedback.timestamp)}
                                </button>
                                <p className="text-sm text-white">{feedback.text}</p>
                              </div>
                              <button
                                onClick={() => removeCoachFeedback(feedback.id)}
                                className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Annotations Panel */}
            {activePanel === 'annotations' && (
              <div className="space-y-4">
                {/* Instructions */}
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-purple-400 uppercase mb-2 flex items-center gap-2">
                    <PenTool size={14} /> Drawing Lines
                  </h4>
                  <p className="text-sm text-slate-400">
                    Enable drawing mode above, then click and drag on the video to draw straight lines. 
                    Each line is saved at the current timestamp and will appear when the video plays that moment.
                  </p>
                </div>

                {/* Annotation Duration Setting */}
                <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                  <span className="text-sm text-slate-300">Line display duration</span>
                  <select
                    value={annotationDuration}
                    onChange={e => setAnnotationDuration(Number(e.target.value))}
                    className="bg-slate-600 text-white text-sm rounded px-2 py-1 border-0"
                  >
                    <option value={1}>1 second</option>
                    <option value={2}>2 seconds</option>
                    <option value={3}>3 seconds</option>
                    <option value={5}>5 seconds</option>
                    <option value={10}>10 seconds</option>
                  </select>
                </div>

                {/* Annotations List */}
                {annotations.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <PenTool size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No annotations yet</p>
                    <p className="text-xs mt-1">Enable drawing mode to add lines</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {annotations
                      .sort((a, b) => a.timestamp - b.timestamp)
                      .map(ann => (
                        <div 
                          key={ann.id}
                          onClick={() => {
                            seekTo(ann.timestamp);
                            setSelectedAnnotation(ann.id);
                          }}
                          className={`bg-slate-700/50 rounded-lg p-3 border cursor-pointer transition-all group ${
                            selectedAnnotation === ann.id 
                              ? 'border-purple-500 bg-purple-500/10' 
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded-full border-2 border-white/50"
                                style={{ backgroundColor: ann.color }}
                              />
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {ann.label || 'Untitled Line'}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    seekTo(ann.timestamp);
                                  }}
                                  className="text-xs text-slate-400 hover:text-blue-400"
                                >
                                  @ {formatTime(ann.timestamp)}
                                </button>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAnnotation(ann.id);
                              }}
                              className="p-1.5 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Drills Panel */}
            {activePanel === 'drills' && (
              <div className="space-y-4">
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-4">
                  <h4 className="text-xs font-bold text-purple-400 uppercase mb-2">Recommended Drills</h4>
                  <p className="text-sm text-slate-400">Based on AI analysis, these drills address the identified areas for improvement.</p>
                </div>

                {aiAnalysis?.drills?.length > 0 ? (
                  aiAnalysis.drills.map((drill, i) => (
                    <div key={i} className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 font-bold text-sm shrink-0">
                          {i + 1}
                        </div>
                        <div>
                          <h5 className="font-bold text-white">{drill.name}</h5>
                          <p className="text-xs text-purple-400 mt-0.5">{drill.purpose}</p>
                          <p className="text-sm text-slate-400 mt-2">{drill.description}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">No drills recommended</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Annotation Label Modal */}
      {showAnnotationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <PenTool size={20} className="text-purple-400" />
              Add Line Label
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400 mb-3">
                Annotation at <span className="text-blue-400 font-mono">{formatTime(pendingLine?.timestamp || 0)}</span>
              </p>
              <input
                type="text"
                value={annotationLabel}
                onChange={e => setAnnotationLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveAnnotation(true)}
                placeholder="e.g., 'Elbow drop', 'Head position'..."
                autoFocus
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 focus:ring-0"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={cancelAnnotation}
                className="flex-1 px-4 py-2.5 bg-slate-700 text-slate-300 font-medium rounded-xl hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => saveAnnotation(false)}
                className="flex-1 px-4 py-2.5 bg-slate-600 text-white font-medium rounded-xl hover:bg-slate-500"
              >
                Skip Label
              </button>
              <button
                onClick={() => saveAnnotation(true)}
                className="flex-1 px-4 py-2.5 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Plus icon component (if not imported)
const Plus = ({ size = 24, className = '' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
