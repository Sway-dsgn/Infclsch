import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { Server as SocketIOServer } from "socket.io";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import * as XLSX from "xlsx";

dotenv.config();

// Lazily initialize GoogleGenAI with proper validation
let generativeAI: GoogleGenAI | null = null;

function getGeminiClient(customApiKey?: string): GoogleGenAI {
  const key = (customApiKey && customApiKey.trim() !== "" && customApiKey !== "undefined") ? customApiKey : process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY") {
    console.warn("WARNING: GEMINI_API_KEY has not been set properly. Gemini fallback will be active.");
  }
  return new GoogleGenAI({
    apiKey: key || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function callOpenAICompatible(
  apiKey: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  let endpoint = baseUrl.trim();
  if (!endpoint.endsWith('/chat/completions')) {
    endpoint = endpoint.replace(/\/$/, '') + '/chat/completions';
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'meta-llama/llama-3-8b-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI Provider API responded with status ${response.status}: ${errText}`);
  }

  const data = await response.json() as any;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty message content returned from OpenAI-compatible provider");
  }
  return content;
}

function extractJsonArrayOrObject(text: string): any {
  const trimmed = text.trim();
  
  // Try direct parse
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    // try to extract from markdown blocks
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch (err) {}
    }
    
    // Find first bracket '{' or '[' and last matching bracket
    const firstSquare = trimmed.indexOf('[');
    const lastSquare = trimmed.lastIndexOf(']');
    const firstCurly = trimmed.indexOf('{');
    const lastCurly = trimmed.lastIndexOf('}');
    
    if (firstSquare !== -1 && lastSquare !== -1 && (firstCurly === -1 || firstSquare < firstCurly)) {
      const candidate = trimmed.substring(firstSquare, lastSquare + 1);
      try {
        return JSON.parse(candidate);
      } catch (err) {}
    }
    
    if (firstCurly !== -1 && lastCurly !== -1) {
      const candidate = trimmed.substring(firstCurly, lastCurly + 1);
      try {
        return JSON.parse(candidate);
      } catch (err) {}
    }
    
    throw new Error("Could not parse JSON from AI response: " + trimmed.substring(0, 120) + "...");
  }
}

const DATASETS_DIR = path.join(process.cwd(), 'datasets');
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 0;

app.use(express.json({ limit: '10mb' }));

// Helper for Indonesian location fallback data when key is missing or calls fail
const MOCK_INFLUENCERS_DB: Record<string, any[]> = {
  bandung: [
    {
      id: "m-bdg-1",
      name: "Rizky Ramadhan",
      username: "@rizkyr_kuliner",
      platform: "Instagram",
      location: "Bandung City (Dago)",
      distanceKm: 8,
      followers: 12500,
      engagementRate: 5.4,
      category: "Kuliner",
      contentType: "Review Makanan Sunda & Cafe Aesthetic",
      whyFits: "Memiliki audiens pemuda Bandung yang aktif mencari rekomendasi kuliner kekinian.",
      contactMethod: "DM Instagram / email ke rizky.mkt@gmail.com",
      estimatedLikes: 680,
      estimatedComments: 45
    },
    {
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
    },
    {
      id: "m-bdg-3",
      name: "Geraldi Wijaya",
      username: "@gege_vlog",
      platform: "Instagram",
      location: "Lembang, KBB",
      distanceKm: 21,
      followers: 6300,
      engagementRate: 4.2,
      category: "Lifestyle",
      contentType: "Daily Life in Lembang, Travel, Coffee Shop",
      whyFits: "Konten estetik bernuansa sejuk Lembang, cocok untuk brand lifestyle santai.",
      contactMethod: "DM Instagram",
      estimatedLikes: 260,
      estimatedComments: 18
    },
    {
      id: "m-bdg-4",
      name: "Sarah Amalia",
      username: "@sarah.edutech",
      platform: "Instagram",
      location: "Jatinangor",
      distanceKm: 32,
      followers: 3500,
      engagementRate: 8.1,
      category: "Edukasi",
      contentType: "Tips Kuliah Unpad & Cara Belajar Digital Marketing",
      whyFits: "Audiens mahasiswa yang sangat tersegmentasi dan memiliki loyalitas konten tinggi.",
      contactMethod: "Email kelola@sarahedu.com",
      estimatedLikes: 280,
      estimatedComments: 35
    }
  ],
  jakarta: [
    {
      id: "m-jkt-1",
      name: "Anissa Amalia",
      username: "@anisania",
      platform: "Instagram",
      location: "Jakarta Selatan",
      distanceKm: 12,
      followers: 24500,
      engagementRate: 4.8,
      category: "Beauty",
      contentType: "Skincare routine untuk kulit sensitif",
      whyFits: "Konten jujur, detail rincian produk, dipercaya oleh komunitas pencinta skincare Jakarta.",
      contactMethod: "Linktree di bio / DM",
      estimatedLikes: 1100,
      estimatedComments: 94
    },
    {
      id: "m-jkt-2",
      name: "Kevin Sanjaya",
      username: "@kevinsan_play",
      platform: "TikTok",
      location: "Tangerang (25km ke Jakpus)",
      distanceKm: 25,
      followers: 95000,
      engagementRate: 7.2,
      category: "Gaming",
      contentType: "Gameplay Mobile Legends & Tips Push Rank",
      whyFits: "Penonton cowok muda sangat aktif, video FYP berkala, cocok untuk produk gaming/gadget.",
      contactMethod: "CP di bio: +62812993847xx (WhatsApp)",
      estimatedLikes: 6800,
      estimatedComments: 420
    },
    {
      id: "m-jkt-3",
      name: "Dwi Putra",
      username: "@dwiputra.vlog",
      platform: "Instagram",
      location: "Bekasi Timur (28km ke Jakpus)",
      distanceKm: 28,
      followers: 8200,
      engagementRate: 3.9,
      category: "Daily vlog",
      contentType: "A Day in My Life: Bekasi-Jakarta Commuter",
      whyFits: "Relatable untuk pekerja komuter kantoran muda area Jabodetabek.",
      contactMethod: "DM Instagram",
      estimatedLikes: 320,
      estimatedComments: 22
    }
  ],
  surabaya: [
    {
      id: "m-sby-1",
      name: "Bimo Suroboyo",
      username: "@bimosby_kuliner",
      platform: "Instagram",
      location: "Surabaya Timur",
      distanceKm: 6,
      followers: 32100,
      engagementRate: 5.1,
      category: "Kuliner",
      contentType: "Makanan Pedas khas Jawa Timur & Street Food Sby",
      whyFits: "Gaya bicara medok Suroboyoan asli yang disukai warga lokal Jawa Timur.",
      contactMethod: "DM Instagram / Line: bimo_culinary",
      estimatedLikes: 1600,
      estimatedComments: 112
    },
    {
      id: "m-sby-2",
      name: "Viona Angelica",
      username: "@viona_ang",
      platform: "Instagram",
      location: "Sidoarjo (22km dari Sby)",
      distanceKm: 22,
      followers: 18900,
      engagementRate: 4.5,
      category: "Fashion",
      contentType: "Korean Style Outfits & Shopee Haul",
      whyFits: "Target market perempuan muda Sidoarjo-Surabaya pencari clothing promo terjangkau.",
      contactMethod: "Email: viona.mgmt@gmail.com",
      estimatedLikes: 850,
      estimatedComments: 60
    }
  ],
  surakarta: [
    {
      id: "m-solo-1",
      name: "Sesilia Evelyn",
      username: "@sesiliaevelyn",
      platform: "Instagram",
      location: "Surakarta",
      distanceKm: 2,
      followers: 2200,
      engagementRate: 6.5,
      category: "Lifestyle",
      contentType: "Lifestyle, Travel, dan Self-love (UGC Creator)",
      whyFits: "Sering membuat konten estetik bergaya UGC yang sangat diminati anak muda, sangat pas untuk menonjolkan visual studio.",
      contactMethod: "DM Instagram / Link di Bio",
      estimatedLikes: 140,
      estimatedComments: 12
    },
    {
      id: "m-solo-2",
      name: "Nashuha",
      username: "@nashuhash",
      platform: "Instagram",
      location: "Surakarta",
      distanceKm: 4,
      followers: 12000,
      engagementRate: 5.2,
      category: "Fashion",
      contentType: "Modest Fashion, Hijab Style, Daily Lifestyle",
      whyFits: "Memiliki audiens anak muda berhijab yang mencari inspirasi tempat foto/studio estetik.",
      contactMethod: "DM Instagram",
      estimatedLikes: 620,
      estimatedComments: 45
    },
    {
      id: "m-solo-3",
      name: "Eunike Tri Nugrahesti",
      username: "@euniketrin",
      platform: "Instagram",
      location: "Solo Raya",
      distanceKm: 5,
      followers: 25000,
      engagementRate: 4.8,
      category: "Lifestyle",
      contentType: "Food, Travel, Fashion, Rekomendasi Tempat (Local Guide)",
      whyFits: "Sering merekomendasikan tempat baru di Solo. Cocok untuk mengiklankan studio sebagai tempat yang Instagramable.",
      contactMethod: "DM / Email di bio",
      estimatedLikes: 1200,
      estimatedComments: 75
    },
    {
      id: "m-solo-4",
      name: "Anggra Hesty",
      username: "@anggrahesty_",
      platform: "Instagram",
      location: "Surakarta",
      distanceKm: 3,
      followers: 15000,
      engagementRate: 5.8,
      category: "Fashion",
      contentType: "Aesthetic Fashion, Monokrom Style, Lifestyle",
      whyFits: "Feed Instagram yang sangat rapi dan estetik, cocok untuk endorsement spot foto studio.",
      contactMethod: "DM Instagram",
      estimatedLikes: 870,
      estimatedComments: 58
    },
    {
      id: "m-solo-5",
      name: "Idha Awfazriyah",
      username: "@idhaaw",
      platform: "Instagram",
      location: "Surakarta",
      distanceKm: 2,
      followers: 32000,
      engagementRate: 4.5,
      category: "Fashion",
      contentType: "Fashion influencer & Lifestyle",
      whyFits: "Fokus pada rekomendasi gaya berpakaian dan produk endorsement yang populer di kalangan mahasiswa.",
      contactMethod: "DM / WA",
      estimatedLikes: 1440,
      estimatedComments: 82
    },
    {
      id: "m-solo-6",
      name: "Aldhi Vallen",
      username: "@aldhivallen",
      platform: "Instagram",
      location: "Solo Raya",
      distanceKm: 6,
      followers: 45000,
      engagementRate: 6.2,
      category: "Lifestyle",
      contentType: "Daily Lifestyle & Men's Fashion",
      whyFits: "Influencer pria dengan gaya kekinian, cocok untuk menargetkan segmen audiens pria muda.",
      contactMethod: "DM Instagram",
      estimatedLikes: 2790,
      estimatedComments: 115
    },
    {
      id: "m-solo-7",
      name: "M. Ravie Dwi Agustian",
      username: "@ravie.pie",
      platform: "Instagram",
      location: "Surakarta",
      distanceKm: 4,
      followers: 28000,
      engagementRate: 5.0,
      category: "Lifestyle",
      contentType: "Entrepreneurship & Lifestyle",
      whyFits: "Aktif dalam komunitas bisnis anak muda di Solo, sangat pas untuk promosi studio kelas premium atau professional headshot.",
      contactMethod: "DM / Email",
      estimatedLikes: 1400,
      estimatedComments: 65
    },
    {
      id: "m-solo-8",
      name: "Kuliner di Solo",
      username: "@kulinerdisolo",
      platform: "Instagram",
      location: "Surakarta",
      distanceKm: 1,
      followers: 450000,
      engagementRate: 3.5,
      category: "Kuliner",
      contentType: "Review Makanan & Cafe Baru di Solo",
      whyFits: "Akun kurator terbesar di Solo. Meski followers sangat besar, ini adalah referensi utama orang Solo mencari tempat nongkrong/studio baru.",
      contactMethod: "Link di Bio / WA Business",
      estimatedLikes: 15750,
      estimatedComments: 420
    },
    {
      id: "m-solo-9",
      name: "Solo Delicious",
      username: "@solodelicious",
      platform: "Instagram",
      location: "Solo Raya",
      distanceKm: 2,
      followers: 600000,
      engagementRate: 3.2,
      category: "Kuliner",
      contentType: "Local Guide & Tempat Hits",
      whyFits: "Sangat efektif untuk brand awareness masif jika studio Anda juga memiliki cafe/resto (compound space).",
      contactMethod: "WA Business",
      estimatedLikes: 19200,
      estimatedComments: 580
    },
    {
      id: "m-solo-10",
      name: "Cari Kuliner Solo",
      username: "@carikulinersolo",
      platform: "Instagram",
      location: "Surakarta",
      distanceKm: 3,
      followers: 200000,
      engagementRate: 4.1,
      category: "Kuliner",
      contentType: "Review Tempat Baru & Jajanan",
      whyFits: "Bagus untuk campaign peluncuran fasilitas baru di studio yang menargetkan kaum milenial.",
      contactMethod: "DM / Email",
      estimatedLikes: 8200,
      estimatedComments: 180
    },
    {
      id: "m-solo-11",
      name: "Solo Foodgram",
      username: "@solofoodgram",
      platform: "Instagram",
      location: "Surakarta",
      distanceKm: 2,
      followers: 350000,
      engagementRate: 3.8,
      category: "Kuliner",
      contentType: "Food & Lifestyle Directory",
      whyFits: "Direktori terpercaya di Solo Raya untuk anak muda yang mencari referensi tempat akhir pekan.",
      contactMethod: "Link di Bio",
      estimatedLikes: 13300,
      estimatedComments: 250
    }
  ]
};

