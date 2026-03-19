import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export default function DemoBanner() {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white px-4 py-2.5 flex items-center justify-center gap-3 text-sm">
      <Sparkles size={16} />
      <span>
        <strong>You're exploring the GoodSwim demo.</strong> This is a sample team with pre-loaded data.
      </span>
      <button
        onClick={() => navigate('/signup')}
        className="bg-white text-teal-700 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-teal-50 transition-colors ml-2"
      >
        Start Your Free Trial
      </button>
    </div>
  );
}
