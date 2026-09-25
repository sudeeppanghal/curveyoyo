const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
  console.log("Launching Puppeteer with mobile emulation for Urlebird...");
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });

    const page = await browser.newPage();
    
    // Set mobile viewport and user-agent
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

    const url = "https://urlebird.com/user/pixelbyarpita/";
    console.log(`Navigating to Urlebird: ${url}`);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Delay 5 seconds for Cloudflare challenge check
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    const content = await page.content();
    const title = await page.title();
    console.log(`Title: ${title}`);
    console.log(`HTML Length: ${content.length}`);
    
    if (content.includes("cf-challenge") || content.includes("captcha") || title.includes("Just a moment")) {
      console.log("Blocked by Cloudflare!");
    } else {
      // Find all video links
      const videoLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        return links
          .map(l => l.href)
          .filter(href => href && href.includes('/video/'));
      });
      
      console.log(`Found ${videoLinks.length} video links:`);
      videoLinks.slice(0, 5).forEach((link, idx) => {
        console.log(`- Link ${idx + 1}: ${link}`);
      });
    }

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    if (browser) await browser.close();
  }
}

run();
