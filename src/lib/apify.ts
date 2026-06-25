import type { Influencer } from '../types';

const APIFY_INSTAGRAM_SEARCH_ACTOR = 'apify~instagram-profile-scraper';
const APIFY_API_BASE = 'https://api.apify.com/v2';

export async function searchInstagramProfiles(
  apiToken: string,
  searchTerms: string[],
  location: string,
  platform: 'Instagram' | 'TikTok'
): Promise<Influencer[]> {
  if (!apiToken) throw new Error('Apify API token tidak tersedia');

  const searchQuery = searchTerms.length > 0
    ? `${searchTerms.join(' ')} ${location}`
    : `influencer ${location}`;

  const actorRunUrl = `${APIFY_API_BASE}/acts/${APIFY_INSTAGRAM_SEARCH_ACTOR}/runs?token=${apiToken}`;

  const response = await fetch(actorRunUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchType: 'search',
      searchTerm: searchQuery,
      searchLimit: 20,
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
    throw new Error('Apify tidak mengembalikan data apapun');
  }

  const seenUsernames = new Set<string>();
  const influencers: Influencer[] = [];

  for (const item of datasetItems) {
    const username = item.username || item.ownerUsername || '';
    if (!username || seenUsernames.has(username.toLowerCase())) continue;
    seenUsernames.add(username.toLowerCase());

    const fullName = item.fullName || item.ownerFullName || username;
    const followers = item.followersCount || 0;
    const likes = item.likesCount || 0;
    const comments = item.commentsCount || 0;
    const avgEngagement = followers > 0
      ? parseFloat((((likes + comments) / followers) * 100).toFixed(2))
      : 0;

    influencers.push({
      id: `apify-${username}`,
      name: fullName,
      username: `@${username}`,
      platform: 'Instagram',
      followers,
      engagementRate: avgEngagement,
      location: item.location || location || 'N/A',
      category: searchTerms[0] || 'General',
      contentType: item.description?.[0]?.slice(0, 100) || item.caption?.[0]?.slice(0, 100) || item.biography || '',
      whyFits: `Scraped via Apify — ${item.followersCount || 0} followers, ${avgEngagement}% engagement`,
      distanceKm: 0,
      contactMethod: 'DM Instagram',
      estimatedLikes: likes,
      estimatedComments: comments,
    });
  }

  return influencers;
}
