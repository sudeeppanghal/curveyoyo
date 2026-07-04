import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav, PublicFooter } from "../../PublicHeaderFooter";
import { prisma } from "@/lib/prisma";

const N = {
  bg:       "#eef2f7",
  raised:   "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm: "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  inset:    "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
  accent:   "#d97706",
  text:     "#2d3748",
  muted:    "#718096",
  border:   "rgba(200, 208, 231, 0.4)",
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const blog = await prisma.blog.findUnique({
    where: { slug: params.slug },
  });
  if (!blog) return { title: "Not Found" };
  return {
    title: `${blog.title} — YoyoSMM`,
    description: blog.excerpt,
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const blog = await prisma.blog.findUnique({
    where: { slug: params.slug },
  });

  if (!blog || !blog.published) {
    notFound();
  }

  return (
    <div style={{ background: N.bg, color: N.text, minHeight: "100vh", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        .neo-btn { transition: all 0.2s ease; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; }
        .neo-btn:hover { transform: translateY(-1px); box-shadow: 10px 10px 20px #c8d0e7, -10px -10px 20px #ffffff !important; }
        .neo-btn:active { transform: translateY(0); box-shadow: inset 3px 3px 8px #c8d0e7, inset -1px -1px 4px #ffffff !important; }
        .blog-content { line-height: 1.8; font-size: 17px; color: #4a5568; }
        .blog-content h2 { font-size: 28px; font-weight: 900; color: #2d3748; margin-top: 48px; margin-bottom: 16px; letter-spacing: -0.5px; }
        .blog-content h3 { font-size: 22px; font-weight: 800; color: #2d3748; margin-top: 32px; margin-bottom: 12px; }
        .blog-content p { margin-bottom: 24px; }
        .blog-content ul { padding-left: 24px; margin-bottom: 24px; }
        .blog-content li { margin-bottom: 12px; }
        .blog-content pre { background: #1a202c; color: #cbd5e1; padding: 16px; border-radius: 12px; overflow-x: auto; margin-bottom: 24px; font-size: 14px; }
        .blog-content code { background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; font-family: monospace; }
        .blog-content pre code { background: transparent; padding: 0; }
        .blog-content blockquote { border-left: 4px solid #d97706; padding-left: 16px; margin-left: 0; font-style: italic; color: #4a5568; background: rgba(217,119,6,0.05); padding: 16px; border-radius: 0 12px 12px 0; }
      `}</style>
      
      <PublicNav />

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "60px 24px 40px", display: "flex", flexDirection: "column", gap: 32 }}>
        
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/blog" className="neo-btn" style={{ width: 40, height: 40, borderRadius: "50%", background: N.bg, boxShadow: N.raised, fontSize: 18, color: N.accent }}>
            ←
          </Link>
          <span style={{ fontSize: 13, fontWeight: 700, color: N.muted }}>Back to Intelligence</span>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: N.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {blog.createdAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: N.muted, display: "inline-block" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: N.muted }}>{blog.readTime} read</span>
          </div>
          
          <h1 style={{ fontSize: 48, fontWeight: 900, color: N.text, letterSpacing: "-1.5px", margin: "0 0 24px", lineHeight: 1.15 }}>
            {blog.title}
          </h1>
          
          <p style={{ fontSize: 20, fontWeight: 500, color: N.muted, margin: 0, lineHeight: 1.6, borderLeft: `3px solid ${N.accent}`, paddingLeft: 20 }}>
            {blog.excerpt}
          </p>
        </div>

        <div 
          className="blog-content" 
          style={{ 
            background: N.bg, 
            padding: "48px 0", 
            borderTop: `1px solid ${N.border}`
          }}
          dangerouslySetInnerHTML={{ __html: blog.content }} 
        />

      </div>
      <PublicFooter />
    </div>
  );
}
