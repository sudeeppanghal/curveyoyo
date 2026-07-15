const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const https = require('https');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = 7860;
const API_SECRET = "yoyosmm_scraper_secret_xyz123";

app.get('/', (req, res) => {
  res.send("Stealth Scraper Service is Healthy & Online!");
});

// Helper function to fetch elite HTTP proxies from GeoNode
function getEliteProxies() {
  return new Promise((resolve) => {
    const url = 'https://proxylist.geonode.com/api/proxy-list?limit=15&page=1&sort_by=latency&sort_type=asc&protocols=http&anonymityLevel=elite';
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.data || []);
        } catch (e) {
          console.error("Failed to parse proxy JSON:", e.message);
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.error("Failed to fetch proxies:", err.message);
      resolve([]);
    });
  });
}

app.get('/scrape', async (req, res) => {
  const { username, platform, secret } = req.query;

  if (secret !== API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!username || !platform) {
    return res.status(400).json({ error: "Username and platform required" });
  }

  console.log(`Scraping ${platform} profile: ${username}`);

  if (platform.toLowerCase() === 'instagram') {
    let proxies = [];
    try {
      proxies = await getEliteProxies();
      console.log(`Retrieved ${proxies.length} elite proxies for Instagram rotation.`);
    } catch (e) {
      console.error("Error fetching proxies:", e.message);
    }

    // Attempt direct load first as a backup, then rotate through top 5 elite proxies
    const proxyList = [null].concat(proxies.slice(0, 5));
    let lastError = null;

    for (let i = 0; i < proxyList.length; i++) {
      const proxy = proxyList[i];
      const proxyUrl = proxy ? `http://${proxy.ip}:${proxy.port}` : null;
      console.log(`Instagram Scrape Attempt ${i + 1}/${proxyList.length} using Proxy: ${proxyUrl || 'Direct Connection'}`);

      let browser;
      let page;
      try {
        const launchArgs = [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ];
        if (proxyUrl) {
          launchArgs.push(`--proxy-server=${proxyUrl}`);
        }

        browser = await puppeteer.launch({
          headless: true,
          args: launchArgs,
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
        });

        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
        });

        // Optimize load times by blocking media/stylesheets
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          const type = req.resourceType();
          if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
            req.abort();
          } else {
            req.continue();
          }
        });

        const targetUrl = `https://www.instagram.com/${username}/`;
        // Reduce navigation timeout since we rotate proxies
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

        // Wait for post links
        await page.waitForSelector('a[href*="/p/"]', { timeout: 8000 });

        const latestPost = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a'));
          const postLink = links.find(l => {
            const href = l.getAttribute('href') || '';
            return href.includes('/p/');
          });
          if (postLink) {
            const href = postLink.getAttribute('href');
            const id = href.split('/p/')[1].replace(/\//g, '');
            return {
              id: id,
              url: `https://www.instagram.com/p/${id}/`
            };
          }
          return null;
        });

        if (!latestPost) throw new Error("No Instagram posts found in DOM");

        console.log(`Instagram scrape successful on attempt ${i + 1}!`);
        return res.json({ success: true, ...latestPost });

      } catch (error) {
        console.warn(`Instagram attempt ${i + 1} failed:`, error.message);
        lastError = error;
      } finally {
        if (browser) await browser.close();
      }
    }

    // If all attempts failed
    return res.status(500).json({
      error: `Instagram scraping failed after all rotation attempts. Last error: ${lastError ? lastError.message : 'Unknown'}`
    });
  } 
  
  else if (platform.toLowerCase() === 'tiktok') {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
      });

      const targetUrl = `https://urlebird.com/user/${username}/`;
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      
      await page.waitForSelector('a[href*="/video/"]', { timeout: 12000 });

      const latestPost = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const postLink = links.find(l => l.href && l.href.includes('/video/'));
        if (postLink) {
          const href = postLink.getAttribute('href');
          const match = href.match(/\/video\/(?:[^\/]+-)?(\d+)/);
          if (match) {
            const id = match[1];
            return {
              id: id
            };
          }
        }
        return null;
      });

      if (!latestPost) throw new Error("No TikTok videos found via Urlebird");
      return res.json({ 
        success: true, 
        id: latestPost.id,
        url: `https://www.tiktok.com/@${username}/video/${latestPost.id}`
      });
    } catch (error) {
      console.error("TikTok scraping error:", error);
      return res.status(500).json({ error: error.message });
    } finally {
      if (browser) await browser.close();
    }
  }

  res.status(400).json({ error: "Unsupported platform" });
});

app.listen(PORT, () => {
  console.log(`Stealth Scraper running on port ${PORT}`);
});
