const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1');
    
    console.log("Loading urlebird search/indexing page first...");
    await page.goto('https://urlebird.com/search/?q=pixelbyarpita', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(resolve => setTimeout(resolve, 4000));

    console.log("Loading urlebird user page...");
    await page.goto('https://urlebird.com/user/pixelbyarpita/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    
    // Wait for videos
    await page.waitForSelector('a[href*="/video/"]', { timeout: 10000 });

    const videos = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .filter(a => a.href && a.href.includes('/video/'))
        .map(a => {
          const href = a.getAttribute('href');
          return {
            href: href,
            html: a.innerHTML.substring(0, 100)
          };
        });
    });
    
    console.log(`Found ${videos.length} videos on Urlebird:`);
    console.log(JSON.stringify(videos, null, 2));
    
  } catch (err) {
    console.error("Urlebird fetch failed:", err.message);
  } finally {
    await browser.close();
  }
}

run();
