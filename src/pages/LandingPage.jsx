import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Waves, Timer, Trophy, Video, Users, Calendar, FileText, 
  MessageSquare, TrendingUp, Zap, Target, Award, Star,
  ChevronRight, Play, Check, ArrowRight, Sparkles, Clock,
  BarChart3, Smartphone, Shield, Heart, Menu, X
} from 'lucide-react';

// Animated wave component
function AnimatedWaves() {
  return (
    <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
      <svg className="relative block w-full h-16 md:h-24" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <path 
          d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" 
          className="fill-slate-900/5"
          style={{ animation: 'wave 8s ease-in-out infinite' }}
        />
        <path 
          d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" 
          className="fill-slate-900/3"
          style={{ animation: 'wave 6s ease-in-out infinite reverse' }}
        />
      </svg>
      <style>{`
        @keyframes wave {
          0%, 100% { transform: translateX(0) translateY(0); }
          50% { transform: translateX(-25px) translateY(5px); }
        }
      `}</style>
    </div>
  );
}

// Feature card component
function FeatureCard({ icon: Icon, title, description, color, delay = 0 }) {
  return (
    <div 
      className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-teal-500/10 hover:border-teal-200 transition-all duration-500 hover:-translate-y-1"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={24} className="text-white" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

const FEATURE_STEPS = [
  {
    title: 'Scheduling & Workout Planner',
    description: 'Manage practice times, assign workouts to groups, track coach assignments, and plan meets — all from one powerful scheduling hub.',
    screenshot: '/screenshots/scheduling.png',
  },
  {
    title: 'Swimmer Profiles',
    description: 'Every swimmer gets a rich profile with personal best tracking, time standards progress, meet results history, test set data, and more — all in one place.',
    video: '/screenshots/swimmer-profile.webm',
  },
  {
    title: 'Meet Management',
    description: 'Upload a meet invite PDF and we auto-parse everything — events, timelines, heat sheets, and more. Collect swimmer commitments, manage entries, and generate event recommendations effortlessly.',
    screenshot: '/screenshots/meet-management.png',
  },
  {
    title: 'Test Set Tracker',
    description: 'Run live test sets with multi-lane support, automatic timing, and instant comparison to previous results.',
    screenshot: '/screenshots/test-set-tracker.png',
  },
  {
    title: 'Powerful Reports & Analytics',
    description: 'Big Movers, Close Calls, Team Records, Relay Generators — reports that actually help you coach better.',
    screenshot: '/screenshots/reports.png',
  },
  {
    title: 'Parent Portal & Communication',
    description: 'Keep parents informed with schedules, meet info, announcements, and swimmer progress — without endless emails.',
    screenshots: ['/screenshots/parent-portal-1.png', '/screenshots/parent-portal-2.png'],
  },
  {
    title: 'AI Data Assistant',
    description: 'Chat with your entire team database. Ask about performance trends, best times, schedules, roster breakdowns, upcoming meets, and more — instant answers powered by AI.',
    screenshot: '/screenshots/ai-assistant.png',
  },
];

const AUTO_ADVANCE_MS = 5000;

function FeatureStepper() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const timerRef = useRef(null);
  const videoRef = useRef(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % FEATURE_STEPS.length);
    }, AUTO_ADVANCE_MS);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!paused && !videoPlaying) startTimer();
    else stopTimer();
    return () => stopTimer();
  }, [paused, videoPlaying, startTimer, stopTimer]);

  useEffect(() => {
    setVideoPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [activeIndex]);

  const handleStepClick = (index) => {
    setActiveIndex(index);
    setPaused(true);
  };

  const togglePause = () => {
    setPaused((p) => {
      if (p) {
        setActiveIndex((prev) => (prev + 1) % FEATURE_STEPS.length);
      }
      return !p;
    });
  };

  const handlePlayVideo = () => {
    setVideoPlaying(true);
    setPaused(true);
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const step = FEATURE_STEPS[activeIndex];

  return (
    <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
      {/* Left: numbered stepper */}
      <div className="w-full lg:w-[420px] flex-shrink-0">
        <ol className="relative space-y-1">
          {FEATURE_STEPS.map((s, i) => {
            const isActive = i === activeIndex;
            return (
              <li
                key={i}
                onClick={() => handleStepClick(i)}
                className={`flex items-start gap-4 cursor-pointer rounded-xl px-4 py-3.5 transition-all duration-300 ${
                  isActive
                    ? 'bg-white shadow-lg shadow-teal-500/10 border border-teal-100'
                    : 'border border-transparent hover:bg-white/60'
                }`}
              >
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300 mt-0.5 ${
                    isActive
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {i + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <h3
                    className={`font-bold transition-colors duration-300 ${
                      isActive ? 'text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    {s.title}
                  </h3>

                  <div
                    className={`grid transition-all duration-500 ${
                      isActive ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="text-slate-600 text-sm leading-relaxed mb-2.5">
                        {s.description}
                      </p>
                      <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          key={`progress-${activeIndex}-${i}-${paused}`}
                          className="h-full rounded-full bg-teal-500"
                          style={{
                            animation: isActive && !paused && !videoPlaying
                              ? `stepper-progress ${AUTO_ADVANCE_MS}ms linear forwards`
                              : 'none',
                            width: isActive && (paused || videoPlaying) ? '100%' : '0%',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <button
          onClick={togglePause}
          className="mt-4 ml-4 flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 transition-colors"
        >
          {paused ? (
            <>
              <Play size={14} className="fill-current" />
              <span>Resume</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="3" width="5" height="18" rx="1" />
                <rect x="14" y="3" width="5" height="18" rx="1" />
              </svg>
              <span>Pause</span>
            </>
          )}
        </button>

        <style>{`
          @keyframes stepper-progress {
            from { width: 0%; }
            to   { width: 100%; }
          }
        `}</style>
      </div>

      {/* Right: media area */}
      <div className="flex-1 min-w-0 w-full lg:sticky lg:top-24">
        {step.screenshots ? (
          <div className="flex gap-8 items-start justify-center">
            {step.screenshots.map((src, idx) => (
              <div key={idx} className="relative flex-shrink-0" style={{ width: 220 }}>
                {/* iPhone shell */}
                <div className="relative rounded-[2.5rem] border-[6px] border-slate-800 bg-slate-800 shadow-2xl overflow-hidden">
                  {/* Notch / Dynamic Island */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10 w-24 h-6 bg-slate-800 rounded-b-2xl" />
                  {/* Screen */}
                  <div className="relative rounded-[2rem] overflow-hidden bg-white">
                    <img
                      src={src}
                      alt={`${step.title} ${idx + 1}`}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                  {/* Home indicator */}
                  <div className="flex justify-center py-1.5 bg-slate-800">
                    <div className="w-20 h-1 rounded-full bg-slate-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-xl shadow-slate-200/50">
            {step.video ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  src={step.video}
                  className="w-full h-auto"
                  onEnded={() => setVideoPlaying(false)}
                  playsInline
                />
                {!videoPlaying && (
                  <button
                    onClick={handlePlayVideo}
                    className="absolute inset-0 flex items-center justify-center bg-slate-900/30 hover:bg-slate-900/40 transition-colors group"
                  >
                    <div className="w-16 h-16 rounded-full bg-white/90 group-hover:bg-white flex items-center justify-center shadow-lg transition-all group-hover:scale-110">
                      <Play size={28} className="text-teal-600 fill-teal-600 ml-1" />
                    </div>
                  </button>
                )}
              </div>
            ) : step.screenshot ? (
              <img
                src={step.screenshot}
                alt={step.title}
                className="w-full h-auto object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400 aspect-[16/10]">
                <Smartphone size={48} className="mb-3 opacity-40" />
                <span className="text-sm font-medium">{step.title} — screenshot coming soon</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Big feature section
function BigFeature({ icon: Icon, title, description, features, imageSide = 'right', color, gradient }) {
  const content = (
    <div className="flex-1 space-y-6">
      <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center`}>
        <Icon size={28} className="text-white" />
      </div>
      <h3 className="text-3xl md:text-4xl font-bold text-slate-900">{title}</h3>
      <p className="text-lg text-slate-600 leading-relaxed">{description}</p>
      <ul className="space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3 text-slate-700">
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Check size={12} className="text-emerald-600" />
            </div>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );

  const visual = (
    <div className="flex-1 relative">
      <div className={`absolute inset-0 ${gradient} rounded-3xl opacity-20 blur-3xl`} />
      <div className={`relative ${gradient} rounded-3xl p-8 min-h-[320px] flex items-center justify-center`}>
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 border border-white/30">
          <Icon size={120} className="text-white/90" />
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col ${imageSide === 'left' ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-20 items-center`}>
      {content}
      {visual}
    </div>
  );
}

// Stat card
function StatCard({ value, label, icon: Icon }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/10 mb-4">
        <Icon size={28} className="text-teal-600" />
      </div>
      <div className="text-4xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-slate-600">{label}</div>
    </div>
  );
}

// Testimonial card
function TestimonialCard({ quote, author, role }) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={18} className="fill-amber-400 text-amber-400" />
        ))}
      </div>
      <p className="text-slate-700 text-lg leading-relaxed mb-6">"{quote}"</p>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold">
          {author.charAt(0)}
        </div>
        <div>
          <div className="font-semibold text-slate-900">{author}</div>
          <div className="text-sm text-slate-500">{role}</div>
        </div>
      </div>
    </div>
  );
}

// Pricing card
function PricingCard({ name, price, period, description, features, popular, cta }) {
  return (
    <div className={`relative rounded-3xl p-8 ${popular ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-2xl shadow-teal-500/30 scale-105' : 'bg-white border border-slate-200'}`}>
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-amber-400 text-amber-900 text-sm font-bold px-4 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}
      <div className="text-center mb-8">
        <h3 className={`text-xl font-bold mb-2 ${popular ? 'text-white' : 'text-slate-900'}`}>{name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className={`text-5xl font-bold ${popular ? 'text-white' : 'text-slate-900'}`}>{price}</span>
          {period && <span className={popular ? 'text-teal-100' : 'text-slate-500'}>/{period}</span>}
        </div>
        <p className={`mt-2 ${popular ? 'text-teal-100' : 'text-slate-500'}`}>{description}</p>
      </div>
      <ul className="space-y-4 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full ${popular ? 'bg-white/20' : 'bg-emerald-100'} flex items-center justify-center flex-shrink-0`}>
              <Check size={12} className={popular ? 'text-white' : 'text-emerald-600'} />
            </div>
            <span className={popular ? 'text-teal-50' : 'text-slate-600'}>{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        to="/signup"
        className={`block w-full text-center py-4 rounded-xl font-semibold transition-all ${
          popular 
            ? 'bg-white text-teal-600 hover:bg-teal-50' 
            : 'bg-slate-900 text-white hover:bg-slate-800'
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}

// Badge display for Trophy Case showcase
function BadgeShowcase() {
  const badges = [
    { label: 'B', color: 'bg-amber-700', glow: 'shadow-amber-500/30' },
    { label: 'BB', color: 'bg-slate-400', glow: 'shadow-slate-400/30' },
    { label: 'A', color: 'bg-yellow-500', glow: 'shadow-yellow-400/30' },
    { label: 'AA', color: 'bg-blue-500', glow: 'shadow-blue-400/30' },
    { label: 'AAA', color: 'bg-purple-600', glow: 'shadow-purple-500/30' },
    { label: 'AAAA', color: 'bg-rose-600', glow: 'shadow-rose-500/30' },
  ];

  return (
    <div className="flex gap-3 flex-wrap justify-center">
      {badges.map((badge, i) => (
        <div 
          key={badge.label}
          className={`${badge.color} ${badge.glow} shadow-lg text-white text-sm font-bold px-4 py-2 rounded-lg transform hover:scale-110 transition-transform cursor-default`}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {badge.label}
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white overflow-x-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-teal-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-cyan-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-lg shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img 
                src="/GoodSwimLogo.png" 
                alt="GoodSwim" 
                className="h-10 w-auto"
              />
            </div>
            
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-600 hover:text-teal-600 font-medium transition-colors">Features</a>
              <a href="#benefits" className="text-slate-600 hover:text-teal-600 font-medium transition-colors">Benefits</a>
              <a href="#pricing" className="text-slate-600 hover:text-teal-600 font-medium transition-colors">Pricing</a>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link to="/login" className="text-slate-600 hover:text-teal-600 font-medium transition-colors">
                Log In
              </Link>
              <Link 
                to="/signup" 
                className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white px-6 py-2.5 rounded-xl hover:shadow-lg hover:shadow-teal-500/30 font-medium transition-all hover:-translate-y-0.5"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2 text-slate-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-4">
            <a href="#features" className="block text-slate-600 hover:text-teal-600 font-medium">Features</a>
            <a href="#benefits" className="block text-slate-600 hover:text-teal-600 font-medium">Benefits</a>
            <a href="#pricing" className="block text-slate-600 hover:text-teal-600 font-medium">Pricing</a>
            <hr className="border-slate-200" />
            <Link to="/login" className="block text-slate-600 font-medium">Log In</Link>
            <Link to="/signup" className="block bg-teal-500 text-white text-center py-3 rounded-xl font-medium">
              Start Free Trial
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 md:pt-40 md:pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-full px-4 py-2 mb-8">
              <Sparkles size={16} className="text-teal-600" />
              <span className="text-sm font-medium text-teal-700">Built by coaches, for coaches</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight">
              The Modern Way to{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 bg-clip-text text-transparent">
                  Run Your Swim Team
                </span>
                <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8">
                  <path d="M0 7 Q50 0, 100 7 T200 7" stroke="url(#gradient)" strokeWidth="3" fill="none" />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#14b8a6" />
                      <stop offset="50%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-slate-600 mb-10 leading-relaxed max-w-3xl mx-auto">
              Practice planning, AI video analysis, meet management, and parent communication — 
              all in one beautiful platform that saves coaches hours every week.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link 
                to="/signup" 
                className="group flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-lg px-8 py-4 rounded-2xl hover:shadow-xl hover:shadow-teal-500/30 font-semibold transition-all hover:-translate-y-1"
              >
                Start Your Free Trial
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="flex items-center gap-2 text-slate-700 text-lg px-8 py-4 rounded-2xl hover:bg-slate-100 font-medium transition-colors">
                <Play size={20} className="text-teal-600" />
                Watch Demo
              </button>
            </div>

            {/* Social proof */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-slate-500 text-sm">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {['bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500'].map((color, i) => (
                    <div key={i} className={`w-8 h-8 rounded-full ${color} border-2 border-white`} />
                  ))}
                </div>
                <span>Trusted by <strong className="text-slate-700">100+</strong> swim teams</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-1"><strong className="text-slate-700">4.9/5</strong> rating</span>
              </div>
            </div>
          </div>
        </div>
        <AnimatedWaves />
      </header>

      {/* Feature Stepper */}
      <section id="features" className="relative py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-teal-600 font-semibold text-sm uppercase tracking-wide">Features</span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mt-3 mb-6">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              From practice planning to parent communication, GoodSwim handles it all.
            </p>
          </div>

          <FeatureStepper />
        </div>
      </section>

      {/* Big Feature 1: Your Data, Fully Unlocked */}
      <section id="benefits" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <BigFeature 
            icon={BarChart3}
            title="Finally, a Platform That Puts Your Data to Work"
            description="Your team generates tons of data every season — times, meet results, attendance, standards progress. GoodSwim brings it all together so you can actually analyze, understand, and act on it."
            features={[
              'Powerful reports like Big Movers, Close Calls, and Relay Generators',
              'AI Data Assistant — chat with your entire team database in plain English',
              'Rich swimmer profiles with PB history, standards tracking, and trends',
              'Test set analytics with historical comparisons across seasons',
              'Team-wide dashboards for quick performance snapshots',
              'Export and share data with parents, staff, and administrators'
            ]}
            color="bg-gradient-to-br from-teal-500 to-cyan-600"
            gradient="bg-gradient-to-br from-teal-500 to-cyan-600"
            imageSide="right"
          />
        </div>
      </section>

      {/* Big Feature 2: Scheduling Hub */}
      <section className="py-24 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-6">
          <BigFeature 
            icon={Calendar}
            title="Scheduling & Practices, All in One Place"
            description="Stop juggling spreadsheets, group chats, and sticky notes. GoodSwim gives your entire coaching staff a single hub for every schedule, workout, and assignment."
            features={[
              'Weekly workout planner with drag-and-drop assignments',
              'Practice times and group schedules visible to the whole team',
              'Coach assignments so everyone knows who\'s on deck',
              'Meet manager with auto-parsed meet invites, timelines, heat sheets, and more',
              'Event manager for non-meet activities and team events',
              'Visual calendar view with schedule exceptions and cancellations'
            ]}
            color="bg-gradient-to-br from-blue-500 to-indigo-600"
            gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            imageSide="left"
          />
        </div>
      </section>

      {/* Trophy Case Section */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-amber-600 font-semibold text-sm uppercase tracking-wide">Motivation</span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mt-3 mb-6">
              Celebrate Every Achievement
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
              The Trophy Case tracks every time standard achieved — from B times all the way to Nationals. 
              Swimmers stay motivated seeing their progress.
            </p>
            <BadgeShowcase />
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto bg-amber-100 rounded-2xl flex items-center justify-center mb-4">
                <Target size={32} className="text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Clear Goals</h3>
              <p className="text-slate-600">See exactly what time they need to hit the next standard. No confusion.</p>
            </div>
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                <TrendingUp size={32} className="text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Track Progress</h3>
              <p className="text-slate-600">Historical data shows improvement over seasons and years.</p>
            </div>
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto bg-rose-100 rounded-2xl flex items-center justify-center mb-4">
                <Heart size={32} className="text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Stay Motivated</h3>
              <p className="text-slate-600">Every badge earned is a celebration. Swimmers love their Trophy Case.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="py-24 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-purple-600 font-semibold text-sm uppercase tracking-wide">Coming Soon</span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mt-3 mb-6">
              What's Next for GoodSwim
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              We're always building. Here's what's on the horizon.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Video Suite */}
            <div className="relative bg-white rounded-2xl p-8 shadow-sm border border-slate-100 overflow-hidden">
              <div className="absolute top-4 right-4 bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Q2 2026
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-5">
                <Video size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Coach Video Suite</h3>
              <p className="text-slate-600 leading-relaxed">
                Upload swimmer footage and break it down frame by frame. Add timestamps, voiceover notes, draw lines and angles directly on the video, and annotate key moments — then push the finished analysis straight to the swimmer's profile. AI-powered stroke analysis will also be available to help identify technique issues automatically.
              </p>
            </div>

            {/* Parent Video Upload */}
            <div className="relative bg-white rounded-2xl p-8 shadow-sm border border-slate-100 overflow-hidden">
              <div className="absolute top-4 right-4 bg-purple-100 text-purple-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                Q3 2026
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-5">
                <Smartphone size={24} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Parent Video Uploads</h3>
              <p className="text-slate-600 leading-relaxed">
                Parents can film their child's races and upload them right from the app, tagging each video to the specific meet result. Coaches get instant access to review footage alongside the data. AI analysis ties it all together — ask questions like "how did the 12&amp;under backstroke turns look at the last meet?" and get instant, actionable answers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-gradient-to-br from-slate-900 to-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Coaches Love GoodSwim
            </h2>
            <p className="text-xl text-slate-300">Join teams already saving time and swimming faster.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">10+</div>
              <div className="text-slate-400">Hours saved per week</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">100%</div>
              <div className="text-slate-400">Parent engagement</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">25k+</div>
              <div className="text-slate-400">Meet results analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">5k+</div>
              <div className="text-slate-400">Practices planned</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-teal-600 font-semibold text-sm uppercase tracking-wide">Testimonials</span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mt-3 mb-6">
              Hear From Fellow Coaches
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard 
              quote="The Close Calls report alone has changed how I plan meet entries. And the AI assistant is unreal - I just ask 'who's closest to a Sectionals cut?' and it tells me instantly. I used to spend hours digging through spreadsheets for that."
              author="Sarah M."
              role="Head Coach"
            />
            <TestimonialCard 
              quote="Having the full schedule, workout planner, and meet manager in one place is a game changer. I upload the meet invite PDF and everything gets parsed automatically - events, timeline, heat sheets. My assistant coaches can see it all without me sending a single email."
              author="Marcus J."
              role="Head Age Group Coach"
            />
            <TestimonialCard 
              quote="Parents love the portal. They can see schedules, commit to meets, and track their kid's progress all from their phone. I went from answering 20 texts a day to basically zero. It's given me my evenings back."
              author="Jennifer P."
              role="Associate Coach"
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-teal-600 font-semibold text-sm uppercase tracking-wide">Pricing</span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mt-3 mb-6">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-slate-600">Start free. Upgrade when you're ready.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-center">
            <PricingCard 
              name="Starter"
              price="$1"
              period="swimmer/mo"
              description="Perfect for getting started"
              features={[
                'Practice builder',
                'Basic reports',
                'Parent portal',
                'Roster management',
                'Email support'
              ]}
              cta="Get Started"
            />
            <PricingCard 
              name="Pro"
              price="$3"
              period="swimmer/mo"
              description="For growing programs"
              features={[
                'Everything in Starter',
                'AI video analysis',
                'Advanced reports',
                'Meet management',
                'Test set tracker',
                'Priority support'
              ]}
              popular={true}
              cta="Start Free Trial"
            />
            <PricingCard 
              name="Club"
              price="$5"
              period="swimmer/mo"
              description="For elite programs"
              features={[
                'Everything in Pro',
                'Multiple coach accounts',
                'Team records board',
                'Custom branding',
                'API access',
                'Dedicated support'
              ]}
              cta="Contact Sales"
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-cyan-600" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-400 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-300 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-6 text-center relative">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Program?
          </h2>
          <p className="text-xl text-teal-100 mb-10 max-w-2xl mx-auto">
            Join the coaches already saving time, improving communication, and helping their swimmers reach new heights.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/signup" 
              className="group flex items-center justify-center gap-2 bg-white text-teal-600 text-lg px-8 py-4 rounded-2xl hover:shadow-xl font-semibold transition-all hover:-translate-y-1"
            >
              Start Your Free Trial
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              to="/login" 
              className="flex items-center justify-center gap-2 text-white text-lg px-8 py-4 rounded-2xl border-2 border-white/30 hover:bg-white/10 font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>
          <p className="text-teal-200 mt-6 text-sm">No credit card required • 14-day free trial • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img 
                  src="/GoodSwimLogo.png" 
                  alt="GoodSwim" 
                  className="h-10 w-auto brightness-0 invert"
                />
              </div>
              <p className="text-sm">Modern swim team management built by coaches, for coaches.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Demo</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">© {new Date().getFullYear()} GoodSwim. All rights reserved.</p>
            <div className="flex items-center gap-2">
              <Shield size={16} />
              <span className="text-sm">Your data is safe & secure</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
