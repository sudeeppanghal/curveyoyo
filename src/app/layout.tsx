import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { prisma } from "@/lib/prisma";
import MaintenanceGate from "./MaintenanceGate";
import ReferralTracker from "@/components/ReferralTracker";
import MobileNav from "@/components/MobileNav";
import "./global.css";
import "./mobile-fix.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const dynamic = "force-dynamic";

// ── Admin-settings cache ────────────────────────────────────────────────────
// Avoids a cold Prisma round-trip on every page load.
// Settings are re-fetched at most once every 30 seconds per process.
interface CachedSettings { isMaintenance: boolean; supportEmail: string | null; }
let _settingsCache: CachedSettings | null = null;
let _settingsCacheExpiry = 0;
const SETTINGS_TTL = 30_000; // 30 seconds

async function getAdminSettings(): Promise<CachedSettings> {
  const now = Date.now();
  if (_settingsCache && now < _settingsCacheExpiry) return _settingsCache;
  try {
    const row = await prisma.adminSettings.findUnique({ where: { id: "global" } });
    _settingsCache = {
      isMaintenance: row?.maintenanceMode ?? false,
      supportEmail:  row?.supportEmail  ?? null,
    };
    _settingsCacheExpiry = now + SETTINGS_TTL;
  } catch (e) {
    console.error("Failed to load admin settings in RootLayout:", e);
    // Keep serving last-known settings rather than crashing
    _settingsCache ??= { isMaintenance: false, supportEmail: null };
  }
  return _settingsCache!;
}
// ───────────────────────────────────────────────────────────────────────────

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "YoyoSMM | World's Best & Cheapest Organic SMM Panel",
  description:
    "YoyoSMM is the cheapest fully automated SMM panel with built-in organic timing schedules. Grow naturally across Instagram, TikTok, and Facebook with human-like pacing curves.",
  keywords: [
    "SMM panel", "cheapest SMM panel", "best SMM panel", "organic SMM panel",
    "organic delivery", "Instagram views", "TikTok views", "Facebook views",
    "SMM automation", "organic pacing", "yoyosmm", "reseller SMM panel"
  ],
  authors: [{ name: "YoyoSMM" }],
  metadataBase: new URL("https://www.yoyosmm.online"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "YoyoSMM | World's Best & Cheapest Organic SMM Panel",
    description: "Cheapest fully automated SMM panel with built-in organic pacing curves.",
    url: "https://www.yoyosmm.online",
    siteName: "YoyoSMM",
    locale: "en_US",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "YoyoSMM - Organic Pacing SMM Panel" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "YoyoSMM | World's Best & Cheapest Organic SMM Panel",
    description: "Cheapest fully automated SMM panel with built-in organic pacing curves.",
    creator: "@YoyoSMM",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  verification: {
    google: "your-google-verification-code",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isMaintenance, supportEmail } = await getAdminSettings();

  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#eef2f7" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                'use strict';
                var MAX_RELOADS = 5;
                var RESET_WINDOW = 120000; // 2 minutes
                var COUNT_KEY = 'yoyo_chunk_reload_count';
                var TS_KEY    = 'yoyo_chunk_reload_ts';

                function canReload() {
                  try {
                    var now   = Date.now();
                    var ts    = parseInt(sessionStorage.getItem(TS_KEY)    || '0', 10);
                    var count = parseInt(sessionStorage.getItem(COUNT_KEY) || '0', 10);
                    if (now - ts > RESET_WINDOW) count = 0;
                    return count < MAX_RELOADS;
                  } catch (e) { return true; }
                }

                function doReload(reason) {
                  if (!canReload()) return;
                  try {
                    var now  = Date.now();
                    var ts   = parseInt(sessionStorage.getItem(TS_KEY)    || '0', 10);
                    var cnt  = parseInt(sessionStorage.getItem(COUNT_KEY) || '0', 10);
                    if (now - ts > RESET_WINDOW) cnt = 0;
                    sessionStorage.setItem(COUNT_KEY, String(cnt + 1));
                    sessionStorage.setItem(TS_KEY,    String(now));
                    console.warn('[ChunkGuard] Auto-reload triggered: ' + reason);
                  } catch (e) {}
                  var base = window.location.pathname + window.location.search;
                  var sep  = base.indexOf('?') !== -1 ? '&' : '?';
                  window.location.href = base + sep + '_cb=' + Date.now() + window.location.hash;
                }

                function isChunkUrl(url) {
                  return url && (
                    url.indexOf('/_next/static/chunks/') !== -1 ||
                    url.indexOf('/_next/static/css/')    !== -1 ||
                    url.indexOf('/_next/static/media/')  !== -1
                  );
                }

                function isChunkMsg(msg) {
                  var m = (msg || '').toLowerCase();
                  return (
                    m.indexOf('failed to load chunk') !== -1 ||
                    m.indexOf('loading chunk')        !== -1 ||
                    m.indexOf('load chunk')           !== -1 ||
                    m.indexOf('chunkloaderror')       !== -1 ||
                    m.indexOf('cannot find module')   !== -1
                  );
                }

                // 1. Intercept script/link tag load failures (captures 404 on chunk files)
                window.addEventListener('error', function (e) {
                  var t = e.target;
                  if (t && (t.tagName === 'SCRIPT' || t.tagName === 'LINK')) {
                    var url = t.src || t.href || '';
                    if (isChunkUrl(url)) {
                      doReload('resource 404: ' + url);
                      return;
                    }
                  }
                  if (isChunkMsg(e.message)) {
                    doReload('error event: ' + e.message);
                  }
                }, true);

                // 2. Intercept unhandled promise rejections (Next.js dynamic import failures)
                window.addEventListener('unhandledrejection', function (e) {
                  var reason = e.reason || {};
                  var msg    = reason.message || (typeof reason === 'string' ? reason : '') || '';
                  var name   = reason.name   || '';
                  if (name.toLowerCase() === 'chunkloaderror' || isChunkMsg(msg)) {
                    doReload('unhandledrejection: ' + msg);
                  }
                });

                // 3. Monkey-patch fetch to detect 404s on chunk files
                var _origFetch = window.fetch;
                window.fetch = function (input, init) {
                  var url = typeof input === 'string' ? input : (input && input.url) || '';
                  return _origFetch.apply(this, arguments).then(function (res) {
                    if (!res.ok && isChunkUrl(url)) {
                      doReload('fetch 404 on chunk: ' + url);
                    }
                    return res;
                  }).catch(function (err) {
                    if (isChunkUrl(url)) {
                      doReload('fetch error on chunk: ' + url);
                    }
                    throw err;
                  });
                };
              })();
            `
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "YoyoSMM",
              "url": "https://www.yoyosmm.online",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://www.yoyosmm.online/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@context": "https://schema.org",
                  "@type": "SiteNavigationElement",
                  "@id": "#navigation",
                  "name": "Sign Up",
                  "url": "https://www.yoyosmm.online/signup"
                },
                {
                  "@context": "https://schema.org",
                  "@type": "SiteNavigationElement",
                  "@id": "#navigation",
                  "name": "Blogs",
                  "url": "https://www.yoyosmm.online/blog"
                },
                {
                  "@context": "https://schema.org",
                  "@type": "SiteNavigationElement",
                  "@id": "#navigation",
                  "name": "About Us",
                  "url": "https://www.yoyosmm.online/about"
                },
                {
                  "@context": "https://schema.org",
                  "@type": "SiteNavigationElement",
                  "@id": "#navigation",
                  "name": "FAQ",
                  "url": "https://www.yoyosmm.online/faq"
                }
              ]
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": "https://www.yoyosmm.online/#organization",
              "name": "YoyoSMM",
              "url": "https://www.yoyosmm.online",
              "logo": "https://www.yoyosmm.online/logo.png",
              "sameAs": [
                "https://t.me/TheQuantumLabs"
              ]
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "@id": "https://www.yoyosmm.online/#software",
              "name": "YoyoSMM Pacing Engine",
              "operatingSystem": "All",
              "applicationCategory": "BusinessApplication",
              "offers": {
                "@type": "Offer",
                "price": "0.00",
                "priceCurrency": "INR"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "reviewCount": "142"
              }
            })
          }}
        />
      </head>
      <body style={{ margin:0, padding:0, minHeight:"100vh", fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif", WebkitFontSmoothing:"antialiased" }}>
        <ThemeProvider />
        <MaintenanceGate initialMaintenance={isMaintenance} supportEmail={supportEmail}>
          <ReferralTracker />
          <MobileNav />
          {children}
        </MaintenanceGate>
      </body>
    </html>
  );
}
