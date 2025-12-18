// src/components/Roster.jsx
// Team roster management component
import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Icon from './Icon';
import { supabase } from '../supabase';
import { checkMultipleResults } from '../utils/teamRecordsManager';
import { isValidTime } from '../utils/timeUtils';

export default function Roster({ 
  swimmers, 
  setSwimmers, 
  setViewSwimmer, 
  navigateTo, 
  setRecordBreaks, 
  setShowRecordModal,
  hideTitle = false
}) {
  const [showImport, setShowImport] = useState(false);
  const [importType, setImportType] = useState('roster'); 
  const [isImporting, setIsImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); 
  const fileInputRef = useRef(null);

  // --- FILTER & SORT ---
  const filteredSwimmers = useMemo(() => {
    const filtered = swimmers.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      const lastA = a.name.trim().split(' ').pop().toLowerCase();
      const lastB = b.name.trim().split(' ').pop().toLowerCase();
      
      if (lastA === lastB) {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      }
      return lastA.localeCompare(lastB);
    });
  }, [swimmers, searchQuery]);

  const calculateAge = (dobStr) => {
    if (!dobStr || dobStr.length !== 8) return null;
    const month = parseInt(dobStr.substring(0, 2)) - 1;
    const day = parseInt(dobStr.substring(2, 4));
    const year = parseInt(dobStr.substring(4, 8));
    const birthDate = new Date(year, month, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  // CSV Parser
  const parseCSVWithQuotes = (text) => {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') { 
          currentCell += '"'; 
          i++; 
        } else { 
          inQuotes = !inQuotes; 
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (currentCell || currentRow.length > 0) { 
          currentRow.push(currentCell.trim()); 
          rows.push(currentRow); 
          currentRow = []; 
          currentCell = ''; 
        }
        if (char === '\r' && nextChar === '\n') i++; 
      } else { 
        currentCell += char; 
      }
    }
    
    if (currentCell || currentRow.length > 0) { 
      currentRow.push(currentCell.trim()); 
      rows.push(currentRow); 
    }
    return rows;
  };

  // --- IMPORT HANDLER (Supports CSV & Excel Rows) ---
  const handleResultsImport = async (rows) => {
    const entriesToInsert = [];
    const swimmerMap = {}; 
    
    // Build Name Map
    swimmers.forEach(s => {
      const parts = s.name.toLowerCase().trim().split(' ');
      const first = parts[0];
      const last = parts[parts.length - 1];
      swimmerMap[`${last}, ${first}`] = s.id;
      swimmerMap[`${last},${first}`] = s.id;
    });

    // Skip header (i=1)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 5) continue; 

      const nameCell = row[1]; 
      const eventCell = row[2]; 
      const prelimTime = row[4];
      const finalsTime = row[5]; 
      const dateVal = row[10];  

      if (!nameCell) continue;

      let rawName = String(nameCell).split('\n')[0].replace(/['"]/g, '').trim().toLowerCase();
      let targetId = null;
      
      if (rawName.includes(',')) {
        const p = rawName.split(',');
        const last = p[0].trim();
        const firstChunk = p[1].trim().split(' ')[0]; 
        const key = `${last}, ${firstChunk}`;
        if (swimmerMap[key]) targetId = swimmerMap[key];
      }

      if (targetId) {
        let cleanEvent = String(eventCell).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Handle Date (Excel Object vs CSV String)
        let cleanDate = new Date().toISOString().split('T')[0];
        if (dateVal) {
          if (dateVal instanceof Date) {
            // Extract date in local timezone to avoid timezone shift
            const year = dateVal.getFullYear();
            const month = String(dateVal.getMonth() + 1).padStart(2, '0');
            const day = String(dateVal.getDate()).padStart(2, '0');
            cleanDate = `${year}-${month}-${day}`;
          } else if (typeof dateVal === 'string' && dateVal.includes('/')) {
            const dParts = dateVal.split('/'); 
            if (dParts.length === 3) {
              cleanDate = `20${dParts[2]}-${dParts[0].padStart(2, '0')}-${dParts[1].padStart(2, '0')}`;
            }
          }
        }

        if (isValidTime(prelimTime)) {
          entriesToInsert.push({ 
            swimmer_id: targetId, 
            event: `${cleanEvent} (Prelim)`, 
            time: String(prelimTime), 
            date: cleanDate, 
            video_url: null 
          });
        }
        if (isValidTime(finalsTime)) {
          entriesToInsert.push({ 
            swimmer_id: targetId, 
            event: `${cleanEvent} (Finals)`, 
            time: String(finalsTime), 
            date: cleanDate, 
            video_url: null 
          });
        }
      }
    }

    if (entriesToInsert.length > 0) {
      // Duplicate Check
      const uniqueSwimmerIds = [...new Set(entriesToInsert.map(e => e.swimmer_id))];
      const { data: existingData } = await supabase
        .from('results')
        .select('swimmer_id, event, time, date')
        .in('swimmer_id', uniqueSwimmerIds);

      const existingSignatures = new Set(
        existingData?.map(r => `${r.swimmer_id}|${r.event}|${r.time}|${r.date}`)
      );
      
      const newEntries = entriesToInsert.filter(
        e => !existingSignatures.has(`${e.swimmer_id}|${e.event}|${e.time}|${e.date}`)
      );

      if (newEntries.length > 0) {
        const { error } = await supabase.from('results').insert(newEntries);
        
        if (error) {
          alert('Database error: ' + error.message);
        } else { 
          // Check for team record breaks
          console.log('🔍 Checking for team record breaks...');
          
          try {
            const breaks = await checkMultipleResults(newEntries);
            
            if (breaks && breaks.length > 0) {
              console.log(`🎉 Found ${breaks.length} team record(s) broken!`, breaks);
              setRecordBreaks(breaks);
              setShowRecordModal(true);
              alert(`Success! Imported ${newEntries.length} results.\n\n🎉 ${breaks.length} TEAM RECORD(S) BROKEN! Check the modal.`);
            } else {
              alert(`Success! Imported ${newEntries.length} results. (${entriesToInsert.length - newEntries.length} skipped as duplicates)`);
            }
          } catch (err) {
            console.error('❌ Error checking for record breaks:', err);
            alert(`Success! Imported ${newEntries.length} results.\n\nNote: Could not check for record breaks. Error: ${err.message}`);
          }
          
          setShowImport(false); 
        }
      } else {
        alert('No new results found. All entries were duplicates.');
        setShowImport(false);
      }
    } else {
      alert('Found 0 valid matches.');
    }
  };

  // --- FILE SELECTION & PARSING ---
  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsImporting(true);
    
    const isExcel = file.name.match(/\.(xls|xlsx)$/i);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        // A. EXCEL FILE
        if (isExcel) {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          
          if (importType === 'results') {
            await handleResultsImport(rows);
          } else {
            alert('Excel import is currently only supported for Results. Use .sd3 for Roster.');
          }
        } 
        // B. TEXT/CSV FILE
        else {
          const text = event.target.result;
          if (importType === 'roster') {
            const newSwimmersData = await parseSD3Roster(text);
            if (newSwimmersData.length > 0) {
              const { data, error } = await supabase.from('swimmers').insert(newSwimmersData).select();
              if (error) throw error;
              setSwimmers(prev => [...prev, ...data]);
              alert(`Successfully imported ${data.length} swimmers!`);
              setShowImport(false);
            } else { 
              alert('No valid roster records found.'); 
            }
          } else { 
            const rows = parseCSVWithQuotes(text);
            await handleResultsImport(rows); 
          }
        }
      } catch (err) { 
        console.error(err); 
        alert('Error importing: ' + err.message); 
      } finally { 
        setIsImporting(false); 
      }
    };

    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
    
    e.target.value = null; 
  };

  // SD3 Logic
  const parseSD3Roster = async (text) => {
    const lines = text.split(/\r\n|\n/);
    const newEntries = [];
    const { data: { user } } = await supabase.auth.getUser();
    const d0Regex = /^D0\d[A-Z0-9]{2,6}\s+(.+?)\s+[A-Z0-9]{8,}/;
    
    lines.forEach((line) => {
      if (line.startsWith('D0')) {
        let cleanName = '';
        let age = null;
        let gender = 'M';
        const match = line.match(d0Regex);
        
        if (match && match[1]) {
          cleanName = match[1].trim();
        } else {
          let rawSection = line.substring(5, 45);
          cleanName = rawSection
            .replace(/^[A-Z0-9]{2,6}\s+/, '')
            .trim()
            .replace(/\s+[A-Z0-9]{5,}$/, '')
            .trim();
        }
        
        if (cleanName) {
          cleanName = cleanName.replace(/\s[A-Z0-9]{6,}$/i, '').trim();
          age = calculateAge(line.substring(55, 63).trim());
          const genderMatch = line.match(/\d{8}\s*\d{1,2}([MF])/);
          if (genderMatch) gender = genderMatch[1];

          if (cleanName.includes(',')) {
            const parts = cleanName.split(',');
            if (parts.length >= 2) {
              cleanName = `${parts[1].trim()} ${parts[0].trim()}`;
            }
          }
          
          const formattedName = cleanName
            .toLowerCase()
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
            
          newEntries.push({ 
            name: formattedName, 
            group_name: 'Imported', 
            status: 'New', 
            efficiency_score: 70, 
            age, 
            gender, 
            coach_id: user.id 
          });
        }
      }
    });
    
    return newEntries;
  };

  const handleAddManual = async () => {
    const name = window.prompt('Enter Swimmer Name:');
    if (!name) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    const newSwimmer = { 
      name, 
      group_name: 'Unassigned', 
      status: 'New', 
      efficiency_score: 50, 
      coach_id: user.id 
    };
    
    const { data, error } = await supabase.from('swimmers').insert([newSwimmer]).select();
    if (!error) setSwimmers(prev => [...prev, ...data]);
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col relative pb-24 md:pb-8">
      <header className="flex flex-col md:flex-row justify-between md:items-center mb-8 shrink-0 gap-4">
        {!hideTitle && <h2 className="text-2xl font-bold text-slate-800">Team Roster</h2>}
        
        <div className="relative w-full md:w-64">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search roster..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>

        <div className="flex gap-3 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <button 
            onClick={() => { setImportType('results'); setShowImport(true); }} 
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-blue-600 transition-colors whitespace-nowrap"
          >
            <Icon name="trophy" size={16} /> Import Results
          </button>
          <button 
            onClick={() => { setImportType('roster'); setShowImport(true); }} 
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Icon name="file-up" size={16} /> Import Roster
          </button>
          <button 
            onClick={handleAddManual} 
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Icon name="plus" size={16} /> Add Swimmer
          </button>
        </div>
      </header>
      
      {/* Roster Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-y-auto flex-1 min-h-0 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-4 font-medium bg-slate-50">Name</th>
              <th className="px-6 py-4 font-medium bg-slate-50">Group</th>
              <th className="px-6 py-4 font-medium bg-slate-50">Gender</th>
              <th className="px-6 py-4 font-medium bg-slate-50">Age</th>
              <th className="px-6 py-4 font-medium bg-slate-50">Date of Birth</th>
              <th className="px-6 py-4 font-medium text-right bg-slate-50">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSwimmers.length > 0 ? filteredSwimmers.map(s => (
              <tr 
                key={s.id} 
                onClick={() => setViewSwimmer(s)} 
                className="hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <td className="px-6 py-4 font-medium text-slate-900">{s.name}</td>
                <td className="px-6 py-4 text-slate-500">{s.group_name || 'Unassigned'}</td>
                <td className="px-6 py-4 text-slate-600">
                  {s.gender || '-'}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {s.age || '-'}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit' 
                  }) : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Edit
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                  No swimmers match "{searchQuery}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">
                {importType === 'roster' ? 'Import Team Roster' : 'Import Meet Results'}
              </h3>
              <button 
                onClick={() => setShowImport(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
              accept={importType === 'roster' ? '.sd3,.csv' : '.csv,.xls,.xlsx'} 
            />
            
            <div 
              onClick={() => fileInputRef.current.click()} 
              className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center bg-slate-50 mb-6 group cursor-pointer transition-colors ${
                importType === 'results' 
                  ? 'border-yellow-300 hover:bg-yellow-50' 
                  : 'border-slate-300 hover:bg-slate-100 hover:border-blue-400'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${
                importType === 'results' 
                  ? 'bg-yellow-100 text-yellow-600' 
                  : 'bg-blue-100 text-blue-600'
              }`}>
                <Icon name={importType === 'results' ? 'trophy' : 'file-up'} size={24} />
              </div>
              <p className="text-slate-800 font-bold text-lg mb-1">
                {isImporting ? 'Processing...' : 'Drag & drop or click to upload'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

