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
  { slug: "why-organic-delivery-beats-flat", title: "Why Organic S-Curve Delivery Beats Flat Delivery Every Time", excerpt: "Flat panel delivery creates machine-flat patterns. Here's the math behind why organic curves produce steadier results.", date: "June 20, 2025", readTime: "5 min" },
  { slug: "multi-panel-failover-guide", title: "The Complete Guide to Multi-Panel Priority Failover", excerpt: "Never lose an order to panel downtime again. A step-by-step setup guide for bulletproof failover routing.", date: "June 15, 2025", readTime: "7 min" },
  { slug: "best-smm-panels-2025", title: "Best SMM Panels for Instagram Reels in 2025", excerpt: "SMMKings, Peakerr, JustAnotherPanel — which panel is best for Instagram Reels delivery? Full comparison.", date: "June 10, 2025", readTime: "8 min" },
  { slug: "peak-hour-delivery-guide", title: "Peak-Hour Delivery: When to Deliver Views for Maximum Reach", excerpt: "Delivery timing matters as much as delivery volume. A data-driven guide to peak-hour clustering.", date: "June 5, 2025", readTime: "6 min" },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen text-slate-800" style={{ background: N.bg }}>
      <style>{`
        .neo-btn:hover{transform:translateY(-1px);box-shadow:8px 8px 22px #c8d0e7,-8px -8px 22px #ffffff !important}
        .neo-btn:active{transform:none;box-shadow:inset 3px 3px 8px #c8d0e7,inset -1px -1px 4px #ffffff !important}
      `}</style>
      
      {/* Navigation */}
      <nav className="border-b" style={{ background: "rgba(238,242,247,0.95)", borderColor: N.border }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ background: N.accentBg, boxShadow: N.raisedSm }}>Y</div>
            <span className="font-extrabold text-slate-800">YoyoSMM</span>
          </Link>
          <Link href="/signup" className="px-5 py-2.5 rounded-full font-bold text-sm text-white no-underline neo-btn" style={{ background: N.accentBg, boxShadow: N.raisedSm }}>Get started →</Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-5xl font-black mb-4 leading-tight" style={{ color: N.text, letterSpacing: "-1.5px" }}>Blog</h1>
        <p className="text-xl font-medium mb-14" style={{ color: N.muted }}>SMM operator guides, delivery strategies, and panel tips.</p>

        <div className="space-y-8">
          {POSTS.map((post) => (
            <article key={post.slug} className="rounded-2xl p-6 transition-all neo-btn" style={{ background: N.bg, boxShadow: N.raised, cursor: "pointer" }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold" style={{ color: N.muted }}>{post.date}</span>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: N.muted }} />
                <span className="text-xs font-bold" style={{ color: N.muted }}>{post.readTime} read</span>
              </div>
              <h2 className="text-xl font-black mb-2" style={{ color: N.text, letterSpacing: "-0.5px" }}>{post.title}</h2>
              <p className="text-sm leading-relaxed mb-4 font-medium" style={{ color: N.muted }}>{post.excerpt}</p>
              <Link href={`/blog/${post.slug}`} className="text-sm font-bold no-underline hover:underline" style={{ color: N.accent }}>Read more →</Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
