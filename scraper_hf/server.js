const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = 7860;
const API_SECRET = "yoyosmm_scraper_secret_xyz123";

app.get('/', (req, res) => {
  res.send("Stealth Scraper Service is Healthy & Online!");
});

app.get('/scrape', async (req, res) => {
  const { username, platform, secret } = req.query;

  if (secret !== API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!username || !platform) {
    return res.status(400).json({ error: "Username and platform required" });
  }

  console.log(`Scraping ${platform} profile: ${username}`);
  let browser;
  let page;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--blink-features=AutomationControlled'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
    });

    page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

    // OPTIMIZATION: Block heavy assets (images, stylesheets, fonts, media) to load pages 5x faster
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    if (platform.toLowerCase() === 'instagram') {
      // Scrape official Instagram page directly
      const targetUrl = `https://www.instagram.com/${username}/`;
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      
      // Wait for posts link (instagram uses /p/[post_id] format)
      await page.waitForSelector('a[href*="/p/"]', { timeout: 15000 });

      const latestPost = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const postLink = links.find(l => {
          const href = l.getAttribute('href') || '';
          return href.startsWith('/p/');
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

      if (!latestPost) throw new Error("No Instagram posts found via official site");
      return res.json({ success: true, ...latestPost });
    } 
    
    else if (platform.toLowerCase() === 'tiktok') {
      const targetUrl = `https://urlebird.com/user/${username}/`;
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      
      await page.waitForSelector('a[href*="/video/"]', { timeout: 15000 });

      const latestPost = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const postLink = links.find(l => l.href && l.href.includes('/video/'));
        if (postLink) {
          const href = postLink.getAttribute('href');
          const match = href.match(/\/video\/(?:[^\/]+-)?(\d+)/);
          if (match) {
            const id = match[1];
            return {
              id: id,
              url: `https://www.tiktok.com/@placeholder/video/${id}`
            };
          }
        }
        return null;
      });

      if (!latestPost) throw new Error("No TikTok videos found via Urlebird");
      return res.json({ success: true, ...latestPost });
    }

    res.status(400).json({ error: "Unsupported platform" });
  } catch (error) {
    console.error("Scraping error:", error);
    
    let pageTitle = "Unknown";
    let bodyExcerpt = "No page loaded";
    try {
      if (page) {
        pageTitle = await page.title();
        bodyExcerpt = await page.evaluate(() => document.body.innerText.substring(0, 1000));
      }
    } catch (e) {
      console.error("Failed to gather page debug info:", e);
    }

    res.status(500).json({ 
      error: error.message, 
      pageTitle,
      bodyExcerpt
    });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Stealth Scraper running on port ${PORT}`);
});
