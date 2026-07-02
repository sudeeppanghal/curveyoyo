import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { prisma } from "@/lib/prisma";
import MaintenanceGate from "./MaintenanceGate";
import ReferralTracker from "@/components/ReferralTracker";
import "./global.css";

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      </head>
      <body style={{ margin:0, padding:0, minHeight:"100vh", background:"#eef2f7", color:"#2d3748", fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif", WebkitFontSmoothing:"antialiased" }}>
        <MaintenanceGate initialMaintenance={isMaintenance} supportEmail={supportEmail}>
          <ReferralTracker />
          {children}
        </MaintenanceGate>
      </body>
    </html>
  );
}
