import React, { useState, useEffect } from 'react';
import { ChevronLeft, Zap, Grid3X3, Save, AlertCircle, Check, Sparkles } from 'lucide-react';
import { supabase } from './supabase';

export default function PracticeQuickEntry({ practiceId, practice, onBack, onSwitchToBuilder }) {
  const [textContent, setTextContent] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [parseErrors, setParseErrors] = useState([]);

  useEffect(() => {
    if (practiceId) {
      loadPracticeAsText();
    }
  }, [practiceId]);

  const loadPracticeAsText = async () => {
    try {
      // Load existing practice and convert to text format
      const { data: setsData } = await supabase
        .from('practice_sets')
        .select(`
          *,
          practice_set_items(*)
        `)
        .eq('practice_id', practiceId)
        .order('order_index', { ascending: true });

      if (setsData) {
        let text = '';
        setsData.forEach(set => {
          // Add set header
          text += `## ${set.name.toUpperCase()}\n`;
          
          // Add items
          if (set.practice_set_items) {
            set.practice_set_items
              .sort((a, b) => a.order_index - b.order_index)
              .forEach(item => {
                let line = `${item.reps}x${item.distance} ${item.stroke}`;
                if (item.interval) line += ` @${item.interval}`;
                if (item.description) line += ` - ${item.description}`;
                if (item.intensity) line += ` (${item.intensity})`;
                if (item.equipment && item.equipment.length > 0) {
                  line += ` [${item.equipment.join(', ')}]`;
                }
                text += line + '\n';
              });
          }
          text += '\n';
        });
        setTextContent(text);
      }
    } catch (error) {
      console.error('Error loading practice:', error);
    }
  };

  const parseTextToPractice = async () => {
    setParsing(true);
    setParseErrors([]);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('parse-practice', {
        body: { text: textContent }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to reach AI parser');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const sets = data?.sets;
      if (!sets || sets.length === 0) {
        throw new Error('AI could not parse any sets from the text. Try adding more detail.');
      }

      await saveParsedPractice(sets);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error parsing practice:', error);
      setParseErrors([error.message]);
    } finally {
      setParsing(false);
    }
  };

  const saveParsedPractice = async (sets) => {
    try {
      // Get team_id from the parent practice
      const { data: practiceRow, error: practiceError } = await supabase
        .from('practices')
        .select('team_id')
        .eq('id', practiceId)
        .single();

      if (practiceError || !practiceRow?.team_id) {
        throw new Error('Could not determine team_id from practice');
      }

      const teamId = practiceRow.team_id;

      // Delete existing sets and items
      const { error: deleteError } = await supabase
        .from('practice_sets')
        .delete()
        .eq('practice_id', practiceId);

      if (deleteError) throw deleteError;

      // Insert new sets and items
      for (const set of sets) {
        const { items, ...setData } = set;
        const newSet = {
          practice_id: practiceId,
          team_id: teamId,
          ...setData
        };

        const { data: setInsertData, error: setError } = await supabase
          .from('practice_sets')
          .insert([newSet])
          .select()
          .single();

        if (setError) throw setError;

        // Insert items
        if (items && items.length > 0) {
          const itemsToInsert = items.map(item => ({
            ...item,
            set_id: setInsertData.id,
            team_id: teamId
          }));

          const { error: itemsError } = await supabase
            .from('practice_set_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }
      }
    } catch (error) {
      throw new Error('Failed to save practice: ' + error.message);
    }
  };

  const insertTemplate = (template) => {
    const cursorPos = document.getElementById('quick-entry-textarea')?.selectionStart || textContent.length;
    const before = textContent.substring(0, cursorPos);
    const after = textContent.substring(cursorPos);
    setTextContent(before + template + after);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Zap className="text-yellow-500" size={24} />
                Quick Entry Mode
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                  <Sparkles size={12} />
                  AI Powered
                </span>
              </h2>
              <p className="text-sm text-slate-500">Type however you want — AI will figure out the structure</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchToBuilder}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Grid3X3 size={16} />
              <span className="hidden md:inline">Switch to Builder</span>
            </button>
            <button
              onClick={parseTextToPractice}
              disabled={parsing || !textContent.trim()}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:bg-slate-300"
            >
              {parsing ? (
                <><Sparkles size={16} className="animate-spin" /> AI Parsing...</>
              ) : saved ? (
                <>
                  <Check size={16} />
                  Saved!
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Parse & Save
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Templates */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => insertTemplate('\n## WARMUP\n')}
            className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100"
          >
            + Warmup
          </button>
          <button
            onClick={() => insertTemplate('\n## MAIN SET\n')}
            className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100"
          >
            + Main Set
          </button>
          <button
            onClick={() => insertTemplate('\n## TEST SET\n')}
            className="px-3 py-1 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100"
          >
            + Test Set
          </button>
          <button
            onClick={() => insertTemplate('\n## COOLDOWN\n')}
            className="px-3 py-1 bg-slate-50 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100"
          >
            + Cooldown
          </button>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Text Editor */}
        <div className="flex-1 flex flex-col border-r border-slate-200">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-purple-600" />
              Type Your Practice — Any Format
            </h3>
            <div className="text-sm text-slate-600 space-y-1">
              <p>AI understands natural language — just type how you normally would.</p>
              <p className="text-xs text-purple-600 font-medium">No strict formatting required. Write it like you'd text it to an assistant coach.</p>
            </div>
          </div>
          
          <textarea
            id="quick-entry-textarea"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            className="flex-1 p-6 font-mono text-base resize-none focus:outline-none"
            placeholder={`Type your practice however you want — AI will parse it...

Examples of what works:

Warmup
400 free easy
4x100 IM on 1:45

Main set
6x200 free descend 1-3 on 2:45
8x50 sprint fly on the :50 with fins
broken 200 - 4x50 fast free, 10 sec rest

Cooldown
200 easy choice

Or even more casual:
"Start with a 400 warmup, then do some 200 free descending,
throw in some kick with a board, and cool down easy"
`}
            spellCheck={false}
          />
        </div>

        {/* Right: Instructions & Examples */}
        <div className="w-96 bg-slate-50 p-6 overflow-y-auto">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-purple-600" />
            AI Quick Reference
          </h3>

          {/* Parse Errors */}
          {parseErrors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle size={18} className="text-red-600 mt-0.5" />
                <h4 className="font-bold text-red-900">Error</h4>
              </div>
              <div className="text-sm text-red-800 space-y-1">
                {parseErrors.map((error, idx) => (
                  <p key={idx}>• {error}</p>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-1">How It Works</h4>
              <p className="text-sm text-purple-700">
                Type your practice in any format. AI reads it like an assistant coach would and converts it into structured sets and items.
              </p>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 mb-2">Structured Format</h4>
              <code className="block bg-white p-2 rounded text-sm border">
                Warmup<br/>
                4x100 Free on 1:30 easy<br/>
                4x50 Choice drill/swim<br/>
                <br/>
                Main Set<br/>
                3x200 Free descend 1-3 on 2:45<br/>
                4x50 Fly sprint with fins
              </code>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 mb-2">Casual / Natural Language</h4>
              <code className="block bg-white p-2 rounded text-sm border text-xs">
                Start with 400 easy free, then 4x100 IM<br/>
                on the 1:45. Main set is 6x200 free<br/>
                descending, then some fast 50s fly<br/>
                with fins. Cool down 200 easy.
              </code>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 mb-2">AI Understands</h4>
              <div className="text-sm text-slate-600 space-y-1">
                <p>• Any stroke name or abbreviation</p>
                <p>• Intervals like "on 1:30" or "@:45" or "30 sec rest"</p>
                <p>• Equipment: fins, paddles, snorkel, kickboard, pull buoy, band</p>
                <p>• Intensity: easy, moderate, fast, sprint, race pace</p>
                <p>• Set groupings even without headers</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <h4 className="font-medium text-amber-900 mb-1">Tips</h4>
              <div className="text-sm text-amber-800 space-y-1">
                <p>• More detail = better results</p>
                <p>• Mention "warmup" or "cooldown" so AI groups sets correctly</p>
                <p>• Include distances for best accuracy</p>
                <p>• You can still use the structured ## format if you prefer</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 border-t border-slate-200 p-4 text-center text-sm text-slate-500 shrink-0">
        <Sparkles size={14} className="inline text-purple-500 mr-1" />
        <strong>AI Powered:</strong> Type your practice in any format — structured, casual, or shorthand.
        Click "Parse & Save" and AI converts it into sets and items. Switch to Builder to fine-tune.
      </div>
    </div>
  );
}

