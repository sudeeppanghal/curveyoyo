const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const https = require('https');
const { execSync } = require('child_process');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = 7860;
const API_SECRET = "yoyosmm_scraper_secret_xyz123";

// ─── Browser tracking & concurrency control ───────────────────────────────
const activeBrowsers = new Set();
const MAX_CONCURRENT = 2; // never spawn more than 2 browsers at once
let activeRequests = 0;

// ─── Circuit breaker per platform ─────────────────────────────────────────
// If a platform fails too many times in a row, pause it for a cooldown period
const circuitBreaker = {
  instagram: { failures: 0, pausedUntil: null, threshold: 4, cooldownMs: 15 * 60 * 1000 },
  tiktok:    { failures: 0, pausedUntil: null, threshold: 5, cooldownMs: 10 * 60 * 1000 },
};

function isCircuitOpen(platform) {
  const cb = circuitBreaker[platform];
  if (!cb) return false;
  if (cb.pausedUntil && Date.now() < cb.pausedUntil) {
    const remainMins = Math.ceil((cb.pausedUntil - Date.now()) / 60000);
    return `Circuit open — ${platform} is blocked/paused. Retry in ${remainMins} min.`;
  }
  if (cb.pausedUntil && Date.now() >= cb.pausedUntil) {
    // Cooldown expired — reset
    cb.failures = 0;
    cb.pausedUntil = null;
    console.log(`[CircuitBreaker] ${platform} circuit RESET after cooldown`);
  }
  return false;
}

function recordSuccess(platform) {
  const cb = circuitBreaker[platform];
  if (cb) { cb.failures = 0; cb.pausedUntil = null; }
}

function recordFailure(platform) {
  const cb = circuitBreaker[platform];
  if (!cb) return;
  cb.failures++;
  console.warn(`[CircuitBreaker] ${platform} failure ${cb.failures}/${cb.threshold}`);
  if (cb.failures >= cb.threshold && !cb.pausedUntil) {
    cb.pausedUntil = Date.now() + cb.cooldownMs;
    const cooldownMins = cb.cooldownMs / 60000;
    console.error(`[CircuitBreaker] ${platform} circuit OPENED — cooling down for ${cooldownMins} min (too many failures)`);
  }
}

// ─── Browser helpers ───────────────────────────────────────────────────────
async function closeBrowser(browser) {
  if (!browser) return;
  try {
    activeBrowsers.delete(browser);
    await browser.close();
  } catch (e) {
    try {
      const pid = browser.process()?.pid;
      if (pid) { try { process.kill(pid, 'SIGKILL'); } catch (_) {} }
    } catch (_) {}
  }
}

async function launchBrowser(args = []) {
  const defaultArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-web-security',
    '--disable-gpu',
    '--single-process',
    '--no-zygote',
  ];
  const browser = await puppeteer.launch({
    headless: true,
    args: [...defaultArgs, ...args],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    timeout: 30000,
  });
  activeBrowsers.add(browser);
  return browser;
}

// ─── Graceful shutdown ─────────────────────────────────────────────────────
async function gracefulShutdown(signal) {
  console.log(`[Scraper] ${signal} received — closing ${activeBrowsers.size} browser(s)...`);
  await Promise.allSettled(Array.from(activeBrowsers).map(b => closeBrowser(b)));
  try { execSync('pkill -9 -f chrome 2>/dev/null; pkill -9 -f chromium 2>/dev/null', { stdio: 'ignore' }); } catch (_) {}
  console.log('[Scraper] Clean shutdown complete.');
  process.exit(0);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', async (err) => {
  console.error('[Scraper] Uncaught exception:', err.message);
  await gracefulShutdown('uncaughtException');
});

// ─── Zombie killer: runs every 3 minutes when idle ────────────────────────
setInterval(() => {
  if (activeBrowsers.size === 0 && activeRequests === 0) {
    try { execSync('pkill -9 -f chrome 2>/dev/null; pkill -9 -f chromium 2>/dev/null', { stdio: 'ignore' }); } catch (_) {}
  }
  console.log(`[Scraper] Health: browsers=${activeBrowsers.size} requests=${activeRequests} | Circuit: ig=${circuitBreaker.instagram.failures}/${circuitBreaker.instagram.threshold}(paused=${!!circuitBreaker.instagram.pausedUntil}) tt=${circuitBreaker.tiktok.failures}/${circuitBreaker.tiktok.threshold}(paused=${!!circuitBreaker.tiktok.pausedUntil})`);
}, 3 * 60 * 1000);

// ─── Proxy fetcher ─────────────────────────────────────────────────────────
function getEliteProxies() {
  return new Promise((resolve) => {
    const url = 'https://proxylist.geonode.com/api/proxy-list?limit=10&page=1&sort_by=latency&sort_type=asc&protocols=http&anonymityLevel=elite';
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data).data || []); }
        catch (e) { resolve([]); }
      });
    }).on('error', () => resolve([]));
  });
}

// ─── Routes ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    activeBrowsers: activeBrowsers.size,
    activeRequests,
    circuitBreaker: {
      instagram: {
        failures: circuitBreaker.instagram.failures,
        paused: !!circuitBreaker.instagram.pausedUntil,
        resumesIn: circuitBreaker.instagram.pausedUntil
          ? `${Math.ceil((circuitBreaker.instagram.pausedUntil - Date.now()) / 60000)}min`
          : null,
      },
      tiktok: {
        failures: circuitBreaker.tiktok.failures,
        paused: !!circuitBreaker.tiktok.pausedUntil,
        resumesIn: circuitBreaker.tiktok.pausedUntil
          ? `${Math.ceil((circuitBreaker.tiktok.pausedUntil - Date.now()) / 60000)}min`
          : null,
      },
    },
  });
});

