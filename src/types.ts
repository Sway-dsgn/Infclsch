export interface Influencer {
  id: string;
  name: string;
  username: string;
  platform: 'Instagram' | 'TikTok';
  location: string;
  distanceKm: number;
  followers: number;
  engagementRate: number; // e.g. 4.5 (%)
  category: string;
  contentType: string;
  whyFits: string;
  contactMethod: string;
  estimatedLikes: number;
  estimatedComments: number;
}

export type CollaborationStatus = 
  | 'Belum Hubungi' 
  | 'Sudah di-DM' 
  | 'Menunggu Balasan' 
  | 'Setuju / Negosiasi' 
  | 'Selesai / Running'
  | 'Ditolak / Gagal';

export interface SavedCollaboration {
  id: string;
  influencer: Influencer;
  status: CollaborationStatus;
  campaignName: string;
  personalizedDm: string;
  notes: string;
  addedAt: string;
  budgetEst: number; // in IDR
}

export interface CampaignConfig {
  brandName: string;
  productDescription: string;
  campaignGoal: string;
  tone: 'Sopan & Formal' | 'Santai & Friendly' | 'Antusias & Kreatif';
  perks: string; // e.g. "Free Product + Komisi 10%"
}
