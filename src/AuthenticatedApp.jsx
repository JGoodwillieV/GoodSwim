// src/App.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

// Auth & Landing
import Login from './Login';
import InviteLanding from './InviteLanding';
import InstallPrompt from './InstallPrompt';

// Extracted Components
import { 
  Sidebar, 
  MobileNav, 
  ParentSidebar, 
  ParentMobileNav,
  Dashboard,
  Roster,
  SwimmerProfile,
  Breadcrumb
} from './components';

// Feature Components
import Standards from './Standards';
import Analysis from './Analysis';
import AnalysisResult from './AnalysisResult';
import TrophyCase from './TrophyCase';
import VersatilityChart from './VersatilityChart';
import MotivationalTimesChart from './MotivationalTimesChart';
import PhotoGallery from './PhotoGallery';
import AllPhotos from './AllPhotos';
import Reports from './Reports';
import TestSetTracker from './TestSetTracker';
import { RecentTestSets, TestSetsList, SwimmerPracticeTab } from './TestSetDisplay';
import { CategoryProgressReport } from './CategoryProgressReport';
import ParentDashboard from './ParentDashboard';
import NotificationSettings from './NotificationSettings';
import ParentMessages from './ParentMessages';
import AIChat from './AIChat';
import AnnouncementsManager, { AnnouncementComposer } from './AnnouncementComposer';
import MeetEntriesManager from './MeetEntriesManager';
import InviteParentModal from './InviteParentModal';
import MeetsManager from './MeetsManager';
import ParentMeetsView from './ParentMeetsView';
import ParentScheduleHub from './ParentScheduleHub';
import RecordBreakModal from './RecordBreakModal';
import PracticeHub from './PracticeHub';
import PracticeBuilder from './PracticeBuilder';
import PracticeRunMode from './PracticeRunMode';
import TemplateLibrary from './TemplateLibrary';
import CalendarManager from './CalendarManager';
import ScheduleHub from './ScheduleHub';
import PracticeScheduleManager from './PracticeScheduleManager';
import CoachAssignmentManager from './CoachAssignmentManager';

// Hub Components (4.1 Navigation Restructure)
import { CommunicationsHub, ReportsHub, ToolsHub } from './hubs';
import Team from './components/Team';
import GroupDetail from './components/GroupDetail';

// Icons
import { ChevronLeft } from 'lucide-react';
import Icon from './components/Icon';

