// src/AnalysisResult.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, ChevronLeft, Pause, PenTool, Scan, RotateCcw, CheckCircle2,
  AlertCircle, Sparkles, Target, MessageSquare, Clock, User, Share2,
  Download, Trash2, Edit3, X, Check, Eye, EyeOff, SkipBack, SkipForward
} from 'lucide-react';

export default function AnalysisResult({ data, videoUrl, onBack, title, swimmerName, stroke, videoType }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Annotation display state
  const [showAllAnnotations, setShowAllAnnotations] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  
  // Load saved annotations from data
  const [annotations, setAnnotations] = useState([]);
  
  // Panel state
  const [activePanel, setActivePanel] = useState('overview');

  // Load annotations when data changes
  useEffect(() => {
    if (data?.annotations && Array.isArray(data.annotations)) {
      setAnnotations(data.annotations);
    }
  }, [data]);

  // Video event handlers
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
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeDetailed = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Get visible annotations based on current time
  const getVisibleAnnotations = () => {
    if (showAllAnnotations) return annotations;
    
    return annotations.filter(ann => {
      const timeDiff = currentTime - ann.timestamp;
      const annDuration = ann.duration || 3; // Default 3 seconds if not specified
      return timeDiff >= 0 && timeDiff <= annDuration;
    });
  };

// Canvas rendering for annotations
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw visible annotations
      const visible = getVisibleAnnotations();
      visible.forEach(ann => {
        
        // Calculate opacity based on time (fade out effect)
        let opacity = 1;
        if (!showAllAnnotations) {
          const timeDiff = currentTime - ann.timestamp;
          const annDuration = ann.duration || 3;
          const fadeStart = annDuration - 0.5; // Start fading 0.5s before end
          if (timeDiff > fadeStart) {
            opacity = Math.max(0, 1 - (timeDiff - fadeStart) / 0.5);
          }
        }
        
        // Highlight selected annotation
        const isSelected = selectedAnnotation === ann.id;
        
        ctx.save();
        ctx.globalAlpha = opacity;
        
        // --- ANGLE RENDERING ---
        if (ann.type === 'angle' && ann.points && ann.points.length === 3) {
          const p1 = { x: ann.points[0].x * canvas.width, y: ann.points[0].y * canvas.height };
          const p2 = { x: ann.points[1].x * canvas.width, y: ann.points[1].y * canvas.height }; // Vertex
          const p3 = { x: ann.points[2].x * canvas.width, y: ann.points[2].y * canvas.height };

          // 1. Draw Lines Shadow
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.strokeStyle = 'rgba(0,0,0,0.5)';
          ctx.lineWidth = (ann.thickness || 3) + 4;
          ctx.lineCap = 'round';
          ctx.stroke();

          // 2. Draw Main Lines
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.strokeStyle = isSelected ? '#ffffff' : (ann.color || '#ef4444');
          ctx.lineWidth = (ann.thickness || 3) + (isSelected ? 2 : 0);
          ctx.lineCap = 'round';
          ctx.stroke();

          // 3. Draw Vertex Dot
          ctx.beginPath();
          ctx.arc(p2.x, p2.y, (ann.thickness || 3) + 2, 0, Math.PI * 2);
          ctx.fillStyle = ann.color || '#ef4444';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // 4. Draw Angle Label (Degrees)
          if (ann.label) {
            ctx.font = 'bold 16px system-ui';
            const textMetrics = ctx.measureText(ann.label);
            const padding = 8;
            const bgWidth = textMetrics.width + padding * 2;
            const bgHeight = 24;
            
            // Position label slightly offset from vertex
            const labelX = p2.x + 20; 
            const labelY = p2.y - 20;

            // Draw Label Background
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.beginPath();
            ctx.roundRect(labelX, labelY - bgHeight/2, bgWidth, bgHeight, 4);
            ctx.fill();
            
            // Draw Label Text
            ctx.fillStyle = ann.color || '#ef4444';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ann.label, labelX + bgWidth/2, labelY);
          }

        } else {
          // --- LINE RENDERING (Default) ---
          // Ensure we have coordinates (fallback to 0 if missing)
          const startX = (ann.startX || 0) * canvas.width;
          const startY = (ann.startY || 0) * canvas.height;
          const endX = (ann.endX || 0) * canvas.width;
          const endY = (ann.endY || 0) * canvas.height;
          
          // Draw line shadow
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = 'rgba(0,0,0,0.5)';
          ctx.lineWidth = (ann.thickness || 3) + 4;
          ctx.lineCap = 'round';
          ctx.stroke();
          
          // Draw main line
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.strokeStyle = isSelected ? '#ffffff' : (ann.color || '#ef4444');
          ctx.lineWidth = (ann.thickness || 3) + (isSelected ? 2 : 0);
          ctx.lineCap = 'round';
          ctx.stroke();
          
          // Draw endpoints
          [{ x: startX, y: startY }, { x: endX, y: endY }].forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, (ann.thickness || 3) + 2, 0, Math.PI * 2);
            ctx.fillStyle = ann.color || '#ef4444';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
          });
          
          // Draw label if exists
          if (ann.label) {
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            
            ctx.font = 'bold 14px system-ui';
            const textMetrics = ctx.measureText(ann.label);
            const padding = 6;
            const bgWidth = textMetrics.width + padding * 2;
            const bgHeight = 20;
            
            // Label background
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.beginPath();
            ctx.roundRect(midX - bgWidth/2, midY - bgHeight/2 - 15, bgWidth, bgHeight, 4);
            ctx.fill();
            
            // Label text
            ctx.fillStyle = ann.color || '#ef4444';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ann.label, midX, midY - 15);
          }
        }
        
        ctx.restore();
      });
      
      requestAnimationFrame(render);
    };
    
    const animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [annotations, currentTime, showAllAnnotations, selectedAnnotation]);

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
    
    // Also resize when video loads
    if (videoRef.current) {
      videoRef.current.addEventListener('loadeddata', resizeCanvas);
    }
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [videoUrl]);

  // Get display title - prefer passed prop, then data.title, then fallback
  const displayTitle = title || data?.title || 'Video Analysis';
  const displayStroke = stroke || data?.stroke;
  const displayVideoType = videoType || data?.videoType;

  // Filter improvements by status
  const acceptedImprovements = data?.improvements?.filter(i => i.status === 'accepted') || [];
  const pendingImprovements = data?.improvements?.filter(i => i.status === 'pending' || !i.status) || [];

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-lg font-bold">{displayTitle}</h2>
            <p className="text-xs text-slate-400">
              {swimmerName && `${swimmerName} • `}
              {displayStroke && `${displayStroke} • `}
              {displayVideoType && displayVideoType.replace('-', ' ')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
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
              {showAllAnnotations ? 'All Lines' : 'Timed'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Video Section */}
        <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl aspect-video border border-slate-700">
            <video 
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onClick={togglePlay}
            />
            <canvas 
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />
            
            {/* Play/Pause Overlay */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                  <Play size={32} className="text-white ml-1" />
                </div>
              </div>
            )}

            {/* Score Badge */}
            {data?.overallScore && (
              <div className="absolute top-4 right-4 bg-black/70 backdrop-blur px-4 py-2 rounded-lg">
                <div className="text-xs text-slate-400 uppercase">Score</div>
                <div className={`text-2xl font-bold ${
                  data.overallScore >= 80 ? 'text-emerald-400' :
                  data.overallScore >= 60 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {data.overallScore}
                </div>
              </div>
            )}

            {/* Annotations count badge */}
            {annotations.length > 0 && (
              <div className="absolute bottom-16 right-4 bg-purple-500/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold">
                {annotations.length} line{annotations.length !== 1 ? 's' : ''}
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
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              
              {/* Annotation Markers */}
              {annotations.map(ann => (
                <div
                  key={ann.id}
                  className={`absolute top-1/2 -translate-y-1/2 w-2 h-4 rounded-sm cursor-pointer hover:scale-150 transition-transform`}
                  style={{ 
                    left: `${(ann.timestamp / duration) * 100}%`,
                    backgroundColor: ann.color || '#a855f7'
                  }}
                  title={ann.label || `Line at ${formatTime(ann.timestamp)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    seekTo(ann.timestamp);
                    setSelectedAnnotation(ann.id);
                    setActivePanel('annotations');
                  }}
                />
              ))}
              
              {/* Key Moments Markers */}
              {data?.keyMoments?.map((moment, i) => (
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
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          {data?.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { l: 'Stroke Rate', v: data?.metrics?.strokeRate || data?.strokeRate },
                { l: 'Dist. Per Stroke', v: data?.metrics?.distancePerStroke || data?.dps },
                { l: 'Body Position', v: data?.metrics?.bodyPosition ? `${data.metrics.bodyPosition}/10` : null },
                { l: 'Timing', v: data?.metrics?.timing ? `${data.metrics.timing}/10` : null },
                { l: 'Efficiency', v: data?.metrics?.efficiency ? `${data.metrics.efficiency}/10` : null }
              ].filter(m => m.v).map((m, i) => (
                <div key={i} className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                  <div className="text-slate-400 text-xs font-bold uppercase mb-1">{m.l}</div>
                  <div className="text-lg font-bold">{m.v || 'N/A'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="w-96 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden">
          {/* Panel Tabs */}
          <div className="flex border-b border-slate-700 shrink-0">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'feedback', label: 'Feedback' },
              { id: 'annotations', label: `Lines${annotations.length > 0 ? ` (${annotations.length})` : ''}` },
              { id: 'coach', label: 'Notes' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={`flex-1 px-3 py-3 text-xs font-medium transition-colors ${
                  activePanel === tab.id 
                    ? 'text-white bg-slate-700/50 border-b-2 border-blue-500' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Overview Panel */}
            {activePanel === 'overview' && (
              <div className="space-y-6">
                {/* AI Summary */}
                {(data?.insight || data?.summary) && (
                  <div className="bg-blue-900/30 border border-blue-500/30 p-4 rounded-xl">
                    <h4 className="text-blue-300 text-sm font-bold mb-2 flex items-center gap-2">
                      <Scan size={16}/> AI Insight
                    </h4>
                    <p className="text-sm text-blue-100 leading-relaxed">{data?.summary || data?.insight}</p>
                  </div>
                )}

                {/* Strengths */}
                {data?.strengths?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-400" /> Strengths
                    </h4>
                    <div className="space-y-2">
                      {data.strengths.map((s, i) => (
                        <div key={i} className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                          <div className="font-medium text-emerald-400 text-sm">{s.title}</div>
                          <p className="text-xs text-slate-400 mt-1">{s.description}</p>
                          {s.timestamp && (
                            <button 
                              onClick={() => seekTo(s.timestamp)}
                              className="text-xs text-emerald-400 mt-2 hover:underline"
                            >
                              @ {formatTime(s.timestamp)}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Drills */}
                {data?.drills?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                      <Target size={14} className="text-purple-400" /> Recommended Drills
                    </h4>
                    <div className="space-y-2">
                      {data.drills.map((drill, i) => (
                        <div key={i} className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                          <div className="font-medium text-purple-400 text-sm">{drill.name}</div>
                          <p className="text-xs text-slate-500 mt-0.5">{drill.focus || drill.purpose}</p>
                          {drill.description && (
                            <p className="text-xs text-slate-400 mt-2">{drill.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Panel */}
            {activePanel === 'feedback' && (
              <div className="space-y-6">
                {/* Accepted Improvements */}
                {acceptedImprovements.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-emerald-400 uppercase mb-3 flex items-center gap-2">
                      <Check size={14} /> Accepted Feedback ({acceptedImprovements.length})
                    </h4>
                    <div className="space-y-2">
                      {acceptedImprovements.map((flaw, i) => (
                        <div key={i} 
                          onClick={() => { if(flaw.timestamp) seekTo(flaw.timestamp); }}
                          className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl cursor-pointer transition-colors hover:bg-emerald-500/20"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-sm text-emerald-400">{flaw.title}</span>
                            {flaw.timestamp && <span className="text-xs font-mono bg-slate-800 px-1.5 rounded text-slate-400">{formatTime(flaw.timestamp)}</span>}
                          </div>
                          <p className="text-xs text-slate-400">{flaw.desc || flaw.description}</p>
                          {flaw.suggestion && (
                            <p className="text-xs text-blue-400 mt-2">
                              <span className="font-bold">Fix:</span> {flaw.suggestion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* All/Pending Flaws */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                    <AlertCircle size={14} className="text-yellow-400" /> 
                    {acceptedImprovements.length > 0 ? 'Other Detected Issues' : 'Detected Issues'}
                  </h4>
                  <div className="space-y-2">
                    {(data?.flaws || pendingImprovements)?.map((flaw, i) => (
                      <div key={i} 
                        onClick={() => { if(flaw.timestamp) seekTo(flaw.timestamp); }}
                        className="p-3 bg-slate-700/50 border border-slate-600 rounded-xl hover:border-blue-500 cursor-pointer transition-colors"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-sm text-white">{flaw.title}</span>
                          {flaw.timestamp && <span className="text-xs font-mono bg-slate-800 px-1.5 rounded text-slate-400">{formatTime(flaw.timestamp)}</span>}
                        </div>
                        <p className="text-xs text-slate-400">{flaw.desc || flaw.description}</p>
                        {flaw.severity && (
                          <span className={`inline-block mt-2 text-xs font-bold px-1.5 py-0.5 rounded ${
                            flaw.severity === 'High' ? 'bg-red-500/20 text-red-400' :
                            flaw.severity === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-slate-500/20 text-slate-400'
                          }`}>
                            {flaw.severity}
                          </span>
                        )}
                      </div>
                    ))}
                    {(!data?.flaws || data.flaws.length === 0) && pendingImprovements.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">No issues detected</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Annotations Panel */}
            {activePanel === 'annotations' && (
              <div className="space-y-4">
                {annotations.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <PenTool size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No line annotations</p>
                    <p className="text-xs mt-1">This analysis has no drawn lines</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                      <h4 className="text-xs font-bold text-purple-400 uppercase mb-2 flex items-center gap-2">
                        <PenTool size={14} /> Coach Annotations
                      </h4>
                      <p className="text-sm text-slate-400">
                        {annotations.length} line{annotations.length !== 1 ? 's' : ''} drawn on this video. 
                        Click any annotation to jump to that moment.
                      </p>
                    </div>
                    
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
                            className={`bg-slate-700/50 rounded-lg p-3 border cursor-pointer transition-all ${
                              selectedAnnotation === ann.id 
                                ? 'border-purple-500 bg-purple-500/10' 
                                : 'border-slate-600 hover:border-slate-500'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-4 h-4 rounded-full border-2 border-white/50"
                                  style={{ backgroundColor: ann.color || '#ef4444' }}
                                />
                                <div>
                                  <div className="text-sm font-medium text-white">
                                    {ann.label || 'Untitled Line'}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    @ {formatTimeDetailed(ann.timestamp)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Coach Notes Panel */}
            {activePanel === 'coach' && (
              <div className="space-y-6">
                {/* General Notes */}
                {data?.coachNotes && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">General Notes</h4>
                    <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{data.coachNotes}</p>
                    </div>
                  </div>
                )}

                {/* Timestamped Feedback */}
                {data?.coachFeedback?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                      <MessageSquare size={14} /> Coach Feedback ({data.coachFeedback.length})
                    </h4>
                    <div className="space-y-2">
                      {data.coachFeedback
                        .sort((a, b) => a.timestamp - b.timestamp)
                        .map((feedback, i) => (
                          <div 
                            key={i}
                            onClick={() => seekTo(feedback.timestamp)}
                            className="bg-slate-700/50 rounded-lg p-3 border border-slate-600 cursor-pointer hover:border-blue-500 transition-colors"
                          >
                            <div className="text-xs font-mono text-blue-400 mb-1">
                              {formatTime(feedback.timestamp)}
                            </div>
                            <p className="text-sm text-white">{feedback.text}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {!data?.coachNotes && (!data?.coachFeedback || data.coachFeedback.length === 0) && (
                  <div className="text-center py-8 text-slate-500">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No coach notes for this analysis</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
