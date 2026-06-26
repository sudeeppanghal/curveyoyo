import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — YoyoSMM",
  description: "SMM operator tips, organic delivery strategies, and panel management guides.",
};

const POSTS = [
  { slug: "why-organic-delivery-beats-flat", title: "Why Organic S-Curve Delivery Beats Flat Delivery Every Time", excerpt: "Flat panel delivery creates machine-flat patterns. Here's the math behind why organic curves produce steadier results.", date: "June 20, 2025", readTime: "5 min" },
  { slug: "multi-panel-failover-guide", title: "The Complete Guide to Multi-Panel Priority Failover", excerpt: "Never lose an order to panel downtime again. A step-by-step setup guide for bulletproof failover routing.", date: "June 15, 2025", readTime: "7 min" },
  { slug: "best-smm-panels-2025", title: "Best SMM Panels for Instagram Reels in 2025", excerpt: "SMMKings, Peakerr, JustAnotherPanel — which panel is best for Instagram Reels delivery? Full comparison.", date: "June 10, 2025", readTime: "8 min" },
  { slug: "peak-hour-delivery-guide", title: "Peak-Hour Delivery: When to Deliver Views for Maximum Reach", excerpt: "Delivery timing matters as much as delivery volume. A data-driven guide to peak-hour clustering.", date: "June 5, 2025", readTime: "6 min" },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen text-white" style={{background:"#0B0B0F"}}>
      <nav className="border-b" style={{background:"rgba(11,11,15,0.95)",borderColor:"rgba(255,255,255,0.06)"}}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{background:"#F59E0B",color:"#0B0B0F"}}>Y</div>
            <span className="font-semibold">YoyoSMM</span>
          </Link>
          <Link href="/signup" className="px-5 py-2.5 rounded-full font-medium text-sm text-[#0B0B0F]" style={{background:"#F59E0B"}}>Get started →</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-5xl font-bold mb-4">Blog</h1>
        <p className="text-xl text-gray-300 mb-14">SMM operator guides, delivery strategies, and panel tips.</p>

        <div className="space-y-6">
          {POSTS.map((post) => (
            <article key={post.slug} className="rounded-2xl border p-6 hover:border-amber-500/20 transition-colors group" style={{background:"rgba(255,255,255,0.03)",borderColor:"rgba(255,255,255,0.06)"}}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs text-gray-500">{post.date}</span>
                <span className="w-1 h-1 rounded-full bg-gray-600 inline-block" />
                <span className="text-xs text-gray-500">{post.readTime} read</span>
              </div>
              <h2 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors mb-2">{post.title}</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">{post.excerpt}</p>
              <Link href={`/blog/${post.slug}`} className="text-amber-400 text-sm font-medium hover:underline">Read more →</Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
