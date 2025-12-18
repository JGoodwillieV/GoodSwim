// src/InstallPrompt.jsx
import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Listen for the beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Check if user has dismissed before
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      
      // Show prompt if never dismissed or dismissed more than a week ago
      if (!dismissed || Date.now() - dismissedTime > oneWeek) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Show iOS prompt after a short delay if on iOS and not installed
    if (iOS && !standalone) {
      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      const dismissedTime = dismissed ? parseInt(dismissed) : 0;
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      
      if (!dismissed || Date.now() - dismissedTime > oneWeek) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for user response
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Install prompt outcome:', outcome);

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  // Don't show if already installed
  if (isStandalone) return null;

  // Don't show if prompt not ready
  if (!showPrompt) return null;

  // iOS-specific prompt (can't auto-prompt on iOS)
  if (isIOS) {
    return (
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in slide-in-from-bottom duration-300">
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Smartphone size={24} className="text-white" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-sm">Install StormTracker</h3>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">
              Add to your home screen for the best experience!
            </p>
            
            <div className="mt-3 bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
              <p className="font-medium mb-2">How to install:</p>
              <ol className="space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                  Tap the <span className="font-semibold">Share</span> button
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                  Scroll and tap <span className="font-semibold">"Add to Home Screen"</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                  Tap <span className="font-semibold">"Add"</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleDismiss}
          className="w-full mt-3 py-2 text-slate-500 text-xs font-medium hover:text-slate-700"
        >
          Maybe Later
        </button>
      </div>
    );
  }

  // Standard install prompt (Chrome, Edge, etc.)
  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in slide-in-from-bottom duration-300">
      <button 
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
      >
        <X size={20} />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0">
          <Download size={24} className="text-white" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 text-sm">Install StormTracker</h3>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Install our app for quick access and offline support!
          </p>
        </div>
      </div>
      
      <div className="flex gap-2 mt-4">
        <button 
          onClick={handleDismiss}
          className="flex-1 py-2.5 text-slate-600 text-sm font-medium hover:bg-slate-50 rounded-lg transition-colors"
        >
          Not Now
        </button>
        <button 
          onClick={handleInstall}
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Download size={16} />
          Install
        </button>
      </div>
    </div>
  );
}
