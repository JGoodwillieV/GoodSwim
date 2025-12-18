import React, { useState, useEffect } from 'react';
import { ChevronLeft, Zap, Grid3X3, Save, AlertCircle, Check } from 'lucide-react';
import { supabase } from './supabase';

// Quick Entry Mode - Fast typing interface for coaches
// Parse text like: "4x100 Free @1:30 easy" into structured data

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
    const errors = [];

    try {
      const lines = textContent.split('\n').filter(line => line.trim());
      const sets = [];
      let currentSet = null;
      let setIndex = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if it's a set header (starts with ##)
        if (line.startsWith('##')) {
          if (currentSet && currentSet.items.length > 0) {
            sets.push(currentSet);
            setIndex++;
          }
          
          const setName = line.replace(/^##\s*/, '').trim();
          const setType = detectSetType(setName);
          
          currentSet = {
            name: setName,
            set_type: setType,
            order_index: setIndex,
            items: []
          };
          continue;
        }

        // Skip empty lines
        if (!line) continue;

        // If no set started, create a default one
        if (!currentSet) {
          currentSet = {
            name: 'Set',
            set_type: 'main_set',
            order_index: setIndex,
            items: []
          };
        }

        // Parse item line
        try {
          const item = parseItemLine(line, currentSet.items.length);
          currentSet.items.push(item);
        } catch (err) {
          errors.push(`Line ${i + 1}: ${err.message}`);
        }
      }

      // Add last set
      if (currentSet && currentSet.items.length > 0) {
        sets.push(currentSet);
      }

      if (errors.length > 0) {
        setParseErrors(errors);
        setParsing(false);
        return;
      }

      // Save to database
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
            set_id: setInsertData.id
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

  const detectSetType = (name) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('warmup') || nameLower.includes('warm up')) return 'warmup';
    if (nameLower.includes('pre-set') || nameLower.includes('preset')) return 'pre_set';
    if (nameLower.includes('test')) return 'test_set';
    if (nameLower.includes('cooldown') || nameLower.includes('cool down')) return 'cooldown';
    if (nameLower.includes('dryland') || nameLower.includes('dry land')) return 'dryland';
    return 'main_set';
  };

  const parseItemLine = (line, orderIndex) => {
    // Format: 4x100 Free @1:30 - descend 1-4 (moderate) [fins, paddles]
    
    // Extract equipment (in brackets)
    let equipment = [];
    const equipmentMatch = line.match(/\[([^\]]+)\]/);
    if (equipmentMatch) {
      const rawEquipment = equipmentMatch[1].split(',').map(e => e.trim().toLowerCase());
      // Validate equipment (must match valid options)
      const validEquipment = ['fins', 'paddles', 'snorkel', 'kickboard', 'pull_buoy', 'band'];
      const invalidEquipment = rawEquipment.filter(eq => !validEquipment.includes(eq));
      if (invalidEquipment.length > 0) {
        throw new Error(`Unknown equipment: "${invalidEquipment.join(', ')}". Use: fins, paddles, snorkel, kickboard, pull_buoy, band`);
      }
      equipment = rawEquipment;
      line = line.replace(/\[([^\]]+)\]/, '').trim();
    }

    // Extract intensity (in parentheses)
    let intensity = null;
    const intensityMatch = line.match(/\(([^)]+)\)/);
    if (intensityMatch) {
      const rawIntensity = intensityMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
      // Validate intensity values (must match DB or be null)
      const validIntensities = ['easy', 'moderate', 'fast', 'sprint', 'race_pace'];
      if (validIntensities.includes(rawIntensity)) {
        intensity = rawIntensity;
      } else {
        throw new Error(`Unknown intensity: "${intensityMatch[1]}". Use: easy, moderate, fast, sprint, race_pace`);
      }
      line = line.replace(/\([^)]+\)/, '').trim();
    }

    // Extract description (after dash)
    let description = '';
    const descMatch = line.match(/\s*-\s*(.+?)$/);
    if (descMatch) {
      description = descMatch[1].trim();
      line = line.replace(/\s*-\s*.+$/, '').trim();
    }

    // Extract interval (after @)
    let interval = '';
    const intervalMatch = line.match(/@([^\s]+)/);
    if (intervalMatch) {
      interval = intervalMatch[1].trim();
      line = line.replace(/@[^\s]+/, '').trim();
    }

    // Parse reps x distance stroke
    // Formats: "4x100 Free", "4 x 100 Free", "100 Free" (defaults to 1x)
    const repDistMatch = line.match(/^(\d+)\s*[xX×]\s*(\d+)\s+(.+)$/);
    const singleDistMatch = line.match(/^(\d+)\s+(.+)$/);

    let reps, distance, stroke;

    if (repDistMatch) {
      reps = parseInt(repDistMatch[1]);
      distance = parseInt(repDistMatch[2]);
      stroke = repDistMatch[3].trim().toLowerCase();
    } else if (singleDistMatch) {
      reps = 1;
      distance = parseInt(singleDistMatch[1]);
      stroke = singleDistMatch[2].trim().toLowerCase();
    } else {
      throw new Error(`Could not parse: "${line}". Format: "4x100 Free @1:30"`);
    }

    // Normalize and validate stroke (DB constraint requires exact values)
    const strokeLower = stroke.toLowerCase();
    
    // Map variations to valid DB values
    const strokeMap = {
      'free': 'free',
      'freestyle': 'free',
      'fr': 'free',
      'back': 'back',
      'backstroke': 'back',
      'bk': 'back',
      'breast': 'breast',
      'breaststroke': 'breast',
      'br': 'breast',
      'fly': 'fly',
      'butterfly': 'fly',
      'fl': 'fly',
      'im': 'IM',  // Must be uppercase for DB
      'choice': 'choice',
      'drill': 'drill',
      'dr': 'drill',
      'kick': 'kick',
      'ki': 'kick'
    };
    
    if (strokeMap[strokeLower]) {
      stroke = strokeMap[strokeLower];
    } else {
      throw new Error(`Unknown stroke: "${stroke}". Use: free, back, breast, fly, IM, choice, drill, kick`);
    }

    return {
      order_index: orderIndex,
      reps,
      distance,
      stroke,
      interval: interval || null,
      description: description || null,
      equipment,
      intensity,
      notes: null
    };
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
              </h2>
              <p className="text-sm text-slate-500">Type fast like a doc - we'll parse it for you!</p>
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
                <>Processing...</>
              ) : saved ? (
                <>
                  <Check size={16} />
                  Saved!
                </>
              ) : (
                <>
                  <Save size={16} />
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
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 mb-2">Type Your Practice</h3>
            <div className="text-sm text-slate-600 space-y-1">
              <p>• Start sets with <code className="bg-slate-200 px-1 rounded">## SET NAME</code></p>
              <p>• Format items: <code className="bg-slate-200 px-1 rounded">4x100 Free @1:30 - descend (moderate) [fins]</code></p>
              <p>• Strokes: free, back, breast, fly, IM, choice, drill, kick</p>
              <p className="text-xs text-orange-600 font-medium">⚠️ Must match valid values or you'll get an error!</p>
            </div>
          </div>
          
          <textarea
            id="quick-entry-textarea"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            className="flex-1 p-6 font-mono text-base resize-none focus:outline-none"
            placeholder={`Type your practice here...

Example:

## WARMUP
4x100 Free @1:30 - easy
4x50 Choice @:50 - drill/swim

## MAIN SET
3x200 Free @2:45 - descend 1-3
4x50 Free @:45 - FAST (sprint)
1x100 Easy - recovery

## COOLDOWN
4x100 Choice - stretching
`}
            spellCheck={false}
          />
        </div>

        {/* Right: Instructions & Examples */}
        <div className="w-96 bg-slate-50 p-6 overflow-y-auto">
          <h3 className="font-bold text-slate-900 mb-4">Quick Reference</h3>

          {/* Parse Errors */}
          {parseErrors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle size={18} className="text-red-600 mt-0.5" />
                <h4 className="font-bold text-red-900">Parse Errors</h4>
              </div>
              <div className="text-sm text-red-800 space-y-1">
                {parseErrors.map((error, idx) => (
                  <p key={idx}>• {error}</p>
                ))}
              </div>
            </div>
          )}

          {/* Format Guide */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-slate-900 mb-2">Set Headers</h4>
              <code className="block bg-white p-2 rounded text-sm border">
                ## WARMUP<br/>
                ## MAIN SET<br/>
                ## TEST SET<br/>
                ## COOLDOWN
              </code>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 mb-2">Basic Items</h4>
              <code className="block bg-white p-2 rounded text-sm border">
                4x100 Free @1:30<br/>
                8x50 Back @:50<br/>
                200 IM
              </code>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 mb-2">With Description</h4>
              <code className="block bg-white p-2 rounded text-sm border">
                4x100 Free @1:30 - descend 1-4<br/>
                6x50 Fly @:55 - build each
              </code>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 mb-2">With Intensity</h4>
              <code className="block bg-white p-2 rounded text-sm border">
                4x50 Free @:45 (sprint)<br/>
                200 Free (easy)<br/>
                8x25 Free (race_pace)
              </code>
              <p className="text-xs text-slate-500 mt-1">
                Options: easy, moderate, fast, sprint, race_pace
              </p>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 mb-2">With Equipment</h4>
              <code className="block bg-white p-2 rounded text-sm border">
                4x100 Free @1:30 [fins]<br/>
                6x50 Free [paddles, snorkel]
              </code>
              <p className="text-xs text-slate-500 mt-1">
                Options: fins, paddles, snorkel, kickboard, pull_buoy, band
              </p>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 mb-2">Complete Example</h4>
              <code className="block bg-white p-2 rounded text-sm border">
                4x100 Free @1:30 - descend (moderate) [fins]
              </code>
            </div>

            <div>
              <h4 className="font-medium text-slate-900 mb-2">Strokes (any case works)</h4>
              <div className="text-sm text-slate-600">
                <p>• free (or freestyle, fr)</p>
                <p>• back (or backstroke, bk)</p>
                <p>• breast (or breaststroke, br)</p>
                <p>• fly (or butterfly, fl)</p>
                <p>• IM (or im)</p>
                <p>• choice</p>
                <p>• drill (or dr)</p>
                <p>• kick (or ki)</p>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                💡 All variations work! Type "Free", "free", "Freestyle", or "fr"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 border-t border-slate-200 p-4 text-center text-sm text-slate-500 shrink-0">
        💡 <strong>Pro Tip:</strong> Type naturally like you would in a doc. Click "Parse & Save" when done. 
        Then switch to Builder view to see the structured format or make fine adjustments.
      </div>
    </div>
  );
}

