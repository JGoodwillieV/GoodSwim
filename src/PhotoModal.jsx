// src/PhotoModal.jsx
import React from 'react';
import { X, Download } from 'lucide-react';

export default function PhotoModal({ photo, onClose }) {
  if (!photo) return null;

  const handleDownload = async (e) => {
    e.stopPropagation(); // Prevent click from closing modal
    try {
      // Fetch the image as a "blob" to force the browser to download it
      // instead of just opening it in a new tab
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `stormtracker-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download failed", err);
      alert("Could not download image.");
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
      >
        <X size={24} />
      </button>

      <div 
        className="relative max-w-5xl max-h-[90vh] flex flex-col items-center"
        onClick={e => e.stopPropagation()} // Clicking image shouldn't close modal
      >
        <img 
          src={photo.url} 
          alt={photo.caption || "Full screen view"} 
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />
        
        {/* Footer: Caption & Download */}
        <div className="mt-6 flex flex-col md:flex-row items-center gap-6 text-center">
           {photo.caption && (
             <p className="text-white text-lg font-medium">{photo.caption}</p>
           )}
           
           <button 
             onClick={handleDownload}
             className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 hover:scale-105"
           >
             <Download size={18} /> Download
           </button>
        </div>
      </div>
    </div>
  );
}
