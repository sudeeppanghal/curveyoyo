import { prisma } from "@/lib/prisma";

const SCRAPER_API_URL = process.env.SCRAPER_API_URL || "https://jaatram-yoyo-scraper.hf.space";
const SCRAPER_API_SECRET = process.env.SCRAPER_API_SECRET || "yoyosmm_scraper_secret_xyz123";

export async function fetchLatestInstagramPost(username: string): Promise<{ id: string, url: string } | null> {
  try {
    console.log(`[Scraper] Fetching latest Instagram post for: ${username}`);
    const url = `${SCRAPER_API_URL}/scrape?platform=instagram&username=${encodeURIComponent(username)}&secret=${SCRAPER_API_SECRET}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Scraper API returned status ${res.status}`);
    }
    const data = await res.json() as any;
    if (data && data.success) {
      console.log(`[Scraper] Success Instagram for ${username}: ${data.id}`);
      return {
        id: data.id,
        url: data.url
      };
    }
  } catch (error: any) {
    console.error(`[Scraper] Instagram Error for ${username}:`, error.message);
  }
  return null;
}

export async function fetchLatestTiktokPost(username: string): Promise<{ id: string, url: string } | null> {
  try {
    console.log(`[Scraper] Fetching latest TikTok post for: ${username}`);
    const url = `${SCRAPER_API_URL}/scrape?platform=tiktok&username=${encodeURIComponent(username)}&secret=${SCRAPER_API_SECRET}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Scraper API returned status ${res.status}`);
    }
    const data = await res.json() as any;
    if (data && data.success) {
      console.log(`[Scraper] Success TikTok for ${username}: ${data.id}`);
      return {
        id: data.id,
        url: data.url
      };
    }
  } catch (error: any) {
    console.error(`[Scraper] TikTok Error for ${username}:`, error.message);
  }
  return null;
}

export async function fetchLatestFacebookPost(username: string): Promise<{ id: string, url: string } | null> {
  console.log(`[Scraper] Facebook scraping is currently not used/active.`);
  return null;
}

