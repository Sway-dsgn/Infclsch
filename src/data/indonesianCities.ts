export interface IndonesianCity {
  name: string;
  province: string;
  subdistricts: string[];
}

export const INDONESIAN_CITIES: IndonesianCity[] = [
  {
    name: "Bandung",
    province: "Jawa Barat",
    subdistricts: ["Dago", "Lembang", "Soreang", "Jatinangor", "Cimahi", "Padalarang", "Cibiru", "Cihampelas"]
  },
  {
    name: "Jakarta",
    province: "DKI Jakarta",
    subdistricts: ["Jakarta Selatan", "Jakarta Pusat", "Tangerang", "Bekasi", "Depok", "Bogor", "Jakarta Barat", "Penjaringan"]
  },
  {
    name: "Surabaya",
    province: "Jawa Timur",
    subdistricts: ["Surabaya Timur", "Sidoarjo", "Gresik", "Mulyorejo", "Wonokromo", "Rungkut", "Surabaya Barat"]
  },
  {
    name: "Yogyakarta",
    province: "DI Yogyakarta",
    subdistricts: ["Sleman", "Bantul", "Kaliurang", "Malioboro", "Gunungkidul", "Depok (Sleman)", "Kulon Progo"]
  },
  {
    name: "Semarang",
    province: "Jawa Tengah",
    subdistricts: ["Tembalang", "Simpang Lima", "Ungaran", "Demak", "Kendal", "Semarang Barat", "Banyumanik"]
  },
  {
    name: "Malang",
    province: "Jawa Timur",
    subdistricts: ["Lowokwaru", "Batu", "Klojen", "Singosari", "Kepanjen", "Blimbing", "Sukun"]
  },
  {
    name: "Medan",
    province: "Sumatera Utara",
    subdistricts: ["Deli Serdang", "Binjai", "Medan Kota", "Medan Selayang", "Belawan", "Medan Baru"]
  },
  {
    name: "Makassar",
    province: "Sulawesi Selatan",
    subdistricts: ["Maros", "Gowa", "Panakkukang", "Tamalanrea", "Sandi", "Ujung Pandang"]
  },
  {
    name: "Denpasar",
    province: "Bali",
    subdistricts: ["Kuta", "Seminyak", "Ubud", "Canggu", "Sanur", "Badung", "Jimbaran"]
  },
  {
    name: "Solo (Surakarta)",
    province: "Jawa Tengah",
    subdistricts: ["Karanganyar", "Sukoharjo", "Boyolali", "Laweyan", "Banjarsari", "Kartasura"]
  }
];
