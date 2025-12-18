import React, { useState, useEffect } from 'react';
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
function TestimonialCard({ quote, author, role, team }) {
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
          <div className="text-sm text-slate-500">{role} • {team}</div>
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

      {/* Feature Grid */}
      <section id="features" className="relative py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-teal-600 font-semibold text-sm uppercase tracking-wide">Features</span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mt-3 mb-6">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              From practice planning to parent communication, StormTracker handles it all.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={Waves}
              title="Visual Practice Builder"
              description="Create beautiful practice plans with sets, equipment, and focus areas. Share directly with swimmers and print deck cards."
              color="bg-gradient-to-br from-teal-500 to-teal-600"
              delay={0}
            />
            <FeatureCard 
              icon={Video}
              title="AI Video Analysis"
              description="Upload underwater or deck footage and get instant AI-powered stroke analysis with actionable feedback."
              color="bg-gradient-to-br from-purple-500 to-purple-600"
              delay={100}
            />
            <FeatureCard 
              icon={Trophy}
              title="Trophy Case & Standards"
              description="Track achievements from B times to Nationals. Swimmers see their progress toward their next milestone."
              color="bg-gradient-to-br from-amber-500 to-orange-500"
              delay={200}
            />
            <FeatureCard 
              icon={Calendar}
              title="Meet Management"
              description="Import meet info PDFs, manage entries, track commitments, and auto-generate event recommendations."
              color="bg-gradient-to-br from-emerald-500 to-emerald-600"
              delay={300}
            />
            <FeatureCard 
              icon={Timer}
              title="Test Set Tracker"
              description="Run live test sets with multi-lane support, automatic timing, and instant comparison to previous results."
              color="bg-gradient-to-br from-cyan-500 to-cyan-600"
              delay={400}
            />
            <FeatureCard 
              icon={FileText}
              title="Powerful Reports"
              description="Big Movers, Close Calls, Team Records, Relay Generators — reports that actually help you coach better."
              color="bg-gradient-to-br from-rose-500 to-rose-600"
              delay={500}
            />
            <FeatureCard 
              icon={Users}
              title="Parent Portal"
              description="Keep parents informed with schedules, meet info, announcements, and swimmer progress — without endless emails."
              color="bg-gradient-to-br from-blue-500 to-indigo-600"
              delay={600}
            />
            <FeatureCard 
              icon={MessageSquare}
              title="Team Communications"
              description="Send targeted announcements to specific groups. Parents get instant access through their own dashboard."
              color="bg-gradient-to-br from-pink-500 to-pink-600"
              delay={700}
            />
            <FeatureCard 
              icon={BarChart3}
              title="Progress Tracking"
              description="Visualize improvement over time with charts, PB tracking, and historical performance data."
              color="bg-gradient-to-br from-teal-500 to-teal-600"
              delay={800}
            />
          </div>
        </div>
      </section>

      {/* Big Feature 1: Practice Builder */}
      <section id="benefits" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <BigFeature 
            icon={Waves}
            title="Practice Planning That Actually Works"
            description="Build workouts visually with our intuitive practice builder. No more scribbling on whiteboards or losing workout cards."
            features={[
              'Drag-and-drop set organization',
              'Quick-entry mode for rapid input',
              'Equipment and focus tracking',
              'Print-ready deck cards',
              'Library of saved workouts',
              'Run mode for live practices'
            ]}
            color="bg-gradient-to-br from-teal-500 to-cyan-600"
            gradient="bg-gradient-to-br from-teal-500 to-cyan-600"
            imageSide="right"
          />
        </div>
      </section>

      {/* Big Feature 2: AI Analysis */}
      <section className="py-24 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-6">
          <BigFeature 
            icon={Sparkles}
            title="AI-Powered Stroke Analysis"
            description="Upload video from your phone and get professional-level technique analysis in seconds. Our AI identifies exactly what to fix."
            features={[
              'Works with any camera or phone',
              'Above and underwater footage',
              'Timestamped technique notes',
              'Specific drill recommendations',
              'Share feedback with swimmers',
              'Track improvement over time'
            ]}
            color="bg-gradient-to-br from-purple-500 to-pink-600"
            gradient="bg-gradient-to-br from-purple-500 to-pink-600"
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
              <div className="text-5xl font-bold text-white mb-2">5+</div>
              <div className="text-slate-400">Hours saved per week</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">100%</div>
              <div className="text-slate-400">Parent engagement</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">10k+</div>
              <div className="text-slate-400">Swimmers tracked</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-white mb-2">50k+</div>
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
              quote="StormTracker has completely transformed how I run practices. The visual builder is intuitive and swimmers love seeing their Trophy Case fill up."
              author="Sarah Mitchell"
              role="Head Coach"
              team="Blue Tide Aquatics"
            />
            <TestimonialCard 
              quote="The AI video analysis is like having an assistant coach. I can give technique feedback to twice as many swimmers in half the time."
              author="Marcus Johnson"
              role="Associate Coach"
              team="Riverside Swim Club"
            />
            <TestimonialCard 
              quote="Parents finally have everything in one place. No more 'I didn't see the email' excuses. Communication has never been easier."
              author="Jennifer Park"
              role="Head Age Group Coach"
              team="Summit Swimming"
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
              price="Free"
              description="Perfect for getting started"
              features={[
                'Up to 25 swimmers',
                'Practice builder',
                'Basic reports',
                'Parent portal',
                'Email support'
              ]}
              cta="Get Started Free"
            />
            <PricingCard 
              name="Pro"
              price="$29"
              period="month"
              description="For growing programs"
              features={[
                'Unlimited swimmers',
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
              price="$79"
              period="month"
              description="For large organizations"
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