// API Route: Scout Influencers using Gemini 3.5 Flash or Custom OpenAI-compatible multi-provider
app.post("/api/scout-influencers", async (req, res) => {
  try {
    const { userLocation, distanceMax, categories, minFollowers, platform } = req.body;

    const locationTerm = userLocation || "Jakarta";
    const maxDist = distanceMax || 100;
    const catList = (categories && categories.length > 0) ? categories : ["Lifestyle", "Kuliner", "Fashion"];
    const followersLimit = minFollowers || 2000;
    const targetPlatform = platform || "Semua";

    // Detect Custom AI config headers
    const aiProvider = req.headers['x-ai-provider'] as string | undefined || 'gemini';
    const customApiKey = req.headers['x-ai-api-key'] as string | undefined;
    const customBaseUrl = req.headers['x-ai-base-url'] as string | undefined;
    const customModel = req.headers['x-ai-model'] as string | undefined;

    // Check if API key is present and valid
    const legacyApiKey = req.headers['x-gemini-api-key'] as string | undefined;
    const apiKey = (customApiKey && customApiKey.trim() !== "") ? customApiKey : (legacyApiKey && legacyApiKey.trim() !== "" ? legacyApiKey : process.env.GEMINI_API_KEY);
    const hasValidKey = apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "";

    const platformTerm = targetPlatform === "Instagram" ? "Instagram only" : targetPlatform === "TikTok" ? "TikTok only" : "both Instagram and TikTok";

    const systemPrompt = `You are an expert Digital Marketing Influencer Scout specializing in the Indonesian social media landscape (Instagram and TikTok).
Your job is to find and output a list of 6 to 9 realistic and realistic micro/nano-influencers in Indonesia based near: "${locationTerm}".
The distance should be within 0 km up to ${maxDist} km from "${locationTerm}".
The category of influencers must be chosen strictly from this list of user-selected categories: ${catList.join(", ")}.
All influencers must have at least ${followersLimit} followers (nano & micro creators up to macro range).
The social media platform of the influencers must be chosen strictly from: ${platformTerm}.

Crucial Rules:
1. Return ONLY a valid JSON array matching the request schema. Do NOT enclose the array in an object wrapper tag.
2. The data MUST feel highly realistic for Indonesia. Usernames should use popular Indonesian conventions (e.g. @_, @name, @username_kuliner, @name.style).
3. The names of creators should be common Indonesian names (Javanese, Sundanese, Batak, general Indonesian, etc. depending on area if relevant).
4. Identify realistic areas of surrounding towns. (e.g., if central city is Bandung, list surrounding districts like Cimahi, Padalarang, Jatinangor, Soreang, Lembang, Tasikmalaya, Cirebon, and calculate realistic physical distances in km).
5. CRITICAL FOR SURAKARTA/SOLO: If the search location is Surakarta, Solo, or surrounding areas in Central Java, you MUST prioritize and use real, existing active Instagram creators:
   - @sesiliaevelyn (Sesilia Evelyn, Lifestyle/Travel, 2200 followers, loc: Surakarta)
   - @nashuhash (Nashuha, Fashion/Lifestyle, 12000 followers, loc: Surakarta)
   - @euniketrin (Eunike Tri Nugrahesti, Lifestyle/Food, 25000 followers, loc: Solo Raya)
   - @anggrahesty_ (Anggra Hesty, Fashion/Aesthetic, 15000 followers, loc: Surakarta)
   - @idhaaw (Idha Awfazriyah, Fashion/Lifestyle, 32000 followers, loc: Surakarta)
   - @aldhivallen (Aldhi Vallen, Lifestyle/Fashion, 45000 followers, loc: Solo Raya)
   - @ravie.pie (M. Ravie Dwi Agustian, Lifestyle, 28000 followers, loc: Surakarta)
   - @kulinerdisolo (Kuliner di Solo, Kuliner/Guide, 450000 followers, loc: Surakarta)
   - @solodelicious (Solo Delicious, Kuliner/Guide, 600000 followers, loc: Solo Raya)
   - @carikulinersolo (Cari Kuliner Solo, Kuliner, 200000 followers, loc: Surakarta)
   - @solofoodgram (Solo Foodgram, Kuliner, 350000 followers, loc: Surakarta)
   DO NOT make up fake, non-existent custom usernames for Solo. Ensure their usernames are exactly as listed here so users can open their real, actual working Instagram profiles in the browser.
6. Ensure platforms are 'Instagram' or 'TikTok' only, as selected above.
7. Provide calculated realistic 'engagementRate' (usually 3.0% - 12.0% for micro-creators).
8. Suggest authentic 'whyFits' details focusing on Digital Marketing KPI (Brand Awareness, target demographics, organic vibes).
9. Provide 'contactMethod' such as DM, WhatsApp business, or professional email.
10. Estimate proportional Likes and Comments per post based on followers * engagementRate.
11. The output should be strictly in Indonesian language for the text description fields.

Response JSON Schema:
[
  {
    "id": "Unique string ID (e.g. inf-jkt-1)",
    "name": "Full name of the creator",
    "username": "Instagram/TikTok handle including @",
    "platform": "Instagram or TikTok",
    "location": "Specific district and city name",
    "distanceKm": 12,
    "followers": 15000,
    "engagementRate": 5.6,
    "category": "Main category selected from input",
    "contentType": "What kind of content they produce",
    "whyFits": "Why they fit for organic digital marketing, in Indonesian",
    "contactMethod": "DM/Email/WA",
    "estimatedLikes": 840,
    "estimatedComments": 50
  }
]`;

    const instructions = `Generate a JSON array of 6-9 creator objects for the area around "${locationTerm}" within ${maxDist}km, for categories: ${catList.join(", ")}, min followers ${followersLimit}, and platform: ${platformTerm}.`;

    // Handle Custom / OpenAIcompatible Open-Source AI request
    if (aiProvider === 'openai_compatible' && customBaseUrl) {
      if (!apiKey || apiKey.trim() === '') {
        console.log("No API Key provided for OpenAI-compatible model, returning mock data");
        return returnDynamicFallback(locationTerm, maxDist, catList, followersLimit, targetPlatform, res);
      }
      console.log(`Querying custom OpenAI-compatible endpoint: ${customBaseUrl} with model: ${customModel || 'meta-llama/llama-3-8b-instruct'}`);
      const openaiPrompt = `${systemPrompt}\n\nIMPORTANT: Return ONLY raw JSON matching the array schema without any conversation or markdown markers. If you use markdown, format it with three backticks followed by 'json'.`;
      const aiResponse = await callOpenAICompatible(apiKey, customBaseUrl, customModel || '', openaiPrompt, instructions);
      const parsedData = extractJsonArrayOrObject(aiResponse);
      return res.json(parsedData);
    }

    // Jika ada data Apify, bypass Gemini sepenuhnya agar tidak error karena file terlalu besar
    const apifyList = loadApifyData();
    if (apifyList.length > 0 && (locationTerm.toLowerCase().replace(/[^a-z]/g, '') === "solo" || locationTerm.toLowerCase().includes("surakarta"))) {
      console.log("Apify results found! Bypassing Gemini to return scraped dataset directly.");
      return returnDynamicFallback(locationTerm, maxDist, catList, followersLimit, targetPlatform, res, apifyList);
    }

    // Default: Gemini API call
    if (!hasValidKey) {
      console.log("No valid Gemini API key found, returning high-quality realistic fallback data...");
      return returnDynamicFallback(locationTerm, maxDist, catList, followersLimit, targetPlatform, res);
    }

    const aiClient = getGeminiClient(apiKey);

    const response = await aiClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents: instructions,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique string ID (e.g. inf-jkt-1)" },
              name: { type: Type.STRING, description: "Full name of the creator" },
              username: { type: Type.STRING, description: "Instagram/TikTok handle including @" },
              platform: { type: Type.STRING, description: "Must be 'Instagram' or 'TikTok'" },
              location: { type: Type.STRING, description: "Specific district and city name (e.g. Jatinangor, Sumedang atau Tembalang, Semarang)" },
              distanceKm: { type: Type.NUMBER, description: "Simulated realistic road distance in km from the central location" },
              followers: { type: Type.INTEGER, description: "Followers count" },
              engagementRate: { type: Type.NUMBER, description: "Engagement rate percentage (e.g., 5.6 for 5.6%)" },
              category: { type: Type.STRING, description: "Main category (one from the list)" },
              contentType: { type: Type.STRING, description: "What kind of contents they produce" },
              whyFits: { type: Type.STRING, description: "Why they are perfect for organic digital marketing and brand awareness" },
              contactMethod: { type: Type.STRING, description: "How to contact them (DM/Email/WA)" },
              estimatedLikes: { type: Type.INTEGER, description: "Estimated average likes per post" },
              estimatedComments: { type: Type.INTEGER, description: "Estimated average comments per post" },
            },
            required: [
              "id", "name", "username", "platform", "location", "distanceKm",
              "followers", "engagementRate", "category", "contentType",
              "whyFits", "contactMethod", "estimatedLikes", "estimatedComments"
            ]
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text from Gemini API");
    }

    const parsedData = JSON.parse(text.trim());
    return res.json(parsedData);

  } catch (error: any) {
    console.error("Gemini Scout Error:", error);
    // If anything fails, fallback gracefully to responsive generated mock data
    const userLocation = req.body.userLocation || "Jakarta";
    const maxDist = req.body.distanceMax || 100;
    const catList = req.body.categories || ["Lifestyle", "Kuliner"];
    const minFollowers = req.body.minFollowers || 2000;
    const platform = req.body.platform || "Semua";
    return returnDynamicFallback(userLocation, maxDist, catList, minFollowers, platform, res);
  }
});

