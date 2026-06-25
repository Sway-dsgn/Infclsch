import type { Influencer } from '../types';

const APIFY_SEARCH_ACTOR = 'apify~instagram-search-scraper';
const APIFY_API_BASE = 'https://api.apify.com/v2';

let searchOffset = 0;

export async function searchInstagramProfiles(
  apiToken: string,
  searchTerms: string[],
  location: string,
  platform: 'Instagram' | 'TikTok'
): Promise<Influencer[]> {
  if (!apiToken) throw new Error('Apify API token tidak tersedia');

  const queries = searchTerms.length > 0
    ? searchTerms.map(t => `${t} ${location}`)
    : [`influencer ${location}`];

  const offset = searchOffset;
  searchOffset += 5;

  const actorRunUrl = `${APIFY_API_BASE}/acts/${APIFY_SEARCH_ACTOR}/runs?token=${apiToken}`;

  const response = await fetch(actorRunUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchTerms: queries,
      searchType: 'user',
      limit: 5,
      resultsOffset: offset,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Apify API error: ${err}`);
  }

  const runData = await response.json();
  const runId: string = runData.data?.id;
  if (!runId) throw new Error('Gagal memulai actor run di Apify');

  const startTime = Date.now();
  const TIMEOUT = 120_000;

  let datasetItems: any[] = [];

  while (Date.now() - startTime < TIMEOUT) {
    await new Promise(r => setTimeout(r, 3000));

    const statusRes = await fetch(
      `${APIFY_API_BASE}/actor-runs/${runId}?token=${apiToken}`
    );
    const statusData = await statusRes.json();
    const status = statusData.data?.status;

    if (status === 'SUCCEEDED') {
      const datasetRes = await fetch(
        `${APIFY_API_BASE}/actor-runs/${runId}/output/dataset/items?token=${apiToken}`
      );
      datasetItems = await datasetRes.json();
      break;
    } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
      throw new Error(`Apify run gagal dengan status: ${status}`);
    }
  }

  if (datasetItems.length === 0) {
    searchOffset = 0;
    throw new Error('Apify tidak mengembalikan data apapun');
  }

  const seenUsernames = new Set<string>();
  const influencers: Influencer[] = [];

  for (const item of datasetItems) {
    const username = item.userName || item.username || '';
    if (!username || seenUsernames.has(username.toLowerCase())) continue;
    seenUsernames.add(username.toLowerCase());

    const fullName = item.fullName || username;
    const followers = item.followersCount || 0;
    const avgEngagement = item.engagementRate || 0;

    influencers.push({
      id: `apify-${username}`,
      name: fullName,
      username: `@${username}`,
      platform: 'Instagram',
      followers,
      engagementRate: typeof avgEngagement === 'number' ? avgEngagement : 0,
      location: item.location || location || 'N/A',
      category: searchTerms[0] || 'General',
      contentType: item.biography || item.description || '',
      whyFits: `Scraped via Apify — ${followers} followers`,
      distanceKm: 0,
      contactMethod: 'DM Instagram',
      estimatedLikes: 0,
      estimatedComments: 0,
    });
  }

  return influencers;
}
