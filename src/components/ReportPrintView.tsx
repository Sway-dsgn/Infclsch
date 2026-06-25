import React from 'react';
import { SavedCollaboration } from '../types';
import { Printer, ArrowLeft } from 'lucide-react';

interface ReportPrintViewProps {
  collaborations: SavedCollaboration[];
  onBack: () => void;
}

export default function ReportPrintView({ collaborations, onBack }: ReportPrintViewProps) {
  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const totalReach = collaborations.reduce((sum, item) => sum + item.influencer.followers, 0);
  const avgEngagement = collaborations.length > 0 
    ? (collaborations.reduce((sum, item) => sum + item.influencer.engagementRate, 0) / collaborations.length).toFixed(1)
    : '0';

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const instagramCount = collaborations.filter(c => c.influencer.platform === 'Instagram').length;
  const tiktokCount = collaborations.filter(c => c.influencer.platform === 'TikTok').length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0" id="report-view">
      {/* UPPER CONTROL BAR, HIDDEN DURING PRINT */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-8 print:hidden" id="report-control-bar">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
          id="back-from-report-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Dasbor
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors cursor-pointer shadow-md shadow-blue-100 dark:shadow-blue-900/30"
          id="trigger-print-btn"
        >
          <Printer className="w-4 h-4" />
          Cetak atau Simpan PDF Laporan
        </button>
      </div>

      {/* PAPER CANVAS */}
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-8 sm:p-12 print:border-0 print:shadow-none print:p-0" id="report-paper-canvas">
        {/* HEADER REPORT KOP */}
        <div className="border-b-2 border-slate-800 pb-6 mb-8 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4">
          <div>
            <span className="inline-block bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm mb-2">
              Laporan Rencana Kerja Sama Influencer
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
              LAPORAN DIGITAL MARKETING &amp; KOLABORASI KREATOR
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Diajukan sebagai Laporan Penugasan Praktek Kerja Lapangan (PKL) Digital Marketing
            </p>
          </div>
          <div className="text-center sm:text-right text-xs text-slate-600 dark:text-slate-400">
            <p className="font-bold text-slate-800 dark:text-white">Tanggal Dokumen</p>
            <p className="mt-1">{currentDateStr}</p>
            <p className="font-mono mt-1 text-blue-600 dark:text-blue-400">STATUS: FINALIZED</p>
          </div>
        </div>

        {/* METRICS GRID FOR PKL SUPERVISOR */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Total Prospect</p>
            <h3 className="text-xl font-display font-bold text-slate-900 mt-1">{collaborations.length} Kreator</h3>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Total Est. Jangkauan</p>
            <h3 className="text-xl font-display font-bold text-slate-900 mt-1">{formatNumber(totalReach)} <span className="text-xs text-slate-400">Pengikut</span></h3>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Rata-rata Engagement</p>
            <h3 className="text-xl font-display font-bold text-slate-900 mt-1">{avgEngagement}%</h3>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Platform Pilihan</p>
            <h3 className="text-xs font-sans text-slate-800 mt-2">
              IG: <span className="font-bold text-slate-900">{instagramCount}</span> | TikTok: <span className="font-bold text-slate-900">{tiktokCount}</span>
            </h3>
          </div>
        </div>

        {/* OBJECTIVE BRIEF */}
        <div className="mb-8">
          <h2 className="text-lg font-display font-semibold text-slate-800 border-l-4 border-blue-500 pl-3 mb-3">
            1. Ringkasan &amp; Tujuan Strategis
          </h2>
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-sm text-slate-700 leading-relaxed space-y-2">
            <p>
              Dokumen ini berisi daftar analisis influencer marketing yang dikumpulkan berdasarkan area radius yang ditentukan (50 km - 100 km). Evaluasi ini ditujukan khusus untuk melaksanakan strategi organik interaktif guna <strong>meningkatkan brand awareness secara organik melalui konten kreatif</strong>.
            </p>
            <p>
              Pemilihan influencer difokuskan pada pembuat konten kategori mikro dan nano (dengan pengikut mulai dari 2.000+) guna memastikan keaslian interaksi khalayak lokal serta tingkat penerimaan konten (engagement) yang lebih murni dan tinggi.
            </p>
          </div>
        </div>

        {/* INFLUENCERS LIST TABLE */}
        <div className="mb-8">
          <h2 className="text-lg font-display font-semibold text-slate-800 border-l-4 border-blue-500 pl-3 mb-4">
            2. Daftar Kreator Hasil Scouting
          </h2>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="p-3">Nama &amp; Username</th>
                  <th className="p-3">Platform / Kategori</th>
                  <th className="p-3 text-right">Followers</th>
                  <th className="p-3 text-right">Engagement</th>
                  <th className="p-3">Lokasi (Jarak)</th>
                  <th className="p-3">Status Rencana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-600">
                {collaborations.length > 0 ? (
                  collaborations.map((col, index) => (
                    <tr key={col.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{col.influencer.name}</div>
                        <div className="font-mono text-blue-600 text-[11px] font-medium">{col.influencer.username}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-700">{col.influencer.platform}</div>
                        <div className="text-slate-500 text-[11px]">{col.influencer.category}</div>
                      </td>
                      <td className="p-3 text-right text-slate-800 font-mono font-medium">
                        {formatNumber(col.influencer.followers)}
                      </td>
                      <td className="p-3 text-right text-slate-800 font-mono">
                        {col.influencer.engagementRate}%
                      </td>
                      <td className="p-3">
                        <div className="text-slate-700">{col.influencer.location}</div>
                        <div className="text-slate-400 text-[10px]">&plusmn; {col.influencer.distanceKm} km</div>
                      </td>
                      <td className="p-3">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          col.status === 'Setuju / Negosiasi' || col.status === 'Selesai / Running'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : col.status === 'Menunggu Balasan'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : col.status === 'Ditolak / Gagal'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {col.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Belum ada influencer yang disetujui / disimpan dalam daftar kerja sama.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DETAILED RATIONALE FOR COLLABORATION */}
        {collaborations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-display font-semibold text-slate-800 border-l-4 border-blue-500 pl-3 mb-4">
              3. Rincian Rasional Kemitraan (Niche Analysis)
            </h2>
            <div className="space-y-4">
              {collaborations.map((col, index) => (
                <div key={col.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200 relative break-inside-avoid">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900 text-sm">
                        {index + 1}. {col.influencer.name} ({col.influencer.username})
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Platform: <span className="font-bold">{col.influencer.platform}</span> | Kategori: <span className="font-bold text-slate-700">{col.influencer.category}</span>
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">Estimasi Likes: {col.influencer.estimatedLikes}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200/60 text-xs">
                    <div>
                      <p className="font-bold text-slate-700">Analisis Gaya Konten:</p>
                      <p className="text-slate-600 mt-1 leading-relaxed">{col.influencer.contentType}</p>
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">Alasan Kesesuaian &amp; Target Kampanye:</p>
                      <p className="text-slate-600 mt-1 leading-relaxed">{col.influencer.whyFits}</p>
                    </div>
                  </div>
                  {col.notes && (
                    <div className="mt-3 bg-white p-2.5 rounded-lg border border-slate-200/80 text-xs text-slate-600">
                      <p className="font-semibold text-slate-800">Catatan Strategis Kerja Sama:</p>
                      <p className="mt-1 italic">&ldquo;{col.notes}&rdquo;</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ASSIGNMENT SIGNATURE BOXES (COMMON IN PKL REPORTS IN INDONESIA) */}
        <div className="pt-8 border-t border-slate-200 mt-12 grid grid-cols-2 gap-8 text-center text-xs break-inside-avoid" id="report-signatures">
          <div>
            <p className="text-slate-500 uppercase tracking-widest text-[9px] mb-12">Disusun Oleh (Siswa/Mahasiswa PKL)</p>
            <div className="w-40 mx-auto border-b border-slate-400 mb-1"></div>
            <p className="font-bold text-slate-800">Praktikan Digital Marketing</p>
            <p className="text-slate-400">Internship Member</p>
          </div>
          <div>
            <p className="text-slate-500 uppercase tracking-widest text-[9px] mb-12">Disetujui Oleh (Pembimbing PKL / Supervisor)</p>
            <div className="w-40 mx-auto border-b border-slate-400 mb-1"></div>
            <p className="font-bold text-slate-800">Pembimbing/Manager Lapangan</p>
            <p className="text-slate-400">Digital Marketing Team Lead</p>
          </div>
        </div>
      </div>
    </div>
  );
}