// API Route: Export all Instagram dataset accounts to Excel (.xlsx)
app.get("/api/export-excel", (req, res) => {
  try {
    if (!fs.existsSync(DATASETS_DIR)) {
      return res.status(404).json({ error: 'Folder datasets tidak ditemukan.' });
    }
    const files = fs.readdirSync(DATASETS_DIR);
    const datasetFiles = files.filter(f =>
      (f.startsWith('apify_results') || f.startsWith('dataset_instagram-scraper') || f.startsWith('dataset_instagram_import')) &&
      f.endsWith('.json')
    );

    if (datasetFiles.length === 0) {
      return res.status(404).json({ error: 'Tidak ada file dataset Instagram yang ditemukan.' });
    }

    let posts: any[] = [];
    for (const file of datasetFiles) {
      try {
        const rawData = fs.readFileSync(path.join(DATASETS_DIR, file), 'utf-8');
        const parsed = JSON.parse(rawData);
        if (Array.isArray(parsed)) {
          posts = posts.concat(parsed);
        }
      } catch (err) {
        console.error(`Gagal membaca file ${file}:`, err);
      }
    }

    // Aggregate per unique username
    const userPosts = new Map<string, any[]>();
    posts.forEach((post: any) => {
      const username = post.ownerUsername || (post.owner && post.owner.username);
      if (username && username.length > 0) {
        if (!userPosts.has(username)) {
          userPosts.set(username, []);
        }
        userPosts.get(username)!.push(post);
      }
    });

    // Build rows for Excel
    const rows: any[] = [];
    userPosts.forEach((postsList, username) => {
      const bestPost = postsList.reduce((max, p) => (p.likesCount || 0) > (max.likesCount || 0) ? p : max, postsList[0]);
      const fullName = bestPost.ownerFullName || (bestPost.owner && bestPost.owner.full_name) || "";
      const caption = bestPost.caption || "";
      const avgLikes = Math.floor(postsList.reduce((sum, p) => sum + Math.max(0, p.likesCount || 0), 0) / postsList.length) || 0;
      const avgComments = Math.floor(postsList.reduce((sum, p) => sum + Math.max(0, p.commentsCount || 0), 0) / postsList.length) || 0;
      const totalPosts = postsList.length;
      const hasRealFollowers = postsList.find(p => p.followersCount && p.followersCount > 0);
      const followers = hasRealFollowers
        ? Math.max(2500, Math.min(500000, hasRealFollowers.followersCount))
        : avgLikes > 0
          ? Math.max(2500, Math.min(500000, Math.floor(avgLikes * (avgLikes < 50 ? 28 : avgLikes < 200 ? 22 : avgLikes < 800 ? 18 : avgLikes < 3000 ? 14 : 10))))
          : 2500;
      const rawER = followers > 0 ? ((avgLikes + avgComments) / followers) * 100 : 0;
      const engagementRate = parseFloat(Math.max(1.5, Math.min(15.0, rawER)).toFixed(1));
      const category = getCategoryFromText(username, fullName, caption);
      const locFromCaption = detectLocation(caption, bestPost.inputUrl, bestPost.locationName);
      const locationName = locFromCaption || bestPost.locationName || "Solo Raya";
      const profileUrl = `https://www.instagram.com/${username}/`;

      rows.push({
        'No': rows.length + 1,
        'Username': `@${username}`,
        'Nama Lengkap': fullName,
        'Link Profil Instagram': profileUrl,
        'Platform': 'Instagram',
        'Lokasi': locationName,
        'Kategori': category,
        'Estimasi Followers': followers,
        'Rata-rata Likes': avgLikes,
        'Rata-rata Comments': avgComments,
        'Engagement Rate (%)': engagementRate,
        'Jumlah Postingan di Dataset': totalPosts,
        'Deskripsi Konten': caption ? caption.substring(0, 120).replace(/\n/g, ' ') : '-',
        'Metode Kontak': 'DM Instagram'
      });
    });

    // Sort by followers descending
    rows.sort((a, b) => b['Estimasi Followers'] - a['Estimasi Followers']);
    // Re-number
    rows.forEach((row, i) => row['No'] = i + 1);

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 },   // No
      { wch: 22 },  // Username
      { wch: 25 },  // Nama Lengkap
      { wch: 40 },  // Link Profil
      { wch: 12 },  // Platform
      { wch: 25 },  // Lokasi
      { wch: 15 },  // Kategori
      { wch: 18 },  // Followers
      { wch: 15 },  // Likes
      { wch: 18 },  // Comments
      { wch: 20 },  // ER
      { wch: 25 },  // Jumlah Posts
      { wch: 50 },  // Deskripsi
      { wch: 18 },  // Metode Kontak
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Akun Instagram');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=dataset_instagram_akun.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);

  } catch (error: any) {
    console.error('Export Excel Error:', error);
    return res.status(500).json({ error: 'Gagal membuat file Excel: ' + error.message });
  }
});

