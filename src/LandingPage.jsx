import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto">
        <div className="text-2xl font-bold text-blue-600">StormTracker</div>
        <div className="space-x-4">
          <Link to="/login" className="text-slate-600 hover:text-blue-600 font-medium">Log In</Link>
          <Link to="/signup" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="text-center py-20 px-4">
        <h1 className="text-5xl font-bold text-slate-900 mb-6">
          Modern Swim Team Management
        </h1>
        <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
          Built by coaches, for coaches. Practice planning, AI video analysis, 
          and team management in one platform.
        </p>
        <Link to="/signup" className="inline-block bg-blue-600 text-white text-lg px-8 py-4 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30">
          Start Your Free Trial
        </Link>
      </header>

      {/* Feature Grid (Placeholder based on PDF) */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-8">
          <FeatureCard title="Practice Planning" desc="Create and share workouts visually." />
          <FeatureCard title="AI Analysis" desc="Analyze stroke technique automatically." />
          <FeatureCard title="Trophy Case" desc="Visualize swimmer progress beautifully." />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, desc }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-slate-600">{desc}</p>
    </div>
  );
}
