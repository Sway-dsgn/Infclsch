import React, { useState, useEffect } from 'react';
import { Compass, Search, Users, BarChart3, ArrowRight, Moon, Sun, Star, TrendingUp, Target, Instagram, Music2, Youtube, Sparkles, Check, Layers, Quote, Activity } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
}

const creators = [
  { name: 'Aulia Safira', category: 'Beauty', followers: '48.2K', er: '5.8%', location: 'Jakarta' },
  { name: 'Raffi Ahmad', category: 'Lifestyle', followers: '125K', er: '4.2%', location: 'Bandung' },
  { name: 'Gita Savitri', category: 'Fashion', followers: '89.7K', er: '6.1%', location: 'Yogyakarta' },
  { name: 'Bimo Kuncoro', category: 'Gaming', followers: '234K', er: '7.3%', location: 'Surabaya' },
  { name: 'Sari Nurlita', category: 'Tech', followers: '32.1K', er: '4.9%', location: 'Jakarta' },
  { name: 'Dimas Pratama', category: 'Kuliner', followers: '67.5K', er: '5.4%', location: 'Solo' },
];

const testimonials = [
  { name: 'Rina Wijaya', role: 'Marketing Manager, Lokal.id', quote: 'Influx membantu kami menemukan kreator yang tepat dalam hitungan menit. Engagement rate campaign kami naik 3x lipat!', avatar: 'RW' },
  { name: 'Andi Pratama', role: 'Founder, Batik Nusantara', quote: 'Dulu cari influencer manual sampe stress. Sekarang tinggal filter, dapet langsung. Game changer banget!', avatar: 'AP' },
  { name: 'Sinta Dewi', role: 'Brand Strategist, KitaBisa', quote: 'Platform ini bikin proses kolaborasi jadi super transparan. ROI tracking-nya akurat banget.', avatar: 'SD' },
  { name: 'Fajar Hidayat', role: 'CEO, MarkPlus Inc', quote: 'Analytics-nya bikin kita paham audiens kreator sebelum collaborate. Recommended!', avatar: 'FH' },
];