// API Route: Import Excel file and save as dataset JSON
app.post("/api/import-excel", express.json({ limit: '50mb' }), (req, res) => {
  try {
    const { fileData, fileName } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: 'Tidak ada data file yang diterima.' });
    }

    const buffer = Buffer.from(fileData, 'base64');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];

    // Try standard parse first, fallback to raw array if empty
    let rows: any[] = XLSX.utils.sheet_to_json(sheet);
    let isRawMode = false;

    if (rows.length === 0) {
      // Try raw mode (array of arrays)
      rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      isRawMode = true;
      if (rows.length === 0) {
        return res.status(400).json({ error: 'File Excel kosong atau tidak memiliki data.' });
      }
    }

    // Detect columns
    const detectedCols = !isRawMode ? Object.keys(rows[0]) : (rows[0] as string[]).map(String);
    console.log('Excel raw mode:', isRawMode, '| Columns detected:', detectedCols);
    console.log('First row data:', JSON.stringify(!isRawMode ? rows[0] : rows[1] || rows[0]));

    // Universal column matcher (only partial-match keywords >= 5 chars)
    const matchCol = (row: Record<string, any>, key: string): string => {
      if (isRawMode) return '';
      const kl = key.toLowerCase().trim();
      const entries = Object.entries(row);
      // 1. Exact original match
      let found = entries.find(([k]) => k.toLowerCase().trim() === kl);
      if (found) return String(found[1] ?? '');
      // 2. Partial/includes match (only >= 5 chars to avoid false positives)
      if (kl.length >= 5) {
        found = entries.find(([k]) => k.toLowerCase().includes(kl));
        if (found) return String(found[1] ?? '');
        found = entries.find(([k]) => kl.includes(k.toLowerCase().trim()));
        if (found) return String(found[1] ?? '');
      }
      // 3. Normalized exact (strip non-alphanumeric)
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const nkl = norm(kl);
      found = entries.find(([k]) => norm(k) === nkl);
      if (found) return String(found[1] ?? '');
      return '';
    };

    // Null-safe string getter
    const str = (v: any) => v !== null && v !== undefined ? String(v).trim() : '';

    // Map raw rows (standard mode) or skip header row (raw mode)
    const dataRows = !isRawMode ? rows : rows.slice(1).filter((r: any[]) => r.some((c: any) => str(c)));
    const influencers = dataRows.map((row: any, index: number) => {
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

      const lk = Number(rawLikes) || 0;
      const cm = Number(rawComments) || 0;
      // Estimate followers from likes if not available (typical IG ratio ~10:1)
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
      };
    });

    // ----- DEDUP: merge duplicate accounts by username (case-insensitive) -----
    const grouped = new Map<string, typeof influencers[0]>();
    let dupCount = 0;
    for (const inf of influencers) {
      const key = inf.username.replace('@', '').toLowerCase().trim();
      const existing = grouped.get(key);
      if (existing) {
        dupCount++;
        // Merge: keep best data from each duplicate
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
    const deduped = Array.from(grouped.values());
    const mergedCount = influencers.length - deduped.length;
    console.log(`Dedup: ${influencers.length} rows -> ${deduped.length} unique (${mergedCount} duplicates merged)`);

    if (!fs.existsSync(DATASETS_DIR)) {
      fs.mkdirSync(DATASETS_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = `dataset_instagram_import_${timestamp}.json`;
    const outputPath = path.join(DATASETS_DIR, outputFile);

    fs.writeFileSync(outputPath, JSON.stringify(deduped, null, 2), 'utf-8');

    console.log(`Imported Excel saved to ${outputFile} (${deduped.length} records, ${mergedCount} merged)`);
    return res.json({ success: true, records: deduped.length, file: outputFile, influencers: deduped, detectedCols, mergedCount });
  } catch (error: any) {
    console.error('Import Excel Error:', error);
    return res.status(500).json({ error: 'Gagal mengimpor file Excel: ' + error.message });
  }
});

// Helper function to return beautiful generated fallback data if Gemini API fails
// Deteksi lokasi dari caption postingan + inputUrl + locationName
const LOCATION_KEYWORDS: Record<string, string[]> = {
  'Surakarta': ['surakarta', 'solo', 'solo raya', 'kartasura', 'sukoharjo', 'klaten', 'boyolali', 'karanganyar', 'wonogiri', 'sragen'],
  'Bandung': ['bandung', 'cimahi', 'lembang', 'jatinangor', 'soreang', 'padalarang', 'cianjur', 'sumedang', 'garut', 'tasikmalaya', 'cirebon'],
  'Jakarta': ['jakarta', 'jkt', 'bekasi', 'tangerang', 'depok', 'bogor', 'jabodetabek'],
  'Yogyakarta': ['yogyakarta', 'jogja', 'jogjakarta', 'sleman', 'bantul', 'gunungkidul'],
  'Surabaya': ['surabaya', 'sidoarjo', 'gresik', 'lamongan', 'bangkalan', 'mojokerto'],
  'Semarang': ['semarang', 'kendal', 'demak', 'ungaran', 'salatiga'],
  'Malang': ['malang', 'batu', 'kepanjen', 'lawang', 'singosari'],
  'Medan': ['medan', 'belawan', 'binjai', 'deli serdang'],
  'Makassar': ['makassar', 'maros', 'gowa', 'takalar'],
  'Denpasar': ['denpasar', 'badung', 'gianyar', 'tabanan', 'bali'],
};

function detectLocation(caption: string, inputUrl?: string, locationName?: string): string {
  if (locationName && locationName !== "Solo Raya (Scrape Instagram)" && locationName.length > 3) {
    const locLower = locationName.toLowerCase();
    for (const [city, keywords] of Object.entries(LOCATION_KEYWORDS)) {
      if (keywords.some(k => locLower.includes(k))) return city;
    }
  }
  if (inputUrl) {
    const urlLower = inputUrl.toLowerCase();
    for (const [city, keywords] of Object.entries(LOCATION_KEYWORDS)) {
      if (keywords.some(k => urlLower.includes(k) || urlLower.includes(`tags/${k}`))) return city;
    }
  }
  if (caption) {
    const capLower = caption.toLowerCase();
    for (const [city, keywords] of Object.entries(LOCATION_KEYWORDS)) {
      for (const k of keywords) {
        const patterns = [` ${k} `, `di ${k}`, `di${k}`, `#${k}`, `${k},`, `${k}.`];
        if (patterns.some(p => capLower.includes(p))) return city;
      }
    }
  }
  return '';
}

// Helper function to dynamically categorize a creator based on their content
function getCategoryFromText(username: string, fullName: string, caption: string): string {
  const text = `${username} ${fullName} ${caption}`.toLowerCase();
  
  if (
    text.includes("kuliner") || 
    text.includes("makan") || 
    text.includes("jajan") || 
    text.includes("food") || 
    text.includes("cafe") || 
    text.includes("resto") || 
    text.includes("kopi") || 
    text.includes("warung") || 
    text.includes("cooking") || 
    text.includes("resep") || 
    text.includes("enak") || 
    text.includes("lezat") || 
    text.includes("nyam") || 
    text.includes("drink")
  ) {
    return "Kuliner";
  }
  
  if (
    text.includes("fashion") || 
    text.includes("ootd") || 
    text.includes("style") || 
    text.includes("hijab") || 
    text.includes("baju") || 
    text.includes("pakaian") || 
    text.includes("outfit") || 
    text.includes("dress") || 
    text.includes("makeup") || 
    text.includes("beauty") || 
    text.includes("skin") || 
    text.includes("skincare")
  ) {
    return "Fashion";
  }
  
  if (
    text.includes("game") || 
    text.includes("gaming") || 
    text.includes("play") || 
    text.includes("mlbb") || 
    text.includes("pubg") || 
    text.includes("mabar") || 
    text.includes("streamer") || 
    text.includes("console") || 
    text.includes("ps5")
  ) {
    return "Gaming";
  }
  
  if (
    text.includes("edukasi") || 
    text.includes("belajar") || 
    text.includes("tips") || 
    text.includes("tutorial") || 
    text.includes("kuliah") || 
    text.includes("sekolah") || 
    text.includes("info") || 
    text.includes("kelas") || 
    text.includes("edutech") || 
    text.includes("motivation") || 
    text.includes("motivas")
  ) {
    return "Edukasi";
  }
  
  if (
    text.includes("vlog") || 
    text.includes("daily") || 
    text.includes("a day in my life") || 
    text.includes("rutinitas") || 
    text.includes("kegiatan") || 
    text.includes("activity") || 
    text.includes("home")
  ) {
    return "Daily vlog";
  }
  
  return "Lifestyle";
}

// Load apify, scraper, dan import dataset dari folder datasets/
function loadApifyData(): any[] {
  try {
    if (!fs.existsSync(DATASETS_DIR)) return [];
    const files = fs.readdirSync(DATASETS_DIR);
    const dataFiles = files.filter(f => 
      (f.startsWith('apify_results') || f.startsWith('dataset_instagram-scraper') || f.startsWith('dataset_instagram_import')) && 
      f.endsWith('.json')
    );
    
    if (dataFiles.length === 0) return [];
    
    let posts: any[] = [];
    for (const file of dataFiles) {
      try {
        const rawData = fs.readFileSync(path.join(DATASETS_DIR, file), 'utf-8');
        const parsed = JSON.parse(rawData);
        if (Array.isArray(parsed)) {
          posts = posts.concat(parsed);
        }
      } catch (err) {
        console.error(`Gagal membaca file ${file}:`, err);
      }
    }
    
    // Kelompokkan postingan berdasarkan username
    const userPosts = new Map<string, any[]>();
    posts.forEach((post: any) => {
      const username = post.ownerUsername || (post.owner && post.owner.username);
      if (username && username.length > 3) {
        if (!userPosts.has(username)) {
          userPosts.set(username, []);
        }
        userPosts.get(username)!.push(post);
      }
    });

    const usersMap = new Map();
    userPosts.forEach((postsList, username) => {
      const bestPost = postsList.reduce((max, p) => (p.likesCount || 0) > (max.likesCount || 0) ? p : max, postsList[0]);
      
      const fullName = bestPost.ownerFullName || (bestPost.owner && bestPost.owner.full_name) || username;
      const caption = bestPost.caption || "";
      
      const avgLikes = Math.floor(postsList.reduce((sum, p) => sum + Math.max(0, p.likesCount || 0), 0) / postsList.length) || 0;
      const avgComments = Math.floor(postsList.reduce((sum, p) => sum + Math.max(0, p.commentsCount || 0), 0) / postsList.length) || 0;
      
      // Prioritaskan followersCount asli dari import dataset
      const hasRealFollowers = postsList.find(p => p.followersCount && p.followersCount > 0);
      
      let followers: number;
      let isEstimated = false;
      
      if (hasRealFollowers) {
        followers = Math.max(2500, Math.min(500000, hasRealFollowers.followersCount));
      } else if (avgLikes > 0) {
        // Estimasi based on real Instagram data patterns:
        // Micro-creator Indo: likes ≈ 3-8% dari followers
        // Makin besar likes, makin kecil ER-nya (diminishing returns)
        isEstimated = true;
        const multiplier = avgLikes < 50 ? 28 : avgLikes < 200 ? 22 : avgLikes < 800 ? 18 : avgLikes < 3000 ? 14 : 10;
        followers = Math.max(2500, Math.min(500000, Math.floor(avgLikes * multiplier)));
      } else {
        isEstimated = true;
        followers = Math.floor(2500 + ((username.length * 137 + username.charCodeAt(0) || 0) % 3500));
      }
      
      const rawER = avgLikes > 0 ? ((avgLikes + avgComments) / followers) * 100 : 0;
      const engagementRate = parseFloat(Math.max(1.5, Math.min(15.0, rawER || 3.0)).toFixed(1));
      
      const category = getCategoryFromText(username, fullName, caption);
      
      // Deteksi lokasi: majority vote dari semua postingan
      const locationVotes = new Map<string, number>();
      for (const post of postsList) {
        const detected = detectLocation(post.caption || '', post.inputUrl, post.locationName);
        if (detected) {
          locationVotes.set(detected, (locationVotes.get(detected) || 0) + 1);
        }
      }
      let detectedLocation = '';
      let maxVotes = 0;
      for (const [city, votes] of locationVotes) {
        if (votes > maxVotes) { maxVotes = votes; detectedLocation = city; }
      }
      const location = detectedLocation || bestPost.locationName || 'Solo Raya';
      
      // Jarak berdasarkan lokasi yang terdeteksi
      const DISTANCE_MAP: Record<string, number> = {
        'Surakarta': 3, 'Bandung': 8, 'Jakarta': 12, 'Yogyakarta': 5,
        'Surabaya': 6, 'Semarang': 10, 'Malang': 15, 'Medan': 8, 'Makassar': 10, 'Denpasar': 7,
      };
      const distanceKm = DISTANCE_MAP[detectedLocation] || Math.floor((username.charCodeAt(0) % 12) + 1);
      
      let whyFits = `Kreator aktif dengan interaksi organik yang baik. Konten bertema ${category.toLowerCase()} sangat diminati audiens lokal.`;
      if (category === "Kuliner") {
        whyFits = `Sangat cocok untuk promosi kuliner di ${location}. Memiliki audiens lokal aktif yang menyukai rekomendasi makanan dan cafe baru.`;
      } else if (category === "Fashion") {
        whyFits = `Memiliki estetika visual yang baik untuk promosi outfit, makeup, atau studio foto aesthetic di ${location}.`;
      } else if (category === "Edukasi") {
        whyFits = `Audiens yang responsif terhadap tips dan rekomendasi informatif. Sangat baik untuk kampanye edukasi produk di ${location}.`;
      } else if (category === "Daily vlog") {
        whyFits = `Gaya dokumentasi harian (UGC) yang autentik dan relatable, membangun kepercayaan tinggi dari followers lokal ${location}.`;
      }

      usersMap.set(username, {
        id: `apify-${username}`,
        name: fullName,
        username: `@${username}`,
        platform: "Instagram",
        location,
        distanceKm,
        followers,
        engagementRate,
        category,
        contentType: caption ? (caption.substring(0, 70).replace(/\n/g, ' ') + (caption.length > 70 ? '...' : '')) : `Konten seputar ${category.toLowerCase()} di ${location}`,
        whyFits,
        contactMethod: "DM Instagram",
        estimatedLikes: avgLikes,
        estimatedComments: avgComments
      });
    });

    return Array.from(usersMap.values());
  } catch (e) {
    console.error("Gagal membaca dataset Instagram:", e);
    return [];
  }
}

function returnDynamicFallback(userLocation: string, maxDist: number, categories: string[], minFollowers: number, platform: string, res: any, preloadedApifyData?: any[]) {
  const normLocation = userLocation.toLowerCase().trim();
  let baseList: any[] = [];

  // Match preset cities
  if (normLocation.includes("bandung")) {
    baseList = [...MOCK_INFLUENCERS_DB.bandung];
  } else if (normLocation.includes("surakarta") || normLocation.includes("solo")) {
    const apifyList = preloadedApifyData ?? loadApifyData();
    if (apifyList.length > 0) {
      // Gabungkan akun Apify dengan data asli hardcode kita
      baseList = [...MOCK_INFLUENCERS_DB.surakarta, ...apifyList];
      // Acak urutan agar tidak monoton (Fisher-Yates shuffle)
      for (let i = baseList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [baseList[i], baseList[j]] = [baseList[j], baseList[i]];
      }
    } else {
      baseList = [...MOCK_INFLUENCERS_DB.surakarta];
    }
  } else if (normLocation.includes("surabaya") || normLocation.includes("sidoarjo") || normLocation.includes("malang")) {
    baseList = [...MOCK_INFLUENCERS_DB.surabaya];
  } else {
    // Default to Jakarta
    baseList = [...MOCK_INFLUENCERS_DB.jakarta];
  }

  // Generate dynamic location-specific entries if city is something else (e.g., Medan, Makassar, Jogja)
  if (baseList.length === 0 || (!normLocation.includes("bandung") && !normLocation.includes("jakarta") && !normLocation.includes("surabaya") && !normLocation.includes("surakarta") && !normLocation.includes("solo"))) {
    const formattedCity = userLocation.charAt(0).toUpperCase() + userLocation.slice(1);
    
    // Choose dynamic platforms based on target filter
    const p1 = platform === "TikTok" ? "TikTok" : "Instagram";
    const p2 = platform === "Instagram" ? "Instagram" : "TikTok";
    const p3 = platform === "Semua" ? "Instagram" : platform;

    baseList = [
      {
        id: "m-dyn-1",
        name: `Andika Pratama`,
        username: `@andika_${categories[0]?.toLowerCase() || "lifestyle"}`,
        platform: p1,
        location: `${formattedCity} Tengah`,
        distanceKm: 8,
        followers: Math.max(minFollowers + 1200, 4800),
        engagementRate: 6.2,
        category: categories[0] || "Lifestyle",
        contentType: `Daily Vlog & Kurasi Spot Kece di ${formattedCity}`,
        whyFits: `Kreator lokal asli ${formattedCity} yang sangat didukung komunitas anak muda setempat untuk info kuliner & tempat baru.`,
        contactMethod: `DM / WA +628212345xx`,
        estimatedLikes: 350,
        estimatedComments: 28
      },
      {
        id: "m-dyn-2",
        name: `Salsa Bila`,
        username: `@salsa.bilaa`,
        platform: p2,
        location: `Kec. Pinggir Kota, ${formattedCity}`,
        distanceKm: 42,
        followers: Math.max(minFollowers + 15500, 18200),
        engagementRate: 7.9,
        category: categories[1] || "Fashion",
        contentType: `Shopee Haul, Make-up tutorial, dan OOTD Remaja`,
        whyFits: `Memiliki konten transisi yang rapi dan interaksi tinggi di kolom komentar dari penonton lokal ${formattedCity}.`,
        contactMethod: `DM / Email: salsa.management@gmail.com`,
        estimatedLikes: 1450,
        estimatedComments: 110
      },
      {
        id: "m-dyn-3",
        name: `Rian Hidayat`,
        username: `@rianh_kuliner`,
        platform: p3,
        location: `Sub-distrik Luar (65km dari ${formattedCity})`,
        distanceKm: 65,
        followers: Math.max(minFollowers + 3400, 7500),
        engagementRate: 4.8,
        category: "Kuliner",
        contentType: `Rekomendasi street food tersembunyi (hidden gems)`,
        whyFits: `Cocok untuk menjangkau target market di kota satelit penopang ${formattedCity} secara organik.`,
        contactMethod: `DM`,
        estimatedLikes: 410,
        estimatedComments: 31
      }
    ];
  }

  // Filter based on followers, categories, distance, and platform
  let filtered = baseList.filter(item => {
    const matchesFollowers = item.followers >= minFollowers;
    // item category is in selected categories
    const matchesCategory = categories.some(cat => item.category.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(item.category.toLowerCase()));
    const matchesDistance = item.distanceKm <= maxDist;
    const matchesPlatform = platform === 'Semua' || !platform ? true : item.platform.toLowerCase() === platform.toLowerCase();
    return matchesFollowers && matchesDistance && matchesPlatform;
  });

  // If filtered is empty because of constraints, yield the whole base list but adjust platforms to match and fit criteria
  if (filtered.length === 0) {
    filtered = baseList.map(item => ({
      ...item,
      platform: platform === 'Semua' || !platform ? item.platform : platform,
      followers: Math.max(item.followers, minFollowers + 500),
      distanceKm: Math.min(item.distanceKm, maxDist - 5)
    }));
  }

  return res.json(filtered);
}

// API Route: Generate Personalized DM/Email Template in Indonesian
app.post("/api/generate-dm", async (req, res) => {
  try {
    const { influencer, config } = req.body;

    if (!influencer || !config) {
      return res.status(400).json({ error: "Missing influencer details or configuration parameters" });
    }

    // Detect Custom AI config headers
    const aiProvider = req.headers['x-ai-provider'] as string | undefined || 'gemini';
    const customApiKey = req.headers['x-ai-api-key'] as string | undefined;
    const customBaseUrl = req.headers['x-ai-base-url'] as string | undefined;
    const customModel = req.headers['x-ai-model'] as string | undefined;

    // Check if API key is present and valid
    const legacyApiKey = req.headers['x-gemini-api-key'] as string | undefined;
    const apiKey = (customApiKey && customApiKey.trim() !== "") ? customApiKey : (legacyApiKey && legacyApiKey.trim() !== "" ? legacyApiKey : process.env.GEMINI_API_KEY);
    const hasValidKey = apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "";

    const toneText = config.tone || "Sopan & Formal";
    const brandName = config.brandName || "[Nama Brand Kamu]";
    const productDesc = config.productDescription || "[Deskripsi Produk Kamu]";
    const goal = config.campaignGoal || "Meningkatkan brand awareness secara organik melalui konten kreatif";
    const perksText = config.perks || "Pengiriman produk gratis (free product) & komisi";

    const systemPromptMessage = `Tulis sebuah pesan penawaran kerja sama (DM Instagram/TikTok atau Email) dalam Bahasa Indonesia untuk mengajak kolaborasi digital marketing.

INFORMASI INFLUENCER:
- Nama Kreator: ${influencer.name}
- Username: ${influencer.username}
- Platform: ${influencer.platform}
- Kategori Konten: ${influencer.category} (${influencer.contentType})
- Lokasi: ${influencer.location}

INFORMASI BRAND & HAMPERS:
- Nama Brand: ${brandName}
- Produk/Jasa: ${productDesc}
- Tujuan Kampanye: ${goal}
- Benefit untuk Kreator: ${perksText}
- Tone Pesan: ${toneText}

ATURAN PENULISAN:
1. Hubungkan secara natural keunikan konten sang kreator dengan brand kami. Sebutkan bahwa konten mereka tentang "${influencer.category}" sangat menarik perhatian kami.
2. Jelaskan penawaran dengan bahasa yang sangat ${toneText.toLowerCase()}.
   - 'Sopan & Formal': menggunakan Saya/Kami, salam formal, sopan santun tingkat tinggi. Cocok untuk email atau brand korporat/profesional.
   - 'Santai & Friendly': menggunakan Kak/kamu, penuh kehangatan, bersahabat, cocok untuk brand skincare/fashion remaja di DM Instagram.
   - 'Antusias & Kreatif': bersemangat, menggunakan tanda seru secara asyik, menekankan kebebasan berkreasi konten organik.
3. Sebutkan benefit secara jelas tanpa terdengar menuntut berlebihan di pesan awal. Sampaikan bahwa kami menghargai kreativitas organik mereka.
4. Akhiri dengan ajakan bertindak (Call to Action) yang sopan, menanyakan ketersediaan rate card atau alamat pengiriman produk.
5. Beri penanda yang jelas [CONTOH_DM_SOPAN] di awal output pesan.`;

    // Handle Custom / OpenAIcompatible Open-Source AI request
    if (aiProvider === 'openai_compatible' && customBaseUrl) {
      if (!apiKey || apiKey.trim() === '') {
        const fallbackTemplate = generateIndonesianDMFallback(influencer, config);
        return res.json({ text: fallbackTemplate });
      }
      console.log(`Querying custom OpenAI-compatible endpoint: ${customBaseUrl} for DM generation with model: ${customModel || 'meta-llama/llama-3-8b-instruct'}`);
      const aiResponse = await callOpenAICompatible(
        apiKey,
        customBaseUrl,
        customModel || '',
        "You are an Indonesian professional copywriting assistant.",
        systemPromptMessage
      );
      return res.json({ text: aiResponse });
    }

    if (!hasValidKey) {
      const fallbackTemplate = generateIndonesianDMFallback(influencer, config);
      return res.json({ text: fallbackTemplate });
    }

    const aiClient = getGeminiClient(apiKey);

    const promptMessage = systemPromptMessage;

    const response = await aiClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents: promptMessage,
    });

    const outputText = response.text || generateIndonesianDMFallback(influencer, config);
    return res.json({ text: outputText });

  } catch (error) {
    console.error("Gemini DM Generation Error:", error);
    const influencer = req.body.influencer;
    const config = req.body.config;
    return res.json({ text: generateIndonesianDMFallback(influencer, config) });
  }
});

