
import React from 'react';
import { LocationData } from '../types';

interface MapEmbedProps {
  from: LocationData;
  to: LocationData;
}

export const MapEmbed: React.FC<MapEmbedProps> = ({ from, to }) => {
  const padding = 0.05;
  const minLat = Math.min(from.lat, to.lat) - padding;
  const maxLat = Math.max(from.lat, to.lat) + padding;
  const minLng = Math.min(from.lng, to.lng) - padding;
  const maxLng = Math.max(from.lng, to.lng) + padding;
  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${from.lat},${from.lng}`;

  return (
    <div className="w-full h-full bg-slate-200 dark:bg-slate-800 relative group">
      <iframe
        title="Route Map"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        loading="lazy"
        src={mapUrl}
        className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-500"
      />
      <div className="absolute bottom-1 right-1 bg-white/80 dark:bg-black/80 text-[8px] px-1 rounded pointer-events-none text-slate-500">
        © OpenStreetMap
      </div>
    </div>
  );
};