export default function LandingPage({ onGetStarted, darkMode, onToggleDark }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      {/* === TOP ANNOUNCEMENT === */}
      <div className="border-b border-slate-100 py-2 text-center text-xs text-slate-400">
        Temukan kreator yang tepat dan kembangkan brand kamu lebih cepat
      </div>

      {/* === NAVBAR === */}
      <nav className={`sticky top-0 z-50 transition-all duration-200 bg-white ${scrolled ? 'border-b border-slate-100' : ''}`}>
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                <Compass className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-base tracking-tight">Influx</span>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {['Cari Kreator', 'Kampanye', 'Analytics', 'Marketplace', 'Blog', 'Harga'].map((item) => (
                <a key={item} href="#" className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-50 transition-all">{item}</a>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={onToggleDark} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={onGetStarted} className="text-sm font-medium text-slate-500 hover:text-slate-800 px-3 py-1.5 hidden sm:block cursor-pointer">Masuk</button>
              <button onClick={onGetStarted} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-all cursor-pointer">
                Mulai Kampanye
              </button>
              <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-slate-100 cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
            </div>
          </div>
          {menuOpen && (
            <div className="md:hidden py-2 border-t border-slate-100 space-y-0.5 pb-3">
              {['Cari Kreator', 'Kampanye', 'Analytics', 'Marketplace', 'Blog', 'Harga'].map((item) => (
                <a key={item} href="#" className="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-lg">{item}</a>
              ))}
              <button onClick={onGetStarted} className="w-full mt-1 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg cursor-pointer">Mulai Kampanye</button>
            </div>
          )}
        </div>
      </nav>

      {/* === HERO === */}
      <section className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 border border-slate-200 text-slate-500 text-xs px-3 py-1 rounded-full mb-5">
              <Sparkles className="w-3 h-3" />
              Platform Influencer Marketing
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-slate-900">
              Temukan Kreator Terbaik
              <br />untuk Brand Kamu
            </h1>

            <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-xl mx-auto">
              Influx membantu brand menemukan influencer autentik, menganalisis audiens, dan membuat campaign yang sukses.
            </p>

            <div className="flex items-center justify-center gap-3 mt-7">
              <button onClick={onGetStarted} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-all cursor-pointer">
                Cari Kreator
              </button>
              <button className="border border-slate-200 hover:border-slate-300 text-slate-600 font-medium px-6 py-2.5 rounded-lg text-sm transition-all bg-white cursor-pointer">
                Jelajahi Platform
              </button>
            </div>
          </div>

          {/* Dashboard mockup — clean flat */}
          <div className="mt-14 border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              <div className="md:col-span-4 p-4 sm:p-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Analytics</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Engagement Rate</span><span className="font-semibold text-slate-800">5.8%</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Followers</span><span className="font-semibold text-slate-800">48.2K</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Demografi</span><span className="font-semibold text-slate-800">18-34</span></div>
                  <div className="h-8 flex items-end gap-1 pt-2">
                    {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
                      <div key={i} className="flex-1 bg-slate-800 rounded-sm" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 p-4 sm:p-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Creator Marketplace</span>
                </div>
                <div className="space-y-2">
                  {creators.slice(0, 4).map((c) => (
                    <div key={c.name} className="flex items-center gap-3 py-1.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">
                        {c.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{c.name}</div>
                        <div className="text-xs text-slate-400">{c.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-800">{c.followers}</div>
                        <div className="text-xs text-slate-400">{c.er}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-3 p-4 sm:p-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <Target className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Performa</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Reach</span><span className="font-semibold text-slate-800">1.2M</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">Conversion</span><span className="font-semibold text-blue-600">8.4%</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-400">ROI</span><span className="font-semibold text-slate-800">3.2x</span></div>
                  <div className="text-center pt-2">
                    <span className="text-2xl font-black text-slate-800">72.8%</span>
                    <div className="text-xs text-slate-400">Engagement Score</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === TRUST === */}
      <section className="border-b border-slate-100 py-10">
        <div className="max-w-6xl mx-auto px-5">
          <p className="text-center text-xs text-slate-400 font-medium mb-5">Digunakan oleh brand dan kreator di seluruh Indonesia</p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-slate-300">
            {['Tokopedia', 'Gojek', 'Shopee', 'Traveloka', 'Bukalapak', 'Blibli'].map((brand) => (
              <span key={brand} className="text-lg sm:text-xl font-bold tracking-tight">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* === FEATURES === */}
      <section className="border-b border-slate-100 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="max-w-xl mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Semua yang kamu butuh untuk campaign influencer</h2>
            <p className="mt-3 text-slate-400 text-sm">Temukan, analisis, dan kelola kolaborasi kreator dalam satu platform.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: <Search className="w-5 h-5" />, title: 'Discovery Kreator', desc: 'Temukan influencer berdasarkan niche, audiens, engagement, dan lokasi dengan filter cerdas.' },
              { icon: <Activity className="w-5 h-5" />, title: 'Analytics Audiens', desc: 'Pahami demografi audiens kreator sebelum memulai kampanye. Data real-time akurat.' },
              { icon: <Layers className="w-5 h-5" />, title: 'Manajemen Campaign', desc: 'Kelola kolaborasi, tracking performa, dan ukur ROI dalam satu dashboard.' },
            ].map((f) => (
              <div key={f.title} className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors bg-white">
                <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 mb-3">{f.icon}</div>
                <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === CREATOR MARKETPLACE === */}
      <section className="border-b border-slate-100 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="max-w-xl mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Temukan ribuan kreator</h2>
            <p className="mt-2 text-slate-400 text-sm">Jelajahi database kreator berdasarkan kategori, performa, dan lokasi.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {creators.map((c) => (
              <div key={c.name} className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors bg-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                    {c.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900">{c.name}</h4>
                    <span className="text-xs text-slate-400">{c.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs border-t border-slate-100 pt-3">
                  <div><span className="font-semibold text-slate-800">{c.followers}</span><span className="text-slate-400 ml-1">followers</span></div>
                  <div><span className="font-semibold text-blue-600">{c.er}</span><span className="text-slate-400 ml-1">ER</span></div>
                  <div className="text-slate-400 ml-auto">{c.location}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === ANALYTICS DASHBOARD PREVIEW === */}
      <section className="border-b border-slate-100 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="max-w-xl mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Dashboard analytics</h2>
            <p className="mt-2 text-slate-400 text-sm">Pantau performa campaign dengan data yang jelas.</p>
          </div>

          <div className="border border-slate-200 rounded-xl bg-white">
            <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              <div className="md:col-span-8 p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Overview Campaign</h3>
                <div className="space-y-3.5">
                  {[
                    { label: 'Jangkauan (Reach)', value: '1.2M', pct: 85, color: 'bg-slate-800' },
                    { label: 'Engagement Rate', value: '5.8%', pct: 72, color: 'bg-slate-700' },
                    { label: 'Conversion Rate', value: '8.4%', pct: 64, color: 'bg-slate-600' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1"><span className="text-slate-500">{item.label}</span><span className="font-semibold text-slate-800">{item.value}</span></div>
                      <div className="h-2 bg-slate-100 rounded"><div className={`h-2 rounded ${item.color}`} style={{width: `${item.pct}%`}} /></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-4 p-5">
                <h3 className="text-sm font-semibold text-slate-800 mb-4">Top Performers</h3>
                <div className="space-y-3">
                  {creators.slice(0, 4).map((c, i) => (
                    <div key={c.name} className="flex items-center gap-3">
                      <span className="text-xs text-slate-300 w-3">{i + 1}</span>
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-600 shrink-0">
                        {c.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{c.name}</div>
                        <div className="text-xs text-slate-400">{c.category}</div>
                      </div>
                      <span className="text-sm font-semibold text-blue-600">{c.er}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === BRAND + CREATOR === */}
      <section className="border-b border-slate-100 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="max-w-xl mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Menghubungkan brand dengan kreator</h2>
            <p className="mt-2 text-slate-400 text-sm">Platform dua sisi untuk brand dan kreator.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="border border-slate-200 rounded-xl p-5 bg-white">
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center mb-3">
                <Target className="w-4 h-4 text-slate-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Untuk Brand</h3>
              <ul className="space-y-2">
                {['Luncurkan campaign dalam hitungan menit', 'Temukan kreator dengan AI matching', 'Lacak ROI secara real-time', 'Kelola puluhan kolaborasi sekaligus'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-500"><Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />{item}</li>
                ))}
              </ul>
            </div>

            <div className="border border-slate-200 rounded-xl p-5 bg-white">
              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center mb-3">
                <Star className="w-4 h-4 text-slate-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Untuk Kreator</h3>
              <ul className="space-y-2">
                {['Dapatkan tawaran kolaborasi', 'Bangun portfolio profesional', 'Monetisasi audiens kamu', 'Kolaborasi dengan brand ternama'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-500"><Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* === TESTIMONIALS === */}
      <section className="border-b border-slate-100 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="max-w-xl mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">Dipercaya brand modern</h2>
            <p className="mt-2 text-slate-400 text-sm">Lihat apa kata mereka yang sudah menggunakan Influx.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {testimonials.map((t) => (
              <div key={t.name} className="border border-slate-200 rounded-xl p-4 bg-white">
                <Quote className="w-5 h-5 text-slate-200 mb-2" />
                <p className="text-sm text-slate-600 leading-relaxed mb-3">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-2.5 pt-3 border-t border-slate-100">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">{t.avatar}</div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === CTA === */}
      <section className="px-5 pb-16">
        <div className="max-w-6xl mx-auto bg-blue-900 rounded-xl py-12 sm:py-14 px-6 sm:px-10 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white max-w-2xl mx-auto">
            Bangun campaign lebih baik dengan kreator yang tepat
          </h2>
          <p className="mt-3 text-slate-400 text-sm max-w-lg mx-auto">
            Temukan influencer, kelola kolaborasi, dan ukur dampak campaign kamu.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7 max-w-sm mx-auto">
            <input type="email" placeholder="Masukkan email kamu" className="w-full px-4 py-2.5 rounded-lg text-sm text-slate-900 bg-white border border-slate-300 outline-none focus:ring-2 focus:ring-slate-400 placeholder:text-slate-400" />
            <button onClick={onGetStarted} className="w-full sm:w-auto bg-white hover:bg-slate-100 text-slate-900 font-medium px-5 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
              Mulai Sekarang <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-5 mt-6 text-slate-600">
            <Instagram className="w-4 h-4" /><Music2 className="w-4 h-4" /><Youtube className="w-4 h-4" /><BarChart3 className="w-4 h-4" /><Target className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-5 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 mb-8">
            <div className="col-span-2 sm:col-span-3 lg:col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center"><Compass className="w-3.5 h-3.5 text-white" /></div>
                <span className="font-bold text-base">Influx</span>
              </div>
              <p className="text-sm text-slate-400 max-w-xs">Platform influencer marketing untuk brand Indonesia. Temukan, analisis, dan kolaborasi dengan kreator terbaik.</p>
            </div>
            {[
              { title: 'Produk', items: ['Cari Kreator', 'Kampanye', 'Analytics', 'Marketplace', 'Harga'] },
              { title: 'Platform', items: ['Integrasi', 'API', 'Keamanan', 'Status', 'Dokumentasi'] },
              { title: 'Sumber Daya', items: ['Blog', 'Panduan', 'Webinar', 'Studi Kasus', 'FAQ'] },
              { title: 'Perusahaan', items: ['Tentang', 'Karir', 'Kontak', 'Blog'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{col.title}</h4>
                <ul className="space-y-1.5">
                  {col.items.map((item) => (
                    <li key={item}><a href="#" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">{item}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>&copy; 2026 Influx</span>
              <a href="#" className="hover:text-slate-600">Privasi</a>
              <a href="#" className="hover:text-slate-600">Syarat</a>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <a href="#" className="hover:text-slate-600 transition-colors"><Instagram className="w-4 h-4" /></a>
              <a href="#" className="hover:text-slate-600 transition-colors"><Music2 className="w-4 h-4" /></a>
              <a href="#" className="hover:text-slate-600 transition-colors"><Youtube className="w-4 h-4" /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
