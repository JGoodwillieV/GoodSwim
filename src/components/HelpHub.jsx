import React, { useState } from 'react';
import Icon from './Icon';
import { supabase } from '../supabase';
import {
  BookOpen, LifeBuoy, ChevronRight, Send, Loader2, Check, X,
  FileUp, Trophy, Calendar, Users, Megaphone, ClipboardList,
  Play, UserPlus, Timer, Waves, Video, Sparkles, Settings
} from 'lucide-react';

const howToItems = [
  {
    id: 'import-roster',
    title: 'Import Roster',
    description: 'Export from Team Unify and import your roster into GoodSwim.',
    icon: FileUp,
    category: 'Getting Started',
  },
  {
    id: 'add-results',
    title: 'Add Results',
    description: 'Export results from Team Unify and import them into GoodSwim.',
    icon: Trophy,
    category: 'Getting Started',
  },
  {
    id: 'practice-schedule',
    title: 'Practice Schedule',
    description: 'Set up your recurring practice times, locations, and group assignments.',
    icon: Calendar,
    category: 'Schedule',
  },
  {
    id: 'coaches-scheduling',
    title: 'Coaches Scheduling',
    description: 'Assign coaches to practice groups and manage coaching schedules.',
    icon: Users,
    category: 'Schedule',
  },
  {
    id: 'add-practices',
    title: 'Add Practices',
    description: 'Create and customize practice plans using the practice builder.',
    icon: ClipboardList,
    category: 'Schedule',
  },
  {
    id: 'create-meet',
    title: 'Create a Meet',
    description: 'Set up a new swim meet with events, dates, and location details.',
    icon: Waves,
    category: 'Meets',
  },
  {
    id: 'meet-entries',
    title: 'Do Meet Entries',
    description: 'Select swimmers and events for meet entries and manage scratches.',
    icon: ClipboardList,
    category: 'Meets',
  },
  {
    id: 'invite-parents',
    title: 'Invite Parents',
    description: 'Send invitations to parents so they can access the parent portal.',
    icon: UserPlus,
    category: 'Communications',
  },
  {
    id: 'run-test-set',
    title: 'Run a Test Set',
    description: 'Record and track test set times to monitor swimmer progress over time.',
    icon: Timer,
    category: 'Tools',
  },
  {
    id: 'video-analysis',
    title: 'Video Analysis',
    description: 'Upload and analyze swimmer technique videos with AI-powered insights.',
    icon: Video,
    category: 'Tools',
  },
  {
    id: 'ai-chat',
    title: 'AI Chat',
    description: 'Use the AI assistant to get coaching advice and training recommendations.',
    icon: Sparkles,
    category: 'Tools',
  },
  {
    id: 'manage-billing',
    title: 'Manage Billing',
    description: 'View your subscription plan, update payment methods, and manage your account.',
    icon: Settings,
    category: 'Account',
  },
];

const categories = ['Getting Started', 'Schedule', 'Meets', 'Communications', 'Tools', 'Account'];

const issueTypes = [
  { value: 'question', label: 'General Question' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'billing', label: 'Billing Issue' },
  { value: 'account', label: 'Account Issue' },
  { value: 'other', label: 'Other' },
];

