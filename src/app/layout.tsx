import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./global.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "YoyoSMM — Organic Delivery Engine for SMM Panels",
  description:
    "Connect any SMM panel API. Organic growth with human-like timing across Instagram, YouTube, TikTok. Multi-panel failover, peak-hour scheduling, 1-day free trial.",
  keywords: [
    "SMM panel", "organic delivery", "Instagram views", "TikTok views",
    "YouTube views", "SMM automation", "panel failover", "yoyosmm"
  ],
  authors: [{ name: "YoyoSMM" }],
  metadataBase: new URL("https://www.yoyosmm.online"),
  openGraph: {
    title: "YoyoSMM — Organic Delivery Engine for SMM Panels",
    description: "Connect any SMM panel API. Organic growth with human-like timing.",
    url: "https://www.yoyosmm.online",
    siteName: "YoyoSMM",
    locale: "en_US",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "YoyoSMM - Organic Delivery Engine" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "YoyoSMM — Organic Delivery Engine for SMM Panels",
    description: "Connect any SMM panel API. Organic growth with human-like timing.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      </head>
      <body style={{ margin:0, padding:0, minHeight:"100vh", background:"#eef2f7", color:"#2d3748", fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif", WebkitFontSmoothing:"antialiased" }}>
        {children}
      </body>
    </html>
  );
}
