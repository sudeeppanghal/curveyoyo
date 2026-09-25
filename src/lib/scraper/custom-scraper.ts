import { prisma } from "@/lib/prisma";
import axios from "axios";

// In-memory cache for admin settings to prevent DB pool exhaustion
let cachedSettings: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 60000;

async function getCachedSettings() {
  const now = Date.now();
  if (cachedSettings && (now - cachedSettings.timestamp < CACHE_TTL_MS)) {
    return cachedSettings.data;
  }
  try {
    const settings = await prisma.adminSettings.findFirst();
    cachedSettings = { data: settings, timestamp: now };
    return settings;
  } catch (err) {
    return cachedSettings?.data || null;
  }
}

export function getInstagramShortcode(url: string): string | null {
  const match = url.match(/\/reel\/([a-zA-Z0-9_-]+)/) || url.match(/\/p\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function getYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:v=|\/embed\/|\/shorts\/|\/watch\?v=|^youtu\.be\/|\/v\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export async function scrapeYouTubeViews(url: string): Promise<number | null> {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;

  try {
    const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 3000,
    });

    const html = response.data;
    const match = html.match(/"viewCount"\s*:\s*"(\d+)"/i) || html.match(/viewCount\b.*?(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  } catch (error: any) {
    // Non-blocking catch
  }
  return null;
}

export async function scrapeInstagramViewsWithCookies(shortcode: string, cookie: string): Promise<number | null> {
  try {
    const url = `https://www.instagram.com/reel/${shortcode}/?__a=1&__d=dis`;
    const response = await axios.get(url, {
      headers: {
        "Cookie": cookie,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
      },
      timeout: 3000,
    });

    const data = response.data;
    const media = data?.graphql?.shortcode_media || data?.items?.[0];
    if (media) {
      const views = media.video_play_count ?? media.play_count ?? media.video_view_count;
      if (views !== undefined) {
        return parseInt(String(views), 10);
      }
    }
  } catch (error: any) {
    // Non-blocking catch
  }
  return null;
}

export async function scrapeViaApify(url: string, apifyKey: string, platform: "instagram" | "tiktok"): Promise<number | null> {
  try {
    if (platform === "instagram") {
      const actorUrl = `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${apifyKey}`;
      const response = await axios.post(
        actorUrl,
        { directUrls: [url], resultsType: "details" },
        { timeout: 3000 }
      );
      const items = response.data;
      if (Array.isArray(items) && items.length > 0) {
        const views = items[0].videoPlayCount ?? items[0].playCount ?? items[0].videoViewCount;
        if (views !== undefined) return parseInt(String(views), 10);
      }
    } else if (platform === "tiktok") {
      const actorUrl = `https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items?token=${apifyKey}`;
      const response = await axios.post(
        actorUrl,
        { postURLs: [url] },
        { timeout: 3000 }
      );
      const items = response.data;
      if (Array.isArray(items) && items.length > 0) {
        const views = items[0].playCount ?? items[0].diggCount;
        if (views !== undefined) return parseInt(String(views), 10);
      }
    }
  } catch (error: any) {
    // Non-blocking catch
  }
  return null;
}

export async function fetchLiveVideoViews(url: string): Promise<{ views: number; title?: string; thumbnail?: string } | null> {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
    const views = await scrapeYouTubeViews(url);
    if (views !== null) return { views };
    return null;
  }

  const isInstagram = lowerUrl.includes("instagram.com");
  const isTiktok = lowerUrl.includes("tiktok.com");
  
  const settings = await getCachedSettings();
  
  if (isInstagram && settings?.instagramCookies) {
    const shortcode = getInstagramShortcode(url);
    if (shortcode) {
      const views = await scrapeInstagramViewsWithCookies(shortcode, settings.instagramCookies);
      if (views !== null) return { views };
    }
  }

  if (settings?.apifyKeys) {
    const platform = isInstagram ? "instagram" : (isTiktok ? "tiktok" : null);
    if (platform) {
      const views = await scrapeViaApify(url, settings.apifyKeys, platform);
      if (views !== null) return { views };
    }
  }

  return null;
}

export function splitViewsIntoParts(total: number, minQty: number = 100): number[] {
  if (total <= minQty * 2) {
    return [total];
  }
  
  const parts: number[] = [];
  let remaining = total;
  const percentages = [0.15, 0.25, 0.35, 0.25];
  
  for (let i = 0; i < percentages.length; i++) {
    if (remaining <= minQty) break;
    let partVal = Math.floor(total * percentages[i]);
    partVal = Math.round(partVal / 10) * 10;
    if (partVal < minQty) partVal = minQty;
    if (remaining - partVal < minQty) break;
    parts.push(partVal);
    remaining -= partVal;
  }
  
  if (remaining > 0) parts.push(remaining);
  return parts;
}
