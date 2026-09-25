module.exports = {
  apps: [{
    name: "yoyo-scraper",
    script: "server.js",
    cwd: "/var/www/yoyosmm/scraper_hf",
    max_memory_restart: "400M",   // restart if memory leaks > 400MB
    kill_timeout: 15000,           // give 15s for graceful shutdown (browser cleanup)
    min_uptime: "5s",              // must stay alive 5s to count as stable
    max_restarts: 10,              // max restarts in restart_delay window
    restart_delay: 5000,           // wait 5s between restarts to prevent loops
    autorestart: true,
    watch: false,
  }]
};
