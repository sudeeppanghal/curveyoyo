import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { NOT_GHOST_USER } from "@/lib/ghost";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://www.yoyosmm.online";
  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/features/organic-delivery-engine`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  let blogUrls: MetadataRoute.Sitemap = [];
  try {
    const blogs = await prisma.blog.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    });
    blogUrls = blogs.map((b) => ({
      url: `${base}/blog/${b.slug}`,
      lastModified: b.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch (err) {
    console.error("[Sitemap] Failed to fetch blogs:", err);
  }

  let verifyUrls: MetadataRoute.Sitemap = [];
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: "COMPLETED",
        user: NOT_GHOST_USER,
      },
      select: { id: true, updatedAt: true },
      take: 1000,
    });
    verifyUrls = orders.map((o) => ({
      url: `${base}/verify/${o.id}`,
      lastModified: o.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));
  } catch (err) {
    console.error("[Sitemap] Failed to fetch verify reports:", err);
  }

  return [...staticUrls, ...blogUrls, ...verifyUrls];
}