// Fast offline template generator when API key is missing or fails
function generateIndonesianDMFallback(influencer: any, config: any) {
  const brand = config.brandName || "Brand Kami";
  const product = config.productDescription || "produk terbaik kami";
  const perks = config.perks || "produk gratis & komisi endorsement";
  const creatorName = influencer.name || "Kak";
  const username = influencer.username || "@creator";
  const niche = influencer.category || "Lifestyle";

  if (config.tone === 'Santai & Friendly') {
    return `Halo Kak ${creatorName}! 😊✨

Kenalin kami dari tim marketing ${brand}. Akhir-akhir ini kami sering banget liat postingan Kakak di ${influencer.platform} (${username}), terutama konten Kakak yang bahas tentang ${niche}. Suka banget sama vibe konten Kakak yang selalu aktif, kreatif, dan aesthetic! 😍

Kami kebetulan lagi ada campaign seru nih untuk ngenalin ${product}, dengan tujuan meningkatkan brand awareness secara organik lewat kreativitas para creator lokal terbaik. Karena kami rasa kecocokan audiens Kakak pas banget dengan brand kami, kami pengen banget ngajak Kak ${creatorName} buat kolaborasi santai!

Tenang aja Kak, kami bakal siapin benefit menarik buat Kakak berupa:
🎁 ${perks}

Kakak punya kebebasan penuh buat bikin konsep konten yang organik khas gaya Kakak sendiri. Gimana Kak, tertarik buat coba kirimin review keren? Kalau Kakak luang, boleh banget kabari kami ya, atau kirim Rate Card terbaru Kakak ke sini. 

Ditunggu kabar baiknya ya Kak! Terima kasih banyak dan sehat selalu! 🙌🌻`;
  } else if (config.tone === 'Antusias & Kreatif') {
    return `Hi Kak ${creatorName}! 🚀🔥

Salam kreatif! Kami dari ${brand} lagi merhatiin banget akun ${influencer.platform} Kakak (${username}). Jujur, konten-konten ${niche} yang Kakak buat bener-bener fresh, seru, dan engagement-nya keliatan asyik banget! Salut buat konsistensinya! 🙌🌟

Kami punya project seru yang tujuannya pengen naikin organic brand awareness lewat karya-karya authentik para pembuat konten berbakat. Melalui campaign ini, kami mau ngajakin kolaborasi buat produk kami, yaitu: ${product}.

Kenapa Kak ${creatorName}? Karena kami percaya style unik Kakak bakal bisa nge-representasiin pesan brand kami secara jujur dan menarik ke followers setia Kakak!

Benefit asyik yang udah kami siapkan:
💥 ${perks}
💥 Creative freedom penuh untuk ngedevelop ide konten!

Kalau Kakak tertarik buat kolaborasi seru dan serba kreatif ini, yuk balas pesan ini ya! Kita bisa diskusi kilat soal konsep seru yang paling pas buat Kakak. 

Let's collaborate and create magic together! Thank you Kak! 🎸`;
  } else {
    // Sopan & Formal (Default)
    return `Yth. Kak ${creatorName} (${username}),
Selamat pagi/siang, salam sejahtera.

Perkenalkan, saya adalah perwakilan divisi Digital Marketing dari ${brand}. Kami telah mengamati beberapa unggahan kreatif Anda di ${influencer.platform}, khususnya dalam kategori ${niche} yang menyajikan informasi yang sangat berkualitas untuk pengikut Anda.

Saat ini brand kami sedang mengadakan kampanye dengan fokus meningkatkan brand awareness secara organik melalui konten kreatif berkualitas tinggi. Kami melihat bahwa visi konten serta segmentasi audiens Anda sangat selaras dengan produk yang kami miliki, yaitu: ${product}.

Oleh karena itu, kami ingin menawarkan kerja sama kolaborasi digital marketing berupa pengenalan produk secara organik (soft-selling / review). Kami juga telah mempersiapkan kompensasi/benefit yang sesuai untuk Anda berupa:
- ${perks}
- Kesempatan kerja sama jangka panjang jika kampanye sukses

Apabila Anda tertarik untuk bekerja sama dan bersedia menerima proposal penawaran ini, mohon kesediaan Anda untuk membalas pesan ini atau mengirimkan Rate Card serta media kit terbaru ke alamat kontak kami.

Atas perhatian dan kerja sama baik yang diberikan, kami ucapkan terima kasih banyak. Semoga sehat dan sukses selalu.

Hormat kami,
Tim Digital Marketing - ${brand}`;
  }
}

