import http from 'http';
import { URL } from 'url';
import { gotScraping } from 'got-scraping';

const PORT = 4000;
const API_SECRET = "yoyosmm_scraper_secret_xyz123";

// ── Circuit Breaker State ─────────────────────────────────────────────────────
// Tracks per-account failure counts and next-allowed-retry timestamps
const failureMap = new Map(); // username+platform → { count, cooldownUntil }

const BASE_COOLDOWN_MS = 60_000;        // 1 minute base
const MAX_COOLDOWN_MS  = 30 * 60_000;  // 30 minutes max cap
const OPEN_CIRCUIT_AFTER = 3;          // open circuit after 3 consecutive failures

function getCooldownMs(failureCount) {
  // Exponential: 1m, 2m, 4m, 8m, 16m, 30m (capped)
  return Math.min(BASE_COOLDOWN_MS * Math.pow(2, failureCount - 1), MAX_COOLDOWN_MS);
}

function getCircuitKey(username, platform) {
  return `${platform}:${username.toLowerCase().replace('@', '')}`;
}

function isInCooldown(key) {
  const state = failureMap.get(key);
  if (!state) return false;
  if (Date.now() < state.cooldownUntil) return state;
  return false; // cooldown expired — allow retry
}

function recordFailure(key) {
  const state = failureMap.get(key) || { count: 0, cooldownUntil: 0 };
  state.count += 1;
  state.cooldownUntil = Date.now() + getCooldownMs(state.count);
  failureMap.set(key, state);
  console.warn(
    `[Circuit Breaker] ${key} failed ${state.count} times. ` +
    `Cooling down for ${getCooldownMs(state.count) / 1000}s until ${new Date(state.cooldownUntil).toISOString()}`
  );
  return state;
}

function recordSuccess(key) {
  if (failureMap.has(key)) {
    console.log(`[Circuit Breaker] ${key} recovered — resetting failure count.`);
    failureMap.delete(key);
  }
}

// ── Helper: scrape with timeout ───────────────────────────────────────────────
async function scrapePage(url) {
  return gotScraping({
    url,
    timeout: { request: 15000 }, // 15s hard timeout per request
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.5",
    },
    retry: { limit: 0 }, // No got-level retries — we handle them ourselves
  });
}

