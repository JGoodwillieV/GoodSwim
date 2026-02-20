import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../supabase';

const TeamRoleContext = createContext(null);

const PERMISSIONS = {
  owner:     { canManageRoster: true,  canManagePractices: true,  canManageTestSets: true,  canManageMeets: true,  canViewReports: true,  canManageBilling: true,  canInviteCoaches: true,  canManageStaff: true  },
  admin:     { canManageRoster: true,  canManagePractices: true,  canManageTestSets: true,  canManageMeets: true,  canViewReports: true,  canManageBilling: false, canInviteCoaches: true,  canManageStaff: true  },
  coach:     { canManageRoster: true,  canManagePractices: true,  canManageTestSets: true,  canManageMeets: true,  canViewReports: true,  canManageBilling: false, canInviteCoaches: false, canManageStaff: false },
  assistant: { canManageRoster: false, canManagePractices: true,  canManageTestSets: true,  canManageMeets: false, canViewReports: true,  canManageBilling: false, canInviteCoaches: false, canManageStaff: false },
  parent:    { canManageRoster: false, canManagePractices: false, canManageTestSets: false, canManageMeets: false, canViewReports: true,  canManageBilling: false, canInviteCoaches: false, canManageStaff: false },
};

export function TeamRoleProvider({ children }) {
  const [role, setRole] = useState(null);
  const [teamId, setTeamId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: membership, error } = await supabase
          .from('team_members')
          .select('team_id, role')
          .eq('user_id', user.id)
          .not('role', 'eq', 'parent')
          .maybeSingle();

        if (error) { console.error('Error fetching team role:', error); setLoading(false); return; }

        if (membership) {
          setTeamId(membership.team_id);
          setRole(membership.role);
        } else {
          const { data: parentMembership } = await supabase
            .from('team_members')
            .select('team_id, role')
            .eq('user_id', user.id)
            .eq('role', 'parent')
            .maybeSingle();
          if (parentMembership) {
            setTeamId(parentMembership.team_id);
            setRole('parent');
          }
        }
      } catch (err) {
        console.error('TeamRole hook error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRole();
  }, []);

  const perms = PERMISSIONS[role] || PERMISSIONS.parent;

  const value = {
    role,
    teamId,
    loading,
    isOwner: role === 'owner',
    isAdmin: role === 'admin',
    isCoach: role === 'coach',
    isAssistant: role === 'assistant',
    isParent: role === 'parent',
    isOwnerOrAdmin: role === 'owner' || role === 'admin',
    ...perms,
  };

  return (
    <TeamRoleContext.Provider value={value}>
      {children}
    </TeamRoleContext.Provider>
  );
}

export function useTeamRole() {
  const ctx = useContext(TeamRoleContext);
  if (!ctx) {
    return {
      role: null, teamId: null, loading: true,
      isOwner: false, isAdmin: false, isCoach: false, isAssistant: false, isParent: false, isOwnerOrAdmin: false,
      canManageRoster: false, canManagePractices: false, canManageTestSets: false,
      canManageMeets: false, canViewReports: false, canManageBilling: false,
      canInviteCoaches: false, canManageStaff: false,
    };
  }
  return ctx;
}