// API Route: Generate Hashtags for Influencer Content
app.post("/api/generate-hashtags", async (req, res) => {
  try {
    const { influencer, config } = req.body;
    if (!influencer || !config) {
      return res.status(400).json({ error: "Missing influencer or config" });
    }

    const aiProvider = req.headers['x-ai-provider'] as string | undefined || 'gemini';
    const customApiKey = req.headers['x-ai-api-key'] as string | undefined;
    const customBaseUrl = req.headers['x-ai-base-url'] as string | undefined;
    const customModel = req.headers['x-ai-model'] as string | undefined;
    const legacyApiKey = req.headers['x-gemini-api-key'] as string | undefined;
    const apiKey = (customApiKey && customApiKey.trim() !== "") ? customApiKey : (legacyApiKey && legacyApiKey.trim() !== "" ? legacyApiKey : process.env.GEMINI_API_KEY);
    const hasValidKey = apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "";

    const systemPrompt = `Kamu adalah ahli hashtag marketing untuk platform Instagram dan TikTok di Indonesia.
Tugasmu adalah menghasilkan hashtag yang relevan, populer, dan efektif untuk campaign digital marketing.

Informasi Brand:
- Nama Brand: ${config.brandName}
- Produk: ${config.productDescription}
- Tujuan: ${config.campaignGoal || "Brand Awareness"}

Informasi Kreator:
- Nama: ${influencer.name} (${influencer.username})
- Platform: ${influencer.platform}
- Niche/Kategori: ${influencer.category}
- Lokasi: ${influencer.location}
- Jenis Konten: ${influencer.contentType}

Hasilkan 4 kelompok hashtag (masing-masing 5-8 hashtag) dalam format JSON:
{
  "brand": ["hashtag untuk brand", ...],
  "niche": ["hashtag sesuai kategori/niche", ...],
  "local": ["hashtag lokasi daerah", ...],
  "trending": ["hashtag tren umum Indonesia", ...]
}

Aturan:
- Gunakan campuran Bahasa Indonesia dan Inggris
- Prioritaskan hashtag yang relevan dengan lokasi Indonesia dan niche kreator
- Jangan gunakan hashtag spam/abusive
- Untuk TikTok, prioritaskan #FYP #Viral #ExplorePage #Trending
- Untuk Instagram, #Explore #ReelsIndonesia #ViralVideo
- Sertakan hashtag lokal spesifik seperti #KulinerSolo #BandungHits #JakartaFashionWeek dll`;

    // Handle OpenAI-compatible
    if (aiProvider === 'openai_compatible' && customBaseUrl) {
      if (!apiKey || apiKey.trim() === '') {
        return res.json(generateFallbackHashtags(influencer, config));
      }
      const aiResponse = await callOpenAICompatible(apiKey, customBaseUrl, customModel || '', systemPrompt, "Generate hashtags JSON");
      const parsed = extractJsonArrayOrObject(aiResponse);
      return res.json(parsed);
    }

    if (!hasValidKey) {
      return res.json(generateFallbackHashtags(influencer, config));
    }

    const aiClient = getGeminiClient(apiKey);
    const response = await aiClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Generate hashtags for the given influencer and brand information.",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    const parsed = JSON.parse(text.trim());
    return res.json(parsed);

  } catch (error: any) {
    console.error("Hashtag generation error:", error);
    const influencer = req.body.influencer;
    const config = req.body.config;
    return res.json(generateFallbackHashtags(influencer, config));
  }
});