// ── HTTP Server ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    res.setHeader('Content-Type', 'application/json');

    if (parsedUrl.pathname === '/') {
      res.statusCode = 200;
      return res.end(JSON.stringify({
        status: "YoYoSMM Local Scraper is online!",
        circuitBreakers: Object.fromEntries(
          [...failureMap.entries()].map(([k, v]) => [k, {
            failures: v.count,
            cooldownUntil: new Date(v.cooldownUntil).toISOString(),
            remainingSecs: Math.max(0, Math.round((v.cooldownUntil - Date.now()) / 1000))
          }])
        )
      }));
    }

    if (parsedUrl.pathname === '/scrape') {
      const username = parsedUrl.searchParams.get('username');
      const platform = parsedUrl.searchParams.get('platform');
      const secret   = parsedUrl.searchParams.get('secret');

      if (secret !== API_SECRET) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: "Unauthorized" }));
      }
      if (!username || !platform) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Username and platform required" }));
      }

      const key = getCircuitKey(username, platform);

      // ── Check circuit breaker BEFORE attempting scrape ──
      const cooldownState = isInCooldown(key);
      if (cooldownState) {
        const remainingSecs = Math.round((cooldownState.cooldownUntil - Date.now()) / 1000);
        console.log(`[Circuit Breaker] ${key} is in cooldown. ${remainingSecs}s remaining. Skipping scrape.`);
        res.statusCode = 503;
        res.setHeader('Retry-After', String(remainingSecs));
        return res.end(JSON.stringify({
          error: "Account temporarily in cooldown due to repeated failures",
          retryAfterSeconds: remainingSecs,
          failureCount: cooldownState.count
        }));
      }

      console.log(`[Local Scraper] Scraping ${platform} profile: ${username}`);

      // ── Instagram via imginn.com ──────────────────────────────────────────
      if (platform.toLowerCase() === 'instagram') {
        try {
          const targetUrl = `https://imginn.com/${username.replace('@', '')}/`;
          const resScraped = await scrapePage(targetUrl);

          if (resScraped.statusCode === 200) {
            const html = resScraped.body;
            let match = /href="\/p\/([^"]*)\/"/.exec(html);
            if (!match) match = /href="\/p\/([^"]*)"/.exec(html);
            if (match && match[1]) {
              recordSuccess(key);
              res.statusCode = 200;
              return res.end(JSON.stringify({
                success: true,
                id: match[1],
                url: `https://www.instagram.com/p/${match[1]}/`
              }));
            }
            // Page loaded but no post found — treat as failure
            throw new Error(`No posts found on imginn for ${username}`);
          }
          throw new Error(`imginn returned status ${resScraped.statusCode}`);
        } catch (error) {
          const state = recordFailure(key);
          const retrySecs = Math.round(getCooldownMs(state.count) / 1000);
          res.statusCode = 500;
          res.setHeader('Retry-After', String(retrySecs));
          return res.end(JSON.stringify({
            error: error.message,
            retryAfterSeconds: retrySecs
          }));
        }
      }

      // ── TikTok via urlebird.com ───────────────────────────────────────────
      else if (platform.toLowerCase() === 'tiktok') {
        try {
          const targetUrl = `https://urlebird.com/user/${username.replace('@', '')}/`;
          let resScraped = await scrapePage(targetUrl);

          // Trigger indexer if profile not found yet, then retry once
          if (resScraped.statusCode === 404) {
            console.log(`[Local Scraper] Profile not on Urlebird — triggering indexer for: ${username}`);
            await scrapePage(`https://urlebird.com/search/?q=${encodeURIComponent(username)}`);
            await new Promise(r => setTimeout(r, 2000));
            resScraped = await scrapePage(targetUrl);
          }

          if (resScraped.statusCode === 200) {
            const html = resScraped.body;
            const match = html.match(/urlebird\.com\/video\/(?:[^\/]+-)?(\d+)/);
            if (match && match[1]) {
              recordSuccess(key);
              res.statusCode = 200;
              return res.end(JSON.stringify({
                success: true,
                id: match[1],
                url: `https://www.tiktok.com/@${username.replace('@', '')}/video/${match[1]}`
              }));
            }
            throw new Error(`No videos found on Urlebird for ${username}`);
          }
          throw new Error(`Urlebird returned status ${resScraped.statusCode}`);
        } catch (error) {
          const state = recordFailure(key);
          const retrySecs = Math.round(getCooldownMs(state.count) / 1000);
          res.statusCode = 500;
          res.setHeader('Retry-After', String(retrySecs));
          return res.end(JSON.stringify({
            error: error.message,
            retryAfterSeconds: retrySecs
          }));
        }
      }
    }

    // ── Reset a specific circuit breaker manually (admin use) ─────────────
    if (parsedUrl.pathname === '/reset-circuit') {
      const key = parsedUrl.searchParams.get('key');
      const secret = parsedUrl.searchParams.get('secret');
      if (secret !== API_SECRET) { res.statusCode = 401; return res.end(JSON.stringify({ error: "Unauthorized" })); }
      if (key && failureMap.has(key)) {
        failureMap.delete(key);
        return res.end(JSON.stringify({ ok: true, message: `Circuit breaker reset for ${key}` }));
      }
      return res.end(JSON.stringify({ ok: false, message: "Key not found" }));
    }

    res.statusCode = 404;
    return res.end(JSON.stringify({ error: "Not found" }));

  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`YoYoSMM Local Scraper running on http://127.0.0.1:${PORT}`);
  console.log(`Circuit breaker: opens after ${OPEN_CIRCUIT_AFTER} failures, max cooldown ${MAX_COOLDOWN_MS/60000}min`);
});
