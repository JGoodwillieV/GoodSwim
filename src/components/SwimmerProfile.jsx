// src/components/SwimmerProfile.jsx
// Individual swimmer profile view component
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Image as ImageIcon, Timer } from 'lucide-react';
import Icon from './Icon';
import { supabase } from '../supabase';
import Standards from '../Standards';
import TrophyCase from '../TrophyCase';
import VersatilityChart from '../VersatilityChart';
import MotivationalTimesChart from '../MotivationalTimesChart';
import PhotoGallery from '../PhotoGallery';
import { SwimmerPracticeTab } from '../TestSetDisplay';
import { 
  timeToSeconds, 
  secondsToTime 
} from '../utils/timeUtils';
import { 
  formatDateSafe, 
  parseDateSafe 
} from '../utils/dateUtils';
import { 
  getBaseEventName 
} from '../utils/eventUtils';

export default function SwimmerProfile({ 
  swimmer, 
  swimmers, 
  onBack, 
  navigateTo, 
  onViewAnalysis, 
  isParentView = false 
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [results, setResults] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [uploadingResultId, setUploadingResultId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const videoInputRef = useRef(null);

  // --- Fetch Real Data ---
  useEffect(() => {
    const fetchData = async () => {
      if (!swimmer?.id) return;

      // Fetch Results
      const { data: resultsData } = await supabase
        .from('results')
        .select('*')
        .eq('swimmer_id', swimmer.id)
        .order('date', { ascending: true });
      
      if (resultsData) setResults(resultsData);

      // Fetch Analyses
      const { data: analysesData } = await supabase
        .from('analyses')
        .select('*')
        .eq('swimmer_id', swimmer.id)
        .order('created_at', { ascending: false });

      if (analysesData) setAnalyses(analysesData);
    };

    fetchData();
  }, [swimmer]);

  // --- Chart Data & Best Time Calculation ---
  const uniqueEvents = useMemo(() => {
    const events = new Set(results.map(r => getBaseEventName(r.event)));
    return Array.from(events).sort();
  }, [results]);

  useEffect(() => {
    if (uniqueEvents.length > 0 && !selectedEvent) {
      setSelectedEvent(uniqueEvents[0]);
    }
  }, [uniqueEvents, selectedEvent]);

  const chartData = useMemo(() => {
    const eventResults = results.filter(r => getBaseEventName(r.event) === selectedEvent);
    const bestTimePerDay = {};
    
    eventResults.forEach(r => {
      const dateKey = r.date; 
      const seconds = timeToSeconds(r.time);
      
      if (seconds === null) return; // Skip DQs for graph

      if (!bestTimePerDay[dateKey] || seconds < bestTimePerDay[dateKey].seconds) {
        const dateObj = parseDateSafe(r.date);
        bestTimePerDay[dateKey] = {
          date: dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }),
          fullDate: r.date,
          seconds: seconds,
          timeStr: r.time,
          type: r.event.includes('Prelim') ? 'Prelim' : 'Finals' 
        };
      }
    });

    return Object.values(bestTimePerDay)
      .sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));
  }, [selectedEvent, results]);

  // Calculate Best Time Overall
  const bestTimeOverall = useMemo(() => {
    const validTimes = chartData.map(d => d.seconds).filter(s => s !== null);
    if (validTimes.length === 0) return null;
    return Math.min(...validTimes);
  }, [chartData]);

  // --- Table Data Grouping ---
  const groupedResults = useMemo(() => {
    const groups = {};

    results.forEach(r => {
      const baseName = getBaseEventName(r.event);
      const dateKey = r.date;
      const key = `${dateKey}_${baseName}`; 

      if (!groups[key]) {
        groups[key] = {
          key,
          date: r.date,
          event: baseName,
          prelim: null,
          finals: null
        };
      }
      if (r.event.includes('Prelim')) groups[key].prelim = r;
      else groups[key].finals = r;
    });

    return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [results]);

  const getImprovement = (group, allGroups) => {
    const pTime = group.prelim ? timeToSeconds(group.prelim.time) : null;
    const fTime = group.finals ? timeToSeconds(group.finals.time) : null;
    
    const validToday = [pTime, fTime].filter(t => t !== null && t > 0);
    if (validToday.length === 0) return null;
    const bestToday = Math.min(...validToday);

    const previousGroups = allGroups.filter(g => 
      g.event === group.event && new Date(g.date) < new Date(group.date)
    );
    
    if (previousGroups.length === 0) return null;

    const lastSwim = previousGroups.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const lastP = lastSwim.prelim ? timeToSeconds(lastSwim.prelim.time) : null;
    const lastF = lastSwim.finals ? timeToSeconds(lastSwim.finals.time) : null;
    
    const validLast = [lastP, lastF].filter(t => t !== null && t > 0);
    if (validLast.length === 0) return null;
    const bestLast = Math.min(...validLast);

    return bestToday - bestLast;
  };

  // --- Upload Logic ---
  const handleUploadClick = (resultId) => {
    setUploadingResultId(resultId);
    videoInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadingResultId) return;

    setIsUploading(true);
    try {
      const fileName = `${swimmer.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('race-videos')
        .upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('race-videos')
        .getPublicUrl(fileName);
        
      const { error: dbError } = await supabase
        .from('results')
        .update({ video_url: publicUrl })
        .eq('id', uploadingResultId);
      if (dbError) throw dbError;

      alert('Video uploaded!');
      setResults(prev => prev.map(r => 
        r.id === uploadingResultId ? { ...r, video_url: publicUrl } : r
      ));
    } catch (err) {
      console.error(err);
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
      setUploadingResultId(null);
      e.target.value = null;
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 overflow-y-auto h-full pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
            <Icon name="chevron-left" size={24}/>
          </button>
          <div>
            <h2 className="text-3xl font-bold text-slate-900">{swimmer.name}</h2>
            <p className="text-slate-500">
              {swimmer.group_name || 'Unassigned'} • {swimmer.age || 'N/A'} Years Old
            </p>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0">
          <button 
            onClick={() => setActiveTab('overview')} 
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${
              activeTab === 'overview' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('results')} 
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'results' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Icon name="trophy" size={14} /> Meet Results
          </button>
          <button 
            onClick={() => setActiveTab('practice')} 
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'practice' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Timer size={14} /> Practice
          </button>
          <button 
            onClick={() => setActiveTab('analysis')} 
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'analysis' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Icon name="video" size={14} /> Video Analysis
          </button>
          <button 
            onClick={() => setActiveTab('photos')} 
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'photos' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <ImageIcon size={14} /> Photos
          </button>
        </div>
      </div>

      {/* --- TAB 1: OVERVIEW --- */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Performance Trend Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Performance Trend</h3>
                <p className="text-slate-500 text-xs">Fastest time per meet</p>
              </div>
              <select 
                value={selectedEvent} 
                onChange={(e) => setSelectedEvent(e.target.value)} 
                className="bg-slate-50 border border-slate-200 py-2 px-3 rounded-lg text-sm font-medium max-w-[150px]"
              >
                {uniqueEvents.length === 0 && <option>No Data</option>}
                {uniqueEvents.map(ev => <option key={ev} value={ev}>{ev}</option>)}
              </select>
            </div>
            
            <div className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 12}} 
                      dy={10} 
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 12}} 
                      tickFormatter={secondsToTime} 
                      width={50}
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}
                      formatter={(value) => [secondsToTime(value), 'Time']}
                      labelStyle={{color: '#64748b', marginBottom: '0.25rem'}}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="seconds" 
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                      connectNulls={true} 
                      dot={{r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-lg">
                  Select an event to see progress.
                </div>
              )}
            </div>
            
            {bestTimeOverall && (
              <Standards 
                eventName={selectedEvent}
                bestTime={bestTimeOverall}
                gender={swimmer.gender || 'M'} 
                age={swimmer.age}
              />
            )}
          </div>

          {/* Motivational Times Progress Chart */}
          <MotivationalTimesChart 
            swimmerId={swimmer.id}
            age={swimmer.age}
            gender={swimmer.gender || 'M'}
          />

          {/* Grid with Trophy Case, Versatility Chart, Coach's Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <TrophyCase 
              swimmerId={swimmer.id}
              age={swimmer.age}
              gender={swimmer.gender || 'M'}
            />

            <VersatilityChart 
              swimmerId={swimmer.id} 
              age={swimmer.age} 
              gender={swimmer.gender || 'M'} 
            />

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">Coach's Notes</h3>
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 mb-4">
                <p className="text-xs font-bold text-yellow-700 mb-2">Focus for this week:</p>
                <textarea 
                  className="w-full bg-transparent border-0 focus:ring-0 p-0 text-sm text-yellow-800 leading-relaxed resize-none focus:outline-none" 
                  placeholder="Add a note..." 
                  rows={4} 
                />
              </div>
              <button className="w-full py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 transition-colors">
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: RESULTS --- */}
      {activeTab === 'results' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm min-h-[400px]">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-bold text-slate-800 text-lg">Meet Results</h3>
            <button className="text-blue-600 text-sm font-medium hover:underline">Import New CSV</button>
          </div>
          
          <input 
            type="file" 
            ref={videoInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="video/mp4,video/quicktime" 
          />

          {groupedResults.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[600px]">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Date</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Event</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Prelim</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Finals</th>
                    <th className="px-6 py-4 font-medium whitespace-nowrap">Improvement</th>
                    <th className="px-6 py-4 font-medium text-right whitespace-nowrap">Video</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groupedResults.map((group, idx) => {
                    const improvement = getImprovement(group, groupedResults);
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {formatDateSafe(group.date)}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                          {group.event}
                        </td>
                        <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                          {group.prelim ? (
                            <span className="font-mono">{group.prelim.time}</span>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-6 py-4 font-bold text-blue-600 whitespace-nowrap">
                          {group.finals ? (
                            <span className="font-mono">{group.finals.time}</span>
                          ) : <span className="text-slate-300 font-normal">-</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {improvement !== null ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              improvement < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                            }`}>
                              <Icon name={improvement < 0 ? 'trending-down' : 'trending-up'} size={12} />
                              {Math.abs(improvement).toFixed(2)}s
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-2">
                            {group.finals && (
                              group.finals.video_url ? (
                                <a 
                                  href={group.finals.video_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200" 
                                  title="Finals Video"
                                >
                                  <Icon name="play-circle" size={16} />
                                </a>
                              ) : (
                                <button 
                                  onClick={() => handleUploadClick(group.finals.id)} 
                                  className="p-2 border border-slate-200 text-slate-400 rounded-lg hover:text-blue-600 hover:border-blue-400" 
                                  title="Upload Finals"
                                >
                                  <Icon name="upload-cloud" size={16} />
                                </button>
                              )
                            )}
                            {group.prelim && (
                              group.prelim.video_url ? (
                                <a 
                                  href={group.prelim.video_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200" 
                                  title="Prelim Video"
                                >
                                  <Icon name="play-circle" size={16} />
                                </a>
                              ) : (
                                <button 
                                  onClick={() => handleUploadClick(group.prelim.id)} 
                                  className="p-2 border border-slate-200 text-slate-400 rounded-lg hover:text-slate-600 hover:border-slate-400" 
                                  title="Upload Prelim"
                                >
                                  <Icon name="upload-cloud" size={16} />
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Icon name="clipboard-list" size={32} className="opacity-50 mb-4" />
              <p>No results found for this swimmer.</p>
            </div>
          )}
        </div>
      )}

      {/* --- TAB 3: PRACTICE --- */}
      {activeTab === 'practice' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <SwimmerPracticeTab swimmerId={swimmer.id} swimmerName={swimmer.name} />
        </div>
      )}

      {/* --- TAB 4: ANALYSIS --- */}
      {activeTab === 'analysis' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm min-h-[400px]">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-lg">AI Video Analyses</h3>
          </div>
          {analyses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {analyses.map((analysis, idx) => (
                <div 
                  key={idx} 
                  onClick={() => onViewAnalysis(analysis)} 
                  className="group relative aspect-video bg-slate-900 rounded-xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all"
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon name="play" size={24} className="text-white fill-white ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white font-bold text-sm">Analysis #{analysis.id}</p>
                    <p className="text-slate-300 text-xs">
                      {new Date(analysis.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Icon name="video" size={32} className="opacity-50 mb-4" />
              <p>No AI analyses saved yet.</p>
              <button 
                onClick={() => navigateTo('analysis')} 
                className="mt-2 text-blue-600 hover:underline text-sm font-medium"
              >
                Go to Analysis Tool
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* --- TAB 5: PHOTOS --- */}
      {activeTab === 'photos' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm min-h-[400px] p-6">
          <PhotoGallery 
            swimmerId={swimmer.id} 
            roster={swimmers} 
          />
        </div>
      )}
    </div>
  );
}