function generateFallbackHashtags(influencer: any, config: any) {
  const brand = config.brandName || "Brand";
  const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cat = influencer.category || "Lifestyle";
  const catLower = cat.toLowerCase();
  const location = influencer.location || "Indonesia";
  const locParts = location.split('(')[0].trim().toLowerCase().replace(/\s+/g, '');

  return {
    brand: [
      `#${brandSlug}`,
      `#${brandSlug}Indonesia`,
      `#${brandSlug}Review`,
      `#${brandSlug}Promo`,
      `#${brandSlug}Aesthetic`,
      `#${brandSlug}Lokal`,
    ],
    niche: [
      `#${catLower}Indonesia`,
      `#${catLower}Lokal`,
      `#Review${cat}`,
      `#${cat}Content`,
      `#${cat}Creator`,
      `#Tips${cat}`,
    ],
    local: [
      `#${locParts}`,
      `#${locParts}Hits`,
      `#${locParts}Kuliner`,
      `#${locParts}Creators`,
      `#Explore${locParts.charAt(0).toUpperCase() + locParts.slice(1)}`,
      `#${locParts}Viral`,
    ],
    trending: [
      '#FYP',
      '#Viral',
      '#ExplorePage',
      '#ReelsIndonesia',
      '#Trending',
      '#OOTDIndonesia',
      '#LocalPride',
    ]
  };
}

