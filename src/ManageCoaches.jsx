import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useTeamRole } from './hooks/useTeamRole';
import InviteCoachModal from './InviteCoachModal';
import {
  UserPlus, Shield, Users, Eye, Crown, MoreVertical,
  Trash2, RefreshCw, ChevronDown, Mail, Clock,
  Check, X, AlertCircle, Loader2
} from 'lucide-react';

const ROLE_META = {
  owner:     { label: 'Owner',     icon: Crown,  color: 'amber',   bg: 'bg-amber-100',   text: 'text-amber-700' },
  admin:     { label: 'Admin',     icon: Shield, color: 'purple',  bg: 'bg-purple-100',  text: 'text-purple-700' },
  coach:     { label: 'Coach',     icon: Users,  color: 'blue',    bg: 'bg-blue-100',    text: 'text-blue-700' },
  assistant: { label: 'Assistant', icon: Eye,    color: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

const ASSIGNABLE_ROLES = ['admin', 'coach', 'assistant'];

export default function ManageCoaches() {
  const { teamId, isOwner, isOwnerOrAdmin } = useTeamRole();
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [changingRole, setChangingRole] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      // Fetch team members (coaches only, not parents)
      const { data: memberData, error: mErr } = await supabase
        .from('team_members')
        .select('id, user_id, role, accepted_at, created_at, invited_by')
        .eq('team_id', teamId)
        .in('role', ['owner', 'admin', 'coach', 'assistant'])
        .order('created_at');

      if (mErr) throw mErr;

      // Fetch display names for members
      const userIds = memberData.map(m => m.user_id).filter(Boolean);
      let profiles = [];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('id, display_name, first_name, last_name')
          .in('id', userIds);
        profiles = profileData || [];
      }

      const enriched = memberData.map(m => {
        const profile = profiles.find(p => p.id === m.user_id);
        return {
          ...m,
          display_name: profile?.display_name || profile?.first_name
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            : 'Unknown',
          email: null, // We don't expose emails from auth
        };
      });
      setMembers(enriched);

      // Fetch pending invites
      const { data: inviteData, error: iErr } = await supabase
        .from('coach_invites')
        .select('*')
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (iErr) throw iErr;
      setInvites(inviteData || []);
    } catch (err) {
      console.error('Error fetching team data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [teamId]);

  const handleChangeRole = async (memberId, newRole) => {
    setChangingRole(memberId);
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('id', memberId)
        .eq('team_id', teamId);
      if (error) throw error;
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
      setOpenMenuId(null);
    } catch (err) {
      console.error('Error changing role:', err);
      setError(err.message);
    } finally {
      setChangingRole(null);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this coach from the team? They will lose access to all team data.')) return;
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)
        .eq('team_id', teamId);
      if (error) throw error;
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err) {
      console.error('Error removing member:', err);
      setError(err.message);
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    try {
      const { error } = await supabase
        .from('coach_invites')
        .update({ status: 'revoked' })
        .eq('id', inviteId);
      if (error) throw error;
      setInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (err) {
      console.error('Error revoking invite:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Team Coaches</h3>
          <p className="text-sm text-slate-500">{members.length} coach{members.length !== 1 ? 'es' : ''} on team</p>
        </div>
        {isOwnerOrAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors"
          >
            <UserPlus size={16} />
            Invite Coach
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Active Members */}
      <div className="space-y-2">
        {members.map((member) => {
          const meta = ROLE_META[member.role] || ROLE_META.coach;
          const RoleIcon = meta.icon;
          const isCurrentUser = member.user_id === supabase.auth.getUser?.()?.data?.user?.id;
          const canManage = isOwnerOrAdmin && member.role !== 'owner' && !isCurrentUser;

          return (
            <div key={member.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center`}>
                <RoleIcon size={18} className={meta.text} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{member.display_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.text}`}>
                    {meta.label}
                  </span>
                  {member.accepted_at && (
                    <span className="text-xs text-slate-400">
                      Joined {new Date(member.accepted_at || member.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {canManage && (
                <div className="relative">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <MoreVertical size={16} className="text-slate-400" />
                  </button>

                  {openMenuId === member.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-20">
                      <p className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase">Change Role</p>
                      {ASSIGNABLE_ROLES.filter(r => r !== member.role).map(role => {
                        const rm = ROLE_META[role];
                        return (
                          <button
                            key={role}
                            onClick={() => handleChangeRole(member.id, role)}
                            disabled={changingRole === member.id}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <rm.icon size={14} className={rm.text} />
                            {rm.label}
                          </button>
                        );
                      })}
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        Remove from Team
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2">
            <Clock size={14} />
            Pending Invites ({invites.length})
          </h4>
          <div className="space-y-2">
            {invites.map((invite) => {
              const meta = ROLE_META[invite.role] || ROLE_META.coach;
              return (
                <div key={invite.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
                    <Mail size={18} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-700 truncate">{invite.name || invite.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${meta.bg} ${meta.text}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs text-slate-400">{invite.email}</span>
                    </div>
                  </div>
                  {isOwnerOrAdmin && (
                    <button
                      onClick={() => handleRevokeInvite(invite.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-400 hover:text-red-500"
                      title="Revoke invite"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {members.length <= 1 && invites.length === 0 && (
        <div className="text-center py-8 bg-slate-50 rounded-2xl">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-blue-500" />
          </div>
          <h4 className="font-bold text-slate-700 mb-1">No other coaches yet</h4>
          <p className="text-sm text-slate-500 mb-4">Invite coaches to share your roster, practices, and data.</p>
          {isOwnerOrAdmin && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors"
            >
              <UserPlus size={16} className="inline mr-2" />
              Invite Your First Coach
            </button>
          )}
        </div>
      )}

      {showInviteModal && (
        <InviteCoachModal
          onClose={() => {
            setShowInviteModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
