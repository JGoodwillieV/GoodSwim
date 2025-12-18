import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
  ChevronLeft,
  Search,
  BookOpen,
  Copy,
  Trash2,
  Star,
  Users,
  Lock,
  Filter,
  Plus,
  Eye,
  Zap
} from 'lucide-react';

export default function TemplateLibrary({ onBack, onLoadTemplate, onCreateFromTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('my'); // 'my' or 'team'
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, [viewMode]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      let query = supabase
        .from('practice_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (viewMode === 'my') {
        // Show only user's templates
        query = query.eq('coach_id', user.id);
      } else if (viewMode === 'team') {
        // Show shared templates OR user's own templates
        query = query.or(`is_shared.eq.true,coach_id.eq.${user.id}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Delete this template? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('practice_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== templateId));
      alert('Template deleted successfully!');
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template: ' + error.message);
    }
  };

  const handleToggleShare = async (template) => {
    try {
      const newShareStatus = !template.is_shared;

      const { error } = await supabase
        .from('practice_templates')
        .update({ is_shared: newShareStatus })
        .eq('id', template.id);

      if (error) throw error;

      setTemplates(prev => prev.map(t => 
        t.id === template.id ? { ...t, is_shared: newShareStatus } : t
      ));

      alert(newShareStatus ? 'Template shared with team!' : 'Template made private');
    } catch (error) {
      console.error('Error toggling share:', error);
      alert('Failed to update sharing: ' + error.message);
    }
  };

  const handleCreateFromTemplate = async (template) => {
    if (!onCreateFromTemplate) {
      alert('This feature is not available in this context');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Create new practice from template
      const newPractice = {
        coach_id: user.id,
        created_by: user.id,
        title: `${template.name} (from template)`,
        description: template.description,
        status: 'draft',
        focus_tags: template.category || [],
        total_yards: 0
      };

      const { data: practiceData, error: practiceError } = await supabase
        .from('practices')
        .insert([newPractice])
        .select()
        .single();

      if (practiceError) throw practiceError;

      // Copy sets and items from template
      const templateSets = template.template_data?.sets || [];
      
      for (const set of templateSets) {
        const { practice_set_items, id, created_at, ...setData } = set;
        const newSet = {
          ...setData,
          practice_id: practiceData.id
        };

        const { data: setInsertData, error: setError } = await supabase
          .from('practice_sets')
          .insert([newSet])
          .select()
          .single();

        if (setError) throw setError;

        // Copy items
        if (practice_set_items && practice_set_items.length > 0) {
          const newItems = practice_set_items.map(item => {
            const { id, created_at, ...itemData } = item;
            return {
              ...itemData,
              set_id: setInsertData.id
            };
          });

          const { error: itemsError } = await supabase
            .from('practice_set_items')
            .insert(newItems);

          if (itemsError) throw itemsError;
        }
      }

      alert('Practice created from template!');
      onCreateFromTemplate(practiceData.id);
    } catch (error) {
      console.error('Error creating from template:', error);
      alert('Failed to create practice from template: ' + error.message);
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    // Search filter
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // Category filter
    const matchesCategory = 
      categoryFilter === 'all' || 
      template.category?.includes(categoryFilter);

    return matchesSearch && matchesCategory;
  });

  // Get all unique categories
  const allCategories = [...new Set(
    templates.flatMap(t => t.category || [])
  )].sort();

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 md:p-6 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <BookOpen size={28} className="text-purple-600" />
                Template Library
              </h2>
              <p className="text-slate-500 text-sm">Browse and load saved practice templates</p>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setViewMode('my')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'my'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Lock size={16} className="inline mr-2" />
            My Templates
          </button>
          <button
            onClick={() => setViewMode('team')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'team'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users size={16} className="inline mr-2" />
            Team Library
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">All Categories</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading templates...</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-400 mb-2">
              {searchQuery || categoryFilter !== 'all' 
                ? 'No templates match your search'
                : 'No templates yet'}
            </p>
            {viewMode === 'my' && !searchQuery && categoryFilter === 'all' && (
              <p className="text-slate-500 text-sm">
                Create templates by clicking "Save as Template" in the Practice Builder
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => setSelectedTemplate(template)}
                onDelete={() => handleDeleteTemplate(template.id)}
                onToggleShare={() => handleToggleShare(template)}
                onCreateFrom={() => handleCreateFromTemplate(template)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <TemplateDetailModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onCreate={() => handleCreateFromTemplate(selectedTemplate)}
        />
      )}
    </div>
  );
}

// Template Card Component
function TemplateCard({ template, onSelect, onDelete, onToggleShare, onCreateFrom }) {
  const totalYards = template.template_data?.practice?.total_yards || 
    template.template_data?.sets?.reduce((sum, set) => sum + (set.total_yards || 0), 0) || 0;

  const isOwner = template.coach_id === template.created_by; // Simplified check

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg transition-shadow cursor-pointer group">
      <div onClick={onSelect}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-slate-900 mb-1 group-hover:text-purple-600 transition-colors">
              {template.name}
            </h3>
            {template.description && (
              <p className="text-sm text-slate-500 line-clamp-2">{template.description}</p>
            )}
          </div>
          {template.is_shared && (
            <div className="ml-2">
              <Users size={16} className="text-purple-600" title="Shared with team" />
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mb-3 text-sm text-slate-600">
          <div>
            <span className="font-bold text-slate-900">{totalYards}</span> yards
          </div>
          <div>
            <span className="font-bold text-slate-900">
              {template.template_data?.sets?.length || 0}
            </span> sets
          </div>
        </div>

        {/* Categories */}
        {template.category && template.category.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.category.slice(0, 3).map((cat, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium"
              >
                {cat}
              </span>
            ))}
            {template.category.length > 3 && (
              <span className="px-2 py-1 bg-slate-50 text-slate-600 rounded text-xs">
                +{template.category.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
        <button
          onClick={onCreateFrom}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
        >
          <Plus size={14} />
          Use Template
        </button>
        <button
          onClick={onSelect}
          className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          title="View details"
        >
          <Eye size={16} />
        </button>
        {isOwner && (
          <>
            <button
              onClick={onToggleShare}
              className={`px-3 py-2 border rounded-lg transition-colors ${
                template.is_shared
                  ? 'border-purple-200 text-purple-600 bg-purple-50'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title={template.is_shared ? 'Make private' : 'Share with team'}
            >
              {template.is_shared ? <Users size={16} /> : <Lock size={16} />}
            </button>
            <button
              onClick={onDelete}
              className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              title="Delete template"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Template Detail Modal
function TemplateDetailModal({ template, onClose, onCreate }) {
  const sets = template.template_data?.sets || [];
  const totalYards = sets.reduce((sum, set) => sum + (set.total_yards || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">{template.name}</h2>
            {template.description && (
              <p className="text-slate-600">{template.description}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <ChevronLeft size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Stats */}
          <div className="flex items-center gap-6 mb-6 p-4 bg-purple-50 rounded-xl">
            <div>
              <div className="text-sm text-purple-600 font-medium">Total Yardage</div>
              <div className="text-2xl font-bold text-purple-900">{totalYards}</div>
            </div>
            <div>
              <div className="text-sm text-purple-600 font-medium">Sets</div>
              <div className="text-2xl font-bold text-purple-900">{sets.length}</div>
            </div>
            {template.category && template.category.length > 0 && (
              <div className="flex-1">
                <div className="text-sm text-purple-600 font-medium mb-2">Focus</div>
                <div className="flex flex-wrap gap-2">
                  {template.category.map((cat, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-white text-purple-700 rounded-full text-sm font-medium"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sets */}
          <div className="space-y-4">
            {sets.map((set, setIdx) => (
              <div key={setIdx} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900">{set.name}</h3>
                  <span className="text-sm text-slate-500">{set.total_yards || 0} yards</span>
                </div>
                {set.practice_set_items && set.practice_set_items.length > 0 && (
                  <div className="space-y-2">
                    {set.practice_set_items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex items-start gap-3 text-sm">
                        <span className="text-slate-400">{itemIdx + 1}.</span>
                        <div className="flex-1">
                          <span className="font-mono font-bold text-slate-900">
                            {item.reps} × {item.distance}
                          </span>
                          <span className="text-slate-600 ml-2">
                            {item.stroke.charAt(0).toUpperCase() + item.stroke.slice(1)}
                          </span>
                          {item.interval && (
                            <span className="text-blue-600 ml-2">@ {item.interval}</span>
                          )}
                          {item.description && (
                            <span className="text-slate-500 ml-2">- {item.description}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 p-6 flex items-center gap-3">
          <button
            onClick={onCreate}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} />
            Create Practice from Template
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