app.get('/scrape', async (req, res) => {
  const { username, platform, secret } = req.query;

  if (secret !== API_SECRET) return res.status(401).json({ error: "Unauthorized" });
  if (!username || !platform) return res.status(400).json({ error: "Username and platform required" });

  const platformKey = platform.toLowerCase();

  // Check circuit breaker
  const circuitMsg = isCircuitOpen(platformKey);
  if (circuitMsg) {
    console.warn(`[Scraper] Circuit open for ${platformKey}: ${circuitMsg}`);
    return res.status(503).json({ error: circuitMsg });
  }

  // Concurrency gate
  if (activeBrowsers.size >= MAX_CONCURRENT) {
    return res.status(429).json({ error: `Too many concurrent scrapes (max ${MAX_CONCURRENT}). Try again shortly.` });
  }

  activeRequests++;
  console.log(`[Scraper] START ${platformKey}/${username} | browsers=${activeBrowsers.size} requests=${activeRequests}`);

  try {
    if (platformKey === 'instagram') {
      return await scrapeInstagram(username, res);
    } else if (platformKey === 'tiktok') {
      return await scrapeTikTok(username, res);
    } else {
      return res.status(400).json({ error: "Unsupported platform" });
    }
  } finally {
    activeRequests--;
    console.log(`[Scraper] END ${platformKey}/${username} | browsers=${activeBrowsers.size} requests=${activeRequests}`);
  }
});

// ─── Instagram scraper ─────────────────────────────────────────────────────
async function scrapeInstagram(username, res) {
  let proxies = [];
  try { proxies = await getEliteProxies(); } catch (_) {}

  const proxyList = [null, ...proxies.slice(0, 2)]; // direct + max 2 proxies
  let lastError = null;

  for (let i = 0; i < proxyList.length; i++) {
    const proxyUrl = proxyList[i] ? `http://${proxyList[i].ip}:${proxyList[i].port}` : null;
    console.log(`[Instagram] Attempt ${i + 1}/${proxyList.length} via ${proxyUrl || 'direct'}`);

    let browser;
    try {
      browser = await launchBrowser(proxyUrl ? [`--proxy-server=${proxyUrl}`] : []);
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
      await page.setRequestInterception(true);
      page.on('request', r => ['image', 'stylesheet', 'font', 'media'].includes(r.resourceType()) ? r.abort() : r.continue());

      await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForSelector('a[href*="/p/"]', { timeout: 6000 });

      const latestPost = await page.evaluate(() => {
        const link = Array.from(document.querySelectorAll('a')).find(l => (l.getAttribute('href') || '').includes('/p/'));
        if (link) {
          const href = link.getAttribute('href');
          const id = href.split('/p/')[1].replace(/\//g, '');
          return { id, url: `https://www.instagram.com/p/${id}/` };
        }
        return null;
      });

      if (!latestPost) throw new Error("No Instagram posts found in DOM");

      console.log(`[Instagram] ✅ Success on attempt ${i + 1}`);
      recordSuccess('instagram');
      return res.json({ success: true, ...latestPost });

    } catch (error) {
      console.warn(`[Instagram] Attempt ${i + 1} failed: ${error.message}`);
      lastError = error;
    } finally {
      await closeBrowser(browser);
    }
  }

  recordFailure('instagram');
  return res.status(500).json({ error: `Instagram failed after ${proxyList.length} attempts. Last: ${lastError?.message}` });
}

// ─── TikTok scraper ────────────────────────────────────────────────────────
async function scrapeTikTok(username, res) {
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    // Trigger Urlebird indexing
    try {
      await page.goto(`https://urlebird.com/search/?q=${encodeURIComponent(username)}`, { waitUntil: 'domcontentloaded', timeout: 12000 });
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.warn(`[TikTok] Search trigger failed: ${e.message}`);
    }

    // Profile page
    await page.goto(`https://urlebird.com/user/${username}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('a[href*="/video/"]', { timeout: 10000 });

    const latestPost = await page.evaluate(() => {
      const link = Array.from(document.querySelectorAll('a')).find(l => l.href && l.href.includes('/video/'));
      if (link) {
        const match = link.getAttribute('href').match(/\/video\/(?:[^\/]+-)?(\d+)/);
        if (match) return { id: match[1] };
      }
      return null;
    });

    if (!latestPost) throw new Error("No TikTok videos found via Urlebird");

    console.log(`[TikTok] ✅ Success: video ${latestPost.id}`);
    recordSuccess('tiktok');
    return res.json({
      success: true,
      id: latestPost.id,
      url: `https://www.tiktok.com/@${username}/video/${latestPost.id}`
    });

  } catch (error) {
    console.error(`[TikTok] ❌ Error: ${error.message}`);
    recordFailure('tiktok');
    return res.status(500).json({ error: error.message });
  } finally {
    await closeBrowser(browser);
  }
}

// ─── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Scraper] Stealth Scraper Service listening on port ${PORT}`);
  console.log(`[Scraper] Max concurrent browsers: ${MAX_CONCURRENT}`);
  console.log(`[Scraper] Circuit breaker: instagram=${circuitBreaker.instagram.threshold} failures → ${circuitBreaker.instagram.cooldownMs/60000}min cooldown | tiktok=${circuitBreaker.tiktok.threshold} failures → ${circuitBreaker.tiktok.cooldownMs/60000}min cooldown`);
});
