// Record Break Modal - Shows when team records are broken
import React, { useState } from 'react';
import { Trophy, TrendingDown, Calendar, Award, X, CheckCircle } from 'lucide-react';
import { updateMultipleRecords } from './utils/teamRecordsManager';

export default function RecordBreakModal({ isOpen, recordBreaks, onClose, onUpdate }) {
  const [updating, setUpdating] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState(
    new Set(recordBreaks.map((_, idx) => idx))
  );

  if (!isOpen || !recordBreaks || recordBreaks.length === 0) return null;

  const handleToggle = (index) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRecords(newSelected);
  };

  const handleUpdateRecords = async () => {
    setUpdating(true);
    try {
      const recordsToUpdate = recordBreaks.filter((_, idx) => selectedRecords.has(idx));
      const results = await updateMultipleRecords(recordsToUpdate);
      
      if (results.success.length > 0) {
        alert(`✅ Successfully updated ${results.success.length} team record(s)!`);
      }
      if (results.failed.length > 0) {
        alert(`⚠️ Failed to update ${results.failed.length} record(s). Check console for details.`);
      }
      
      onUpdate(results);
      onClose();
    } catch (error) {
      console.error('Error updating records:', error);
      alert('Error updating records: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 w-full max-w-2xl rounded-2xl border-2 border-yellow-500 shadow-2xl shadow-yellow-500/20 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Celebration Header */}
        <div className="relative bg-gradient-to-r from-yellow-600 via-orange-500 to-yellow-600 p-6 text-center">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxwYXR0ZXJuIGlkPSJzdGFycyIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjMpIi8+CiAgICA8L3BhdHRlcm4+CiAgPC9kZWZzPgogIDxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjc3RhcnMpIi8+Cjwvc3ZnPg==')] opacity-20"></div>
          
          <div className="relative">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Trophy size={40} className="text-white animate-bounce" />
              <h2 className="text-3xl font-black text-white">
                🎉 TEAM RECORD{recordBreaks.length > 1 ? 'S' : ''} BROKEN! 🎉
              </h2>
              <Trophy size={40} className="text-white animate-bounce" style={{ animationDelay: '0.1s' }} />
            </div>
            <p className="text-white/90 font-semibold">
              {recordBreaks.length} swimmer{recordBreaks.length > 1 ? 's have' : ' has'} set new team record{recordBreaks.length > 1 ? 's' : ''}!
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Records List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {recordBreaks.map((record, index) => (
            <div
              key={index}
              className={`bg-slate-800 rounded-xl border-2 transition-all ${
                selectedRecords.has(index)
                  ? 'border-yellow-500 shadow-lg shadow-yellow-500/20'
                  : 'border-slate-700'
              }`}
            >
              {/* Selection Checkbox */}
              <div className="flex items-start gap-4 p-4">
                <div className="flex-shrink-0 pt-1">
                  <button
                    onClick={() => handleToggle(index)}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                      selectedRecords.has(index)
                        ? 'bg-yellow-500 border-yellow-500'
                        : 'bg-slate-700 border-slate-600 hover:border-yellow-500'
                    }`}
                  >
                    {selectedRecords.has(index) && <CheckCircle size={20} className="text-white" />}
                  </button>
                </div>

                <div className="flex-1">
                  {/* Swimmer Name & Event */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Award size={20} className="text-yellow-500" />
                        {record.swimmer_name}
                      </h3>
                      <p className="text-slate-400 text-sm">
                        {record.gender} {record.age_group} • {record.event}
                      </p>
                    </div>
                  </div>

                  {/* Time Comparison */}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    {/* New Record */}
                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg p-3">
                      <div className="text-emerald-200 text-xs font-semibold mb-1">NEW RECORD</div>
                      <div className="text-white text-2xl font-bold font-mono">{record.time_display}</div>
                      <div className="text-emerald-200 text-xs mt-1 flex items-center gap-1">
                        <Calendar size={12} />
                        {(() => {
                          const [year, month, day] = record.date.split('T')[0].split('-');
                          const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                          return dateObj.toLocaleDateString();
                        })()}
                      </div>
                    </div>

                    {/* Previous Record */}
                    {record.previous_record ? (
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <div className="text-slate-400 text-xs font-semibold mb-1">PREVIOUS RECORD</div>
                        <div className="text-slate-300 text-2xl font-bold font-mono line-through">
                          {record.previous_record.time_display}
                        </div>
                        <div className="text-slate-400 text-xs mt-1">
                          {record.previous_record.swimmer_name}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-center">
                        <div className="text-slate-400 text-sm text-center">
                          First recorded<br />team record!
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Improvement */}
                  {record.improvement && (
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                      <TrendingDown size={16} />
                      <span>
                        Improved by {record.improvement.toFixed(2)} seconds!
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="p-6 bg-slate-900 border-t border-slate-700">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              disabled={updating}
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateRecords}
              disabled={selectedRecords.size === 0 || updating}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:from-slate-700 disabled:to-slate-700 text-white rounded-lg font-bold transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {updating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Trophy size={20} />
                  Update {selectedRecords.size} Record{selectedRecords.size !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
          
          <p className="text-slate-400 text-xs text-center mt-3">
            Selected records will be updated in the team records database
          </p>
        </div>
      </div>
    </div>
  );
}

