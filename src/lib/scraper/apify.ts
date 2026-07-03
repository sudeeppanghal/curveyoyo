import { ApifyClient } from 'apify-client';
import { prisma } from "@/lib/prisma";

// Simple round-robin key rotator
let currentKeyIndex = 0;

async function getNextApifyClient() {
  const settings = await prisma.adminSettings.findUnique({
    where: { id: "global" }
  });

  const keysStr = settings?.apifyKeys || process.env.APIFY_API_KEYS;
  if (!keysStr) {
    throw new Error("Missing APIFY_API_KEYS in database or .env");
  }
  
  const keys = keysStr.split(',').map(k => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    throw new Error("No valid Apify keys found.");
  }
  
  const key = keys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  
  return new ApifyClient({ token: key });
}

export async function fetchLatestInstagramPost(username: string): Promise<{ id: string, url: string } | null> {
  const client = await getNextApifyClient();

  
  const input = {
    "usernames": [username],
    "resultsType": "posts",
    "resultsLimit": 1
  };

  try {
    // We use a popular Apify actor for Instagram scraping
    // "apify/instagram-scraper" is a commonly used actor ID.
    // If we need a specific one, we can change this string.
    const run = await client.actor("apify/instagram-scraper").call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    if (items && items.length > 0) {
      const post = items[0] as any;
      return {
        id: post.id || post.shortCode || post.url,
        url: post.url
      };
    }
  } catch (error) {
    console.error(`Apify Scraper Error for ${username}:`, error);
  }
  
  return null;
}
export async function fetchLatestTiktokPost(username: string): Promise<{ id: string, url: string } | null> {
  const client = await getNextApifyClient();
  const input = {
    "profiles": [username],
    "resultsPerPage": 1,
    "shouldDownloadVideos": false
  };

  try {
    const run = await client.actor("clockwork/tiktok-scraper").call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    if (items && items.length > 0) {
      const post = items[0] as any;
      return {
        id: post.id || post.videoMeta?.id || post.webVideoUrl,
        url: post.webVideoUrl || post.videoUrl
      };
    }
  } catch (error) {
    console.error(`Apify TikTok Scraper Error for ${username}:`, error);
  }
  return null;
}

export async function fetchLatestFacebookPost(username: string): Promise<{ id: string, url: string } | null> {
  const client = await getNextApifyClient();
  const input = {
    "startUrls": [{ "url": `https://www.facebook.com/${username}` }],
    "resultsLimit": 1
  };

  try {
    const run = await client.actor("apify/facebook-pages-scraper").call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    if (items && items.length > 0) {
      const post = items[0] as any;
      return {
        id: post.postId || post.url,
        url: post.url
      };
    }
  } catch (error) {
    console.error(`Apify Facebook Scraper Error for ${username}:`, error);
  }
  return null;
}
