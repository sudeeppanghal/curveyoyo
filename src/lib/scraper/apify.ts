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
