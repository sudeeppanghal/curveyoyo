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
    
    console.log("Navigating to TikTok profile directly...");
    await page.goto('https://www.tiktok.com/@pixelbyarpita', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Print title
    const title = await page.title();
    console.log(`Page Title: ${title}`);
    
    // Evaluate page content to find video links
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => a.href)
        .filter(href => href && href.includes('/video/'));
    });
    
    console.log(`Found ${links.length} video links:`);
    console.log(links.slice(0, 5));
    
  } catch (err) {
    console.error("Direct TikTok scrape failed:", err.message);
  } finally {
    await browser.close();
  }
}

run();
