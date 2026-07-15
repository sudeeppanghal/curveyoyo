import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isGhostEmail } from "@/lib/ghost";
import { N } from "@/lib/theme";
import { PublicNav, PublicFooter } from "@/app/PublicHeaderFooter";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { user: true, reel: true },
  });

  if (!order || isGhostEmail(order.user.email)) {
    return {
      title: "Report Not Found | YoyoSMM",
    };
  }

  const title = `Verification Report ${order.id} | YoyoSMM`;
  const description = `Live campaign analysis for ${order.viewsTarget.toLocaleString()} ${order.reel.platform} views paced dynamically over ${order.durationHours} hours.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://www.yoyosmm.online/verify/${order.id}`,
    },
  };
}

export default async function VerifyPage({ params }: Props) {
  const { id } = await params;
  
  // 1. Fetch Order
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      reel: true,
      deliveryEvents: {
        orderBy: { scheduledAt: "asc" },
      },
    },
  });

  if (!order || isGhostEmail(order.user.email)) {
    notFound();
  }

  // 2. Calculate Pacing Analytics
  const completedEvents = order.deliveryEvents.filter(e => e.status === "DONE");
  const failedEvents = order.deliveryEvents.filter(e => e.status === "FAILED");
  const totalEvents = order.deliveryEvents.length;
  
  const completionRate = totalEvents > 0 
    ? ((completedEvents.length / totalEvents) * 100).toFixed(1)
    : "0.0";

  // Build clean SVG path points for S-Curve visualization
  let runningPlanned = 0;
  let runningActual = 0;
  const chartPoints = order.deliveryEvents.map((e, idx) => {
    runningPlanned += e.viewsBatch;
    if (e.status === "DONE") {
      runningActual += e.viewsBatch;
    }
    return {
      idx,
      planned: runningPlanned,
      actual: runningActual,
      status: e.status
    };
  });

  const maxVal = Math.max(1, runningPlanned);
  const width = 500;
  const height = 150;
  
  const plannedPoints = chartPoints.map(p => {
    const x = totalEvents > 1 ? (p.idx / (totalEvents - 1)) * width : 0;
    const y = height - (p.planned / maxVal) * height;
    return `${x},${y}`;
  }).join(" ");

  const actualPoints = chartPoints.map(p => {
    const x = totalEvents > 1 ? (p.idx / (totalEvents - 1)) * width : 0;
    const y = height - (p.actual / maxVal) * height;
    return `${x},${y}`;
  }).join(" ");

  // Schema structured JSON-LD data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": `Social Growth Campaign Report: ${order.viewsTarget.toLocaleString()} Views paced over ${order.durationHours}h`,
    "description": `Public verification report detailing delivery parameters, natural pacing graph, and completion logs.`,
    "image": "https://www.yoyosmm.online/logo.png",
    "datePublished": order.createdAt.toISOString(),
    "author": {
      "@type": "Organization",
      "name": "YoyoSMM",
      "url": "https://www.yoyosmm.online"
    },
    "publisher": {
      "@type": "Organization",
      "name": "YoyoSMM",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.yoyosmm.online/logo.png"
      }
    }
  };

  return (
    <div style={{ background: "#eef2f7", minHeight: "100vh", color: N.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <PublicNav />
      {/* Structured SEO Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div style={{ display:"flex", justifyContent:"center", minHeight:"80vh", padding:"60px 20px", background:"#eef2f7" }}>
        <div style={{ maxWidth: 800, width: "100%", borderRadius: 24, padding: 32, background: "#eef2f7", boxShadow: "9px 9px 16px #cbd5e0, -9px -9px 16px #ffffff" }}>
          
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#4f46e5", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>
              Campaign Verification Certificate
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#1a202c", letterSpacing: "-0.5px", margin: 0 }}>
              Order #{order.id}
            </h1>
            <div style={{ fontSize: 13, color: "#718096", marginTop: 4 }}>
              System Delivery Logs & Growth Curve
            </div>
          </div>

          {/* Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 40 }}>
            
            <div style={{ borderRadius: 16, padding: 18, background: "#eef2f7", boxShadow: "inset 3px 3px 6px #cbd5e0, inset -3px -3px 6px #ffffff" }}>
              <div style={{ fontSize: 10, color: "#718096", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Views Target</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#1a202c" }}>{order.viewsTarget.toLocaleString()}</div>
            </div>

            <div style={{ borderRadius: 16, padding: 18, background: "#eef2f7", boxShadow: "inset 3px 3px 6px #cbd5e0, inset -3px -3px 6px #ffffff" }}>
              <div style={{ fontSize: 10, color: "#718096", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Delivered</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#16a34a" }}>{order.viewsDelivered.toLocaleString()}</div>
            </div>

            <div style={{ borderRadius: 16, padding: 18, background: "#eef2f7", boxShadow: "inset 3px 3px 6px #cbd5e0, inset -3px -3px 6px #ffffff" }}>
              <div style={{ fontSize: 10, color: "#718096", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Pacing Schedule</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#4f46e5" }}>{order.curveStyle}</div>
            </div>

            <div style={{ borderRadius: 16, padding: 18, background: "#eef2f7", boxShadow: "inset 3px 3px 6px #cbd5e0, inset -3px -3px 6px #ffffff" }}>
              <div style={{ fontSize: 10, color: "#718096", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Completion Rate</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#1a202c" }}>{completionRate}%</div>
            </div>

          </div>

          {/* SVG Pacing Graph */}
          <div style={{ borderRadius: 20, padding: 24, background: "#eef2f7", boxShadow: "5px 5px 10px #cbd5e0, -5px -5px 10px #ffffff", marginBottom: 40 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: "#2d3748", margin: "0 0 16px 0" }}>
              Pacing Vector Graph (Cumulative Target vs Realized)
            </h2>
            <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
              <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
                {/* Grid Lines */}
                <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#e2e8f0" strokeDasharray="4 4" />
                
                {/* Planned Curve */}
                <polyline
                  fill="none"
                  stroke="#cbd5e0"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  points={plannedPoints}
                />
                
                {/* Actual Delivered Curve */}
                <polyline
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="3.5"
                  points={actualPoints}
                />
              </svg>
            </div>
            <div style={{ display:"flex", justifyContent:"center", gap: 20, marginTop: 12, fontSize: 11, fontWeight: 700 }}>
              <span style={{ color: "#718096" }}>— - — Target Baseline</span>
              <span style={{ color: "#16a34a" }}>━━━━ Realized Pacing</span>
            </div>
          </div>

          {/* Report Summary (SEO Rich Text Block) */}
          <div style={{ padding: 20, borderRadius: 16, background: "rgba(79,70,229,0.04)", border: "1px solid rgba(79,70,229,0.08)", marginBottom: 40 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: "#4f46e5", margin: "0 0 8px 0", textTransform: "uppercase" }}>Campaign Summary</h3>
            <p style={{ fontSize: 13, color: "#4a5568", lineHeight: 1.6, margin: 0 }}>
              This organic delivery campaign successfully pacing completed #{order.id} on {order.reel.platform.toUpperCase()} platform. The distribution algorithm delivered {order.viewsDelivered.toLocaleString()} views over a scheduled timeframe of {order.durationHours} hours. Pacing was throttled dynamically using the {order.curveStyle} curve, simulating authentic engagement cycles to maintain profile status and maximize search engine feed recommendations.
            </p>
          </div>

          {/* Footer Call to Action */}
          <div style={{ textAlign: "center" }}>
            <Link href="/signup" style={{ display: "inline-block", padding: "12px 28px", borderRadius: 12, background: "#4f46e5", color: "#ffffff", fontWeight: 700, fontSize: 13, textDecoration: "none", boxShadow: "4px 4px 8px #cbd5e0" }}>
              Launch Your Organic Growth Campaign Now
            </Link>
          </div>

        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
