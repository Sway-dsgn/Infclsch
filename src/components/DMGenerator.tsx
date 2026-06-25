import React, { useState, useEffect } from 'react';
import { Influencer, CampaignConfig, SavedCollaboration } from '../types';
import { Sparkles, Copy, Check, RefreshCw, Send, Loader2 } from 'lucide-react';

interface DMGeneratorProps {
  influencer: Influencer;
  campaignConfig: CampaignConfig;
  onSaveMessage: (messageText: string) => void;
  onClose: () => void;
}

export default function DMGenerator({ influencer, campaignConfig, onSaveMessage, onClose }: DMGeneratorProps) {
  const [config, setConfig] = useState<CampaignConfig>(campaignConfig);
  const [generatedText, setGeneratedText] = useState<string>('');

  useEffect(() => {
    setConfig(campaignConfig);
  }, [campaignConfig]);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const savedProvider = localStorage.getItem('ai_provider') || 'gemini';
      const savedKey = localStorage.getItem('ai_api_key') || localStorage.getItem('gemini_custom_api_key') || '';
      const savedBaseUrl = localStorage.getItem('ai_base_url') || '';
      const savedModel = localStorage.getItem('ai_model') || '';

      const response = await fetch('/api/generate-dm', {
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
          config
        })
      });

      if (!response.ok) {
        throw new Error('Gagal menghasilkan draf pesan dari server.');
      }

      const data = await response.json();
      setGeneratedText(data.text);
    } catch (err: any) {
      console.error(err);
      setError('Mode offline aktif atau koneksi terputus. Menggunakan template bawaan berkualitas tinggi.');
      // Auto fallback
      const offlineText = getOfflineTemplate(influencer, config);
      setGeneratedText(offlineText);
    } finally {
      setLoading(false);
    }
  };

  const getOfflineTemplate = (inf: Influencer, cfg: CampaignConfig) => {
    const brand = cfg.brandName || "[Nama Brand]";
    const product = cfg.productDescription || "[Nama Produk]";
    const perks = cfg.perks || "pengiriman produk gratis & fee";
    const name = inf.name;
    const username = inf.username;
    const category = inf.category;

    if (cfg.tone === 'Santai & Friendly') {
      return `Halo Kak ${name}! 😊\n\nKenalin kami dari tim ${brand}. Kami suka banget sama konten Kakak di ${inf.platform} (${username}), terutama pas ngebahas soal ${category} yang estetik dan asyik banget! ✨\n\nKebetulan kami sedang ada campaign baru untuk memperkenalkan produk ${product} yang bertujuan meningkatkan awareness secara organik lewat kreativitas para creator lokal.\n\nKarena audiens Kakak cocok banget dengan brand kami, kami pengen banget ngajak Kak ${name} buat kolaborasi ramah lingkungan/organik!\n\nBenefit yang kami persiapkan:\n🎁 ${perks}\n\nApakah Kakak tertarik untuk mencoba? Jika bersedia, boleh kabari kami atau kirim Rate Card terbaru Kakak ya. Terima kasih banyak, Kak! Ditunggu kabarnya! 🙌🌟`;
    } else if (cfg.tone === 'Antusias & Kreatif') {
      return `Hai Kak ${name}! 🚀🔥\n\nSalam kenal dari ${brand}! Kami suka banget merhatiin feeds / video di akun ${inf.platform} Kakak (${username}). Konten ${category} yang Kakak buatan bener-bener fresh dan dapet engagement yang asyik abis dari followers Kakak. Keren banget!\n\nSaat ini kami lagi ngerilis campaign organic brand awareness untuk memperkenalkan: ${product}.\n\nKami mau ngajakin Kak ${name} buat kolaborasi bikin konten kreatif dengan kebebasan penuh dalam berkreasi sesuai gaya unik Kakak!\n\nBenefit seru untuk Kakak:\n✓ ${perks}\n✓ Creative freedom penuh buat konsep konten!\n\nKalau Kakak tertarik buat bikin kolaborasi seru ini, langsung reply pesan ini ya! Kita obrolin ide kreatifnya bareng-bareng. Let's create something awesome! 💥🎸`;
    } else {
      return `Yth. Kak ${name} (${username}),\n\nSelamat siang, semoga dalam keadaan sehat selalu.\n\nPerkenalkan, saya perwakilan tim Digital Marketing dari ${brand}. Kami sangat mengagumi konten-konten berkualitas tinggi bertema ${category} yang Anda unggah secara konsisten di media sosial ${inf.platform}.\n\nSaat ini, brand kami sedang mengadakan kampanye influencer marketing organik dengan tujuan meningkatkan brand awareness untuk produk kami, yaitu: ${product}.\n\nKami tertarik untuk mengajak Anda berkolaborasi karena kami meyakini bahwa demografis audiens Anda sangat selaras dengan target konsumen kami. Kami telah menyiapkan kompensasi yang sesuai berupa:\n- ${perks}\n- Kesempatan kerja sama berkelanjutan\n\nApabila Anda menyukai produk kami dan bersedia menerima tawaran kerja sama ini, mohon ketersediaannya untuk menginfokan rate card atau alamat pengiriman produk dengan membalas pesan ini.\n\nTerima kasih banyak atas waktu dan perhatian Anda.\n\nHormat kami,\nTim Digital Marketing ${brand}`;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSaveMessage(generatedText);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-6 max-h-[90vh] overflow-y-auto w-full md:max-w-2xl" id="dm-generator-container">
      <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-slate-700 mb-6">
        <div>
          <h3 className="text-xl font-display font-semibold text-slate-800 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500 fill-blue-100 dark:fill-blue-900/50" />
            Pembuat Pesan DM AI
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Draf pesan kolaborasi khusus untuk <span className="font-semibold text-blue-600 dark:text-blue-400">{influencer.username}</span> ({influencer.name})
          </p>
        </div>
        <button 
          onClick={onClose}
          className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Tutup"
          id="close-btn-dm"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CONFIG FORM */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">Pengaturan Kampanye</h4>
          
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nama Brand</label>
            <input 
              type="text" 
              value={config.brandName}
              onChange={(e) => setConfig({ ...config, brandName: e.target.value })}
              className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-700 focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-800 focus:border-blue-500 dark:focus:border-blue-400 transition-all outline-none text-slate-800 dark:text-slate-200"
              placeholder="Contoh: ChocoDelight"
              id="brand-name-input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Deskripsi Singkat Produk</label>
            <textarea 
              rows={2}
              value={config.productDescription}
              onChange={(e) => setConfig({ ...config, productDescription: e.target.value })}
              className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-700 focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-800 focus:border-blue-500 dark:focus:border-blue-400 transition-all outline-none resize-none text-slate-800 dark:text-slate-200"
              placeholder="Contoh: Kue brownies panggang premium rasa triple-choco, rendah gula dan gluten-free."
              id="product-desc-textarea"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tone & Gaya Bahasa</label>
            <select 
              value={config.tone}
              onChange={(e) => setConfig({ ...config, tone: e.target.value as any })}
              className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-700 focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-800 focus:border-blue-500 dark:focus:border-blue-400 cursor-pointer outline-none text-slate-800 dark:text-slate-200"
              id="tone-select"
            >
              <option value="Sopan & Formal">Sopan & Formal (Cocok untuk email / brand korporat)</option>
              <option value="Santai & Friendly">Santai & Friendly (Cocok untuk DM Instagram / brand anak muda)</option>
              <option value="Antusias & Kreatif">Antusias & Kreatif (Cocok untuk TikTok / brand kekinian)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Kompensasi / Benefit</label>
            <input 
              type="text" 
              value={config.perks}
              onChange={(e) => setConfig({ ...config, perks: e.target.value })}
              className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-slate-50 dark:bg-slate-700 focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-800 focus:border-blue-500 dark:focus:border-blue-400 transition-all outline-none text-slate-800 dark:text-slate-200"
              placeholder="Contoh: Hampers Brownies Spesial + Komisi 10% Penjualan"
              id="perks-input"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-slate-800 dark:bg-blue-600 hover:bg-slate-900 dark:hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors duration-200 cursor-pointer disabled:opacity-50"
            id="generate-dm-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Merumuskan Pesan...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Buat / Perbarui Draf AI
              </>
            )}
          </button>
        </div>

        {/* GENERATED TEXT VIEW */}
        <div className="flex flex-col h-full min-h-[300px]">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase">Hasil Draf Pesan</h4>
            {generatedText && (
              <button 
                onClick={handleCopy}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 font-medium bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/50 px-2.5 py-1 rounded-md transition-colors"
                id="copy-text-btn"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Tersalin' : 'Salin Pesan'}
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-700">
            {generatedText ? (
              <textarea
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                className="w-full flex-1 p-3.5 text-sm font-sans text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 resize-none border-0 focus:ring-0 outline-none leading-relaxed min-h-[240px]"
                id="generated-dm-textarea"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-500">
                <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-500 stroke-[1.5] mb-2 animate-pulse" />
                <p className="text-xs">Klik tombol &ldquo;Buat / Perbarui Draf AI&rdquo; di sebelah kiri untuk menghasilkan draf undangan personal yang disesuaikan dengan niche kreator.</p>
              </div>
            )}
          </div>

          {generatedText && (
            <button
              onClick={handleSave}
              className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              id="save-message-btn"
            >
              Simpan ke Draf Kolaborasi
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-xs rounded-xl" id="api-error-alert">
          💡 {error}
        </div>
      )}
    </div>
  );
}
