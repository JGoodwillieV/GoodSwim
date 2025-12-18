import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Calendar, Plus, Copy, Sparkles, BookTemplate, ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function PracticeHub({ onBack, onCreateNew, onEditPractice, swimmers, navigateTo }) {
  const [currentWeek, setCurrentWeek] = useState(getWeekDates(new Date()));
  const [practices, setPractices] = useState([]);
  const [recentPractices, setRecentPractices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPractices();
  }, [currentWeek]);

  const fetchPractices = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get week start and end
      const weekStart = currentWeek[0].date;
      const weekEnd = currentWeek[6].date;

      // Fetch practices for current week
      const { data: weekData, error: weekError } = await supabase
        .from('practices')
        .select('*')
        .eq('coach_id', user.id)
        .gte('scheduled_date', weekStart)
        .lte('scheduled_date', weekEnd)
        .order('scheduled_date', { ascending: true });

      if (weekError) throw weekError;

      // Fetch recent practices (last 10)
      const { data: recentData, error: recentError } = await supabase
        .from('practices')
        .select('*')
        .eq('coach_id', user.id)
        .order('scheduled_date', { ascending: false })
        .limit(10);

      if (recentError) throw recentError;

      setPractices(weekData || []);
      setRecentPractices(recentData || []);
    } catch (error) {
      console.error('Error fetching practices:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique training groups from swimmers
  const trainingGroups = [...new Set(swimmers?.map(s => s.group_name).filter(Boolean))];

  // Group practices by date and group
  const getPracticesForDate = (dateStr) => {
    return practices.filter(p => p.scheduled_date === dateStr);
  };

  const handlePrevWeek = () => {
    const prevWeek = new Date(currentWeek[0].date);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setCurrentWeek(getWeekDates(prevWeek));
  };

  const handleNextWeek = () => {
    const nextWeek = new Date(currentWeek[0].date);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeek(getWeekDates(nextWeek));
  };

  const handleCopyPractice = async (practice) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create copy of practice
      const newPractice = {
        coach_id: user.id,
        created_by: user.id,
        title: `${practice.title} (Copy)`,
        description: practice.description,
        training_group_id: practice.training_group_id,
        scheduled_date: null,
        scheduled_time: practice.scheduled_time,
        status: 'draft',
        focus_tags: practice.focus_tags,
        total_yards: practice.total_yards
      };

      const { data: newPracticeData, error: practiceError } = await supabase
        .from('practices')
        .insert([newPractice])
        .select()
        .single();

      if (practiceError) throw practiceError;

      // Copy sets and items
      const { data: sets } = await supabase
        .from('practice_sets')
        .select('*, practice_set_items(*)')
        .eq('practice_id', practice.id)
        .order('order_index');

      if (sets && sets.length > 0) {
        for (const set of sets) {
          const { practice_set_items, ...setData } = set;
          const newSet = {
            ...setData,
            id: undefined,
            practice_id: newPracticeData.id
          };

          const { data: newSetData, error: setError } = await supabase
            .from('practice_sets')
            .insert([newSet])
            .select()
            .single();

          if (setError) throw setError;

          // Copy items
          if (practice_set_items && practice_set_items.length > 0) {
            const newItems = practice_set_items.map(item => ({
              ...item,
              id: undefined,
              set_id: newSetData.id
            }));

            const { error: itemsError } = await supabase
              .from('practice_set_items')
              .insert(newItems);

            if (itemsError) throw itemsError;
          }
        }
      }

      alert('Practice copied successfully!');
      onEditPractice(newPracticeData.id);
    } catch (error) {
      console.error('Error copying practice:', error);
      alert('Failed to copy practice: ' + error.message);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 overflow-y-auto h-full pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Practices</h2>
            <p className="text-slate-500">Plan, build, and run your swim practices</p>
          </div>
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          <Plus size={20} />
          New Practice
        </button>
      </div>

      {/* This Week View */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calendar size={20} className="text-blue-600" />
            This Week
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevWeek}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm text-slate-600 font-medium min-w-[200px] text-center">
              {formatDateRange(currentWeek[0].date, currentWeek[6].date)}
            </span>
            <button
              onClick={handleNextWeek}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {currentWeek.map((day, index) => {
              const dayPractices = getPracticesForDate(day.date);
              const isToday = day.date === new Date().toISOString().split('T')[0];

              return (
                <div
                  key={index}
                  className={`border rounded-xl p-4 min-h-[120px] ${
                    isToday
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-500 mb-1">
                    {DAYS[index]}
                  </div>
                  <div className={`text-lg font-bold mb-3 ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>
                    {day.dayNum}
                  </div>

                  {dayPractices.length > 0 ? (
                    <div className="space-y-2">
                      {dayPractices.map((practice) => (
                        <div
                          key={practice.id}
                          onClick={() => onEditPractice(practice.id)}
                          className="bg-white border border-slate-200 rounded-lg p-2 cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all"
                        >
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {practice.title}
                          </div>
                          <div className="text-xs text-slate-500">
                            {practice.scheduled_time?.substring(0, 5) || 'No time'}
                          </div>
                          <div className="text-xs font-bold text-blue-600 mt-1">
                            {practice.total_yards}y
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={onCreateNew}
                      className="text-xs text-slate-400 hover:text-blue-600 font-medium"
                    >
                      + Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
          onClick={() => navigateTo('template-library')}
          className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl flex items-center gap-4 cursor-pointer hover:from-purple-600 hover:to-purple-700 transition-colors text-white shadow-lg shadow-purple-200"
        >
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <BookTemplate size={24} />
          </div>
          <div className="text-left">
            <div className="font-bold text-lg">Templates</div>
            <div className="text-xs text-purple-100">Browse saved practices</div>
          </div>
        </button>

        <button
          onClick={() => {
            if (recentPractices.length > 0) {
              handleCopyPractice(recentPractices[0]);
            } else {
              alert('No recent practices to copy');
            }
          }}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-xl flex items-center gap-4 cursor-pointer hover:from-emerald-600 hover:to-emerald-700 transition-colors text-white shadow-lg shadow-emerald-200"
        >
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Copy size={24} />
          </div>
          <div className="text-left">
            <div className="font-bold text-lg">Copy Last Practice</div>
            <div className="text-xs text-emerald-100">Duplicate & modify</div>
          </div>
        </button>

        <button
          onClick={() => alert('AI Suggestions coming in Phase 2!')}
          className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl flex items-center gap-4 cursor-pointer hover:from-orange-600 hover:to-orange-700 transition-colors text-white shadow-lg shadow-orange-200"
        >
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles size={24} />
          </div>
          <div className="text-left">
            <div className="font-bold text-lg">AI Suggest</div>
            <div className="text-xs text-orange-100">Generate practice ideas</div>
          </div>
        </button>
      </div>

      {/* Recent Practices */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">Recent Practices</h3>
        </div>

        {recentPractices.length > 0 ? (
          <div className="space-y-3">
            {recentPractices.slice(0, 5).map((practice) => (
              <div
                key={practice.id}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all"
              >
                <div className="flex-1">
                  <div className="font-bold text-slate-900">{practice.title}</div>
                  <div className="text-sm text-slate-500">
                    {practice.scheduled_date
                      ? new Date(practice.scheduled_date + 'T00:00:00').toLocaleDateString()
                      : 'Not scheduled'}{' '}
                    • {practice.total_yards}y •{' '}
                    {practice.focus_tags?.join(', ') || 'No tags'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEditPractice(practice.id)}
                    className="px-4 py-2 text-blue-600 border border-blue-200 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleCopyPractice(practice)}
                    className="px-4 py-2 text-slate-600 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <p>No practices yet. Create your first one!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Functions
function getWeekDates(date) {
  const curr = new Date(date);
  const first = curr.getDate() - curr.getDay() + 1; // Monday
  
  const week = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(curr);
    day.setDate(first + i);
    week.push({
      date: day.toISOString().split('T')[0],
      dayNum: day.getDate()
    });
  }
  return week;
}

function formatDateRange(start, end) {
  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');
  
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}`;
  }
  return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}`;
}

