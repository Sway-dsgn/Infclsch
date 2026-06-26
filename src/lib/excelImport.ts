import * as XLSX from 'xlsx';
import type { Influencer } from '../types';

const matchCol = (row: Record<string, any>, key: string): string => {
  const kl = key.toLowerCase().trim();
  const entries = Object.entries(row);
  let found = entries.find(([k]) => k.toLowerCase().trim() === kl);
  if (found) return String(found[1] ?? '');
  if (kl.length >= 5) {
    found = entries.find(([k]) => k.toLowerCase().includes(kl));
    if (found) return String(found[1] ?? '');
    found = entries.find(([k]) => kl.includes(k.toLowerCase().trim()));
    if (found) return String(found[1] ?? '');
  }
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const nkl = norm(kl);
  found = entries.find(([k]) => norm(k) === nkl);
  if (found) return String(found[1] ?? '');
  return '';
};

const matchNum = (row: Record<string, any>, keys: string[]): number => {
  for (const key of keys) {
    const val = matchCol(row, key);
    if (val) return Number(val) || 0;
  }
  return 0;
};

const str = (v: any) => v !== null && v !== undefined ? String(v).trim() : '';

export function parseExcelFile(file: File): Promise<{ influencers: Influencer[]; mergedCount: number; truncated: boolean }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];

        let rows: any[] = XLSX.utils.sheet_to_json(sheet);
        let isRawMode = false;

        if (rows.length === 0) {
          rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          isRawMode = true;
          if (rows.length === 0) {
            return reject(new Error('File Excel kosong atau tidak memiliki data.'));
          }
        }

        const dataRows = !isRawMode ? rows : rows.slice(1).filter((r: any[]) => r.some((c: any) => str(c)));

        const MAX_IMPORT = 500;

        const influencers: Influencer[] = dataRows.map((row: any, index: number) => {
          if (isRawMode) {
            const arr = row as any[];
            const get = (i: number) => str(arr[i]);
            const num = (i: number) => Number(arr[i]) || 0;
            return {
              id: `import_${Date.now()}_${index}`,
              name: get(0) || get(1) || `Creator ${index + 1}`,
              username: get(1)?.startsWith('@') ? get(1) : get(2) ? `@${get(2).replace('@', '')}` : `@creator_${index + 1}`,
              platform: str(arr).toLowerCase().includes('tiktok') ? 'TikTok' as const : 'Instagram' as const,
              location: get(3) || 'Solo Raya',
              distanceKm: num(4),
              followers: num(5),
              engagementRate: num(6),
              category: get(7) || 'Lifestyle',
              contentType: get(8) || 'Konten kreatif engaging',
              whyFits: get(9) || 'Audiens relevan dengan target brand.',
              contactMethod: get(10) || 'DM Instagram',
              estimatedLikes: num(11),
              estimatedComments: num(12),
            };
          }

          const rawUsername = matchCol(row, 'ownerUsername') || matchCol(row, 'username') || matchCol(row, 'akun') || matchCol(row, 'user');
          const rawName = matchCol(row, 'ownerFullName') || matchCol(row, 'nama') || matchCol(row, 'name') || matchCol(row, 'influencer');
          const rawFollowers = matchCol(row, 'followers') || matchCol(row, 'pengikut') || matchCol(row, 'follower');
          const rawEr = matchCol(row, 'engagement rate') || matchCol(row, 'er') || matchCol(row, 'engagement');
          const rawLocation = matchCol(row, 'locationName') || matchCol(row, 'lokasi') || matchCol(row, 'kota') || matchCol(row, 'location') || matchCol(row, 'daerah') || matchCol(row, 'alamat') || matchCol(row, 'domisili');
          const rawCategory = matchCol(row, 'kategori') || matchCol(row, 'niche') || matchCol(row, 'category') || matchCol(row, 'bidang');
          const rawPlatform = matchCol(row, 'platform') || matchCol(row, 'media');
          const rawContent = matchCol(row, 'caption') || matchCol(row, 'konten') || matchCol(row, 'content') || matchCol(row, 'deskripsi');
          const rawLikes = matchCol(row, 'likesCount') || matchCol(row, 'likes') || matchCol(row, 'like');
          const rawComments = matchCol(row, 'commentsCount') || matchCol(row, 'comments') || matchCol(row, 'komentar');
          const rawDistance = matchCol(row, 'jarak') || matchCol(row, 'distance') || matchCol(row, 'radius');
          const rawContact = matchCol(row, 'kontak') || matchCol(row, 'contact') || matchCol(row, 'dm') || matchCol(row, 'email') || matchCol(row, 'telepon') || matchCol(row, 'hp');
          const rawWhyFits = matchCol(row, 'alasan') || matchCol(row, 'notes') || matchCol(row, 'catatan');
          const rawLat = matchNum(row, ['latitude', 'lat', 'latitud', 'lintang']);
          const rawLng = matchNum(row, ['longitude', 'lng', 'lon', 'longitud', 'bujur']);
          const rawIgUrl = matchCol(row, 'instagramUrl') || matchCol(row, 'igUrl') || matchCol(row, 'link_ig') || matchCol(row, 'instagram') || matchCol(row, 'ig');
          const rawRating = matchNum(row, ['rating', 'nilai', 'star']);
          const rawReviews = matchNum(row, ['reviewsCount', 'reviews_count', 'ulasan', 'review']);

          const lk = Number(rawLikes) || 0;
          const cm = Number(rawComments) || 0;
          const estFollowers = Number(rawFollowers) || (lk > 0 ? lk * 10 : 0);
          const estEr = Number(rawEr) || (estFollowers > 0 ? Number(((lk + cm) / estFollowers * 100).toFixed(1)) : 0);

          return {
            id: `import_${Date.now()}_${index}`,
            name: rawName || `Creator ${index + 1}`,
            username: rawUsername ? `@${rawUsername.replace('@', '').trim()}` : `@creator_${index + 1}`,
            platform: rawPlatform.toLowerCase().includes('tiktok') ? 'TikTok' as const : 'Instagram' as const,
            location: rawLocation || 'Solo Raya',
            distanceKm: Number(rawDistance) || 0,
            followers: estFollowers,
            engagementRate: estEr,
            category: rawCategory || 'Lifestyle',
            contentType: rawContent || 'Konten kreatif engaging',
            whyFits: rawWhyFits || 'Audiens relevan dengan target brand.',
            contactMethod: rawContact || 'DM Instagram',
            estimatedLikes: lk,
            estimatedComments: cm,
            latitude: rawLat || undefined,
            longitude: rawLng || undefined,
            instagramUrl: rawIgUrl || undefined,
            rating: rawRating || undefined,
            reviewsCount: rawReviews || undefined,
          };
        });

        // Dedup
        const grouped = new Map<string, Influencer>();
        let mergedCount = 0;
        for (const inf of influencers) {
          const key = inf.username.replace('@', '').toLowerCase().trim();
          const existing = grouped.get(key);
          if (existing) {
            mergedCount++;
            existing.name = inf.name && !inf.name.startsWith('Creator') ? inf.name : existing.name;
            existing.followers = Math.max(existing.followers, inf.followers);
            existing.engagementRate = Math.max(existing.engagementRate, inf.engagementRate);
            existing.estimatedLikes = Math.max(existing.estimatedLikes, inf.estimatedLikes);
            existing.estimatedComments = Math.max(existing.estimatedComments, inf.estimatedComments);
            existing.distanceKm = inf.distanceKm || existing.distanceKm;
            existing.location = inf.location && inf.location !== 'Solo Raya' ? inf.location : existing.location;
            existing.category = inf.category && inf.category !== 'Lifestyle' ? inf.category : existing.category;
            existing.contentType = inf.contentType && !inf.contentType.includes('Konten kreatif') ? inf.contentType : existing.contentType;
            existing.whyFits = inf.whyFits && !inf.whyFits.includes('Audiens relevan') ? inf.whyFits : existing.whyFits;
            existing.contactMethod = inf.contactMethod && inf.contactMethod !== 'DM Instagram' ? inf.contactMethod : existing.contactMethod;
          } else {
            grouped.set(key, { ...inf });
          }
        }

        let deduped = Array.from(grouped.values());
        const truncated = deduped.length > MAX_IMPORT;
        if (deduped.length > MAX_IMPORT) {
          deduped = deduped.slice(0, MAX_IMPORT);
        }

        resolve({ influencers: deduped, mergedCount, truncated });
      } catch (err: any) {
        reject(new Error('Gagal memproses file Excel: ' + (err.message || err)));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
