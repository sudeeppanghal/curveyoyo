const http = require('http');

const SECRET = process.env.CRON_SECRET || process.env.ADMIN_SECRET || 'yoyosmm_admin_sec_9e3a1f8b4d0c7e2d5a6c8e9b';
const CRON_URL = `http://127.0.0.1:3000/api/cron?secret=${SECRET}`;

let isRunning = false;

function triggerCron() {
  if (isRunning) {
    console.log(`[${new Date().toISOString()}] ⏳ Previous cron tick still in progress, skipping overlap...`);
    return;
  }

  isRunning = true;
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] ⏱️ Executing scheduled delivery cron tick...`);

  const req = http.get(CRON_URL, {
    headers: {
      'x-admin-secret': SECRET,
      'User-Agent': 'YoYoSMM-CronDaemon/1.0'
    },
    timeout: 120000 // 2-minute safety window for upstream SMM API responses
  }, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      isRunning = false;
      const durationMs = Date.now() - startTime;
      
      let processedCount = 0;
      try {
        const parsed = JSON.parse(data);
        processedCount = parsed.processed || 0;
      } catch {}

      if (res.statusCode === 200) {
        console.log(`[${new Date().toISOString()}] ✅ Cron Success (${res.statusCode}) in ${durationMs}ms: ${data.substring(0, 200)}`);
        
        // If there were batches processed, schedule next tick rapidly (3s) to drain any backlog!
        if (processedCount > 0) {
          setTimeout(triggerCron, 3000);
          return;
        }
      } else {
        console.error(`[${new Date().toISOString()}] ⚠️ Cron HTTP Warning (${res.statusCode}): ${data.substring(0, 200)}`);
      }

      // When queue is clear, check every 20 seconds
      setTimeout(triggerCron, 20000);
    });
  });

  req.on('error', (err) => {
    isRunning = false;
    console.error(`[${new Date().toISOString()}] ❌ Cron Connection Error: ${err.message}`);
    setTimeout(triggerCron, 10000);
  });

  req.on('timeout', () => {
    isRunning = false;
    req.destroy();
    console.error(`[${new Date().toISOString()}] ⏱️ Cron Request Timed Out (120s)`);
    setTimeout(triggerCron, 10000);
  });
}

// Initial trigger on startup
triggerCron();

