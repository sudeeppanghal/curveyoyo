import Link from "next/link";
import type { Metadata } from "next";
import { PublicNav, PublicFooter } from "../PublicHeaderFooter";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Blog — YoyoSMM",
  description: "SMM operator tips, organic delivery strategies, and panel management guides.",
};

const N = {
  bg:       "#eef2f7",
  raised:   "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm: "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  inset:    "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
  accent:   "#d97706",
  accentBg: "linear-gradient(135deg, #d97706, #ea580c)",
  text:     "#2d3748",
  muted:    "#718096",
  border:   "rgba(200, 208, 231, 0.4)",
};

export default async function BlogPage() {
  const blogs = await prisma.blog.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div style={{ background: N.bg, color: N.text, minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        .neo-btn { transition: all 0.2s ease; cursor: pointer; text-decoration: none; display: inline-flex; items-center; justify-content: center; }
        .neo-btn:hover { transform: translateY(-1px); box-shadow: 10px 10px 20px #c8d0e7, -10px -10px 20px #ffffff !important; }
        .neo-btn:active { transform: translateY(0); box-shadow: inset 3px 3px 8px #c8d0e7, inset -1px -1px 4px #ffffff !important; }
        .blog-card { transition: all 0.25s ease; cursor: pointer; text-decoration: none; display: flex; flex-direction: column; gap: 12px; }
        .blog-card:hover { transform: translateY(-3px); box-shadow: 12px 12px 24px #c8d0e7, -12px -12px 24px #ffffff !important; }
      `}</style>
      
      <PublicNav />

      {/* Main Content Container */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "60px 24px 40px", display: "flex", flexDirection: "column", gap: 48 }}>
        
        {/* Header Section */}
        <div>
          <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 800, background: "rgba(217,119,6,0.1)", color: N.accent, border: `1px solid rgba(217,119,6,0.3)`, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
            ◆ Intelligence & Insights
          </div>
          <h1 style={{ fontSize: 44, fontWeight: 900, color: N.text, letterSpacing: "-1.5px", margin: "0 0 12px", lineHeight: 1.2 }}>
            SMM Engineering Blog
          </h1>
          <p style={{ fontSize: 16, fontWeight: 600, color: N.muted, margin: 0 }}>
            Deep dives into algorithmic pacing, logistic curves, and fail-safe routing strategies.
          </p>
        </div>

        {/* Posts List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {blogs.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-card" style={{ padding: 36, borderRadius: 24, background: N.bg, boxShadow: N.raised }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: N.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {post.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: N.muted, display: "inline-block" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: N.muted }}>{post.readTime} read</span>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: N.text, margin: 0, letterSpacing: "-0.5px", lineHeight: 1.3 }}>{post.title}</h2>
              <p style={{ fontSize: 15, fontWeight: 500, color: N.muted, margin: 0, lineHeight: 1.6 }}>{post.excerpt}</p>
              <div style={{ fontSize: 14, fontWeight: 800, color: N.accent, marginTop: 4 }}>
                Read full breakdown →
              </div>
            </Link>
          ))}
          {blogs.length === 0 && (
            <p style={{ color: N.muted, fontStyle: "italic", textAlign: "center", padding: 40 }}>No blogs published yet.</p>
          )}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 10 }}>
          <Link href="/" className="neo-btn" style={{ padding: "16px 32px", borderRadius: 16, fontWeight: 700, fontSize: 15, color: N.text, background: N.bg, boxShadow: N.raised }}>
            ← Back to Home
          </Link>
        </div>

      </div>
      <PublicFooter />
    </div>
  );
}
