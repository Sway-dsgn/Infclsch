import React from 'react';
import { Influencer, CampaignConfig } from '../types';
import { Sparkles, TrendingUp, Target, MapPin, Users } from 'lucide-react';

interface RelevanceScoreProps {
  influencer: Influencer;
  config: CampaignConfig;
  userLocation?: string;
  showDetails?: boolean;
}

function computeScore(inf: Influencer, cfg: CampaignConfig, userLocation?: string): { score: number; label: string; color: string; breakdown: { label: string; pct: number }[] } {
  const breakdown: { label: string; pct: number }[] = [];

  // 1. Category match (30%)
  const brandLower = cfg.brandName.toLowerCase();
  const productLower = cfg.productDescription.toLowerCase();
  const catLower = inf.category.toLowerCase();
  let catScore = 0;
  if (brandLower.includes(catLower) || productLower.includes(catLower)) {
    catScore = 30;
  } else if (
    (catLower === 'kuliner' && (productLower.includes('makan') || productLower.includes('minum') || productLower.includes('coklat') || productLower.includes('kopi'))) ||
    (catLower === 'fashion' && (productLower.includes('baju') || productLower.includes('pakaian') || productLower.includes('fashion'))) ||
    (catLower === 'lifestyle' && (productLower.includes('gaya') || productLower.includes('hidup') || productLower.includes('sehari'))) ||
    (catLower === 'beauty' && (productLower.includes('skincare') || productLower.includes('makeup') || productLower.includes('kecantikan'))) ||
    (catLower === 'edukasi' && (productLower.includes('edukasi') || productLower.includes('belajar') || productLower.includes('tips'))) ||
    (catLower === 'gaming' && (productLower.includes('game') || productLower.includes('gadget') || productLower.includes('digital')))
  ) {
    catScore = 25;
  } else {
    catScore = 15;
  }
  breakdown.push({ label: 'Kesesuaian Niche', pct: catScore });

  // 2. Engagement health (25%)
  const er = inf.engagementRate;
  let engScore = 0;
  if (er >= 8) engScore = 25;
  else if (er >= 5) engScore = 20;
  else if (er >= 3) engScore = 14;
  else engScore = 8;
  breakdown.push({ label: 'Kualitas Engagement', pct: engScore });

  // 3. Location proximity relevance (20%)
  const locLower = inf.location.toLowerCase();
  const cfgLocLower = userLocation || '';
  let locScore = 0;
  if (cfgLocLower && locLower.includes(cfgLocLower.toLowerCase().split(' ')[0])) {
    locScore = 20;
  } else if (inf.distanceKm <= 15) {
    locScore = 18;
  } else if (inf.distanceKm <= 35) {
    locScore = 14;
  } else if (inf.distanceKm <= 60) {
    locScore = 10;
  } else {
    locScore = 6;
  }
  breakdown.push({ label: 'Relevansi Lokasi', pct: locScore });

  // 4. Follower quality & size (15%)
  const f = inf.followers;
  let folScore = 0;
  if (f >= 100000) folScore = 8;
  else if (f >= 50000) folScore = 11;
  else if (f >= 10000) folScore = 15;
  else if (f >= 5000) folScore = 13;
  else folScore = 10;
  breakdown.push({ label: 'Ukuran & Kualitas Audiens', pct: folScore });

  // 5. Content fit (10%)
  const contentLower = inf.contentType.toLowerCase();
  const whyLower = inf.whyFits.toLowerCase();
  let contentScore = 0;
  const matchTerms = ['review', 'rekomendasi', 'kuliner', 'fashion', 'lifestyle', 'daily', 'tips', 'tutorial', 'travel', 'estetik', 'aesthetic', 'organic', 'ugc', 'konten', 'kreatif'];
  const matches = matchTerms.filter(t => contentLower.includes(t) || whyLower.includes(t)).length;
  contentScore = Math.min(10, matches * 2);
  breakdown.push({ label: 'Kesesuaian Konten', pct: contentScore });

  const total = Math.round(catScore + engScore + locScore + folScore + contentScore);

  let label: string;
  let color: string;
  if (total >= 85) { label = 'Sangat Cocok'; color = 'text-blue-600 bg-blue-50 border-blue-300'; }
  else if (total >= 70) { label = 'Cocok'; color = 'text-blue-600 bg-blue-50 border-blue-300'; }
  else if (total >= 55) { label = 'Potensi'; color = 'text-amber-600 bg-amber-50 border-amber-300'; }
  else if (total >= 40) { label = 'Cukup'; color = 'text-orange-600 bg-orange-50 border-orange-300'; }
  else { label = 'Kurang'; color = 'text-rose-600 bg-rose-50 border-rose-300'; }

  return { score: total, label, color, breakdown };
}

export default function RelevanceScore({ influencer, config, userLocation, showDetails }: RelevanceScoreProps) {
  const { score, label, color, breakdown } = computeScore(influencer, config, userLocation);

  const scoreColor = score >= 70 ? 'text-blue-600' : score >= 55 ? 'text-amber-600' : score >= 40 ? 'text-orange-600' : 'text-rose-600';
  const ringColor = score >= 70 ? 'stroke-blue-500' : score >= 55 ? 'stroke-amber-500' : score >= 40 ? 'stroke-orange-500' : 'stroke-rose-500';

  return (
    <div className="inline-flex items-center gap-2">
      <div className="relative w-8 h-8">
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-slate-200 dark:stroke-slate-600" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.5" fill="none"
            className={ringColor}
            strokeWidth="3"
            strokeDasharray={`${score * 0.97} 100`}
            strokeLinecap="round"
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-[8px] font-extrabold ${scoreColor}`}>
          {score}
        </span>
      </div>
      <div>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${color}`}>
          {label}
        </span>
      </div>
    </div>
  );
}

export function RelevanceBreakdown({ influencer, config, userLocation }: { influencer: Influencer; config: CampaignConfig; userLocation?: string }) {
  const { breakdown } = computeScore(influencer, config, userLocation);

  return (
    <div className="space-y-1.5">
      {breakdown.map((b) => (
        <div key={b.label}>
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="font-medium text-slate-600 dark:text-slate-400">{b.label}</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">{b.pct}/100</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all bg-blue-500"
              style={{ width: `${b.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
