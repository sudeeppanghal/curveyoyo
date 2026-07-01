import Link from "next/link";
import type { Metadata } from "next";

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

const POSTS = [
  { slug: "why-organic-delivery-beats-flat", title: "Why Organic S-Curve Delivery Beats Flat Delivery Every Time", excerpt: "Flat panel delivery creates artificial machine patterns that算法 easily detect. Here's the mathematical breakdown of why organic curves produce superior algorithmic reach.", date: "July 2026", readTime: "5 min" },
  { slug: "timing-routing-infrastructure", title: "Designing a Fail-Safe Timing Delivery Routing Infrastructure", excerpt: "How our multi-path routing nodes guarantee 99.98% delivery success rates with instant backup path switching across major social platforms.", date: "July 2026", readTime: "7 min" },
  { slug: "why-organic-pacing-wins", title: "Why Organic Pacing Wins the Algorithm Game in 2026", excerpt: "A comprehensive analysis comparing legacy reseller flat delivery to proprietary wholesale S-curve pacing.", date: "July 2026", readTime: "8 min" },
  { slug: "peak-hour-delivery-guide", title: "Peak-Hour Delivery: When to Dispatch Engagement for Maximum Viral Reach", excerpt: "Delivery timing matters just as much as delivery volume. A data-driven guide to peak-hour audience clustering across TikTok, IG, and YouTube.", date: "July 2026", readTime: "6 min" },
];

export default function BlogPage() {
  return (
    <div style={{ background: N.bg, color: N.text, minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        .neo-btn { transition: all 0.2s ease; cursor: pointer; text-decoration: none; display: inline-flex; items-center; justify-content: center; }
        .neo-btn:hover { transform: translateY(-1px); box-shadow: 10px 10px 20px #c8d0e7, -10px -10px 20px #ffffff !important; }
        .neo-btn:active { transform: translateY(0); box-shadow: inset 3px 3px 8px #c8d0e7, inset -1px -1px 4px #ffffff !important; }
        .blog-card { transition: all 0.25s ease; cursor: pointer; text-decoration: none; display: flex; flex-direction: column; gap: 12px; }
        .blog-card:hover { transform: translateY(-3px); box-shadow: 12px 12px 24px #c8d0e7, -12px -12px 24px #ffffff !important; }
      `}</style>
      
      {/* Navigation */}
      <nav style={{ borderBottom: `1px solid ${N.border}`, background: "rgba(238,242,247,0.95)", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: "#fff", background: N.accentBg, boxShadow: N.raisedSm }}>Y</div>
            <span style={{ fontWeight: 800, fontSize: 20, color: N.text, letterSpacing: "-0.5px" }}>YoyoSMM</span>
          </Link>
          <Link href="/signup" className="neo-btn" style={{ padding: "10px 24px", borderRadius: 999, fontWeight: 800, fontSize: 14, color: "#fff", background: N.accentBg, boxShadow: N.raisedSm }}>
            Get Started →
          </Link>
        </div>
      </nav>

      {/* Main Content Container */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "60px 24px 100px", display: "flex", flexDirection: "column", gap: 40 }}>
        
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
          {POSTS.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="blog-card" style={{ padding: 36, borderRadius: 24, background: N.bg, boxShadow: N.raised }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: N.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>{post.date}</span>
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
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 10 }}>
          <Link href="/" className="neo-btn" style={{ padding: "16px 32px", borderRadius: 16, fontWeight: 700, fontSize: 15, color: N.text, background: N.bg, boxShadow: N.raised }}>
            ← Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
}
