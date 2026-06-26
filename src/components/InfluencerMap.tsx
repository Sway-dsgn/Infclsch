import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Influencer } from '../types';

interface InfluencerMapProps {
  creators: Influencer[];
  userLocation?: string;
}

const CITY_COORDS: Record<string, [number, number]> = {
  'bandung': [-6.9175, 107.6191],
  'jakarta': [-6.2088, 106.8456],
  'surabaya': [-7.2575, 112.7521],
  'yogyakarta': [-7.7956, 110.3695],
  'semarang': [-6.9932, 110.4203],
  'malang': [-7.9797, 112.6304],
  'medan': [3.5952, 98.6722],
  'makassar': [-5.1477, 119.4322],
  'denpasar': [-8.6705, 115.2126],
  'solo': [-7.5667, 110.8281],
  'surakarta': [-7.5667, 110.8281],
};

function getCoords(influencer: Influencer): [number, number] {
  if (influencer.latitude != null && influencer.longitude != null) {
    return [influencer.latitude, influencer.longitude];
  }
  const loc = influencer.location.toLowerCase();
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (loc.includes(city)) return coords;
  }
  return [-7.5667, 110.8281];
}

export default function InfluencerMap({ creators, userLocation }: InfluencerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || creators.length === 0) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    const bounds = L.latLngBounds([]);

    creators.forEach((creator) => {
      const coords = getCoords(creator);
      const platformColor = creator.platform === 'Instagram' ? '#E1306C' : '#000000';
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background: ${platformColor};
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        ">${creator.name.slice(0, 2).toUpperCase()}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(coords, { icon }).addTo(map);
      bounds.extend(coords);

      const igLink = creator.instagramUrl || `https://www.instagram.com/${creator.username.replace('@', '')}`;
      const tiktokLink = `https://www.tiktok.com/@${creator.username.replace('@', '')}`;
      const profileLink = creator.platform === 'Instagram' ? igLink : tiktokLink;

      const popupHtml = `
        <div style="font-family: sans-serif; font-size: 12px; min-width: 200px;">
          <strong style="font-size: 14px;">${creator.name}</strong><br/>
          <span style="color: #666;">${creator.username}</span><br/>
          <span style="display:inline-block;background:${platformColor};color:white;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:bold;margin:4px 0;">${creator.platform}</span>
          <br/>
          📍 ${creator.location}<br/>
          👥 ${creator.followers >= 1000 ? (creator.followers / 1000).toFixed(1) + 'K' : creator.followers} followers &bull; 📊 ${creator.engagementRate}% ER
          ${creator.rating ? `<br/>⭐ ${creator.rating}${creator.reviewsCount ? ` (${creator.reviewsCount} ulasan)` : ''}` : ''}
          <br/><br/>
          <a href="${profileLink}" target="_blank" rel="noopener noreferrer" style="
            display:inline-block;background:#0095F6;color:white;
            padding:6px 12px;border-radius:6px;text-decoration:none;
            font-size:11px;font-weight:bold;
          ">Buka Profil ${creator.platform} ↗</a>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        marker.openPopup();
      });
    });

    if (creators.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    setTimeout(() => map.invalidateSize(), 200);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [creators]);

  if (creators.length === 0) {
    return (
      <div className="bg-slate-100 dark:bg-slate-700 rounded-xl h-[300px] flex items-center justify-center text-xs text-slate-400 border border-slate-200 dark:border-slate-600">
        Tidak ada data untuk ditampilkan di peta
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 shadow-sm">
      <div ref={mapRef} className="w-full h-[400px] z-0" />
      <div className="px-4 py-2 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-400 flex items-center justify-between">
        <span>{creators.length} data — klik marker untuk lihat detail & buka IG</span>
        <span>© OpenStreetMap contributors</span>
      </div>
    </div>
  );
}
