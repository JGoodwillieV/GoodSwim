// src/AllPhotos.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { ChevronLeft, Image as ImageIcon } from 'lucide-react';
import PhotoModal from './PhotoModal'; // Import the new modal

export default function AllPhotos({ onBack }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null); // Track clicked photo

  useEffect(() => {
    const fetchPhotos = async () => {
      const { data } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });
      
      setPhotos(data || []);
      setLoading(false);
    };

    fetchPhotos();
  }, []);

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ImageIcon className="text-blue-600" /> Team Gallery
          </h2>
          <p className="text-slate-500">All uploaded memories</p>
        </div>
      </div>

      {/* Gallery Grid */}
      {loading ? (
        <div className="text-center text-slate-400 py-20">Loading Photos...</div>
      ) : photos.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <ImageIcon size={48} className="mx-auto text-slate-300 mb-2"/>
            <p className="text-slate-500">No photos uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {photos.map((photo) => (
            <div 
                key={photo.id} 
                onClick={() => setSelectedPhoto(photo)} // CLICK HANDLER
                className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <img 
                src={photo.url} 
                alt="Team memory" 
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs font-medium line-clamp-2">{photo.caption}</p>
                  <p className="text-slate-400 text-[10px] mt-1">
                    {new Date(photo.created_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* NEW FULL SCREEN VIEWER */}
      <PhotoModal photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
    </div>
  );
}