export default function App() {
  // Core State
  const [session, setSession] = useState(null);
  const [view, setView] = useState('dashboard');
  const [swimmers, setSwimmers] = useState([]);
  const [selectedSwimmer, setSelectedSwimmer] = useState(null);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedPracticeId, setSelectedPracticeId] = useState(null);
  const [selectedMeetId, setSelectedMeetId] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [previousView, setPreviousView] = useState(null); // Track where user came from for back navigation
  const [practicePreFill, setPracticePreFill] = useState(null); // Pre-fill data when creating practice from schedule
  const [selectedGroupName, setSelectedGroupName] = useState(null); // Track selected group for group detail view
  
  // User Role State
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  
  // Dashboard Stats
  const [stats, setStats] = useState({ photos: 0, analyses: 0 });
  
  // Team Records
  const [recordBreaks, setRecordBreaks] = useState([]);
  const [showRecordModal, setShowRecordModal] = useState(false);
  
  // Announcements
  const [showAnnouncementComposer, setShowAnnouncementComposer] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcementsRefreshKey, setAnnouncementsRefreshKey] = useState(0);

  // --- Auth Effects ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    
    return () => subscription.unsubscribe();
  }, []);

  // Fetch user role when session changes
  useEffect(() => {
    if (session?.user) {
      fetchUserRole();
    } else {
      setUserRole(null);
      setRoleLoading(false);
    }
  }, [session]);

  const fetchUserRole = async () => {
    try {
      setRoleLoading(true);
      
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role, first_login')
        .eq('id', session.user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile exists - check if on invite page
          if (window.location.pathname.startsWith('/invite')) {
            return;
          }

          // Create profile as coach for direct signups
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({ 
              id: session.user.id, 
              role: 'coach',
              display_name: session.user.email,
              first_login: false
            });
          
          if (!insertError) {
            setUserRole('coach');
          } else {
            console.error('Error creating profile:', insertError);
            setUserRole('coach');
          }
        } else {
          console.error('Error fetching role:', error);
          setUserRole('coach');
        }
      } else {
        setUserRole(profile.role);
      }
    } catch (err) {
      console.error('Role fetch error:', err);
      setUserRole('coach');
    } finally {
      setRoleLoading(false);
    }
  };

  // Fetch data based on role
  useEffect(() => {
    if (session && userRole === 'coach') {
      fetchRoster();
      fetchStats();
    } else if (session && userRole === 'parent') {
      fetchParentSwimmers();
    }
  }, [session, userRole]);

  // --- Data Fetching ---
  const fetchRoster = async () => {
    const { data, error } = await supabase
      .from('swimmers')
      .select('*')
      .eq('coach_id', session.user.id);
    
    if (error) console.error('Error fetching roster:', error);
    else setSwimmers(data || []);
  };

  const fetchStats = async () => {
    const { count: analysisCount } = await supabase
      .from('analyses')
      .select('*', { count: 'exact', head: true });
      
    const { count: photoCount } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true });

    setStats({ 
      analyses: analysisCount || 0, 
      photos: photoCount || 0 
    });
  };

  const fetchParentSwimmers = async () => {
    try {
      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (parentData) {
        const { data: swimmerLinks } = await supabase
          .from('swimmer_parents')
          .select(`swimmer_id, swimmers (*)`)
          .eq('parent_id', parentData.id);

        if (swimmerLinks) {
          const swimmerList = swimmerLinks
            .map(link => link.swimmers)
            .filter(Boolean);
          setSwimmers(swimmerList);
        }
      }
    } catch (error) {
      console.error('Error fetching parent swimmers:', error);
    }
  };

  // --- Navigation ---
  const navigateTo = (v) => {
    setView(v);
    if (v !== 'roster' && v !== 'view-analysis') {
      setSelectedSwimmer(null);
    }
  };

  const handleParentSelectSwimmer = (swimmer) => {
    setSelectedSwimmer(swimmer);
    setView('profile');
  };

  const handleViewAnalysis = (analysis) => {
    setCurrentAnalysis(analysis);
    setView('view-analysis');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSwimmers([]);
  };

  // --- Loading States ---
  if (loading || roleLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // --- Handle Invite Links ---
  const path = window.location.pathname;
  const inviteMatch = path.match(/^\/invite\/(.+)$/);

  if (inviteMatch) {
    return (
      <InviteLanding 
        token={inviteMatch[1]} 
        onComplete={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  // --- Auth Check ---
  if (!session) return <Login />;

  // --- Parent View ---
  if (userRole === 'parent') {
    return (
      <div className="flex min-h-screen bg-[#f8fafc]">
        {view !== 'view-analysis' && (
          <ParentSidebar activeTab={view} setActiveTab={navigateTo} onLogout={handleLogout} />
        )}
        {view !== 'view-analysis' && (
          <ParentMobileNav activeTab={view} setActiveTab={navigateTo} />
        )}
        
        <main className={`flex-1 h-screen overflow-hidden ${view !== 'view-analysis' ? 'md:ml-64' : ''}`}>
          {view === 'dashboard' && (
            <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
              <header className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">My Dashboard</h2>
                <button onClick={handleLogout} className="md:hidden text-slate-400 p-2">
                  <Icon name="log-out" size={20} />
                </button>
              </header>
              <ParentDashboard 
                user={session.user}
                onSelectSwimmer={handleParentSelectSwimmer}
              />
            </div>
          )}

          {view === 'my-swimmers' && (
            <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
              <header className="flex items-center gap-4 mb-6">
                <button onClick={() => navigateTo('dashboard')} className="p-2 hover:bg-slate-100 rounded-full">
                  <ChevronLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold text-slate-800">My Swimmers</h2>
              </header>
              <ParentDashboard 
                user={session.user}
                onSelectSwimmer={handleParentSelectSwimmer}
                simpleView={true}
              />
            </div>
          )}

          {view === 'meets' && (
            <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
              <ParentScheduleHub 
                user={session.user} 
                swimmerGroups={[...new Set(swimmers.map(s => s.group_name).filter(Boolean))]}
              />
            </div>
          )}

          {view === 'notifications' && (
            <ParentMessages 
              user={session.user} 
              swimmerGroups={[...new Set(swimmers.map(s => s.group_name).filter(Boolean))]}
            />
          )}
          
          {view === 'profile' && selectedSwimmer && (
            <SwimmerProfile 
              swimmer={selectedSwimmer} 
              swimmers={swimmers}
              onBack={() => setView('dashboard')}
              navigateTo={navigateTo}
              onViewAnalysis={handleViewAnalysis}
              isParentView={true}
            />
          )}

          {view === 'view-analysis' && currentAnalysis && (
            <AnalysisResult 
              data={currentAnalysis.json_data} 
              videoUrl={currentAnalysis.video_url}
              title={currentAnalysis.json_data?.title}
              swimmerName={swimmers.find(s => s.id === currentAnalysis.swimmer_id)?.name}
              stroke={currentAnalysis.json_data?.stroke}
              videoType={currentAnalysis.json_data?.videoType}
              onBack={() => {
                if (selectedSwimmer) setView('profile'); 
                else setView('dashboard');
              }} 
            />
          )}
        </main>
        
        <InstallPrompt />
      </div>
    );
  }

  // --- Coach View ---
  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {view !== 'view-analysis' && (
        <Sidebar activeTab={view} setActiveTab={navigateTo} onLogout={handleLogout} />
      )}

      {view !== 'view-analysis' && (
        <MobileNav activeTab={view} setActiveTab={navigateTo} />
      )}
      
      <main className={`flex-1 h-screen overflow-hidden ${view !== 'view-analysis' ? 'md:ml-64' : ''}`}>
        
        {view === 'dashboard' && (
          <Dashboard 
            navigateTo={navigateTo} 
            swimmers={swimmers} 
            stats={stats}
            onLogout={handleLogout} 
            onInviteParent={() => setShowInviteModal(true)}
          />
        )}
        
        {view === 'all-photos' && (
          <AllPhotos onBack={() => navigateTo('dashboard')} />
        )}

        {/* Team - Roster, Groups, Records */}
        {view === 'team' && (
          <Team
            swimmers={swimmers}
            setSwimmers={setSwimmers}
            setViewSwimmer={(s) => { setSelectedSwimmer(s); setView('profile'); }}
            navigateTo={(dest, data) => {
              if (dest === 'group-detail' && data?.groupName) {
                setSelectedGroupName(data.groupName);
                setView('group-detail');
              } else {
                navigateTo(dest);
              }
            }}
            setRecordBreaks={setRecordBreaks}
            setShowRecordModal={setShowRecordModal}
            onViewTrophyCase={() => navigateTo('trophy-case')}
          />
        )}

        {/* Group Detail - View swimmers in a specific group */}
        {view === 'group-detail' && selectedGroupName && (
          <GroupDetail
            groupName={selectedGroupName}
            swimmers={swimmers}
            onBack={() => {
              setSelectedGroupName(null);
              setView('team');
            }}
            onViewSwimmer={(s) => { setSelectedSwimmer(s); setView('profile'); }}
            onAddSwimmer={() => navigateTo('roster')}
          />
        )}

        {/* Legacy Roster - for adding/managing swimmers */}
        {view === 'roster' && (
          <Roster 
            swimmers={swimmers} 
            setSwimmers={setSwimmers} 
            setViewSwimmer={(s) => { setSelectedSwimmer(s); setView('profile'); }}
            navigateTo={navigateTo}
            setRecordBreaks={setRecordBreaks}
            setShowRecordModal={setShowRecordModal}
          />
        )}

        {/* Trophy Case - accessible from Team Hub */}
        {view === 'trophy-case' && (
          <TrophyCase 
            swimmers={swimmers}
            onBack={() => navigateTo('team')}
          />
        )}
        
        {view === 'profile' && selectedSwimmer && (
          <SwimmerProfile 
            swimmer={selectedSwimmer} 
            swimmers={swimmers}
            onBack={() => setView('roster')}
            navigateTo={navigateTo}
            onViewAnalysis={handleViewAnalysis} 
          />
        )}
        
        {view === 'analysis' && (
          <Analysis 
            swimmers={swimmers} 
            onBack={() => navigateTo('dashboard')} 
            supabase={supabase} 
          />
        )}

        {view === 'view-analysis' && currentAnalysis && (
          <AnalysisResult 
            data={currentAnalysis.json_data} 
            videoUrl={currentAnalysis.video_url}
            title={currentAnalysis.json_data?.title}
            swimmerName={swimmers.find(s => s.id === currentAnalysis.swimmer_id)?.name}
            stroke={currentAnalysis.json_data?.stroke}
            videoType={currentAnalysis.json_data?.videoType}
            onBack={() => {
              if (selectedSwimmer) setView('profile'); 
              else setView('dashboard');
            }} 
          />
        )}

        {/* Communications Hub - Announcements & Parent Invites */}
        {view === 'communications' && (
          <CommunicationsHub
            swimmers={swimmers}
            onComposeAnnouncement={() => {
              setEditingAnnouncement(null);
              setShowAnnouncementComposer(true);
            }}
            onEditAnnouncement={(announcement) => {
              setEditingAnnouncement(announcement);
              setShowAnnouncementComposer(true);
            }}
            onInviteParent={() => setShowInviteModal(true)}
            navigateTo={navigateTo}
            refreshKey={announcementsRefreshKey}
          />
        )}

        {/* Reports Hub - Meet Reports, Big Movers, Progress */}
        {view === 'reports' && (
          <ReportsHub
            navigateTo={navigateTo}
            onGenerateMeetReport={(meet) => {
              // Navigate to full reports generator
              navigateTo('reports-full');
            }}
          />
        )}

        {/* Full Reports Generator (legacy) */}
        {view === 'reports-full' && (
          <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
            <Breadcrumb 
              currentView="reports" 
              previousView={previousView}
              onNavigate={(v) => {
                setPreviousView(null);
                navigateTo(v);
              }}
            />
            <Reports onBack={() => navigateTo('reports')} />
          </div>
        )}

        {/* Category Progress Report - Direct Access */}
        {view === 'category-progress' && (
          <div className="overflow-y-auto h-full pb-24 md:pb-8">
            <CategoryProgressReport onBack={() => navigateTo('dashboard')} />
          </div>
        )}

        {/* Tools Hub - AI Analysis & Chat */}
        {view === 'tools' && (
          <ToolsHub
            swimmers={swimmers}
            navigateTo={navigateTo}
            onStartAnalysis={() => navigateTo('analysis')}
            onOpenAIChat={() => navigateTo('ai-chat')}
            onViewAnalysis={handleViewAnalysis}
          />
        )}
        
        {/* Unified Schedule View */}
        {view === 'schedule' && (
          <ScheduleHub
            onNavigate={navigateTo}
            onCreateMeet={() => {
              setSelectedMeetId(null);
              setPreviousView('schedule');
              navigateTo('meets');
            }}
            onCreatePractice={() => {
              setSelectedPracticeId(null);
              setPracticePreFill(null);
              setPreviousView('schedule');
              navigateTo('practice-builder');
            }}
            onCreatePracticeFromSchedule={(scheduleData) => {
              setSelectedPracticeId(null);
              setPracticePreFill(scheduleData);
              setPreviousView('schedule');
              navigateTo('practice-builder');
            }}
            onCreateEvent={() => {
              setSelectedEventId(null);
              setPreviousView('schedule');
              navigateTo('calendar');
            }}
            onManagePracticeSchedule={() => {
              setPreviousView('schedule');
              navigateTo('practice-schedule');
            }}
            onViewMeet={(meet) => {
              setSelectedMeetId(meet.id);
              setPreviousView('schedule');
              navigateTo('meets');
            }}
            onViewPractice={(practiceId) => {
              setSelectedPracticeId(practiceId);
              setPreviousView('schedule');
              navigateTo('practice-builder');
            }}
            onViewEvent={(event) => {
              setSelectedEventId(event.id);
              setPreviousView('schedule');
              navigateTo('calendar');
            }}
          />
        )}
        
        {/* Keep legacy routes for deep linking and drill-down */}
        {view === 'calendar' && (
          <CalendarManager 
            onBack={() => {
              setSelectedEventId(null);
              const backTo = previousView === 'schedule' ? 'schedule' : 'dashboard';
              setPreviousView(null);
              setView(backTo);
            }}
          />
        )}
        
        {view === 'practice-schedule' && (
          <PracticeScheduleManager
            onBack={() => {
              const backTo = previousView === 'schedule' ? 'schedule' : 'dashboard';
              setPreviousView(null);
              navigateTo(backTo);
            }}
            onOpenPracticeBuilder={(practiceId) => {
              setSelectedPracticeId(practiceId);
              setPreviousView('practice-schedule');
              navigateTo('practice-builder');
            }}
            onManageCoachAssignments={() => {
              setPreviousView('practice-schedule');
              navigateTo('coach-assignments');
            }}
          />
        )}
        
        {view === 'coach-assignments' && (
          <CoachAssignmentManager
            onBack={() => {
              const backTo = previousView === 'practice-schedule' ? 'practice-schedule' : 'schedule';
              setPreviousView(null);
              navigateTo(backTo);
            }}
          />
        )}
        
        {view === 'meets' && (
          <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
            <Breadcrumb 
              currentView="meets" 
              previousView={previousView}
              onNavigate={(v) => {
                setPreviousView(null);
                navigateTo(v);
              }}
            />
            <MeetsManager />
          </div>
        )}
        
        {/* meet-entries now redirects to meets - keeping for backward compatibility */}
        {view === 'meet-entries' && (
          <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
            <Breadcrumb 
              currentView="meets" 
              previousView={previousView}
              onNavigate={(v) => {
                setPreviousView(null);
                navigateTo(v);
              }}
            />
            <MeetsManager />
          </div>
        )}

        {view === 'announcements' && (
          <AnnouncementsManager onBack={() => navigateTo('dashboard')} />
        )}

        {view === 'test-set' && (
          <TestSetTracker 
            onBack={() => navigateTo('dashboard')}
            swimmers={swimmers}
            groups={[...new Set(swimmers.map(s => s.group_name).filter(Boolean))]}
          />
        )}

        {view === 'test-sets-list' && (
          <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
            <Breadcrumb 
              currentView="test-sets-list" 
              previousView={previousView}
              onNavigate={(v) => {
                setPreviousView(null);
                navigateTo(v);
              }}
            />
            <TestSetsList 
              onBack={() => navigateTo('schedule')}
              onStartNew={() => navigateTo('test-set')}
            />
          </div>
        )}

        {view === 'ai-chat' && (
          <AIChat onBack={() => navigateTo('dashboard')} />
        )}

        {view === 'practice-hub' && (
          <PracticeHub
            onBack={() => navigateTo('dashboard')}
            onCreateNew={() => {
              setSelectedPracticeId(null);
              setView('practice-builder');
            }}
            onEditPractice={(practiceId) => {
              setSelectedPracticeId(practiceId);
              setView('practice-builder');
            }}
            navigateTo={navigateTo}
            swimmers={swimmers}
          />
        )}

        {view === 'practice-builder' && (
          <PracticeBuilder
            practiceId={selectedPracticeId}
            preFillData={practicePreFill}
            onBack={() => {
              setSelectedPracticeId(null);
              setPracticePreFill(null);
              const backTo = previousView === 'schedule' ? 'schedule' : 'practice-hub';
              setPreviousView(null);
              setView(backTo);
            }}
            onSave={() => {
              setPracticePreFill(null);
              const backTo = previousView === 'schedule' ? 'schedule' : 'practice-hub';
              setPreviousView(null);
              setView(backTo);
            }}
            onRunPractice={(practiceId) => {
              setSelectedPracticeId(practiceId);
              setView('practice-run-mode');
            }}
            swimmers={swimmers}
          />
        )}

        {view === 'practice-run-mode' && (
          <PracticeRunMode
            practiceId={selectedPracticeId}
            onBack={() => {
              setView('practice-builder');
            }}
            onLaunchTestSet={(config) => {
              console.log('Launch test set with config:', config);
            }}
          />
        )}

        {view === 'template-library' && (
          <TemplateLibrary
            onBack={() => setView('practice-hub')}
            onCreateFromTemplate={(practiceId) => {
              setSelectedPracticeId(practiceId);
              setView('practice-builder');
            }}
          />
        )}
      </main>
      
      {/* Modals */}
      {showInviteModal && (
        <InviteParentModal 
          swimmers={swimmers} 
          onClose={() => setShowInviteModal(false)} 
        />
      )}
      
      {showRecordModal && (
        <RecordBreakModal
          isOpen={showRecordModal}
          recordBreaks={recordBreaks}
          onClose={() => {
            setShowRecordModal(false);
            setRecordBreaks([]);
          }}
          onUpdate={(results) => {
            console.log('Records updated:', results);
          }}
        />
      )}
      
      {showAnnouncementComposer && (
        <AnnouncementComposer
          editingAnnouncement={editingAnnouncement}
          onClose={() => {
            setShowAnnouncementComposer(false);
            setEditingAnnouncement(null);
          }}
          onSuccess={() => {
            setShowAnnouncementComposer(false);
            setEditingAnnouncement(null);
            setAnnouncementsRefreshKey(k => k + 1);
          }}
        />
      )}
      
      <InstallPrompt />
    </div>
  );
}
