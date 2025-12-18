import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Timer, 
  Flag,
  Play,
  Clock
} from 'lucide-react';

// Run Practice Mode - Optimized for iPad/Poolside Use
// Large text, minimal interaction, easy navigation

export default function PracticeRunMode({ practiceId, onBack, onLaunchTestSet }) {
  const [practice, setPractice] = useState(null);
  const [sets, setSets] = useState([]);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showTimer, setShowTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    loadPractice();
  }, [practiceId]);

  useEffect(() => {
    let interval;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const loadPractice = async () => {
    try {
      setLoading(true);

      // Load practice
      const { data: practiceData, error: practiceError } = await supabase
        .from('practices')
        .select('*')
        .eq('id', practiceId)
        .single();

      if (practiceError) throw practiceError;

      // Load sets and items
      const { data: setsData, error: setsError } = await supabase
        .from('practice_sets')
        .select(`
          *,
          practice_set_items(*)
        `)
        .eq('practice_id', practiceId)
        .order('order_index', { ascending: true });

      if (setsError) throw setsError;

      // Sort items within each set
      const setsWithSortedItems = setsData.map(set => ({
        ...set,
        practice_set_items: set.practice_set_items?.sort((a, b) => a.order_index - b.order_index) || []
      }));

      setPractice(practiceData);
      setSets(setsWithSortedItems);
    } catch (error) {
      console.error('Error loading practice:', error);
      alert('Failed to load practice');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const currentSet = sets[currentSetIndex];

  const handleNext = () => {
    if (currentSetIndex < sets.length - 1) {
      setCurrentSetIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSetIndex > 0) {
      setCurrentSetIndex(prev => prev - 1);
    }
  };

  const handleLaunchTestSet = () => {
    if (currentSet?.is_test_set) {
      // For now, just show alert. In Phase 2, this will launch Test Set Tracker
      alert('Test Set Tracker integration coming in Phase 2!\n\nFor now, manually navigate to Test Set Tracker and configure your test set.');
      // Future: onLaunchTestSet(currentSet.test_set_config);
    }
  };

  const toggleTimer = () => {
    if (timerRunning) {
      setTimerRunning(false);
    } else {
      setTimerRunning(true);
    }
  };

  const resetTimer = () => {
    setTimerSeconds(0);
    setTimerRunning(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const setTypeColors = {
    warmup: 'bg-blue-100 border-blue-300',
    pre_set: 'bg-purple-100 border-purple-300',
    main_set: 'bg-emerald-100 border-emerald-300',
    test_set: 'bg-orange-100 border-orange-300',
    cooldown: 'bg-slate-100 border-slate-300',
    dryland: 'bg-yellow-100 border-yellow-300'
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-2xl">Loading practice...</div>
      </div>
    );
  }

  if (!practice || sets.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-8">
        <p className="text-2xl mb-8">No sets in this practice</p>
        <button
          onClick={onBack}
          className="px-8 py-4 bg-white text-slate-900 rounded-xl text-xl font-bold hover:bg-slate-100"
        >
          Back to Practice
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white overflow-hidden">
      {/* Header - Minimal */}
      <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between shrink-0">
        <button
          onClick={onBack}
          className="p-3 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X size={32} />
        </button>
        
        <div className="text-center">
          <h1 className="text-2xl font-bold">{practice.title}</h1>
          <p className="text-slate-400 text-lg">
            Set {currentSetIndex + 1} of {sets.length}
          </p>
        </div>

        <div className="w-14"></div> {/* Spacer for centering */}
      </div>

      {/* Main Content - Large Text */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">
          {/* Set Header */}
          <div className={`border-4 rounded-2xl p-8 mb-8 ${setTypeColors[currentSet.set_type] || 'bg-white border-slate-300'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-5xl font-bold text-slate-900">
                {currentSet.name}
              </h2>
              {currentSet.is_test_set && (
                <span className="px-6 py-3 bg-orange-500 text-white rounded-xl text-2xl font-bold flex items-center gap-3">
                  <Timer size={28} />
                  TEST SET
                </span>
              )}
            </div>
            <p className="text-3xl text-slate-700 font-medium">
              {currentSet.total_yards} yards
            </p>
          </div>

          {/* Test Set Launch Button */}
          {currentSet.is_test_set && (
            <div className="mb-8 p-6 bg-orange-500 rounded-2xl">
              <div className="text-center mb-4">
                <p className="text-2xl text-white font-medium mb-4">
                  🕐 This is a test set! Ready to start timing?
                </p>
                <button
                  onClick={handleLaunchTestSet}
                  className="px-12 py-6 bg-white text-orange-600 rounded-xl text-3xl font-bold hover:bg-orange-50 transition-colors flex items-center gap-4 mx-auto shadow-lg"
                >
                  <Play size={32} />
                  Launch Test Set Tracker
                </button>
              </div>
            </div>
          )}

          {/* Set Items - Extra Large Text */}
          {currentSet.practice_set_items && currentSet.practice_set_items.length > 0 ? (
            <div className="space-y-6">
              {currentSet.practice_set_items.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-slate-800 border-2 border-slate-700 rounded-2xl p-8 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start gap-6">
                    {/* Item Number */}
                    <div className="text-4xl font-bold text-slate-500 min-w-[60px]">
                      {idx + 1}.
                    </div>

                    {/* Item Content */}
                    <div className="flex-1">
                      {/* Reps x Distance */}
                      <div className="text-5xl font-bold mb-3">
                        {item.reps} × {item.distance}
                      </div>

                      {/* Stroke and Interval */}
                      <div className="flex items-center gap-6 mb-3">
                        <span className="text-3xl text-blue-400 font-medium">
                          {item.stroke.charAt(0).toUpperCase() + item.stroke.slice(1)}
                        </span>
                        {item.interval && (
                          <span className="text-3xl text-emerald-400 font-bold">
                            @ {item.interval}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {item.description && (
                        <p className="text-2xl text-slate-300 mb-3">
                          {item.description}
                        </p>
                      )}

                      {/* Equipment & Intensity */}
                      <div className="flex flex-wrap gap-3">
                        {item.equipment && item.equipment.length > 0 && (
                          <>
                            {item.equipment.map((eq, eqIdx) => (
                              <span
                                key={eqIdx}
                                className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg text-xl font-medium"
                              >
                                {eq}
                              </span>
                            ))}
                          </>
                        )}
                        {item.intensity && (
                          <span className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xl font-bold">
                            {item.intensity.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Total Yards for Item */}
                    <div className="text-right">
                      <div className="text-2xl text-slate-500">Yards</div>
                      <div className="text-4xl font-bold text-slate-300">
                        {item.reps * item.distance}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-3xl">
              No items in this set
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer - Large Buttons */}
      <div className="bg-slate-800 border-t border-slate-700 p-6 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-6">
          {/* Previous Button */}
          <button
            onClick={handlePrev}
            disabled={currentSetIndex === 0}
            className={`flex items-center gap-3 px-8 py-6 rounded-xl text-2xl font-bold transition-colors ${
              currentSetIndex === 0
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            }`}
          >
            <ChevronLeft size={32} />
            Previous
          </button>

          {/* Timer */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTimer}
              className="px-8 py-6 bg-blue-600 text-white rounded-xl text-2xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-3"
            >
              <Clock size={28} />
              {timerRunning ? 'Pause' : 'Start Timer'}
            </button>
            <div className="text-center">
              <div className="text-5xl font-bold font-mono">
                {formatTime(timerSeconds)}
              </div>
              <button
                onClick={resetTimer}
                className="text-slate-400 hover:text-white text-lg mt-1"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Next Button */}
          <button
            onClick={handleNext}
            disabled={currentSetIndex === sets.length - 1}
            className={`flex items-center gap-3 px-8 py-6 rounded-xl text-2xl font-bold transition-colors ${
              currentSetIndex === sets.length - 1
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            Next
            <ChevronRight size={32} />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mt-4 max-w-5xl mx-auto">
          <div className="flex gap-2">
            {sets.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSetIndex(idx)}
                className={`h-3 flex-1 rounded-full transition-colors ${
                  idx === currentSetIndex
                    ? 'bg-emerald-500'
                    : idx < currentSetIndex
                    ? 'bg-slate-600'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

