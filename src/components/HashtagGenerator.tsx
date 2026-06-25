import React, { useState } from 'react';
import { Sparkles, Copy, Check, Loader2, Hash, MapPin, Tag, TrendingUp, X } from 'lucide-react';
import { Influencer, CampaignConfig } from '../types';

interface HashtagGeneratorProps {
  influencer: Influencer;
  campaignConfig: CampaignConfig;
  onClose: () => void;
}

export default function HashtagGenerator({ influencer, campaignConfig, onClose }: HashtagGeneratorProps) {
  const [hashtags, setHashtags] = useState<{
    trending: string[];
    local: string[];
    niche: string[];
    brand: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const savedProvider = localStorage.getItem('ai_provider') || 'gemini';
      const savedKey = localStorage.getItem('ai_api_key') || localStorage.getItem('gemini_custom_api_key') || '';
      const savedBaseUrl = localStorage.getItem('ai_base_url') || '';
      const savedModel = localStorage.getItem('ai_model') || '';

      const response = await fetch('/api/generate-hashtags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AI-Provider': savedProvider,
          'X-AI-API-Key': savedKey,
          'X-AI-Base-URL': savedBaseUrl,
          'X-AI-Model': savedModel,
          'X-Gemini-API-Key': savedKey
        },
        body: JSON.stringify({
          influencer,
          config: campaignConfig
        })
      });

      if (!response.ok) {
        throw new Error('Gagal menghasilkan hashtag');
      }

      const data = await response.json();
      setHashtags(data);
    } catch (err: any) {
      setError('Mode offline — menggunakan hashtag template lokal.');
      setHashtags(getLocalHashtags(influencer, campaignConfig));
    } finally {
      setLoading(false);
    }
  };

  const copyAll = () => {
    if (!hashtags) return;
    const all = [
      ...hashtags.brand,
      ...hashtags.niche,
      ...hashtags.local,
      ...hashtags.trending
    ].join(' ');
    navigator.clipboard.writeText(all);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 max-h-[90vh] overflow-y-auto w-full md:max-w-xl">
      <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-700 mb-5">
        <div className="flex items-center gap-2">
          <Hash className="w-5 h-5 text-blue-500" />
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">AI Hashtag Generator</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Untuk @{influencer.username.replace('@', '')}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>Generate hashtag yang relevan berdasarkan brand <strong>{campaignConfig.brandName}</strong>, niche <strong>{influencer.category}</strong>, dan lokasi <strong>{influencer.location}</strong></span>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Menghasilkan...' : 'Generate Hashtag AI'}
        </button>

        {error && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl text-xs text-amber-800 dark:text-amber-300">
            {error}
          </div>
        )}

        {hashtags && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={copyAll}
                className="text-xs flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg font-medium transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-blue-600" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Tersalin!' : 'Salin Semua'}
              </button>
            </div>

            <Group title="🏷️ Brand Hashtags" icon={<Tag className="w-3.5 h-3.5" />} items={hashtags.brand} color="blue" />
            <Group title="📂 Niche Hashtags" icon={<Hash className="w-3.5 h-3.5" />} items={hashtags.niche} color="blue" />
            <Group title="📍 Local Hashtags" icon={<MapPin className="w-3.5 h-3.5" />} items={hashtags.local} color="amber" />
            <Group title="📈 Trending Hashtags" icon={<TrendingUp className="w-3.5 h-3.5" />} items={hashtags.trending} color="rose" />
          </div>
        )}
      </div>
    </div>
  );
}

function Group({ title, icon, items, color }: { title: string; icon: React.ReactNode; items: string[]; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300',
    amber: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300',
    rose: 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-300',
  };

  return (
    <div className={`p-3 rounded-xl border ${colorMap[color] || colorMap.blue}`}>
      <div className="flex items-center gap-1.5 mb-2 font-semibold text-xs">
        {icon}
        {title}
        <span className="ml-auto text-[10px] opacity-60">{items.length} tag</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((tag, i) => (
          <span key={i} className="text-[11px] font-mono bg-white/70 dark:bg-slate-800/70 px-2 py-0.5 rounded-full border border-current/20">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function getLocalHashtags(inf: Influencer, cfg: CampaignConfig) {
  const brandSlug = cfg.brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const locationSlug = inf.location.split('(')[0].trim().toLowerCase().replace(/\s+/g, '');
  const categorySlug = inf.category.toLowerCase();

  return {
    brand: [
      `#${brandSlug}`,
      `#${brandSlug}Indonesia`,
      `#${brandSlug}Review`,
      `#${brandSlug}Promo`,
    ],
    niche: [
      `#${categorySlug}Indonesia`,
      `#${categorySlug}Lokal`,
      `#Review${inf.category}`,
      `#${inf.category === 'Kuliner' ? 'Foodie' : inf.category}Content`,
    ],
    local: [
      `#${locationSlug}`,
      `#${locationSlug}Hits`,
      `#${locationSlug}Kuliner`,
      `#${locationSlug}Creators`,
    ],
    trending: [
      '#FYP',
      '#Viral',
      '#ExplorePage',
      '#OOTDIndonesia',
      '#LocalPride',
    ]
  };
}
