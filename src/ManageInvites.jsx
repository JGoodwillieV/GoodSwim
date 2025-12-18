// src/ManageInvites.jsx
// Component for coaches to view and manage pending invites
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  Mail, Clock, Check, X, Copy, RefreshCw, Loader2, 
  Users, Link2, Trash2, ChevronLeft, Search, Filter,
  AlertCircle, CheckCircle, XCircle
} from 'lucide-react';
import InviteParentModal from './InviteParentModal';

// App URL - change this when you get a real domain
const APP_URL = 'https://storm-tracker-nine.vercel.app';

export default function ManageInvites({ swimmers = [], onBack }) {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, accepted, expired
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadInvites();
  }, []);

  const loadInvites = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parent_invites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with swimmer names
      const swimmerMap = swimmers.reduce((acc, s) => {
        acc[s.id] = s.name;
        return acc;
      }, {});

      const enrichedInvites = (data || []).map(invite => ({
        ...invite,
        swimmer_names: invite.swimmer_ids
          .map(id => swimmerMap[id])
          .filter(Boolean),
        is_expired: new Date(invite.expires_at) < new Date() && invite.status === 'pending'
      }));

      setInvites(enrichedInvites);
    } catch (err) {
      console.error('Error loading invites:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async (invite) => {
    const link = `${APP_URL}/invite/${invite.token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleRevoke = async (invite) => {
    if (!confirm(`Revoke invite for ${invite.email}?`)) return;

    try {
      const { error } = await supabase
        .from('parent_invites')
        .update({ status: 'revoked' })
        .eq('id', invite.id);

      if (error) throw error;
      loadInvites();
    } catch (err) {
      console.error('Error revoking invite:', err);
      alert('Failed to revoke invite');
    }
  };

  const handleResend = async (invite) => {
    // Create a new invite with same details
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('parent_invites')
        .insert({
          email: invite.email,
          account_name: invite.account_name,
          swimmer_ids: invite.swimmer_ids,
          invited_by: user.id
        });

      if (error) throw error;
      
      // Mark old one as revoked
      await supabase
        .from('parent_invites')
        .update({ status: 'revoked' })
        .eq('id', invite.id);

      loadInvites();
      alert('New invite created!');
    } catch (err) {
      console.error('Error resending:', err);
      alert('Failed to create new invite');
    }
  };

  // Filter invites
  const filteredInvites = invites.filter(invite => {
    // Search filter
    const searchMatch = 
      invite.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invite.account_name && invite.account_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      invite.swimmer_names.some(n => n.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Status filter
    let statusMatch = true;
    if (statusFilter === 'pending') statusMatch = invite.status === 'pending' && !invite.is_expired;
    else if (statusFilter === 'accepted') statusMatch = invite.status === 'accepted';
    else if (statusFilter === 'expired') statusMatch = invite.is_expired || invite.status === 'revoked';
    
    return searchMatch && statusMatch;
  });

  // Stats
  const stats = {
    total: invites.length,
    pending: invites.filter(i => i.status === 'pending' && !i.is_expired).length,
    accepted: invites.filter(i => i.status === 'accepted').length,
    expired: invites.filter(i => i.is_expired || i.status === 'revoked').length
  };

  const getStatusBadge = (invite) => {
    if (invite.status === 'accepted') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
          <CheckCircle size={12} />
          Accepted
        </span>
      );
    }
    if (invite.is_expired) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
          <Clock size={12} />
          Expired
        </span>
      );
    }
    if (invite.status === 'revoked') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
          <XCircle size={12} />
          Revoked
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
        <Clock size={12} />
        Pending
      </span>
    );
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysLeft = (expiresAt) => {
    const diff = new Date(expiresAt) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Expired';
    if (days === 0) return 'Expires today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ChevronLeft size={24} className="text-slate-600" />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Parent Invites</h2>
            <p className="text-slate-500">Manage invite links for parents</p>
          </div>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors"
        >
          <Link2 size={18} />
          New Invite
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-500">Total Invites</p>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-amber-600">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-green-600">Accepted</p>
          <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-sm text-slate-500">Expired/Revoked</p>
          <p className="text-2xl font-bold text-slate-400">{stats.expired}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by email, name, or swimmer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'pending', 'accepted', 'expired'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize ${
                statusFilter === status
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <button
          onClick={loadInvites}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          title="Refresh"
        >
          <RefreshCw size={18} className="text-slate-600" />
        </button>
      </div>

      {/* Invites List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : filteredInvites.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Mail size={48} className="text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">No invites found</h3>
          <p className="text-slate-500 mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your filters'
              : 'Create your first parent invite to get started'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl inline-flex items-center gap-2"
            >
              <Link2 size={18} />
              Create Invite
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInvites.map(invite => (
            <div 
              key={invite.id}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-bold text-slate-800 truncate">
                      {invite.account_name || invite.email}
                    </p>
                    {getStatusBadge(invite)}
                  </div>
                  
                  <p className="text-sm text-slate-500 flex items-center gap-2 mb-2">
                    <Mail size={14} />
                    {invite.email}
                  </p>
                  
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {invite.swimmer_names.map((name, idx) => (
                      <span 
                        key={idx}
                        className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span>Created {formatDate(invite.created_at)}</span>
                    {invite.status === 'pending' && !invite.is_expired && (
                      <span className="text-amber-500">{getDaysLeft(invite.expires_at)}</span>
                    )}
                    {invite.status === 'accepted' && invite.accepted_at && (
                      <span className="text-green-500">Accepted {formatDate(invite.accepted_at)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {invite.status === 'pending' && !invite.is_expired && (
                    <>
                      <button
                        onClick={() => handleCopyLink(invite)}
                        className={`p-2 rounded-lg transition-colors ${
                          copiedId === invite.id
                            ? 'bg-green-100 text-green-600'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                        title="Copy invite link"
                      >
                        {copiedId === invite.id ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                      <button
                        onClick={() => handleRevoke(invite)}
                        className="p-2 bg-slate-100 hover:bg-red-100 text-slate-600 hover:text-red-600 rounded-lg transition-colors"
                        title="Revoke invite"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                  {(invite.is_expired || invite.status === 'revoked') && (
                    <button
                      onClick={() => handleResend(invite)}
                      className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                      title="Create new invite"
                    >
                      <RefreshCw size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteParentModal
          swimmers={swimmers}
          onClose={() => {
            setShowInviteModal(false);
            loadInvites();
          }}
        />
      )}
    </div>
  );
}