function StepItem({ number, children }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div className="flex-1 pt-1 text-slate-700 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function ImportRosterGuide() {
  return (
    <div className="space-y-6">
      {/* Section 1: Exporting from Team Unify */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Exporting from Team Unify</h3>
        <p className="text-sm text-slate-500 mb-6">First, export your roster from Team Unify as a PDF.</p>

        <div className="space-y-5">
          <StepItem number={1}>
            Go to <span className="font-semibold text-slate-900">"Org Tools"</span> then click <span className="font-semibold text-slate-900">"Members"</span>.
          </StepItem>
          <StepItem number={2}>
            Click the <span className="font-semibold text-slate-900">checkbox at the top</span> to select all members.
          </StepItem>
          <StepItem number={3}>
            Click the <span className="font-semibold text-slate-900">"Export"</span> button and select <span className="font-semibold text-slate-900">"Member Directory"</span>.
          </StepItem>
          <StepItem number={4}>
            Make sure you check <span className="font-semibold text-slate-900">"Include DOB"</span> and <span className="font-semibold text-slate-900">"Include ID#"</span>.
          </StepItem>
          <StepItem number={5}>
            Click <span className="font-semibold text-slate-900">"Generate"</span>. It should download a PDF after that.
          </StepItem>
        </div>
      </div>

      {/* Section 2: Importing into GoodSwim */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Importing into GoodSwim</h3>
        <p className="text-sm text-slate-500 mb-6">Now import the exported PDF into GoodSwim.</p>

        <div className="space-y-5">
          <StepItem number={1}>
            Click <span className="font-semibold text-slate-900">"Team"</span> in the navigation bar.
          </StepItem>
          <StepItem number={2}>
            Click <span className="font-semibold text-slate-900">"Import Roster"</span>.
          </StepItem>
          <StepItem number={3}>
            Select the <span className="font-semibold text-slate-900">PDF</span> that you just downloaded from Team Unify.
          </StepItem>
        </div>
      </div>

      {/* Video Tutorial */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Video Walkthrough</h3>
        <div className="rounded-xl overflow-hidden bg-slate-900">
          <video
            controls
            className="w-full"
            preload="metadata"
          >
            <source src="/videos/import-roster.webm" type="video/webm" />
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  );
}

function AddResultsGuide() {
  return (
    <div className="space-y-6">
      {/* Section 1: Exporting from Team Unify */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Exporting from Team Unify</h3>
        <p className="text-sm text-slate-500 mb-6">First, export your meet results from Team Unify as an Excel file.</p>

        <div className="space-y-5">
          <StepItem number={1}>
            Click <span className="font-semibold text-slate-900">"Events & Competition"</span>.
          </StepItem>
          <StepItem number={2}>
            Click <span className="font-semibold text-slate-900">"Meet Results"</span>.
          </StepItem>
          <StepItem number={3}>
            Click <span className="font-semibold text-slate-900">"Results By Meet"</span>.
          </StepItem>
          <StepItem number={4}>
            Click the <span className="font-semibold text-slate-900">meet name</span> you want to export.
          </StepItem>
          <StepItem number={5}>
            Select your team from the dropdown. If you have a lot of swimmers, you may need to break it out by <span className="font-semibold text-slate-900">"Competitive Category"</span> and/or <span className="font-semibold text-slate-900">"Age Group"</span> and pull multiple files.
          </StepItem>
          <StepItem number={6}>
            Click <span className="font-semibold text-slate-900">"Search"</span>.
          </StepItem>
          <StepItem number={7}>
            Click <span className="font-semibold text-slate-900">"Excel Export"</span>.
          </StepItem>
        </div>
      </div>

      {/* Section 2: Importing into GoodSwim */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Importing into GoodSwim</h3>
        <p className="text-sm text-slate-500 mb-6">Now import the exported file(s) into GoodSwim.</p>

        <div className="space-y-5">
          <StepItem number={1}>
            Go to <span className="font-semibold text-slate-900">"Team"</span> in the navigation bar.
          </StepItem>
          <StepItem number={2}>
            Click <span className="font-semibold text-slate-900">"Import Results"</span>.
          </StepItem>
          <StepItem number={3}>
            Select the <span className="font-semibold text-slate-900">file(s)</span> that you just downloaded from Team Unify.
          </StepItem>
        </div>
      </div>
    </div>
  );
}

export default function HelpHub({ navigateTo, isParentView = false }) {
  const [activeTab, setActiveTab] = useState(isParentView ? 'support' : 'how-to');
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Support form state
  const [subject, setSubject] = useState('');
  const [issueType, setIssueType] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmitSupport = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !issueType || !message.trim()) return;

    setSending(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `https://ozznaspwqcfxulgqovro.supabase.co/functions/v1/send-support-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            subject: subject.trim(),
            issue_type: issueType,
            message: message.trim(),
            user_email: user?.email || 'unknown',
            user_id: user?.id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send support request');
      }

      setSent(true);
      setSubject('');
      setIssueType('');
      setMessage('');
      setTimeout(() => setSent(false), 5000);
    } catch (err) {
      console.error('Error sending support request:', err);
      setError('Something went wrong. Please try again or email us directly at support@goodswim.io');
    } finally {
      setSending(false);
    }
  };

  if (selectedArticle) {
    const article = howToItems.find(item => item.id === selectedArticle);
    return (
      <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
        <button
          onClick={() => setSelectedArticle(null)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <Icon name="chevron-left" size={20} />
          <span className="font-medium">Back to How-To Guides</span>
        </button>

        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
              {article && <article.icon size={28} className="text-blue-600" />}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{article?.title}</h1>
              <span className="text-sm text-slate-500">{article?.category}</span>
            </div>
          </div>

          {selectedArticle === 'import-roster' ? (
            <ImportRosterGuide />
          ) : selectedArticle === 'add-results' ? (
            <AddResultsGuide />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 md:p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                <Play size={32} className="text-slate-400 ml-1" />
              </div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">Content Coming Soon</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                A detailed walkthrough with step-by-step instructions and a video tutorial will be added here shortly.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">Help Center</h2>
        <p className="text-slate-500">{isParentView ? 'Get support for GoodSwim' : 'Find guides and get support for GoodSwim'}</p>
      </div>

      {/* Tab Navigation (coaches only) */}
      {!isParentView && (
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-8 max-w-sm">
          <button
            onClick={() => setActiveTab('how-to')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'how-to'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <BookOpen size={16} />
            How To
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'support'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LifeBuoy size={16} />
            Support
          </button>
        </div>
      )}

      {/* How To Tab */}
      {activeTab === 'how-to' && (
        <div>
          {categories.map(category => {
            const items = howToItems.filter(item => item.category === category);
            if (items.length === 0) return null;

            return (
              <div key={category} className="mb-8">
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
                  {category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedArticle(item.id)}
                      className="bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                          <item.icon size={20} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-slate-800 text-sm">{item.title}</h4>
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                          </div>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Support Tab */}
      {activeTab === 'support' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <LifeBuoy size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Contact Support</h3>
                <p className="text-sm text-slate-500">We'll get back to you as soon as possible</p>
              </div>
            </div>

            {sent && (
              <div className="mb-6 flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
                <Check size={20} />
                <span className="font-medium">Your message has been sent! We'll get back to you soon.</span>
              </div>
            )}

            {error && (
              <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                <X size={20} className="flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmitSupport} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Issue Type</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white"
                  required
                >
                  <option value="">Select an issue type...</option>
                  {issueTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or question in detail..."
                  rows={6}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={sending || !subject.trim() || !issueType || !message.trim()}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 bg-slate-50 rounded-xl border border-slate-200 p-5">
            <p className="text-sm text-slate-600">
              You can also reach us directly at{' '}
              <a href="mailto:support@goodswim.io" className="text-blue-600 font-medium hover:underline">
                support@goodswim.io
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