// API Route: Generate AI Chat Reply for DM simulation
app.post("/api/generate-chat-reply", async (req, res) => {
  try {
    const { messages: conversation, influencer } = req.body;
    if (!conversation || !influencer) {
      return res.status(400).json({ error: "Missing conversation history or influencer info" });
    }

    const aiProvider = req.headers['x-ai-provider'] as string | undefined || 'gemini';
    const customApiKey = req.headers['x-ai-api-key'] as string | undefined;
    const customBaseUrl = req.headers['x-ai-base-url'] as string | undefined;
    const customModel = req.headers['x-ai-model'] as string | undefined;
    const legacyApiKey = req.headers['x-gemini-api-key'] as string | undefined;
    const apiKey = (customApiKey && customApiKey.trim() !== "") ? customApiKey : (legacyApiKey && legacyApiKey.trim() !== "" ? legacyApiKey : process.env.GEMINI_API_KEY);
    const hasValidKey = apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "";

    const recentMessages = conversation.slice(-6).map((m: any) =>
      `${m.sender === 'Kamu (Brand)' ? 'Brand' : influencer.name}: ${m.text}`
    ).join('\n');

    const systemPrompt = `Kamu adalah ${influencer.name}, seorang content creator ${influencer.platform} dari ${influencer.location} (niche ${influencer.category}).

Kamu lagi di-DM sama tim marketing brand. Yang penting: lo balesnya WAJIB kayak anak muda ngobrol santai di DM real, bukan kayak robot marketing. Jangan kaku, jangan formal, jangan kayak lagi nulis surat resmi.

ATURAN BALES DM:
- Bahasa campuran Indonesia-Inggris gaul (wajar, kayak percakapan sehari-hari anak muda Indo)
- BOLEH BANGET pake bahasa gaul: "wkwk", "sih", "dong", "nih", "deh", "banget", "gitu", "emang", "anjir", "bener", "gas", "ok sip", "mantap"
- Boleh pake emoticon santai: 😂🔥👍🙏😅💯✨
- Variasi panjang: kadang pendek (3-8 kata), kadang agak panjang (10-20 kata)
- JANGAN pake kalimat formal kayak "Terima kasih atas kepercayaannya", "Saya sangat tertarik", "Mohon informasinya lebih lanjut"
- Ganti dengan: "wah oke nih", "gas deh", "boleh tuh", "siap", "ok sip mantap", "wkwk iya dong", "noted kak", dll
- Kalo brand ngasih tawaran, bales dengan antusias tapi santai
- Kalo nanya sesuatu, jawab dengan natural
- JANGAN ngulang-ulang template yang sama tiap chat

Riwayat chat terbaru:
${recentMessages}

Sekarang bales pesan terakhir dari brand dengan santai, natural, kayak lo lagi chat temen sendiri. JANGAN pake kata-kata formal.`;

    // Handle OpenAI-compatible
    if (aiProvider === 'openai_compatible' && customBaseUrl) {
      if (!apiKey || apiKey.trim() === '') {
        return res.json({ text: generateFallbackChatReply(influencer.name) });
      }
      const aiResponse = await callOpenAICompatible(apiKey, customBaseUrl, customModel || '', systemPrompt, "Balas pesan DM ini secara natural.");
      return res.json({ text: aiResponse });
    }

    if (!hasValidKey) {
      return res.json({ text: generateFallbackChatReply(influencer.name) });
    }

    const aiClient = getGeminiClient(apiKey);
    const response = await aiClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Balas pesan DM ini secara natural dan autentik sebagai seorang content creator.",
      config: {
        systemInstruction: systemPrompt,
      }
    });

    const outputText = response.text || generateFallbackChatReply(influencer.name);
    return res.json({ text: outputText });

  } catch (error) {
    console.error("Chat reply generation error:", error);
    const influencer = req.body.influencer;
    return res.json({ text: generateFallbackChatReply(influencer?.name || 'Kreator') });
  }
});

function generateFallbackChatReply(name: string): string {
  const replies = [
    `Halo! Terima kasih sudah menghubungi saya 😊`,
    `Wah menarik nih! Bisa ceritain lebih detail?`,
    `Saya tertarik untuk kolaborasi! Ada rate card nih, bisa saya kirim?`,
    `Noted! Saya tunggu detail lebih lanjut ya`,
    `Baik, saya akan cek dulu dan kabari lagi`,
    `Maaf baru balas, lagi sibuk bikin konten 😅`,
    `Oke deal! kirim produknya ke alamat saya ya`,
    `Siap! besok saya posting deh kontennya`,
    `Terima kasih banyak atas kepercayaannya! 🙌`,
    `Boleh maling info dulu nih, budgetnya berapa ya kira-kira?`,
    `Halo kak, makasih udah reach out! Boleh tau produknya apa?`,
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

// Vite middleware configuration for dev & static folder routing for prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5173", "http://localhost:3000"],
      methods: ["GET", "POST"],
    },
  });

  type ChatMessage = {
    roomId: string;
    sender: string;
    text: string;
    timestamp: number;
  };

  const chatRooms = new Map<string, ChatMessage[]>();

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join-room", (roomId: string) => {
      socket.join(roomId);
      if (!chatRooms.has(roomId)) {
        chatRooms.set(roomId, []);
      }
      socket.emit("chat-history", chatRooms.get(roomId));
    });

    socket.on("leave-room", (roomId: string) => {
      socket.leave(roomId);
    });

    socket.on("send-message", (data: ChatMessage) => {
      const msg = { ...data, timestamp: Date.now() };
      if (!chatRooms.has(data.roomId)) {
        chatRooms.set(data.roomId, []);
      }
      chatRooms.get(data.roomId)!.push(msg);
      io.to(data.roomId).emit("new-message", msg);
    });

    socket.on("typing", ({ roomId, sender }: { roomId: string; sender: string }) => {
      socket.to(roomId).emit("user-typing", sender);
    });

    socket.on("stop-typing", ({ roomId }: { roomId: string }) => {
      socket.to(roomId).emit("user-stop-typing");
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  server.listen(PORT, "0.0.0.0", () => {
    const addr = server.address();
    const actualPort = typeof addr === 'string' ? addr : addr?.port;
    console.log(`Server running at http://localhost:${actualPort}`);
    console.log(`Socket.IO server ready on port ${actualPort}`);
  });
}

startServer();
