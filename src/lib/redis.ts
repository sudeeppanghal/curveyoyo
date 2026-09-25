import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

/** Cache panel health status for 5 minutes */
export async function cachePanelStatus(panelId: string, status: "ONLINE" | "OFFLINE" | "SLOW") {
  const redis = getRedis();
  await redis.setex(`panel:status:${panelId}`, 300, status);
}

export async function getCachedPanelStatus(panelId: string): Promise<string | null> {
  const redis = getRedis();
  return redis.get(`panel:status:${panelId}`);
}

/** Rate limiting: max N orders per user per hour */
export async function checkRateLimit(userId: string, maxPerHour = 100): Promise<boolean> {
  const redis = getRedis();
  const key = `ratelimit:orders:${userId}:${Math.floor(Date.now() / 3600000)}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 3600);
  return count <= maxPerHour;
}

/** Cache dashboard stats for 60 seconds */
export async function cacheDashboardStats(userId: string, stats: object) {
  const redis = getRedis();
  await redis.setex(`dashboard:stats:${userId}`, 60, JSON.stringify(stats));
}

export async function getCachedDashboardStats(userId: string): Promise<object | null> {
  const redis = getRedis();
  const raw = await redis.get<string>(`dashboard:stats:${userId}`);
  if (!raw) return null;
  try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return null; }
}
