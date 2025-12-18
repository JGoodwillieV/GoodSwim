// src/ReportLayoutEditor.jsx
// Layout Editor for customizing meet report layouts

import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  REPORT_SECTIONS, 
  getSectionsByCategory, 
  getDefaultLayout,
  validateLayout 
} from './reportSections';
import {
  GripVertical, ChevronLeft, Save, Plus, Trash2, Eye, EyeOff,
  Settings, X, Check, Copy, LayoutTemplate, AlertCircle
} from 'lucide-react';

export default function ReportLayoutEditor({ onBack, initialLayout = null, reportFormat = 'modern' }) {
  const [layoutName, setLayoutName] = useState(initialLayout?.name || '');
  const [layoutDescription, setLayoutDescription] = useState(initialLayout?.description || '');
  const [sections, setSections] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [draggedItem, setDraggedItem] = useState(null);

  useEffect(() => {
    loadLayout();
  }, [initialLayout, reportFormat]);

  const loadLayout = () => {
    if (initialLayout?.layout_config) {
      setSections(initialLayout.layout_config.sections || []);
      setLayoutName(initialLayout.name);
      setLayoutDescription(initialLayout.description || '');
    } else {
      // Load default layout
      const defaultLayout = getDefaultLayout(reportFormat);
      setSections(defaultLayout.sections);
    }
    
    // Load available sections for this format
    const available = Object.values(REPORT_SECTIONS)
      .filter(s => s.availableIn.includes(reportFormat));
    setAvailableSections(available);
  };

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;
    
    const newSections = [...sections];
    const draggedSection = newSections[draggedItem];
    newSections.splice(draggedItem, 1);
    newSections.splice(index, 0, draggedSection);
    
    // Update order property
    newSections.forEach((section, idx) => {
      section.order = idx;
    });
    
    setSections(newSections);
    setDraggedItem(index);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const toggleSection = (index) => {
    const newSections = [...sections];
    newSections[index].enabled = !newSections[index].enabled;
    setSections(newSections);
  };

  const removeSection = (index) => {
    const newSections = sections.filter((_, idx) => idx !== index);
    newSections.forEach((section, idx) => {
      section.order = idx;
    });
    setSections(newSections);
  };

  const addSection = (sectionId) => {
    const sectionDef = REPORT_SECTIONS[sectionId];
    if (!sectionDef) return;
    
    // Check if already added
    if (sections.some(s => s.id === sectionId)) {
      setError('This section is already in your layout');
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    const newSection = {
      id: sectionId,
      type: sectionDef.category,
      enabled: true,
      order: sections.length,
      config: sectionDef.configurable ? Object.keys(sectionDef.config || {}).reduce((acc, key) => {
        acc[key] = sectionDef.config[key].default;
        return acc;
      }, {}) : {}
    };
    
    setSections([...sections, newSection]);
  };

  const updateSectionConfig = (index, key, value) => {
    const newSections = [...sections];
    newSections[index].config[key] = value;
    setSections(newSections);
  };

  const handleSave = async () => {
    if (!layoutName.trim()) {
      setError('Please enter a layout name');
      return;
    }
    
    const layoutConfig = { sections };
    const validation = validateLayout(layoutConfig);
    
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const layoutData = {
        coach_id: user.id,
        name: layoutName,
        description: layoutDescription || null,
        layout_config: layoutConfig
      };
      
      if (initialLayout?.id) {
        // Update existing
        const { error } = await supabase
          .from('report_layouts')
          .update(layoutData)
          .eq('id', initialLayout.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('report_layouts')
          .insert(layoutData);
        
        if (error) throw error;
      }
      
      setSuccess('Layout saved successfully!');
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const loadDefaultLayout = () => {
    if (confirm('Reset to default layout? This will discard any changes.')) {
      const defaultLayout = getDefaultLayout(reportFormat);
      setSections(defaultLayout.sections);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack} 
          className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutTemplate className="text-indigo-600" size={28} />
            Report Layout Editor
          </h2>
          <p className="text-slate-500">
            Customize your {reportFormat === 'modern' ? 'Modern' : 'Classic'} report layout
          </p>
        </div>
        <button
          onClick={loadDefaultLayout}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors"
        >
          Reset to Default
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !layoutName.trim()}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save size={18} />
          {saving ? 'Saving...' : 'Save Layout'}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-800">
          <Check size={20} />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Layout Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="font-bold text-slate-800 text-lg mb-4">Layout Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Layout Name *
                </label>
                <input
                  type="text"
                  value={layoutName}
                  onChange={(e) => setLayoutName(e.target.value)}
                  placeholder="e.g., Championship Meet Report"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={layoutDescription}
                  onChange={(e) => setLayoutDescription(e.target.value)}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
              
              <div className="pt-4 border-t border-slate-200">
                <div className="text-sm text-slate-600 space-y-2">
                  <div className="flex items-center justify-between">
                    <span>Total Sections:</span>
                    <span className="font-semibold">{sections.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Enabled:</span>
                    <span className="font-semibold text-green-600">
                      {sections.filter(s => s.enabled).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Disabled:</span>
                    <span className="font-semibold text-slate-400">
                      {sections.filter(s => !s.enabled).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Add Section */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <Plus size={20} />
              Add Section
            </h3>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {Object.entries(getSectionsByCategory()).map(([category, categorySections]) => {
                const filteredSections = categorySections.filter(s => 
                  s.availableIn.includes(reportFormat)
                );
                
                if (filteredSections.length === 0) return null;
                
                return (
                  <div key={category} className="mb-4">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      {category}
                    </div>
                    {filteredSections.map(section => {
                      const isAdded = sections.some(s => s.id === section.id);
                      return (
                        <button
                          key={section.id}
                          onClick={() => addSection(section.id)}
                          disabled={isAdded}
                          className={`w-full text-left p-3 rounded-xl border transition-colors mb-2 ${
                            isAdded
                              ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                          }`}
                        >
                          <div className="font-medium text-sm">{section.name}</div>
                          <div className="text-xs text-slate-500 mt-1">{section.description}</div>
                          {isAdded && (
                            <div className="text-xs text-slate-400 mt-1">✓ Already added</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Section List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="font-bold text-slate-800 text-lg mb-4">
              Report Sections ({sections.length})
            </h3>
            
            {sections.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <LayoutTemplate size={48} className="mx-auto mb-4 opacity-50" />
                <p>No sections added yet</p>
                <p className="text-sm">Add sections from the left panel</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sections.map((section, index) => {
                  const sectionDef = REPORT_SECTIONS[section.id];
                  if (!sectionDef) return null;
                  
                  return (
                    <div
                      key={`${section.id}-${index}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`border rounded-xl p-4 transition-all ${
                        section.enabled
                          ? 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                          : 'bg-slate-50 border-slate-200 opacity-60'
                      } ${draggedItem === index ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <button className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
                          <GripVertical size={20} />
                        </button>
                        
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800">{sectionDef.name}</div>
                          <div className="text-xs text-slate-500">{sectionDef.description}</div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {sectionDef.configurable && (
                            <button
                              onClick={() => setShowConfig(showConfig === section.id ? null : section.id)}
                              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                              title="Configure"
                            >
                              <Settings size={18} />
                            </button>
                          )}
                          
                          <button
                            onClick={() => toggleSection(index)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title={section.enabled ? 'Disable' : 'Enable'}
                          >
                            {section.enabled ? (
                              <Eye size={18} className="text-green-600" />
                            ) : (
                              <EyeOff size={18} className="text-slate-400" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => removeSection(index)}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                            title="Remove"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Configuration Panel */}
                      {showConfig === section.id && sectionDef.configurable && (
                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                          <div className="text-sm font-semibold text-slate-700 mb-2">
                            Section Configuration
                          </div>
                          {Object.entries(sectionDef.config || {}).map(([key, configDef]) => (
                            <div key={key}>
                              <label className="block text-xs font-medium text-slate-600 mb-1">
                                {configDef.label}
                              </label>
                              {configDef.type === 'number' ? (
                                <input
                                  type="number"
                                  value={section.config[key] || configDef.default}
                                  onChange={(e) => updateSectionConfig(index, key, parseInt(e.target.value))}
                                  min={configDef.min}
                                  max={configDef.max}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                />
                              ) : configDef.type === 'boolean' ? (
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={section.config[key] ?? configDef.default}
                                    onChange={(e) => updateSectionConfig(index, key, e.target.checked)}
                                    className="rounded border-slate-300"
                                  />
                                  <span className="text-sm text-slate-600">
                                    {section.config[key] ?? configDef.default ? 'Yes' : 'No'}
                                  </span>
                                </label>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

