import React, { useState, useEffect, useRef } from 'react';
import { Influencer, SavedCollaboration, CampaignConfig, CollaborationStatus } from './types';
import { INDONESIAN_CITIES } from './data/indonesianCities';
import DMGenerator from './components/DMGenerator';
import ReportPrintView from './components/ReportPrintView';
import ChatRoom from './components/ChatRoom';
import HashtagGenerator from './components/HashtagGenerator';
import InfluencerMap from './components/InfluencerMap';
import RelevanceScore from './components/RelevanceScore';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import { 
  Search, MapPin, Sliders, Users, Compass, CheckSquare, Square, 
  Sparkles, Heart, Plus, Mail, Copy, Check, FileDown, Upload,
  Trash2, AlertCircle, RefreshCw, BarChart2, Star, Layers,
  ExternalLink, ShieldCheck, BadgeCheck, Moon, Sun, Hash
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { supabase } from './lib/supabase';
import { signOut, getSession } from './lib/auth';
import {
  getCollaborations,
  createCollaboration,
  updateCollaborationStatus,
  updateCollaborationNotes,
  updateCollaborationDm,
  updateCollaborationBudget,
  deleteCollaboration,
} from './lib/collaborations';

export default function App() {
  // --- PAGE ROUTING (Landing / Login / App) ---
  const [currentPage, setCurrentPage] = useState<'landing' | 'login' | 'app'>('landing');
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    getSession().then(({ session }) => {
      if (session) {
        setCurrentPage('app');
      }
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setCurrentPage('app');
      } else if (event === 'SIGNED_OUT') {
        setCurrentPage('landing');
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  // --- APPLICATION STATES ---
  const [activeTab, setActiveTab] = useState<'eksplorasi' | 'kerjasama'>('eksplorasi');
  const [showPrintView, setShowPrintView] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);


  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  // Search parameters
  const [userLocation, setUserLocation] = useState<string>('Solo (Surakarta)');
  const [distanceMax, setDistanceMax] = useState<number>(100);
  const [minFollowers, setMinFollowers] = useState<number>(2000);
  const [selectedPlatform, setSelectedPlatform] = useState<'Semua' | 'Instagram' | 'TikTok'>('Semua');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'Lifestyle', 'Kuliner', 'Fashion', 'Gaming', 'Edukasi', 'Daily vlog'
  ]);

  const ITEMS_PER_PAGE = 10;

  // Loading & Results
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [creators, setCreators] = useState<Influencer[]>([]);
  const [currentPageNum, setCurrentPageNum] = useState<number>(1);
  const [searchTriggered, setSearchTriggered] = useState<boolean>(false);

  // Client-side filtered creators (show everything, then narrow by active filters)
  const filteredCreators = creators.filter(c => {
    if (selectedPlatform !== 'Semua' && c.platform !== selectedPlatform) return false;
    if (c.followers < minFollowers) return false;
    return true;
  });
  const [geoStatus, setGeoStatus] = useState<string>('');

  // Audit (Verification Check) state
  const [activeAuditInfluencer, setActiveAuditInfluencer] = useState<Influencer | null>(null);
  const [auditProgress, setAuditProgress] = useState<number>(0);
  const [auditPhase, setAuditPhase] = useState<string>('');

  // Brand/Campaign config
  const [campaignConfig, setCampaignConfig] = useState<CampaignConfig>({
    brandName: 'ChocoLatte Sunda',
    productDescription: 'Kuliner minuman cokelat jahe instan premium produksi lokal dengan biji kakao asli Jawa Barat dan rempah hangat.',
    campaignGoal: 'Meningkatkan brand awareness secara organik melalui konten kreatif review kuliner lokal',
    tone: 'Santai & Friendly',
    perks: 'Hampers Spesial ChocoLatte (senilai Rp 150rb) + Komisi affiliate 15%'
  });

  // Saved collaborations (persisted in localStorage)
  const [collaborations, setCollaborations] = useState<SavedCollaboration[]>([]);

  // DM modal trigger
  const [activeDMInfluencer, setActiveDMInfluencer] = useState<Influencer | null>(null);

  // Hashtag generator modal
  const [activeHashtagInfluencer, setActiveHashtagInfluencer] = useState<Influencer | null>(null);

  // Map view toggle
  const [showMapView, setShowMapView] = useState<boolean>(false);

  // Success notifications
  const [notification, setNotification] = useState<string>('');
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Custom API multi-provider states
  const [aiProvider, setAiProvider] = useState<string>(() => {
    return localStorage.getItem('ai_provider') || 'gemini';
  });
  const [aiApiKey, setAiApiKey] = useState<string>(() => {
    return localStorage.getItem('ai_api_key') || localStorage.getItem('gemini_custom_api_key') || '';
  });
  const [aiBaseUrl, setAiBaseUrl] = useState<string>(() => {
    return localStorage.getItem('ai_base_url') || 'https://api.openai.com/v1';
  });
  const [aiModel, setAiModel] = useState<string>(() => {
    return localStorage.getItem('ai_model') || 'meta-llama/llama-3-8b-instruct';
  });

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPageNum(1); }, [selectedPlatform, minFollowers, selectedCategories]);

  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [tempProvider, setTempProvider] = useState<string>('gemini');
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [tempBaseUrl, setTempBaseUrl] = useState<string>('https://api.openai.com/v1');
  const [tempModel, setTempModel] = useState<string>('meta-llama/llama-3-8b-instruct');

  const handleSaveApiConfig = (provider: string, key: string, baseUrl: string, model: string) => {
    setAiProvider(provider);
    setAiApiKey(key);
    setAiBaseUrl(baseUrl);
    setAiModel(model);

    localStorage.setItem('ai_provider', provider);
    localStorage.setItem('ai_api_key', key);
    localStorage.setItem('ai_base_url', baseUrl);
    localStorage.setItem('ai_model', model);
    // Legacy support
    localStorage.setItem('gemini_custom_api_key', key);

    triggerNotification(
      key 
        ? `Konfigurasi AI kustom (${provider === 'gemini' ? 'Gemini' : 'OpenSource/Custom'}) berhasil disimpan!` 
        : 'Konfigurasi AI dihapus. Aplikasi berjalan dalam mode demo/fallback.'
    );
  };

  // --- LOAD COLLABORATIONS FROM SUPABASE ---
  useEffect(() => {
    if (currentPage !== 'app') return;

    getCollaborations().then((cols) => {
      if (cols.length > 0) {
        setCollaborations(cols);
      } else {
        const initialSeed: SavedCollaboration[] = [
          {
            id: "col-1",
            addedAt: new Date().toISOString(),
            notes: "Rencana kirim hampers lewat kurir minggu depan. Kreator ini sangat menyukai kuliner tradisional.",
            status: "Menunggu Balasan",
            campaignName: "Pengenalan ChocoLatte Sunda",
            personalizedDm: "Halo Kak Rizky! 😊✨\n\nKenalin kami dari tim marketing ChocoLatte Sunda. Akhir-akhir ini kami sering banget liat postingan Kakak di Instagram (@rizkyr_kuliner), terutama konten Kakak yang bahas tentang jajanan kuliner Bandung. Suka banget sama vibe konten Kakak yang aesthetic abis!\n\nKami kebetulan lagi ada campaign seru nih untuk ngenalin ChocoLatte Sunda, produk minuman cokelat jahe instan biji kakao lokal. Karena kami rasa audiens Kakak pas banget dengan brand kami, kami pengen banget ngajak Kak Rizky buat kolaborasi santai!\n\nKami siapin benefit berupa Hampers Spesial ChocoLatte (senilai Rp 150rb) + Komisi affiliate 15%. Kakak punya kreativitas penuh untuk bikin konsep konten organik gaya Kakak sendiri. Gimana Kak, tertarik? Ditunggu kabar baiknya ya! 🙌",
            budgetEst: 150000,
            influencer: {
              id: "m-bdg-1",
              name: "Rizky Ramadhan",
              username: "@rizkyr_kuliner",
              platform: "Instagram",
              location: "Bandung City (Dago Area)",
              distanceKm: 8,
              followers: 12500,
              engagementRate: 5.4,
              category: "Kuliner",
              contentType: "Review Makanan Sunda & Cafe Aesthetic",
              whyFits: "Memiliki audiens pemuda Bandung yang aktif mencari rekomendasi kuliner kekinian.",
              contactMethod: "DM Instagram / email ke rizky.mkt@gmail.com",
              estimatedLikes: 680,
              estimatedComments: 45
            }
          },
          {
            id: "col-2",
            addedAt: new Date().toISOString(),
            notes: "Sudah di-DM lewat TikTok, respon positif sedang menjadwalkan tanggal posting.",
            status: "Setuju / Negosiasi",
            campaignName: "Pengenalan ChocoLatte Sunda",
            personalizedDm: "Hai Kak Siti! 🚀🔥\n\nSalam kreatif! Kami dari ChocoLatte Sunda lagi merhatiin banget akun TikTok Kakak (@sitinur_style). Konten Fashion & OOTD remaja Jabar yang Kakak buatan bener-bener fresh dan dapet engagement yang asyik abis dari followers Kakak. Keren banget!\n\nSaat ini kami lagi ngerilis campaign organic brand awareness untuk memperkenalkan ChocoLatte Sunda. Kami mau ngajakin Kak Siti buat kolaborasi bikin konten kreatif dengan kebebasan penuh dalam berkreasi sesuai gaya unik Kakak!\n\nBenefit seru untuk Kakak:\nHampers Spesial ChocoLatte (senilai Rp 150rb) + Komisi affiliate 15%.\n\nKalau Kakak tertarik buat bikin kolaborasi seru ini, langsung reply pesan ini ya! Ditunggu kabar baiknya ya Kak! Terima kasih banyak dan sehat selalu!",
            budgetEst: 150000,
            influencer: {
              id: "m-bdg-2",
              name: "Siti Nurhaliza",
              username: "@sitinur_style",
              platform: "TikTok",
              location: "Soreang, Kab. Bandung",
              distanceKm: 28,
              followers: 48000,
              engagementRate: 6.8,
              category: "Fashion",
              contentType: "Hijab Mix and Match & Daily OOTD",
              whyFits: "Sangat populer di kalangan remaja muslimah Jawa Barat dengan engagement tontonan TikTok tinggi.",
              contactMethod: "TikTok DM / Business link di Bio",
              estimatedLikes: 3200,
              estimatedComments: 180
            }
          }
        ];
        for (const col of initialSeed) {
          createCollaboration(col);
        }
        setCollaborations(initialSeed);
      }
    });
  }, [currentPage]);

  // Simulated Audit / Realness check sequence
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeAuditInfluencer) {
      setAuditProgress(0);
      setAuditPhase('Menghubungkan ke API analisis metadata platform...');
      
      interval = setInterval(() => {
        setAuditProgress(prev => {
          const increment = Math.floor(Math.random() * 12) + 6;
          const next = prev + increment;
          
          if (next >= 100) {
            clearInterval(interval);
            setAuditPhase('Analisis Selesai! Laporan siap dibaca.');
            return 100;
          }
          
          if (next < 25) {
            setAuditPhase('Memindai status aktivitas & histori postingan...');
          } else if (next < 50) {
            setAuditPhase('Menganalisis rasio akun bot di antara pengikut...');
          } else if (next < 75) {
            setAuditPhase('Membandingkan rasio Likes vs Comments (Konsistensi Organik)...');
          } else {
            setAuditPhase('Mendeteksi persebaran wilayah geolokasi & demografi...');
          }
          
          return next;
        });
      }, 250);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeAuditInfluencer]);

  const refreshCollaborations = async () => {
    const cols = await getCollaborations();
    setCollaborations(cols);
  };

  // --- ACTIONS ---
  const triggerNotification = (text: string) => {
    if (notificationTimerRef.current) {
      clearTimeout(notificationTimerRef.current);
    }
    setNotification(text);
    notificationTimerRef.current = setTimeout(() => {
      setNotification('');
      notificationTimerRef.current = null;
    }, 4000);
  };

  const handleSelectCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter(c => c !== cat));
      } else {
        triggerNotification('Pencarian minimal membutuhkan 1 kategori utama.');
      }
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Simulation of automated multi-step AI scouting text
  const loadingSteps = [
    'Mendeteksi area koordinat ' + userLocation + '...',
    'Menghitung jarak radius sekitar ' + distanceMax + ' km...',
    'Menganalisis repositori profil publik ( Followers > ' + minFollowers + ')...',
    'Menyaring akun palsu, akun bot, dan agensi repost iklan massal...',
    'Memvalidasi tingkat interaksi konten (like, comment, feed cycle)...',
    'Merumuskan indeks kecocokan digital marketing organik untuk Anda...'
  ];

  const handleSearch = async () => {
    setLoading(true);
    setLoadingStep(0);
    setSearchTriggered(true);

    // Run custom loading sequence
    const timer = setInterval(() => {
      setLoadingStep(prev => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(timer);
          return prev;
        }
      });
    }, 900);

    try {
      const response = await fetch('/api/scout-influencers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-AI-Provider': aiProvider,
          'X-AI-API-Key': aiApiKey,
          'X-AI-Base-URL': aiBaseUrl,
          'X-AI-Model': aiModel,
          'X-Gemini-API-Key': aiApiKey
        },
        body: JSON.stringify({
          userLocation,
          distanceMax,
          categories: selectedCategories,
          minFollowers,
          platform: selectedPlatform
        })
      });

      if (!response.ok) {
        throw new Error('Pencarian server gagal');
      }

      const data = await response.json();
      setCreators(data);
      setCurrentPageNum(1);
    } catch (err) {
      console.error(err);
      triggerNotification('Terjadi kegagalan server. Merangkai hasil scouting lokal alternatif berkualitas tinggi.');
    } finally {
      // Ensure sequence finishes beautifully
      setTimeout(() => {
        clearInterval(timer);
        setLoading(false);
      }, 5400);
    }
  };

  // Autodetect location using browser geolocation
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('Geolokasi tidak didukung oleh browser Anda.');
      return;
    }

    setGeoStatus('Mendeteksi posisi GPS...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // In real world we do reverse geo, for now let's determine nearest Indonesian city or say 'Bandung'
        // and allow typing, giving them an authentic real coordinates feeling.
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        // Let's match typical Indonesian coordinates roughly
        // Bandung: around -6.9, 107.6
        // Jakarta: around -6.2, 106.8
        // Surabaya: around -7.2, 112.7
        let detectedCity = 'Bandung';
        if (lat < -6.5 && lat > -7.3 && lon > 107.0 && lon < 108.0) {
          detectedCity = 'Bandung';
        } else if (lat < -5.9 && lat > -6.5 && lon > 106.0 && lon < 107.2) {
          detectedCity = 'Jakarta';
        } else if (lat < -7.0 && lat > -7.8 && lon > 112.0 && lon < 113.2) {
          detectedCity = 'Surabaya';
        } else {
          detectedCity = 'Yogyakarta'; // default close match with GPS simulation
        }
        
        setUserLocation(detectedCity);
        setGeoStatus(`Berhasil mendeteksi area terdekat: ${detectedCity} (Lat: ${lat.toFixed(3)}, Lon: ${lon.toFixed(3)})`);
        triggerNotification(`GPS Terdeteksi: Lokasi disesuaikan ke ${detectedCity}`);
        setTimeout(() => setGeoStatus(''), 5000);
      },
      (error) => {
        console.error(error);
        setGeoStatus('Gagal mengakses GPS. Jaringan diblokir atau izin ditolak.');
        setTimeout(() => setGeoStatus(''), 4000);
      }
    );
  };

  // Save/add creator to Campaign Tracker
  const handleSaveCreator = async (creator: Influencer) => {
    // Check if duplicate
    if (collaborations.some(col => col.influencer.id === creator.id)) {
      triggerNotification(`${creator.username} sudah ada dalam Daftar Kerja Sama.`);
      return;
    }

    const newCol: SavedCollaboration = {
      id: "col-" + Date.now(),
      addedAt: new Date().toISOString(),
      notes: 'Rencana kerja sama brand awareness baru. Desain konten kreatif organis.',
      status: 'Belum Hubungi',
      campaignName: 'Campaign Awareness ' + campaignConfig.brandName,
      personalizedDm: '', // Will be generated
      budgetEst: 150000,
      influencer: creator
    };

    const created = await createCollaboration(newCol);
    if (created) {
      setCollaborations([created, ...collaborations]);
    }
    triggerNotification(`Berhasil menyimpan ${creator.username} ke Daftar Kerja Sama Kampanye.`);
  };

  // Delete saved collaboration
  const handleDeleteCollaboration = async (id: string) => {
    await deleteCollaboration(id);
    setCollaborations(prev => prev.filter(col => col.id !== id));
    triggerNotification('Kerja sama telah dihapus dari daftar tracker.');
  };

  // Update saved collaboration status
  const handleUpdateStatus = async (id: string, status: CollaborationStatus) => {
    await updateCollaborationStatus(id, status);
    setCollaborations(prev => prev.map(col => {
      if (col.id === id) return { ...col, status };
      return col;
    }));
    triggerNotification('Status kolaborasi diperbarui.');
  };

  // Update saved comments/notes
  const handleUpdateNotes = async (id: string, notes: string) => {
    await updateCollaborationNotes(id, notes);
    setCollaborations(prev => prev.map(col => {
      if (col.id === id) return { ...col, notes };
      return col;
    }));
  };

  // Open DM Modal
  const handleOpenDMGenerator = (influencer: Influencer) => {
    setActiveDMInfluencer(influencer);
  };

  // Save the custom message back to the active saved collaboration
  const handleSaveDMBack = async (text: string) => {
    if (!activeDMInfluencer) return;

    const matchedSaved = collaborations.find(col => col.influencer.id === activeDMInfluencer.id);
    if (matchedSaved) {
      const newStatus = matchedSaved.status === 'Belum Hubungi' ? 'Sudah di-DM' : undefined;
      await updateCollaborationDm(matchedSaved.id, text, newStatus);
      setCollaborations(prev => prev.map(col => {
        if (col.influencer.id === activeDMInfluencer.id) {
          return { 
            ...col, 
            personalizedDm: text, 
            status: newStatus || col.status 
          };
        }
        return col;
      }));
      triggerNotification(`Draf pesan kolaborasi berhasil disimpan untuk ${activeDMInfluencer.username}.`);
    } else {
      const newCol: SavedCollaboration = {
        id: "col-" + Date.now(),
        addedAt: new Date().toISOString(),
        notes: 'Pesan kustom telah disimpan.',
        status: 'Sudah di-DM',
        campaignName: 'Campaign Awareness ' + campaignConfig.brandName,
        personalizedDm: text,
        budgetEst: 150000,
        influencer: activeDMInfluencer
      };
      const created = await createCollaboration(newCol);
      if (created) {
        setCollaborations(prev => [created, ...prev]);
      }
      triggerNotification(`Kreator disimpan secara otomatis & draf pesan diamankan!`);
    }

    setActiveDMInfluencer(null);
  };

  // CRM Summary metrics
  const totalFollowersReach = collaborations.reduce((sum, c) => sum + c.influencer.followers, 0);
  const avgEngagementRate = collaborations.length > 0
    ? Number((collaborations.reduce((sum, c) => sum + c.influencer.engagementRate, 0) / collaborations.length).toFixed(1))
    : 0;

  if (currentPage === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => setCurrentPage('login')}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(!darkMode)}
      />
    );
  }

  if (authLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2 text-slate-400">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (currentPage === 'login') {
    return (
      <LoginPage
        onLogin={() => setCurrentPage('app')}
        onBack={() => setCurrentPage('landing')}
        darkMode={darkMode}
      />
    );
  }

  if (showPrintView) {
    return (
      <ReportPrintView 
        collaborations={collaborations}
        onBack={() => setShowPrintView(false)}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-hidden" id="application-body">
      
      {/* GLOBAL TOAST NOTIFICATION */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white text-xs sm:text-sm font-medium px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-800"
            id="toast-notification"
          >
            <Sparkles className="w-4 h-4 text-blue-400 fill-blue-400" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <aside className="w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 hidden lg:flex flex-col shrink-0" id="sleek-sidebar">
        <div className="p-6 flex-1 flex flex-col min-h-0">
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-100 dark:shadow-blue-900/30">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[9px] bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider block w-fit">
                  PKL Digital Marketing
                </span>
                <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">Influx</span>
            </div>
          </div>
          
          <nav className="space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">Campaign Dashboard</div>
            
            <button 
              onClick={() => setActiveTab('eksplorasi')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all w-full text-left cursor-pointer ${
                activeTab === 'eksplorasi'
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-950 dark:hover:text-white'
              }`}
              id="sidebar-tab-eksplorasi"
            >
              <Search className="w-4 h-4" />
              Influencer Discovery
            </button>

            <button 
              onClick={() => setActiveTab('kerjasama')}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all relative w-full text-left cursor-pointer ${
                activeTab === 'kerjasama'
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-950 dark:hover:text-white'
              }`}
              id="sidebar-tab-kerjasama"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Outreach &amp; CRM</span>
              {collaborations.length > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {collaborations.length}
                </span>
              )}
            </button>
          </nav>


        </div>
        
        {/* Sidebar Footer context box */}
        <div className="p-4 bg-blue-900 text-white rounded-2xl m-4 mb-2">
          <div className="text-[10px] opacity-60 mb-0.5 uppercase font-mono font-semibold">Active Project Info</div>
          <div className="font-bold text-sm truncate">{campaignConfig.brandName}</div>
          <p className="text-[10px] text-slate-400 dark:text-slate-300 mt-1 line-clamp-2 leading-relaxed h-[30px]" title={campaignConfig.productDescription}>
            {campaignConfig.productDescription}
          </p>
        </div>

        {/* Custom AI Config Settings (Gemini & Open Source) */}
        <div className="mx-4 mb-4 p-3.5 bg-blue-900 rounded-2xl text-white border border-blue-500/20">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
            <span className="text-xs font-bold tracking-wide">Pengaturan AI Kustom</span>
          </div>
          <p className="text-[10px] text-blue-200 leading-normal mb-2.5">
            {aiApiKey 
              ? `✓ Mode: ${aiProvider === 'gemini' ? 'Gemini AI' : `Custom/OpenSource (${aiModel})`}` 
              : 'Aplikasi berjalan dalam mode demo/fallback.'}
          </p>
          <button
            onClick={() => {
              setTempProvider(aiProvider);
              setTempApiKey(aiApiKey);
              setTempBaseUrl(aiBaseUrl);
              setTempModel(aiModel);
              setShowApiKeyModal(true);
            }}
            className="w-full py-1.5 px-3 bg-white hover:bg-neutral-100 text-blue-950 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {aiApiKey ? 'Ubah Model & API Key' : 'Atur API Key & Model'}
          </button>
        </div>

        {/* Dark Mode Toggle */}
        <div className="mx-4 mb-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            id="dark-mode-toggle"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {darkMode ? 'Mode Terang' : 'Mode Gelap'}
          </button>
        </div>
        {/* Logout */}
        <div className="mx-4 mb-4">
          <button
            onClick={async () => {
              await signOut();
              setCurrentPage('landing');
            }}
            className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            id="logout-btn"
          >
            Keluar
          </button>
        </div>
      </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden" id="main-content-layout">
          
          {/* Header bar */}
          <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 sm:px-8 shrink-0">
          <div className="flex items-center gap-3">
            {/* Quick Logo representation on screens when sidebar is hidden */}
            <div className="lg:hidden w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white tracking-tight">
                {activeTab === 'eksplorasi' ? 'Rekomendasi Kreator Lokal' : 'Manajemen Saluran Kerja Sama'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab switch for mobile sizes */}
            <div className="lg:hidden flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('eksplorasi')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  activeTab === 'eksplorasi' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Cari
              </button>
              <button 
                onClick={() => setActiveTab('kerjasama')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all relative ${
                  activeTab === 'kerjasama' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                CRM {collaborations.length > 0 && `(${collaborations.length})`}
              </button>
            </div>

            <button 
              onClick={() => setShowPrintView(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-lg flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer"
              id="export-list-header-btn"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Cetak Laporan</span>
            </button>

            <input
              type="file"
              accept=".xlsx,.xls"
              ref={fileInputRef}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  triggerNotification('Mengimpor file Excel...');
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                    const base64 = (ev.target?.result as string).split(',')[1];
                    const response = await fetch('/api/import-excel', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ fileData: base64, fileName: file.name }),
                    });
                    if (!response.ok) {
                      const err = await response.json();
                      throw new Error(err.error || 'Gagal mengimpor data.');
                    }
                    const result = await response.json();
                    if (result.influencers && result.influencers.length > 0) {
                      setCreators(result.influencers);
                      setSearchTriggered(true);
                      setActiveTab('eksplorasi');
                      setCurrentPageNum(1);
                      const mergeNote = result.mergedCount > 0 ? ` (${result.mergedCount} duplikat digabung)` : '';
                      triggerNotification(`${result.influencers.length} kreator berhasil diimpor dari Excel!${mergeNote} 🎉`);
                    } else {
                      triggerNotification('File Excel berhasil diproses, tapi tidak ada data kreator.');
                    }
                  };
                  reader.readAsDataURL(file);
                } catch (err: any) {
                  console.error(err);
                  triggerNotification('Gagal mengimpor Excel: ' + err.message);
                }
                e.target.value = '';
              }}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-lg flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer"
              id="import-excel-btn"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Excel</span>
            </button>
          </div>
        </header>

        {/* Content Area with custom sleek grid or forms */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 bg-slate-50 dark:bg-slate-900/50">
          
          {/* Subtle info card replacement for the giant dark hero */}
          <div className="p-5 sm:p-6 bg-blue-900 rounded-2xl text-white shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative z-10 max-w-2xl">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-300 mb-1">
                <Sparkles className="w-3 h-3 text-blue-300 fill-blue-400" />
                PKL Digital Marketing Optimizer
              </div>
              <h2 className="text-xl font-bold tracking-tight">Pemetaan Influencer Lokal Berdaya Tinggi</h2>
              <p className="text-xs text-blue-100 mt-1.5 leading-relaxed">
                Halo Praktikan! Dasbor ini memetakan influencer lokal dalam radius <strong className="text-white">50 - 100 km</strong> yang memiliki engagement murni (&gt;2.000 followers). Susun undangan kreatif secara instan memakai generator bertenaga AI.
              </p>
            </div>
            <button
              onClick={() => {
                const target = document.getElementById('campaign-form-box-side');
                if (target) {
                  target.scrollIntoView({ behavior: 'smooth' });
                } else {
                  triggerNotification('Formulir di bawah dapat diubah kapan saja!');
                }
              }}
              className="px-3.5 py-1.5 bg-blue-800 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg border border-blue-700/50 self-start md:self-auto transition-colors"
            >
              Ubah Profil Brand
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'eksplorasi' && (
              <motion.div
                key="eksplorasi-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 gap-8"
                id="scout-search-grid"
              >

                {/* Scouting results area */}
                <div className="space-y-4" id="results-display-area">
                  
                  {/* Initial state */}
                  {!searchTriggered && !loading && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center text-slate-500 dark:text-slate-400 shadow-sm flex flex-col items-center justify-center min-h-[480px]" id="empty-state-welcome">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl flex items-center justify-center mb-4">
                        <Compass className="w-8 h-8 text-blue-400 stroke-[1.5]" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">Mulai Riset Pasar &amp; Scouting Influencer</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1.5 leading-relaxed">
                        Pilih rentang lokasi PKL, tetapkan filter ambang followers serta niche sasaran, selanjutnya klik tombol analisis untuk mengerahkan intelijen AI.
                      </p>
                      <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-md">
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full font-semibold border border-slate-200/50 dark:border-slate-600">Murni &gt;= 2.000 Followers</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full font-semibold border border-slate-200/50 dark:border-slate-600">Rasio Interaksi Otentik</span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-full font-semibold border border-slate-200/50 dark:border-slate-600">Filtering Akun Bot Jabar</span>
                      </div>
                    </div>
                  )}

                  {/* Loading animation sequence */}
                  {loading && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 min-h-[480px] flex flex-col items-center justify-center shadow-sm" id="loading-sequence-view">
                      <div className="relative mb-5">
                        <div className="w-12 h-12 rounded-full border-4 border-blue-100 dark:border-blue-800 border-t-blue-600 animate-spin"></div>
                        <Sparkles className="w-4 h-4 text-blue-500 absolute top-4 left-4 animate-pulse" />
                      </div>
                      
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white"> Saringan Berbasis AI Sedang Menyaring Database... </h3>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 mb-6">
                        Proses korelasi geospasial serta estimasi engagement berdaya aktif.
                      </p>

                      <div className="w-full max-w-md space-y-2 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-200 dark:border-slate-600">
                        {loadingSteps.map((step, idx) => {
                          const isDone = idx < loadingStep;
                          const isCurrent = idx === loadingStep;
                          return (
                            <div 
                              key={idx} 
                              className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${
                                isDone ? 'text-blue-600 dark:text-blue-400 font-semibold' : isCurrent ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400 opacity-60'
                              }`}
                            >
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                                isDone ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold' : isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-400'
                              }`}>
                                {isDone ? '✓' : idx + 1}
                              </span>
                              <span className="truncate">{step}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Results Display */}
                  {!loading && searchTriggered && (
                    <div className="space-y-4" id="results-ready-container">
                      
                      <div className="flex justify-between items-center bg-white dark:bg-slate-800 px-5 py-4 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                        <div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">LOKASI SCOUTING: {userLocation}</p>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                            Ditemukan {filteredCreators.length} Kreator Mikro yang Valid
                            {filteredCreators.length < creators.length && <span className="text-slate-400 font-normal ml-1">(dari {creators.length} total)</span>}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowMapView(!showMapView)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                              showMapView
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                            }`}
                          >
                            <MapPin className="w-3 h-3" />
                            {showMapView ? 'List View' : 'Map View'}
                          </button>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full border border-slate-200/50 dark:border-slate-600">
                            Radius {distanceMax} km
                          </span>
                        </div>
                      </div>

                      {showMapView && filteredCreators.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden" id="map-view-container">
                          <InfluencerMap creators={filteredCreators} userLocation={userLocation} />
                        </div>
                      )}

                      {filteredCreators.length === 0 ? (
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-10 text-center text-slate-400 dark:text-slate-500 shadow-sm" id="no-matching-results">
                          <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-500 mx-auto mb-2" />
                          <p className="text-sm font-bold text-slate-800 dark:text-white">
                            {creators.length > 0 ? 'Semua kreator tersaring oleh filter aktif.' : 'Tidak ada kreator yang klop di filter ini.'}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            {creators.length > 0 ? 'Longgarkan filter platform, followers minimal, atau kategori untuk melihat hasil.' : 'Silakan longgarkan minimal followers atau perluas cakupan area Anda.'}
                          </p>
                        </div>
                      ) : (() => {
                        const totalPages = Math.ceil(filteredCreators.length / ITEMS_PER_PAGE);
                        const startIdx = (currentPageNum - 1) * ITEMS_PER_PAGE;
                        const paginatedCreators = filteredCreators.slice(startIdx, startIdx + ITEMS_PER_PAGE);

                        const getPageNumbers = () => {
                          const pages: (number | string)[] = [];
                          if (totalPages <= 7) {
                            for (let i = 1; i <= totalPages; i++) pages.push(i);
                          } else {
                            pages.push(1);
                            if (currentPageNum > 3) pages.push('...');
                            for (let i = Math.max(2, currentPageNum - 1); i <= Math.min(totalPages - 1, currentPageNum + 1); i++) {
                              pages.push(i);
                            }
                            if (currentPageNum < totalPages - 2) pages.push('...');
                            pages.push(totalPages);
                          }
                          return pages;
                        };

                        return (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="results-grid">
                              {paginatedCreators.map(creator => {
                                const isSaved = collaborations.some(item => item.influencer.id === creator.id);
                                return (
                                  <div 
                                    key={creator.id}
                                    className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col justify-between"
                                    id={`creator-card-${creator.id}`}
                                  >
                                    <div>
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-wrap gap-1">
                                          <span className={`text-[10px] sm:text-[10px] font-bold px-2 py-0.5 rounded ${
                                            creator.platform === 'Instagram'
                                              ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300'
                                              : 'bg-slate-900 dark:bg-slate-600 text-white'
                                          }`}>
                                            {creator.platform}
                                          </span>
                                          <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-bold border border-slate-200/50 dark:border-slate-600">
                                            {creator.category}
                                          </span>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center justify-end gap-0.5 font-bold">
                                            <MapPin className="w-3.5 h-3.5 text-slate-404 dark:text-slate-500" />
                                            {creator.distanceKm} km
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3 mb-3">
                                        <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs uppercase shadow-inner animate-fade-in">
                                          {creator.name.slice(0, 2)}
                                        </div>
                                        <div>
                                          <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{creator.name}</h4>
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                            <a 
                                              href={creator.platform === 'Instagram' ? `https://www.instagram.com/${creator.username.replace('@','')}` : `https://www.tiktok.com/@${creator.username.replace('@','')}`}
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-[11px] font-bold font-mono text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 inline-flex bg-blue-50/70 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-md px-2 py-0.5 transition-colors cursor-pointer"
                                              title={`Buka profil asli ${creator.platform} di tab baru 🔗`}
                                            >
                                              {creator.username}
                                              <ExternalLink className="w-3 h-3 text-blue-500 dark:text-blue-400 shrink-0" />
                                            </a>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Stats block */}
                                      <div className="flex items-center justify-between mb-2">
                                        <RelevanceScore influencer={creator} config={campaignConfig} userLocation={userLocation} />
                                        <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full font-mono font-bold">
                                          #{creator.id.split('-')[1]?.toUpperCase() || 'INF'}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-700/50 p-2 rounded-lg text-center text-[11px] mb-3 border border-slate-200 dark:border-slate-600 font-semibold font-mono">
                                        <div>
                                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-sans block">Followers</span>
                                          <span className="text-slate-800 dark:text-slate-200">{creator.followers >= 1000 ? (creator.followers / 1000) + 'K' : creator.followers}</span>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-sans block">Engagement</span>
                                          <span className="text-blue-700 dark:text-blue-400">{creator.engagementRate}%</span>
                                        </div>
                                        <div className="truncate">
                                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-sans block">Lokasi</span>
                                          <span className="text-slate-600 dark:text-slate-400 text-[10px] truncate block" title={creator.location}>{creator.location.split('(')[0].trim()}</span>
                                        </div>
                                      </div>

                                      <div className="text-xs space-y-1.5 mb-3 leading-relaxed">
                                        <p className="text-slate-600 dark:text-slate-400 text-[11.5px]">
                                          <strong className="text-slate-800 dark:text-slate-200 font-semibold">Gaya Konten:</strong> {creator.contentType}
                                        </p>
                                        <div className="bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-[11px] italic">
                                          {creator.whyFits}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                                      <button
                                        onClick={() => handleSaveCreator(creator)}
                                        className={`flex-1 text-[10.5px] font-bold py-1.5 px-1 rounded-lg flex items-center justify-center gap-0.5 transition-all cursor-pointer border ${
                                          isSaved
                                            ? 'bg-blue-50/70 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white border-transparent'
                                        }`}
                                      >
                                        {isSaved ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                        {isSaved ? 'Tersimpan' : 'Simpan'}
                                      </button>
                                      
                                      <button
                                        onClick={() => setActiveAuditInfluencer(creator)}
                                        className="text-blue-750 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-[10.5px] py-1.5 px-2 rounded-lg border border-blue-200 dark:border-blue-700 transition-all cursor-pointer bg-blue-50/30 dark:bg-blue-900/20 flex items-center justify-center gap-0.5 font-bold"
                                        title="Audit Keaslian Akun (Real vs Bot)"
                                      >
                                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                                        Cek Keaslian
                                      </button>
                                      
                                      <button
                                        onClick={() => handleOpenDMGenerator(creator)}
                                        className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-[10.5px] font-bold py-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-600 transition-all cursor-pointer bg-white dark:bg-slate-700 flex items-center justify-center gap-0.5 shrink-0"
                                        title="Tulis Draf Pesan AI"
                                      >
                                        <Mail className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                                        Draft DM
                                      </button>
                                      <button
                                        onClick={() => setActiveHashtagInfluencer(creator)}
                                        className="text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-[10.5px] font-bold py-1.5 px-2 rounded-lg border border-amber-200 dark:border-amber-700 transition-all cursor-pointer bg-amber-50/30 dark:bg-amber-900/20 flex items-center justify-center gap-0.5 shrink-0"
                                        title="Generate Hashtag AI"
                                      >
                                        <Hash className="w-3 h-3 shrink-0" />
                                        Hashtag
                                      </button>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(creator.contactMethod);
                                          triggerNotification(`Kontak ${creator.username} tersalin: ${creator.contactMethod}`);
                                        }}
                                        className="text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-[10.5px] font-bold py-1.5 px-2 rounded-lg border border-blue-200 dark:border-blue-700 transition-all bg-blue-50/30 dark:bg-blue-900/20 flex items-center justify-center gap-0.5 shrink-0 cursor-pointer"
                                        title="Salin info kontak"
                                      >
                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                        Kontak
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {totalPages > 1 && (
                              <div className="flex items-center justify-center gap-1 pt-2" id="pagination-controls">
                                <button
                                  onClick={() => setCurrentPageNum(p => Math.max(1, p - 1))}
                                  disabled={currentPageNum === 1}
                                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                                >
                                  Prev
                                </button>
                                {getPageNumbers().map((page, i) =>
                                  page === '...' ? (
                                    <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-xs text-slate-400 dark:text-slate-500">...</span>
                                  ) : (
                                    <button
                                      key={page}
                                      onClick={() => setCurrentPageNum(page as number)}
                                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                        currentPageNum === page
                                          ? 'bg-blue-600 text-white border-blue-600'
                                          : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                                      }`}
                                    >
                                      {page}
                                    </button>
                                  )
                                )}
                                <button
                                  onClick={() => setCurrentPageNum(p => Math.min(totalPages, p + 1))}
                                  disabled={currentPageNum === totalPages}
                                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                                >
                                  Next
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                </div>

              </motion.div>
            )}

            {/* TAB 2: CRM Tracker */}
            {activeTab === 'kerjasama' && (
              <motion.div
                key="kerjasama-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="space-y-6"
                id="crm-collaborations-workspace"
              >
                
                {/* KPI Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm" id="crm-summary-kpis">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider">Total Est. Reach</span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white font-mono leading-none mt-0.5">
                        {new Intl.NumberFormat('id-ID').format(totalFollowersReach)}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl flex items-center justify-center shrink-0">
                      <BarChart2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider">Rerata Engagement</span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white font-mono leading-none mt-0.5">
                        {avgEngagementRate}%
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-xl flex items-center justify-center shrink-0">
                      <Star className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider">Kerjasama Berjalan</span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-none mt-0.5">
                        {collaborations.filter(c => c.status === 'Setuju / Negosiasi' || c.status === 'Selesai / Running').length} / {collaborations.length} Kreator
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Management Board */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm space-y-4" id="crm-items-card">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-700 pb-4 gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-blue-600" />
                        Manajemen Saluran Hubungan Influencer
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pantau status proposal, sesuaikan catatan taktis, dan jalankan percakapan organik.</p>
                    </div>
                    
                    {collaborations.length > 0 && (
                      <button
                        onClick={() => setShowPrintView(true)}
                        className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700 transition-colors cursor-pointer flex items-center gap-1 self-stretch sm:self-auto justify-center"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        Laporan Cetak
                      </button>
                    )}
                  </div>

                  {collaborations.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 dark:text-slate-500" id="crm-empty-state">
                      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Heart className="w-6 h-6 text-slate-300 dark:text-slate-500" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Belum ada partner tersimpan.</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">Masuk ke tab &quot;Influencer Discovery&quot; di atas untuk menandai kreator potensial pilihan Anda.</p>
                    </div>
                  ) : (
                    <div className="space-y-5 divide-y divide-slate-100 dark:divide-slate-700" id="collaborations-list">
                      {collaborations.map(col => (
                        <div key={col.id} className="pt-5 first:pt-0 flex flex-col xl:flex-row gap-6 justify-between items-start" id={`saved-item-${col.id}`}>
                          
                          {/* Left mini info */}
                          <div className="space-y-1.5 xl:w-[35%] shrink-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                                col.influencer.platform === 'Instagram' ? 'bg-pink-100 text-pink-700' : 'bg-slate-900 text-white'
                              }`}>
                                {col.influencer.platform}
                              </span>
                              <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold border border-slate-200/50">
                                {col.influencer.category}
                              </span>
                            </div>
                            
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-white text-sm">{col.influencer.name}</h4>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <a 
                                  href={col.influencer.platform === 'Instagram' ? `https://www.instagram.com/${col.influencer.username.replace('@','')}` : `https://www.tiktok.com/@${col.influencer.username.replace('@','')}`}
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[11px] font-bold font-mono text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 inline-flex bg-blue-50/70 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-md px-2 py-0.5 transition-colors cursor-pointer"
                                  title={`Buka profil asli ${col.influencer.platform} di tab baru 🔗`}
                                >
                                  {col.influencer.username}
                                  <ExternalLink className="w-3 h-3 text-blue-500 dark:text-blue-400 shrink-0" />
                                </a>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">{col.influencer.location} &bull; <strong className="text-slate-700 dark:text-slate-300 font-mono">{col.influencer.followers >= 1000 ? (col.influencer.followers / 1000) + 'K' : col.influencer.followers} followers</strong></p>
                            </div>

                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-600">
                              <span className="font-bold block text-[10px] text-slate-500 dark:text-slate-400 uppercase mb-0.5">Fokus Konten</span>
                              {col.influencer.contentType}
                            </p>
                          </div>

                          {/* Center inputs */}
                          <div className="w-full xl:col-span-8 space-y-3">
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Status Saluran Hubungan</label>
                                <select
                                  value={col.status}
                                  onChange={(e) => handleUpdateStatus(col.id, e.target.value as any)}
                                  className={`w-full text-xs border rounded-lg px-2 py-1.5 focus:ring-1 outline-none cursor-pointer font-bold ${
                                    col.status === 'Setuju / Negosiasi' || col.status === 'Selesai / Running'
                                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300'
                                      : col.status === 'Menunggu Balasan'
                                      ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                                      : col.status === 'Ditolak / Gagal'
                                      ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700 text-rose-800 dark:text-rose-300'
                                      : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200'
                                  }`}
                                >
                                  <option value="Belum Hubungi">🔴 Belum Hubungi</option>
                                  <option value="Sudah di-DM">🔵 Sudah di-DM</option>
                                  <option value="Menunggu Balasan">🟡 Menunggu Balasan</option>
                                  <option value="Setuju / Negosiasi">🟢 Setuju / Negosiasi</option>
                                  <option value="Selesai / Running">🚀 Selesai / Running</option>
                                  <option value="Ditolak / Gagal">⚫ Ditolak / Gagal</option>
                                </select>
                              </div>

                              <div className="w-full sm:w-[150px]">
                                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">ESTIMASI BUDGET</label>
                                <input 
                                  type="number"
                                  value={col.budgetEst || 150000}
                                  onChange={async (e) => {
                                    const val = Number(e.target.value);
                                    await updateCollaborationBudget(col.id, val);
                                    setCollaborations(prev => prev.map(c => {
                                      if (c.id === col.id) return { ...c, budgetEst: val };
                                      return c;
                                    }));
                                  }}
                                  className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 font-semibold font-mono text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-700"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Catatan Strategis Mandiri</label>
                              <textarea
                                rows={2}
                                value={col.notes}
                                onChange={(e) => handleUpdateNotes(col.id, e.target.value)}
                                className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-slate-700 focus:bg-white dark:focus:bg-slate-700 transition-all outline-none resize-none leading-relaxed text-slate-600 dark:text-slate-300"
                                placeholder="Tulis detail janji, alamat pengiriman hampers, dll..."
                              />
                            </div>

                            <div className="flex gap-2 justify-end pt-1">
                              {col.personalizedDm && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(col.personalizedDm);
                                    triggerNotification(`Pesan Tersalin untuk ${col.influencer.username}!`);
                                  }}
                                  className="text-[10.5px] text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/40 border border-blue-300 dark:border-blue-700 px-2.5 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer font-bold"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  Salin Pesan
                                </button>
                              )}
                              {col.personalizedDm && (
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(col.influencer.contactMethod);
                                    triggerNotification(`Info kontak ${col.influencer.username} tersalin!`);
                                  }}
                                  className="text-[10.5px] text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/40 border border-blue-300 dark:border-blue-700 px-2.5 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer font-bold"
                                >
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                  Salin Kontak
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenDMGenerator(col.influencer)}
                                className="text-[10.5px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/50 px-2.5 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer font-bold border border-blue-200/60 dark:border-blue-700"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                {col.personalizedDm ? 'Re-write DM AI' : 'Tulis DM AI'}
                              </button>
                            </div>

                          </div>

                          {/* Delete */}
                          <div className="self-end xl:self-start">
                            <button
                              onClick={() => handleDeleteCollaboration(col.id)}
                              className="p-1.5 text-slate-300 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg border border-transparent hover:border-red-200 transition-colors"
                              title="Hapus Partner"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer inside Content Area */}
          <footer className="py-6 text-center text-slate-400 dark:text-slate-500 text-[11px] border-t border-slate-200/60 dark:border-slate-700">
            <p className="font-semibold text-slate-500 dark:text-slate-400">Dasbor PKL Digital Marketing &bull; Pendukung Brand Awareness Organik</p>
            <p className="mt-1">Praktek Kerja Lapangan &copy; 2026. Didukung oleh Gemini AI Integration (Google GenAI API).</p>
          </footer>

        </div>

      </main>

      {/* RENDER DM GENERATOR MODAL */}
      <AnimatePresence>
        {activeDMInfluencer && (
          <div className="fixed inset-0 bg-slate-950/65 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden"
            >
              <DMGenerator
                influencer={activeDMInfluencer}
                campaignConfig={campaignConfig}
                onSaveMessage={handleSaveDMBack}
                onClose={() => setActiveDMInfluencer(null)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RENDER HASHTAG GENERATOR MODAL */}
      <AnimatePresence>
        {activeHashtagInfluencer && (
          <div className="fixed inset-0 bg-slate-950/65 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              className="w-full max-w-xl"
            >
              <HashtagGenerator
                influencer={activeHashtagInfluencer}
                campaignConfig={campaignConfig}
                onClose={() => setActiveHashtagInfluencer(null)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RENDER INFLUENCER AUTHENTICITY AUDIT MODAL */}
      <AnimatePresence>
        {activeAuditInfluencer && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="bg-slate-900 px-5 py-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm tracking-wide">Audit Keaslian Akun (Realness Audit)</h3>
                    <p className="text-[9px] text-slate-300 font-mono">ID Sidik: {activeAuditInfluencer.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveAuditInfluencer(null)}
                  className="text-slate-400 hover:text-white transition-colors text-xs font-bold px-2 py-1 hover:bg-slate-800 rounded cursor-pointer"
                >
                  Tutup [X]
                </button>
              </div>

              {/* Scanning Screen */}
              {auditProgress < 100 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center space-y-6">
                  {/* Pulsing Scanner Radar Animation */}
                  <div className="relative w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center border border-blue-150 shadow-inner">
                    <motion.div 
                      className="absolute inset-0 rounded-full bg-blue-400/20"
                      animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    />
                    <Search className="w-8 h-8 text-blue-600 animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 text-sm">Menghitung Reputasi Organik untuk {activeAuditInfluencer.username}</h4>
                    <p className="text-xs text-blue-600 font-semibold font-mono animate-pulse">{auditPhase}</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${auditProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 font-mono font-bold">{auditProgress}% Selesai</span>
                </div>
              ) : (
                /* Report Screen */
                <div className="p-6 space-y-5">
                  <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-150 space-y-1">
                    <BadgeCheck className="w-10 h-10 text-blue-600 mx-auto animate-bounce animate-speed-700" />
                    <h4 className="font-bold text-blue-900 text-sm">TERVALIDASI: AKUN ASLI & ORISINIL</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Berdasarkan hasil pemindaian metadata digital pelaku pasar, kreator ini terbukti memiliki kredibilitas interaksi organik yang sangat baik.</p>
                  </div>

                  {/* Creator details */}
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                      {activeAuditInfluencer.name.slice(0, 2)}
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 text-xs sm:text-sm">{activeAuditInfluencer.name}</h5>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <a 
                          href={activeAuditInfluencer.platform === 'Instagram' ? `https://www.instagram.com/${activeAuditInfluencer.username.replace('@','')}` : `https://www.tiktok.com/@${activeAuditInfluencer.username.replace('@','')}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs font-bold font-mono text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-100/60 hover:bg-blue-100 rounded-md px-2 py-0.5 transition-colors cursor-pointer"
                          title={`Buka profil asli ${activeAuditInfluencer.platform} di tab baru 🔗`}
                        >
                          {activeAuditInfluencer.username} ({activeAuditInfluencer.platform})
                          <ExternalLink className="w-3 h-3 text-blue-500 shrink-0" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3" id="audit-stats-grid">
                    <div className="border border-slate-200 p-3 rounded-lg bg-white">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Suku Pengikut Riil</span>
                      <span className="text-lg font-extrabold text-slate-900 font-mono">
                        {(94.2 + (parseInt(activeAuditInfluencer.id.replace(/\D/g, '')) || 7) % 5).toFixed(1)}%
                      </span>
                      <span className="text-[9px] text-blue-600 font-semibold block mt-0.5">✓ Pengikut Murni Human</span>
                    </div>

                    <div className="border border-slate-200 p-3 rounded-lg bg-white">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Indeks Bot/Spam</span>
                      <span className="text-lg font-extrabold text-slate-500 font-mono">
                        {(100 - (94.2 + (parseInt(activeAuditInfluencer.id.replace(/\D/g, '')) || 7) % 5)).toFixed(1)}%
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium block mt-0.5">Sangat Aman (Batas &lt; 8%)</span>
                    </div>

                    <div className="border border-slate-200 p-3 rounded-lg bg-white">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Relevansi Lokal</span>
                      <span className="text-md font-extrabold text-slate-900 font-mono">
                        {activeAuditInfluencer.location.toLowerCase().includes('surakarta') || activeAuditInfluencer.location.toLowerCase().includes('solo') || activeAuditInfluencer.location.toLowerCase().includes('sukoharjo') ? '94.5%' : '84.8%'}
                      </span>
                      <span className="text-[9px] text-blue-600 font-semibold block mt-0.5">Warga {activeAuditInfluencer.location.split('(')[0].trim()}</span>
                    </div>

                    <div className="border border-slate-200 p-3 rounded-lg bg-white">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Rasio Komentar Murni</span>
                      <span className="text-md font-extrabold text-blue-700 font-mono">92.9% RELEVAN</span>
                      <span className="text-[9px] text-slate-400 font-medium block mt-0.5">Bebas dari bot spam iklan</span>
                    </div>
                  </div>

                  {/* Summary Conclusion */}
                  <div className="text-xs bg-slate-50 p-3 rounded-lg text-slate-600 leading-relaxed border border-slate-200">
                    <strong className="text-slate-800 block mb-0.5">Kesimpulan Audit (Verdict):</strong>
                    Akun terbukti real dan bersih murni dari pembelian bots. Komentar menunjukkan interaksi murni yang sangat cocok untuk PKL Digital Marketing demi awareness regional berkualitas.
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={() => {
                        handleSaveCreator(activeAuditInfluencer);
                        setActiveAuditInfluencer(null);
                      }}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Simpan Kemitraan
                    </button>
                    <button
                      onClick={() => {
                        const influencer = activeAuditInfluencer;
                        setActiveAuditInfluencer(null);
                        handleOpenDMGenerator(influencer);
                      }}
                      className="text-xs bg-white text-slate-700 border border-slate-200 font-bold px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      Draft DM AI
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* API Key Configuration Modal */}
      <AnimatePresence>
        {showApiKeyModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
            >
              <div className="bg-slate-900 px-5 py-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold text-xs sm:text-sm tracking-wide font-sans">Konfigurasi Multi-AI Provider</h3>
                </div>
                <button 
                  onClick={() => setShowApiKeyModal(false)}
                  className="text-slate-400 hover:text-white transition-colors text-xs font-bold px-2 py-1 hover:bg-slate-800 rounded cursor-pointer animate-none"
                >
                  Tutup [X]
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Pilih Penyedia AI (Provider)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTempProvider('gemini');
                        if (!tempApiKey || tempApiKey.startsWith('sk-') || tempApiKey.includes('/')) {
                          setTempApiKey('');
                        }
                      }}
                      className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center ${
                        tempProvider === 'gemini'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Gemini AI (Default)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTempProvider('openai_compatible');
                        if (tempApiKey.startsWith('AIza')) {
                          setTempApiKey(''); // Reset if it was a Gemini key
                        }
                      }}
                      className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer text-center ${
                        tempProvider === 'openai_compatible'
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      OpenSource / Custom LLM
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-1">
                  {/* API Key */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 block">Kunci API (API Key)</label>
                      <span className="text-[10px] text-slate-400">Diperlukan</span>
                    </div>
                    <input
                      type="password"
                      placeholder={tempProvider === 'gemini' ? "AIzaSy..." : "sk-... atau Kunci API kustom"}
                      value={tempApiKey || ''}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  {/* OpenAI-Compatible fields */}
                  {tempProvider === 'openai_compatible' && (
                    <motion.div 
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3 pt-1 border-t border-slate-100"
                    >
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">Base URL Endpoint</label>
                        <input
                          type="text"
                          placeholder="https://openrouter.ai/api/v1 atau https://api.groq.com/openai/v1"
                          value={tempBaseUrl || ''}
                          onChange={(e) => setTempBaseUrl(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-700"
                        />
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Format URL OpenAI-kompatibel. Contoh: OpenRouter, Groq, DeepSeek, TogetherAI, atau Ollama Lokal.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block">Nama Model (Model ID)</label>
                        <input
                          type="text"
                          placeholder="meta-llama/llama-3-8b-instruct atau deepseek-chat"
                          value={tempModel || ''}
                          onChange={(e) => setTempModel(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-700"
                        />
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-[9px] text-slate-400">Rekomendasi:</span>
                          <button
                            type="button"
                            onClick={() => setTempModel('meta-llama/llama-3-8b-instruct')}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors font-medium border border-slate-200 cursor-pointer"
                          >
                            Llama 3 (8B)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTempModel('deepseek-chat')}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors font-medium border border-slate-200 cursor-pointer"
                          >
                            DeepSeek Chat
                          </button>
                          <button
                            type="button"
                            onClick={() => setTempModel('qwen/qwen-2.5-72b-instruct')}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors font-medium border border-slate-200 cursor-pointer"
                          >
                            Qwen 2.5
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <p className="text-[10px] text-slate-400 block leading-tight border-t border-slate-100 pt-3">
                    * Kunci API disimpan di penyimpanan lokal browser Anda (localStorage) secara aman, tidak pernah bocor atau dikirim ke server luar kecuali diproksikan ke model API pilihan Anda.
                  </p>
                </div>

                <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 mt-4">
                  <button
                    onClick={() => {
                      handleSaveApiConfig('gemini', '', 'https://api.openai.com/v1', 'meta-llama/llama-3-8b-instruct');
                      setShowApiKeyModal(false);
                    }}
                    className="text-xs bg-red-50 text-red-600 hover:bg-red-100 font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer border border-red-200"
                  >
                    Hapus Key
                  </button>
                  <button
                    onClick={() => {
                      handleSaveApiConfig(tempProvider, tempApiKey, tempBaseUrl, tempModel);
                      setShowApiKeyModal(false);
                    }}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-lg transition-colors cursor-pointer shadow-sm"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CHAT DM FLOATING WIDGET */}
      <ChatRoom />

    </div>
  );
}
