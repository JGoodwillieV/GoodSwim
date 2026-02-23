import React, { useState, useCallback } from 'react';
import { X, Upload, FileText, ChevronRight, ChevronLeft, Check, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../supabase';
import { useTeamRole } from '../hooks/useTeamRole';
import { parseTimeStandardsFile } from '../utils/timeStandardsParser';
import { LSC_LIST } from '../utils/lscList';

const STEPS = ['Upload File', 'Details', 'Preview & Confirm'];

const courseBadgeColor = (course) => {
  if (course === 'SCY') return 'bg-blue-100 text-blue-700';
  if (course === 'LCM') return 'bg-emerald-100 text-emerald-700';
  if (course === 'SCM') return 'bg-purple-100 text-purple-700';
  return 'bg-slate-100 text-slate-600';
};

export default function TimeStandardsUpload({ onClose, onComplete }) {
  const { teamId } = useTeamRole();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [parsedResult, setParsedResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [usedAI, setUsedAI] = useState(false);

  const [metadata, setMetadata] = useState({
    name: '',
    lsc: '',
    season: '',
    is_public: true,
  });

  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) handleFileSelect(dropped);
  }, []);

  const handleFileSelect = async (selectedFile) => {
    setFile(selectedFile);
    setParseError(null);
    setParsing(true);
    setUsedAI(false);

    try {
      const result = await parseTimeStandardsFile(selectedFile);
      setParsedResult(result);

      const aiWasUsed = selectedFile.name.toLowerCase().endsWith('.pdf') && result.entries.length > 0;
      setUsedAI(aiWasUsed);

      setMetadata(prev => ({
        ...prev,
        name: result.metadata.name || prev.name || selectedFile.name.replace(/\.[^.]+$/, ''),
        season: result.metadata.season || prev.season,
      }));
      setStep(1);
    } catch (err) {
      console.error('Parse error:', err);
      setParseError(err.message || 'Failed to parse file.');
    } finally {
      setParsing(false);
    }
  };

  const handleSave = async () => {
    if (!teamId || !parsedResult || parsedResult.entries.length === 0) return;
    setSaving(true);

    try {
      let sourceUrl = null;
      if (file) {
        const path = `${teamId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('time-standards')
          .upload(path, file, { contentType: file.type });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('time-standards').getPublicUrl(path);
          sourceUrl = urlData?.publicUrl;
        }
      }

      const lscName = metadata.lsc ? LSC_LIST.find(l => String(l.id) === String(metadata.lsc))?.name || null : null;

      // Determine set-level course: null if mixed, otherwise the single course
      const coursesInEntries = [...new Set(parsedResult.entries.map(e => e.course))];
      const setCourse = coursesInEntries.length === 1 ? coursesInEntries[0] : null;

      const { data: setData, error: setError } = await supabase
        .from('time_standard_sets')
        .insert({
          name: metadata.name.trim(),
          organization: lscName,
          season: metadata.season.trim() || null,
          course: setCourse,
          created_by_team_id: teamId,
          is_public: metadata.is_public,
          source_file_url: sourceUrl,
          status: 'active',
        })
        .select('id')
        .single();

      if (setError) throw setError;

      const entries = parsedResult.entries.map(e => ({
        set_id: setData.id,
        standard_name: e.standard_name,
        event: e.event,
        gender: e.gender,
        age_min: e.age_min,
        age_max: e.age_max,
        course: e.course || 'SCY',
        time_seconds: e.time_seconds,
        time_string: e.time_string,
      }));

      const BATCH_SIZE = 500;
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const { error: entryError } = await supabase
          .from('time_standard_entries')
          .insert(batch);
        if (entryError) throw entryError;
      }

      const { error: selError } = await supabase
        .from('team_standard_selections')
        .insert({ team_id: teamId, set_id: setData.id });
      if (selError && selError.code !== '23505') throw selError;

      onComplete();
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save time standards. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const entryCount = parsedResult?.entries?.length || 0;
  const uniqueEvents = parsedResult ? [...new Set(parsedResult.entries.map(e => e.event))].sort() : [];
  const detectedCourses = parsedResult ? [...new Set(parsedResult.entries.map(e => e.course))] : [];

  const groupedPreview = {};
  if (parsedResult) {
    for (const e of parsedResult.entries) {
      const key = e.event;
      if (!groupedPreview[key]) groupedPreview[key] = [];
      groupedPreview[key].push(e);
    }
  }

  const selectedLSCName = metadata.lsc ? LSC_LIST.find(l => String(l.id) === String(metadata.lsc))?.name : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Upload Time Standards</h2>
            <div className="flex items-center gap-2 mt-2">
              {STEPS.map((label, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    i < step ? 'bg-green-500 text-white' :
                    i === step ? 'bg-blue-600 text-white' :
                    'bg-slate-200 text-slate-500'
                  }`}>
                    {i < step ? <Check size={12} /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:inline ${
                    i === step ? 'text-blue-600' : 'text-slate-400'
                  }`}>{label}</span>
                  {i < STEPS.length - 1 && <ChevronRight size={14} className="text-slate-300 mx-1" />}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 0: File Upload */}
          {step === 0 && (
            <div>
              <div
                onDrop={handleFileDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('ts-file-input').click()}
              >
                {parsing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="text-blue-500 animate-spin" />
                    <p className="text-slate-600 font-medium">Parsing file...</p>
                    <p className="text-xs text-slate-400">AI is analyzing your document</p>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-700 font-medium mb-1">
                      Drop a file here, or click to browse
                    </p>
                    <p className="text-sm text-slate-400">
                      Supports PDF, CSV, and Excel (.xls, .xlsx)
                    </p>
                    <p className="text-xs text-slate-300 mt-2 flex items-center justify-center gap-1">
                      <Sparkles size={12} /> AI-powered parsing for PDFs
                    </p>
                  </>
                )}
              </div>
              <input
                id="ts-file-input"
                type="file"
                accept=".pdf,.csv,.xls,.xlsx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files[0]) handleFileSelect(e.target.files[0]);
                }}
              />

              {parseError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                  <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{parseError}</p>
                </div>
              )}

              {file && !parsing && !parseError && (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  <FileText size={18} className="text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Metadata */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={metadata.name}
                  onChange={(e) => setMetadata(prev => ({ ...prev, name: e.target.value }))}
                  placeholder='e.g., "PVS LC Champs 2025 Qualifying Times"'
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">LSC</label>
                  <select
                    value={metadata.lsc}
                    onChange={(e) => setMetadata(prev => ({ ...prev, lsc: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="">Select LSC...</option>
                    {LSC_LIST.map(lsc => (
                      <option key={lsc.id} value={lsc.id}>{lsc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Season</label>
                  <input
                    type="text"
                    value={metadata.season}
                    onChange={(e) => setMetadata(prev => ({ ...prev, season: e.target.value }))}
                    placeholder="e.g., 2025-2026"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Auto-detected courses */}
              {detectedCourses.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Detected courses:</span>
                  <div className="flex gap-1.5">
                    {detectedCourses.map(c => (
                      <span key={c} className={`text-xs px-2 py-0.5 rounded-full font-medium ${courseBadgeColor(c)}`}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={metadata.is_public}
                    onChange={(e) => setMetadata(prev => ({ ...prev, is_public: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-700">Share with other teams</span>
                    <p className="text-xs text-slate-400">Other teams can find and use these standards</p>
                  </div>
                </label>
              </div>

              {entryCount > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
                  <Check size={16} className="text-green-600" />
                  <p className="text-sm text-green-700">
                    <span className="font-semibold">{entryCount}</span> time entries parsed across{' '}
                    <span className="font-semibold">{uniqueEvents.length}</span> events
                    {usedAI && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-violet-600">
                        <Sparkles size={10} /> via AI
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 2 && (
            <div>
              <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div><span className="text-slate-500">Name:</span> <span className="font-medium text-slate-800">{metadata.name}</span></div>
                  <div>
                    <span className="text-slate-500">Course:</span>{' '}
                    <span className="inline-flex gap-1">
                      {detectedCourses.map(c => (
                        <span key={c} className={`text-xs px-1.5 py-0.5 rounded font-medium ${courseBadgeColor(c)}`}>{c}</span>
                      ))}
                    </span>
                  </div>
                  {selectedLSCName && <div><span className="text-slate-500">LSC:</span> <span className="font-medium text-slate-800">{selectedLSCName}</span></div>}
                  {metadata.season && <div><span className="text-slate-500">Season:</span> <span className="font-medium text-slate-800">{metadata.season}</span></div>}
                  <div><span className="text-slate-500">Entries:</span> <span className="font-semibold text-blue-600">{entryCount}</span></div>
                  <div><span className="text-slate-500">Sharing:</span> <span className="font-medium text-slate-800">{metadata.is_public ? 'Public' : 'Private'}</span></div>
                </div>
              </div>

              {entryCount === 0 ? (
                <div className="p-6 text-center">
                  <AlertCircle size={32} className="text-amber-500 mx-auto mb-2" />
                  <p className="text-slate-600 font-medium">No entries were parsed from this file.</p>
                  <p className="text-sm text-slate-400 mt-1">Try a different file format or check the file contents.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {Object.entries(groupedPreview).map(([event, entries]) => (
                    <div key={event} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 border-b border-slate-200">
                        {event} <span className="text-slate-400 font-normal">({entries.length} entries)</span>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-slate-500 border-b border-slate-100">
                            <th className="text-left px-3 py-1.5 font-medium">Gender</th>
                            <th className="text-left px-3 py-1.5 font-medium">Ages</th>
                            <th className="text-left px-3 py-1.5 font-medium">Cut</th>
                            <th className="text-left px-3 py-1.5 font-medium">Course</th>
                            <th className="text-right px-3 py-1.5 font-medium">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.slice(0, 10).map((e, i) => (
                            <tr key={i} className="border-b border-slate-50 last:border-0">
                              <td className="px-3 py-1.5 text-slate-600">{e.gender === 'M' ? 'Boys' : 'Girls'}</td>
                              <td className="px-3 py-1.5 text-slate-600">
                                {e.age_min === 0 ? `${e.age_max} & Under` : e.age_max >= 99 ? `${e.age_min} & Over` : `${e.age_min}-${e.age_max}`}
                              </td>
                              <td className="px-3 py-1.5 text-slate-500">{e.standard_name}</td>
                              <td className="px-3 py-1.5">
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${courseBadgeColor(e.course)}`}>{e.course}</span>
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono text-slate-900">{e.time_string}</td>
                            </tr>
                          ))}
                          {entries.length > 10 && (
                            <tr><td colSpan={5} className="px-3 py-1.5 text-xs text-slate-400 text-center">...and {entries.length - 10} more</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={() => step === 0 ? onClose() : setStep(step - 1)}
            className="inline-flex items-center gap-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            <ChevronLeft size={16} />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 0 && (!file || parsing)) ||
                (step === 1 && !metadata.name.trim())
              }
              className="inline-flex items-center gap-1 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving || entryCount === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Save Standards
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
