// src/AutoGenerateEventsModal.jsx
// Modal for auto-generating event entries for swimmers

import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Loader2, Check, AlertCircle, TrendingUp, Award, Target, Zap } from 'lucide-react';
import { 
  generateRecommendationsForSwimmer, 
  generateRecommendationsForGroup,
  applyRecommendations 
} from './utils/eventRecommendationEngine';

const AutoGenerateEventsModal = ({ meet, committedSwimmers, onClose, onSuccess }) => {
  const [mode, setMode] = useState('balanced');
  const [maxEvents, setMaxEvents] = useState(3);
  const [focusOnStandardsChasers, setFocusOnStandardsChasers] = useState(false);
  const [selectedSwimmers, setSelectedSwimmers] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [applying, setApplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('group'); // 'group' or 'individual'
  const [selectedIndividualSwimmer, setSelectedIndividualSwimmer] = useState(null);

  // Filter swimmers
  const filteredSwimmers = useMemo(() => {
    if (!searchQuery) return committedSwimmers;
    
    return committedSwimmers.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [committedSwimmers, searchQuery]);

  // Handle select all / deselect all
  const handleToggleAll = () => {
    if (selectedSwimmers.length === filteredSwimmers.length) {
      setSelectedSwimmers([]);
    } else {
      setSelectedSwimmers(filteredSwimmers.map(s => s.id));
    }
  };

  // Handle individual swimmer toggle
  const handleToggleSwimmer = (swimmerId) => {
    if (selectedSwimmers.includes(swimmerId)) {
      setSelectedSwimmers(selectedSwimmers.filter(id => id !== swimmerId));
    } else {
      setSelectedSwimmers([...selectedSwimmers, swimmerId]);
    }
  };

  // Generate recommendations
  const handleGenerate = async () => {
    if (viewMode === 'individual' && !selectedIndividualSwimmer) {
      alert('Please select a swimmer');
      return;
    }
    
    if (viewMode === 'group' && selectedSwimmers.length === 0) {
      alert('Please select at least one swimmer');
      return;
    }

    setGenerating(true);
    setRecommendations(null);

    try {
      const options = {
        mode,
        maxEvents,
        focusOnStandardsChasers
      };

      let results;
      if (viewMode === 'individual') {
        const swimmer = committedSwimmers.find(s => s.id === selectedIndividualSwimmer);
        const result = await generateRecommendationsForSwimmer(swimmer, meet, options);
        results = [result];
      } else {
        const swimmers = committedSwimmers.filter(s => selectedSwimmers.includes(s.id));
        results = await generateRecommendationsForGroup(swimmers, meet, options);
      }
      
      setRecommendations(results);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      alert('Error generating recommendations: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  // Track which recommendations are selected (using stable event IDs)
  const [selectedRecommendations, setSelectedRecommendations] = useState({});

  // Initialize selected state when recommendations are generated
  useEffect(() => {
    if (recommendations) {
      const initialSelected = {};
      recommendations.forEach((swimmerRec) => {
        if (!swimmerRec?.swimmer?.id) {
          console.error('Missing swimmer ID:', swimmerRec);
          return;
        }
        swimmerRec.recommendations.forEach((rec) => {
          if (!rec?.meetEvent?.id) {
            console.error('Missing meetEvent ID:', rec);
            return;
          }
          // Use swimmer ID + meet event ID as stable key
          const key = `${swimmerRec.swimmer.id}-${rec.meetEvent.id}`;
          initialSelected[key] = true; // All selected by default
        });
      });
      setSelectedRecommendations(initialSelected);
      console.log('✅ Initialized selections:', Object.keys(initialSelected).length, 'events');
    }
  }, [recommendations]);

  // Toggle individual recommendation
  const toggleRecommendation = (swimmerId, meetEventId) => {
    const key = `${swimmerId}-${meetEventId}`;
    console.log('🔄 Toggle checkbox:', key, 'Current:', selectedRecommendations[key], '→ New:', !selectedRecommendations[key]);
    setSelectedRecommendations(prev => {
      const newState = {
        ...prev,
        [key]: !prev[key]
      };
      console.log('✅ Updated state:', newState);
      return newState;
    });
  };

  // Apply only selected recommendations
  const handleApply = async () => {
    if (!recommendations) return;

    setApplying(true);

    try {
      // Flatten all recommendations and filter only selected ones
      const allRecs = recommendations.flatMap((r) => 
        r.recommendations
          .filter((rec) => {
            const key = `${r.swimmer.id}-${rec.meetEvent.id}`;
            return selectedRecommendations[key];
          })
          .map((rec) => ({
            ...rec,
            swimmer: r.swimmer
          }))
      );

      if (allRecs.length === 0) {
        alert('Please select at least one recommendation to apply');
        setApplying(false);
        return;
      }

      const result = await applyRecommendations(allRecs, meet);

      if (result.success) {
        onSuccess(result.message);
        onClose();
      } else {
        alert('Error applying recommendations: ' + result.message);
      }
    } catch (error) {
      console.error('Error applying recommendations:', error);
      alert('Error applying recommendations: ' + error.message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Auto-Generate Event Entries</h2>
              <p className="text-sm text-slate-500">AI-powered event recommendations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!recommendations ? (
            <>
              {/* Configuration Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <Target size={18} />
                  Configuration
                </h3>

                {/* Meet Type Presets */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Quick Presets
                    <span className="text-xs text-slate-500 ml-2">(One-click configurations)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setMode('championship');
                        setMaxEvents(3);
                        setFocusOnStandardsChasers(true);
                      }}
                      className="p-3 text-left bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-lg hover:shadow-md transition-all"
                    >
                      <div className="font-semibold text-sm text-amber-800">Championship Meet</div>
                      <div className="text-xs text-amber-600 mt-1">3 events total, standards focus</div>
                    </button>
                    <button
                      onClick={() => {
                        setMode('balanced');
                        setMaxEvents(4);
                        setFocusOnStandardsChasers(false);
                      }}
                      className="p-3 text-left bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:shadow-md transition-all"
                    >
                      <div className="font-semibold text-sm text-blue-800">Dual Meet</div>
                      <div className="text-xs text-blue-600 mt-1">4 events total, balanced</div>
                    </button>
                    <button
                      onClick={() => {
                        setMode('developmental');
                        setMaxEvents(6);
                        setFocusOnStandardsChasers(false);
                      }}
                      className="p-3 text-left bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg hover:shadow-md transition-all"
                    >
                      <div className="font-semibold text-sm text-green-800">B/C Meet</div>
                      <div className="text-xs text-green-600 mt-1">6 events total, try new things</div>
                    </button>
                    <button
                      onClick={() => {
                        setMode('championship');
                        setMaxEvents(2);
                        setFocusOnStandardsChasers(true);
                      }}
                      className="p-3 text-left bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg hover:shadow-md transition-all"
                    >
                      <div className="font-semibold text-sm text-purple-800">Qualifying Meet</div>
                      <div className="text-xs text-purple-600 mt-1">2 events total, cuts only</div>
                    </button>
                  </div>
                </div>

                {/* Mode Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Recommendation Mode
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setMode('championship')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        mode === 'championship'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Award className={`mb-2 ${mode === 'championship' ? 'text-blue-600' : 'text-slate-400'}`} size={20} />
                      <div className="font-semibold text-sm">Championship</div>
                      <div className="text-xs text-slate-500 mt-1">Focus on best events only</div>
                    </button>

                    <button
                      onClick={() => setMode('balanced')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        mode === 'balanced'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <TrendingUp className={`mb-2 ${mode === 'balanced' ? 'text-blue-600' : 'text-slate-400'}`} size={20} />
                      <div className="font-semibold text-sm">Balanced</div>
                      <div className="text-xs text-slate-500 mt-1">Mix of best and development</div>
                    </button>

                    <button
                      onClick={() => setMode('developmental')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        mode === 'developmental'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Zap className={`mb-2 ${mode === 'developmental' ? 'text-blue-600' : 'text-slate-400'}`} size={20} />
                      <div className="font-semibold text-sm">Developmental</div>
                      <div className="text-xs text-slate-500 mt-1">Try new events</div>
                    </button>
                  </div>
                </div>

                {/* Max Events */}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    Max Events per Swimmer
                    <span className="text-xs text-slate-500 ml-2">(Total for entire meet, not per session)</span>
                  </label>
                  <div className="flex gap-2 items-center">
                    {[2, 3, 4, 5, 6].map(num => (
                      <button
                        key={num}
                        onClick={() => setMaxEvents(num)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          maxEvents === num
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-sm text-slate-500">or</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={maxEvents}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Allow empty or valid numbers
                          if (val === '' || /^\d+$/.test(val)) {
                            const num = parseInt(val);
                            if (val === '') {
                              setMaxEvents(''); // Allow empty temporarily
                            } else if (num >= 1 && num <= 15) {
                              setMaxEvents(num);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          // Ensure we have a valid value on blur
                          const val = parseInt(e.target.value);
                          if (!val || val < 1) setMaxEvents(1);
                          else if (val > 15) setMaxEvents(15);
                          else setMaxEvents(val);
                        }}
                        placeholder="1-15"
                        className="w-16 px-3 py-2 border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    💡 Tip: 3-4 for championships, 4-5 for regular meets, 6+ for developmental meets
                  </p>
                </div>

                {/* Focus on Standards Chasers */}
                <label className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={focusOnStandardsChasers}
                    onChange={(e) => setFocusOnStandardsChasers(e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">Focus on Standards Chasers</div>
                    <div className="text-xs text-slate-600">Prioritize events close to achieving next standard</div>
                  </div>
                </label>
              </div>

              {/* Swimmer Selection */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-slate-700">Select Swimmers</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setViewMode('group');
                        setSelectedIndividualSwimmer(null);
                      }}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                        viewMode === 'group'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Group
                    </button>
                    <button
                      onClick={() => {
                        setViewMode('individual');
                        setSelectedSwimmers([]);
                      }}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                        viewMode === 'individual'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Individual
                    </button>
                  </div>
                </div>

                {/* Search */}
                <input
                  type="text"
                  placeholder="Search swimmers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />

                {/* Group Mode */}
                {viewMode === 'group' && (
                  <>
                    <div className="flex justify-end">
                      <button
                        onClick={handleToggleAll}
                        className="text-sm text-blue-600 hover:underline font-medium"
                      >
                        {selectedSwimmers.length === filteredSwimmers.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    
                    <div className="border border-slate-200 rounded-xl max-h-64 overflow-y-auto">
                      {filteredSwimmers.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                          <p>No committed swimmers found</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {filteredSwimmers.map(swimmer => (
                            <label
                              key={swimmer.id}
                              className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedSwimmers.includes(swimmer.id)}
                                onChange={() => handleToggleSwimmer(swimmer.id)}
                                className="w-4 h-4 text-blue-600"
                              />
                              <div className="flex-1">
                                <div className="font-medium text-slate-800">{swimmer.name}</div>
                                <div className="text-xs text-slate-500">
                                  {swimmer.age} years • {swimmer.gender || 'M'} • {swimmer.group_name || 'No Group'}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="text-sm text-slate-500">
                      {selectedSwimmers.length} swimmer{selectedSwimmers.length !== 1 ? 's' : ''} selected
                    </div>
                  </>
                )}

                {/* Individual Mode */}
                {viewMode === 'individual' && (
                  <div className="border border-slate-200 rounded-xl max-h-64 overflow-y-auto">
                    {filteredSwimmers.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                        <p>No committed swimmers found</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {filteredSwimmers.map(swimmer => (
                          <label
                            key={swimmer.id}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <input
                              type="radio"
                              name="individual-swimmer"
                              checked={selectedIndividualSwimmer === swimmer.id}
                              onChange={() => setSelectedIndividualSwimmer(swimmer.id)}
                              className="w-4 h-4 text-blue-600"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-slate-800">{swimmer.name}</div>
                              <div className="text-xs text-slate-500">
                                {swimmer.age} years • {swimmer.gender || 'M'} • {swimmer.group_name || 'No Group'}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Recommendations Display */
            <RecommendationsDisplay 
              recommendations={recommendations} 
              meet={meet}
              selectedRecommendations={selectedRecommendations}
              toggleRecommendation={toggleRecommendation}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="text-sm text-slate-600">
            {recommendations ? (
              <span className="flex items-center gap-2">
                <Check className="text-green-600" size={16} />
                {recommendations.reduce((sum, r) => sum + r.recommendations.length, 0)} entries ready
              </span>
            ) : viewMode === 'individual' ? (
              selectedIndividualSwimmer 
                ? `1 swimmer selected` 
                : 'No swimmer selected'
            ) : (
              `${selectedSwimmers.length} swimmer${selectedSwimmers.length !== 1 ? 's' : ''} selected`
            )}
          </div>
          <div className="flex gap-3">
            {recommendations ? (
              <>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-600">
                    {Object.values(selectedRecommendations).filter(Boolean).length} of{' '}
                    {Object.keys(selectedRecommendations).length} selected
                  </span>
                  <button
                    onClick={() => setRecommendations(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                  >
                    Back
                  </button>
                </div>
                <button
                  onClick={handleApply}
                  disabled={applying || Object.values(selectedRecommendations).filter(Boolean).length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {applying ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Apply Selected ({Object.values(selectedRecommendations).filter(Boolean).length})
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating || (viewMode === 'group' ? selectedSwimmers.length === 0 : !selectedIndividualSwimmer)}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Generate Recommendations
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Component to display recommendations
const RecommendationsDisplay = ({ recommendations, meet, selectedRecommendations, toggleRecommendation }) => {
  const [sortBy, setSortBy] = useState('event_number'); // Default to event_number for chronological order
  const totalEntries = recommendations?.reduce((sum, r) => sum + (r?.recommendations?.length || 0), 0) || 0;
  
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No recommendations to display
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <Check className="text-green-600" size={20} />
            <h3 className="font-semibold text-slate-800">Recommendations Generated</h3>
          </div>
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-600 font-medium ml-2">Sort:</span>
            <button
              onClick={() => setSortBy('event_number')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                sortBy === 'event_number'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              📅 Event Order
            </button>
            <button
              onClick={() => setSortBy('score')}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
                sortBy === 'score'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              ⭐ Best Score
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Generated {totalEntries} event entries for {recommendations.length} swimmer{recommendations.length !== 1 ? 's' : ''}.
          {sortBy === 'event_number' 
            ? ' Sorted by event number (chronological order).'
            : ' Sorted by recommendation score (best first).'}
        </p>
      </div>

      <div className="space-y-4">
        {recommendations.map((swimmerRec, idx) => {
          if (!swimmerRec?.swimmer?.id) {
            console.error('Invalid swimmer rec at index', idx, swimmerRec);
            return null;
          }
          return (
            <SwimmerRecommendation 
              key={swimmerRec.swimmer.id} 
              swimmerRec={swimmerRec} 
              sortBy={sortBy}
              selectedRecommendations={selectedRecommendations}
              toggleRecommendation={toggleRecommendation}
              meet={meet}
            />
          );
        })}
      </div>
    </div>
  );
};

// Component for individual swimmer recommendation
const SwimmerRecommendation = ({ 
  swimmerRec, 
  sortBy = 'score',
  selectedRecommendations = {},
  toggleRecommendation,
  meet
}) => {
  const { swimmer, recommendations = [], stats, error } = swimmerRec || {};
  
  if (!swimmer || !recommendations) {
    console.error('Invalid swimmerRec:', swimmerRec);
    return null;
  }
  
  // Get events per day limit from meet (default to 3 if not set)
  const eventsPerDayLimit = meet?.events_per_day_limit || 3;
  
  // Sort recommendations based on sortBy prop
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    if (sortBy === 'event_number') {
      return (a.meetEvent.event_number || 0) - (b.meetEvent.event_number || 0);
    }
    return b.scores.total - a.scores.total; // Default: by score
  });
  
  // Count selected events for this swimmer
  const selectedCount = recommendations.filter((rec) => {
    const key = `${swimmer.id}-${rec.meetEvent.id}`;
    return selectedRecommendations[key];
  }).length;
  
  // Check session distribution (only count selected events)
  const sessionCounts = {};
  recommendations.forEach((rec) => {
    const key = `${swimmer.id}-${rec.meetEvent.id}`;
    if (selectedRecommendations[key]) {
      const session = rec.meetEvent?.session_number;
      if (session) { // Only count if session_number exists
        sessionCounts[session] = (sessionCounts[session] || 0) + 1;
      }
    }
  });
  
  // Log for debugging
  if (Object.keys(sessionCounts).length > 0) {
    console.log('Session distribution:', sessionCounts, 'Limit:', eventsPerDayLimit);
  }
  
  const hasSessionOverload = Object.values(sessionCounts).some(count => count > eventsPerDayLimit);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <div className="flex-1">
            <div className="font-semibold text-slate-800">{swimmer.name}</div>
            <div className="text-sm text-red-600">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="text-amber-600" size={20} />
          <div className="flex-1">
            <div className="font-semibold text-slate-800">{swimmer.name}</div>
            <div className="text-sm text-amber-700">No eligible events found</div>
            {stats?.eligibleEvents !== undefined && (
              <div className="text-xs text-amber-600 mt-1">
                {stats.eligibleEvents === 0 
                  ? 'No events match swimmer\'s age/gender. Check meet events setup.'
                  : `Found ${stats.eligibleEvents} eligible events but no recommendations. Try Developmental mode or check if swimmer has any results.`
                }
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <div className="font-semibold text-slate-800">{swimmer.name}</div>
            <div className="text-xs text-slate-500">
              {swimmer.age} years • {swimmer.gender || 'M'} • {swimmer.group_name || 'No Group'}
            </div>
            {hasSessionOverload && (
              <div className="mt-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded inline-flex items-center gap-1">
                <AlertCircle size={12} />
                ⚠️ More than {eventsPerDayLimit} events in one session (meet limit)
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-blue-600">
              {selectedCount}/{recommendations.length}
            </div>
            <div className="text-xs text-slate-500">selected</div>
            {Object.keys(sessionCounts).length > 0 && (
              <div className="text-xs text-slate-400 mt-1">
                {Object.entries(sessionCounts).map(([session, count]) => (
                  <div key={session}>
                    S{session}: {count} {count > eventsPerDayLimit ? '⚠️' : ''}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {sortedRecommendations.map((rec, idx) => {
          // Use stable key based on swimmer ID and event ID
          if (!rec?.meetEvent?.id) {
            console.error('Missing meetEvent ID in rec:', rec);
            return null;
          }
          const key = `${swimmer.id}-${rec.meetEvent.id}`;
          const isSelected = selectedRecommendations[key] !== false; // Default to true if undefined
          
          return (
          <div 
            key={idx} 
            className={`p-4 transition-all ${
              isSelected 
                ? 'hover:bg-slate-50' 
                : 'bg-slate-100 opacity-60'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={isSelected !== false} // Handle undefined as true
                onChange={(e) => {
                  e.stopPropagation();
                  console.log('📝 Checkbox clicked:', swimmer.name, rec.eventName, 'Key:', key);
                  toggleRecommendation(swimmer.id, rec.meetEvent.id);
                }}
                className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer flex-shrink-0"
              />
              
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-800">
                      Event #{rec.meetEvent.event_number}: {rec.eventName}
                      {rec.meetEvent.session_number && (
                        <span className="ml-2 text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                          Session {rec.meetEvent.session_number}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-600">
                      {rec.bestTime ? (
                        <span>Seed Time: <span className="font-mono font-semibold">{rec.bestTime}</span></span>
                      ) : (
                        <span className="text-amber-600">New event - No seed time</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">{rec.scores.total}</div>
                    <div className="text-xs text-slate-500">score</div>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="flex gap-2 mb-2">
                  <ScorePill label="Performance" score={rec.scores.performance} max={40} />
                  <ScorePill label="Opportunity" score={rec.scores.opportunity} max={30} />
                  <ScorePill label="Strategic" score={rec.scores.strategic} max={20} />
                </div>

                {/* Reasons */}
                <div className="space-y-1">
                  {rec.improvementReason && (
                    <div className="text-xs text-slate-600 flex items-center gap-1">
                      <TrendingUp size={12} className="text-green-600" />
                      {rec.improvementReason}
                    </div>
                  )}
                  {rec.opportunityReasons && rec.opportunityReasons.map((reason, i) => (
                    <div key={i} className="text-xs text-slate-600 flex items-center gap-1">
                      <Target size={12} className="text-amber-600" />
                      {reason}
                    </div>
                  ))}
                  {rec.strategicReasons && rec.strategicReasons.map((reason, i) => (
                    <div key={i} className="text-xs text-slate-600 flex items-center gap-1">
                      <Award size={12} className="text-purple-600" />
                      {reason}
                    </div>
                  ))}
                  {rec.hasSpacingWarning && (
                    <div className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded flex items-center gap-1">
                      <AlertCircle size={12} />
                      May be close to another event
                    </div>
                  )}
                  {rec.difficulty && (
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      Difficulty: {rec.difficulty.toFixed(1)}/5
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};

// Score pill component
const ScorePill = ({ label, score, max }) => {
  const percent = (score / max) * 100;
  let colorClass = 'bg-slate-100 text-slate-600';
  
  if (percent >= 75) colorClass = 'bg-green-100 text-green-700';
  else if (percent >= 50) colorClass = 'bg-blue-100 text-blue-700';
  else if (percent >= 25) colorClass = 'bg-amber-100 text-amber-700';

  return (
    <div className={`px-2 py-1 rounded text-xs font-medium ${colorClass}`}>
      {label}: {score}/{max}
    </div>
  );
};

export default AutoGenerateEventsModal;

