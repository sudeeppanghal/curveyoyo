import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.yoyosmm.online";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/features/organic-delivery-engine`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/features/multi-panel-failover`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/use-cases/agencies`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/use-cases/instagram-clippers`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];
}
