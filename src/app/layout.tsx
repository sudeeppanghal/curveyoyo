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

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "YoyoSMM — Organic Pacing SMM Panel",
  description:
    "Premium SMM panel with built-in organic timing schedules. Grow naturally across Instagram, TikTok, and Facebook with human-like pacing curves.",
  keywords: [
    "SMM panel", "organic delivery", "Instagram views", "TikTok views",
    "Facebook views", "SMM automation", "organic pacing", "yoyosmm"
  ],
  authors: [{ name: "YoyoSMM" }],
  metadataBase: new URL("https://www.yoyosmm.online"),
  openGraph: {
    title: "YoyoSMM — Organic Pacing SMM Panel",
    description: "Premium SMM panel with built-in organic timing schedules.",
    url: "https://www.yoyosmm.online",
    siteName: "YoyoSMM",
    locale: "en_US",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "YoyoSMM - Organic Pacing SMM Panel" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "YoyoSMM — Organic Pacing SMM Panel",
    description: "Premium SMM panel with built-in organic timing schedules.",
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
  let isMaintenance = false;
  let supportEmail: string | null = null;
  try {
    const settings = await prisma.adminSettings.findUnique({ where: { id: "global" } });
    if (settings) {
      isMaintenance = settings.maintenanceMode;
      supportEmail = settings.supportEmail;
    }
  } catch (e) {
    console.error("Failed to load global maintenanceMode setting in RootLayout:", e);
  }

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
              (function() {
                var chunkLoadErrorPattern = /failed to load chunk|loading chunk/i;
                function checkAndReload(errorMsg, url) {
                  if (chunkLoadErrorPattern.test(errorMsg) || (url && url.indexOf('/_next/static/chunks/') !== -1)) {
                    console.warn("Chunk load error detected: " + errorMsg + ". Force reloading page...");
                    var lastReload = sessionStorage.getItem('last_chunk_reload');
                    var now = Date.now();
                    if (!lastReload || (now - parseInt(lastReload)) > 10000) {
                      sessionStorage.setItem('last_chunk_reload', now.toString());
                      window.location.reload();
                    }
                  }
                }
                window.addEventListener('error', function(e) {
                  var target = e.target;
                  if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
                    var url = target.src || target.href || '';
                    if (url && url.indexOf('/_next/static/') !== -1) {
                      checkAndReload("Resource load failed: " + url, url);
                    }
                  }
                  var message = e.message || '';
                  var url = e.filename || '';
                  checkAndReload(message, url);
                }, true);
                window.addEventListener('unhandledrejection', function(e) {
                  var reason = e.reason || {};
                  var message = reason.message || (typeof reason === 'string' ? reason : '') || '';
                  checkAndReload(message, '');
                });
              })();
            `
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
