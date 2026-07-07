"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { N } from "@/lib/theme";



interface Stats {
  totalOrders?: number; activeOrders?: number;
  viewsDelivered?: number; activePanels?: number;
  totalReels?: number; completedOrders?: number;
  deliveringOrders?: number; totalViewsDelivered?: number;
}

function NeoCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ borderRadius:20, padding:24, background:N.bg, boxShadow:N.raised, ...style }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label:string; value:string|number; sub:string; icon:string }) {
  return (
    <NeoCard>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
        <div style={{ width:44, height:44, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, background:N.bg, boxShadow:N.raisedSm }}>
          {icon}
        </div>
        <div style={{ fontSize:10, fontWeight:800, color:"#16a34a", background:"rgba(22,163,74,0.1)", padding:"3px 8px", borderRadius:6, boxShadow:N.inset }}>LIVE</div>
      </div>
      <div style={{ fontSize:28, fontWeight:900, color:N.text, letterSpacing:"-1px", marginBottom:4 }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize:12, fontWeight:800, color:N.muted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:11, color:N.muted, fontWeight:600 }}>{sub}</div>
    </NeoCard>
  );
}

function LiveCountdown({ targetDateStr, fallbackHour }: { targetDateStr?: string | null; fallbackHour?: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!targetDateStr) {
    return <span style={{ fontSize: 12, fontWeight: 900, color: "#f59e0b" }}>Hour +{fallbackHour || 0}h</span>;
  }

  const diffMs = new Date(targetDateStr).getTime() - now;
  if (diffMs <= 0) {
    return <span style={{ fontSize: 12, fontWeight: 900, color: "#22c55e", animation: "pulse 1s infinite" }}>⚡ Executing now…</span>;
  }

  const totalSecs = Math.floor(diffMs / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const pad = (n: number) => String(n).padStart(2, "0");
  const timeFormatted = hrs > 0 ? `${pad(hrs)}h ${pad(mins)}m ${pad(secs)}s` : `${pad(mins)}m ${pad(secs)}s`;

  return <span style={{ fontSize: 13, fontWeight: 900, color: "#f59e0b", fontFamily: "monospace" }}>In {timeFormatted}</span>;
}

function DashboardMiniChart({ data }: { data: any[] }) {
  if (!data.length) return null;

  // Calculate cumulative planned and actual views
  let runningPlanned = 0;
  let runningActual = 0;
  const cumulativeData = data.map((d) => {
    runningPlanned += d.planned;
    runningActual += d.status === "DONE" ? d.planned : 0;
    return {
      ...d,
      cumulativePlanned: runningPlanned,
      cumulativeActual: runningActual,
    };
  });

  const W = 350, H = 100, pad = 10;
  const maxVal = Math.max(cumulativeData.at(-1)!.cumulativePlanned, 1);

  const toX = (i: number) => pad + (i / Math.max(data.length - 1, 1)) * (W - 2 * pad);
  const toY = (v: number) => H - pad - (v / maxVal) * (H - 2 * pad);

  const plannedPts = cumulativeData.map((d, i) => ({ x: toX(i), y: toY(d.cumulativePlanned) }));
  
  const lastExecutedIdx = data.findLastIndex((d) => d.status === "DONE" || d.status === "FAILED");
  const actualPts = cumulativeData
    .slice(0, lastExecutedIdx !== -1 ? lastExecutedIdx + 1 : 0)
    .map((d, i) => ({ x: toX(i), y: toY(d.cumulativeActual) }));

  const makePath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ borderRadius:10, background: "#120324", padding: "8px 0", overflow: "visible" }}>
      {/* Planned line */}
      {plannedPts.length > 0 && (
        <path d={makePath(plannedPts)} fill="none" stroke="rgba(217, 119, 6, 0.4)" strokeWidth="1.5" strokeDasharray="3 2" />
      )}
      {/* Actual line */}
      {actualPts.length > 0 && (
        <path d={makePath(actualPts)} fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 3px #16a34a)" }} />
      )}
    </svg>
  );
}

function AnnouncementCountdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const calculateTime = () => {
      const difference = +new Date(targetDate) - +new Date();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        expired: false
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.expired) {
    return <span style={{ color: "#ef4444", fontWeight: 800 }}>Offer Expired!</span>;
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, width: "100%", padding: "8px 0" }}>
      <span style={{ fontSize: 11, fontWeight: 900, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.12em", display: "flex", alignItems: "center", gap: 6 }}>
        ⏳ SPECIAL DEPOSIT OFFER ENDS IN
      </span>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {[
          { label: "Days", val: timeLeft.days },
          { label: "Hours", val: timeLeft.hours },
          { label: "Mins", val: timeLeft.minutes },
          { label: "Secs", val: timeLeft.seconds }
        ].map((item, idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div className="digit-box-pulse" style={{
              background: "linear-gradient(180deg, rgba(168, 85, 247, 0.25) 0%, rgba(168, 85, 247, 0.08) 100%)",
              color: "#e9d5ff",
              minWidth: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              fontFamily: "Outfit, Inter, system-ui, sans-serif",
              fontSize: 22,
              fontWeight: 900,
              border: "1px solid rgba(168, 85, 247, 0.35)",
              boxShadow: "0 4px 12px rgba(168, 85, 247, 0.2)",
              transition: "transform 0.2s ease"
            }}>
              {pad(item.val)}
            </div>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [panels, setPanels] = useState<any[]>([]);
  const [runningCampaigns, setRunningCampaigns] = useState<any[]>([]);
  const [activeTrackerIdx, setActiveTrackerIdx] = useState(0);
  const runningCampaign = runningCampaigns[activeTrackerIdx] || null;
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [walletMode, setWalletMode] = useState(false);
  const [activeRoutes, setActiveRoutes] = useState(482);
  const [userEmail, setUserEmail] = useState("");
  const [announcement, setAnnouncement] = useState<any | null>(null);

  useEffect(() => {
    setActiveRoutes(Math.floor(Math.random() * (1000 - 300 + 1)) + 300);
    const timer = setInterval(() => {
      setActiveRoutes(Math.floor(Math.random() * (1000 - 300 + 1)) + 300);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch("/api/billing/status")
      .then(res => res.json())
      .then(data => {
        if (data) {
          setWalletMode(!!data.walletMode);
          if (data.email) setUserEmail(data.email);
        }
      })
      .catch(() => {});

    fetch("/api/announcements")
      .then(res => res.json())
      .then(data => {
        if (data && data.announcement) {
          setAnnouncement(data.announcement);
        }
      })
      .catch(() => {});

    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? d ?? {});
        if (d.email) setUserEmail(d.email);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Fetch user's orders to check for active campaigns
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => {
        const list = d.orders ?? [];
        const runningList = list.filter((o: any) => o.status === "DELIVERING" || o.status === "QUEUED" || o.status === "PAUSED");
        if (runningList.length > 0) {
          setTrackerLoading(true);
          Promise.all(
            runningList.map((o: any) =>
              fetch(`/api/delivery/status/${o.id}`)
                .then((res) => res.json())
                .catch(() => null)
            )
          )
            .then((results) => {
              const valid = results.filter((r) => r && r.order);
              setRunningCampaigns(valid);
              setTrackerLoading(false);
            })
            .catch(() => setTrackerLoading(false));
        }
      })
      .catch(() => {});

    // Fetch panels and dynamic balances
    fetch("/api/panels")
      .then((r) => r.json())
      .then(async (d) => {
        const loaded = d.panels ?? [];
        setPanels(loaded);
        if (loaded.length > 0) {
          // Fire background health check
          const healthRes = await fetch("/api/panels/health", { method: "POST" });
          if (healthRes.ok) {
            const healthData = await healthRes.json();
            setPanels(prev => prev.map(p => {
              const match = healthData.panels?.find((r: any) => r.id === p.id);
              if (match) {
                return { ...p, status: match.status, balance: match.balance, currency: match.currency };
              }
              return p;
            }));
          }
        }
      })
      .catch(() => {});
  }, []);

  const quickActions = [
    { label:"Deposit Funds",   href:"/billing",      icon:"🪙", desc:"Add wallet balance via UPI or Crypto" },
    { label:"Create Order",    href:"/reels/new",    icon:"⚡", desc:"Start organic S-curve delivery" },
    { label:"Add New Reel",    href:"/reels/new",    icon:"🎬", desc:"Import a reel URL to track" },
    { label:"View Analytics",  href:"/analytics",    icon:"📊", desc:"Track views & engagement" },
    { label:"Clipping Graphs", href:"/analytics",    icon:"📈", desc:"Explore Whop, CrossWave & clipping algorithms" },
    ...(userEmail.toLowerCase() === "bizanomarketing.carrd.co@gmail.com" || stats?.activePanels !== undefined ? [{ label:"VIP Affiliate", href:"/affiliate", icon:"🤝", desc:"Earn 20% partner commissions" }] : []),
  ];

  const steps = [
    { num:"01", label:"Deposit Funds",   desc:"Add wallet balance via UPI or Crypto",     href:"/billing",   done: (stats.totalOrders ?? 0) > 0 },
    { num:"02", label:"Import a Campaign", desc:"Paste any IG, TikTok, YT, TG, FB, or X link", href:"/reels/new", done: (stats.totalReels ?? 0) > 0 },
    { num:"03", label:"Create an Order", desc:"Set views, curve shape, and run campaign", href:"/reels/new", done: (stats.totalOrders ?? 0) > 0 },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .neo-qa:hover{box-shadow:10px 10px 24px #c8d0e7,-5px -5px 14px #ffffff !important;transform:translateY(-2px)}
        .neo-qa:active{box-shadow:inset 4px 4px 10px #c8d0e7,inset -2px -2px 6px #ffffff !important;transform:none}
        .neo-step:hover{box-shadow:6px 6px 16px #c8d0e7,-3px -3px 10px #ffffff !important}
        
        .promo-card-animated {
          position: relative;
          overflow: hidden;
          animation: neonGlow 4s infinite ease-in-out, fadeUp 0.3s ease;
        }
        
        .promo-card-animated::after {
          content: '';
          position: absolute;
          top: 0;
          left: -150%;
          width: 60%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.12) 50%,
            transparent
          );
          transform: skewX(-20deg);
          pointer-events: none;
          animation: shimmerSweep 5s infinite ease-in-out;
        }

        .digit-box-pulse {
          animation: digitBreathe 3s infinite ease-in-out;
        }

        @keyframes neonGlow {
          0%, 100% {
            border-color: rgba(168, 85, 247, 0.25);
            box-shadow: 0 12px 36px rgba(0,0,0,0.6), 0 0 15px rgba(168, 85, 247, 0.1);
          }
          50% {
            border-color: rgba(236, 72, 153, 0.55);
            box-shadow: 0 12px 40px rgba(0,0,0,0.65), 0 0 25px rgba(236, 72, 153, 0.25);
          }
        }

        @keyframes shimmerSweep {
          0% { left: -150%; }
          30% { left: 150%; }
          100% { left: 150%; }
        }

        @keyframes digitBreathe {
          0%, 100% {
            transform: scale(1);
            border-color: rgba(168, 85, 247, 0.35);
            box-shadow: 0 4px 12px rgba(168, 85, 247, 0.2);
          }
          50% {
            transform: scale(1.04);
            border-color: rgba(168, 85, 247, 0.65);
            box-shadow: 0 6px 18px rgba(168, 85, 247, 0.45);
            color: #fff;
          }
        }
      `}</style>

      {/* VIP Partner Banner */}
      {userEmail.toLowerCase() === "bizanomarketing.carrd.co@gmail.com" && (
        <div style={{ padding:"18px 24px", borderRadius:20, background:"linear-gradient(135deg, #1e293b, #0f172a)", color:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16, boxShadow:N.raised }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:28 }}>🤝</span>
            <div>
              <div style={{ fontSize:15, fontWeight:900, color:"#f59e0b", letterSpacing:"-0.3px" }}>VIP Partner Affiliate System Active</div>
              <div style={{ fontSize:13, color:"#cbd5e1", fontWeight:600 }}>Earn 20% cash commission on every deposit made by your referrals!</div>
            </div>
          </div>
          <Link href="/affiliate" style={{ padding:"10px 20px", borderRadius:12, background:"#d97706", color:"#fff", fontWeight:800, fontSize:13, textDecoration:"none", boxShadow:"0 4px 12px rgba(217,119,6,0.3)" }}>
            Open Affiliate Dashboard →
          </Link>
        </div>
      )}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:900, color:N.text, margin:"0 0 4px", letterSpacing:"-0.5px" }}>
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"} 👋
          </h1>
          <p style={{ fontSize:13, color:N.muted, margin:0, fontWeight:600 }}>Your organic delivery dashboard</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {(stats.activeOrders ?? 0) > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:20, background:N.bg, boxShadow:N.inset }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:N.accent, animation:"pulse 1.5s infinite", display:"inline-block" }}/>
              <span style={{ fontSize:12, fontWeight:800, color:N.accent }}>{stats.activeOrders} delivering</span>
            </div>
          )}
        </div>
      </div>

      {/* Promotion Announcement Banner */}
      {announcement && announcement.offerEnabled && announcement.endsAt && new Date(announcement.endsAt).getTime() > Date.now() && (
        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <Link href={announcement.targetLink || "/dashboard/billing"} style={{ textDecoration: "none", width: "100%", maxWidth: 1025 }}>
            <div className="promo-card-animated" style={{
              borderRadius: 24,
              background: "linear-gradient(135deg, #0f0c1b 0%, #08010f 100%)",
              border: "1.5px solid rgba(168, 85, 247, 0.2)",
              boxShadow: "0 12px 36px rgba(0,0,0,0.6)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              cursor: "pointer",
              transition: "transform 0.2s ease, border-color 0.2s ease",
              marginBottom: 28,
              width: "100%"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.4)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.2)";
            }}
            >
              {announcement.imageUrl && (
                <div style={{ width: "100%", height: 247, display: "flex", background: "#06070a", borderBottom: "1.5px solid rgba(168, 85, 247, 0.2)", overflow: "hidden" }}>
                  <img src={announcement.imageUrl} alt="Offer Announcement" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </div>
              )}
              <div style={{ width: "100%", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4, alignItems: "center", textAlign: "center", boxSizing: "border-box" }}>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.5px" }}>{announcement.title}</h3>
                <p style={{ fontSize: 13, color: N.muted, margin: 0, fontWeight: 600 }}>{announcement.description}</p>
                
                <div style={{ width: "100%", height: "1px", background: `linear-gradient(90deg, transparent, ${N.border}, transparent)`, margin: "12px 0 4px" }} />
                
                <AnnouncementCountdown targetDate={announcement.endsAt} />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Live Campaign Tracker Widget */}
      {runningCampaign && (
        <div style={{
          borderRadius: 24,
          padding: 24,
          background: "#08010f",
          border: "1px solid #1c0a35",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          color: "#f3e8ff",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          animation: "fadeUp 0.3s ease"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16, color: "#d946ef", animation: "pulse 1.5s infinite" }}>⚡</span>
              <h2 style={{ fontSize: 15, fontWeight: 900, color: "#f3e8ff", margin: 0 }}>Live Campaign Tracker</h2>
              <span style={{
                padding: "2px 8px",
                borderRadius: 20,
                fontSize: 10,
                fontWeight: 800,
                background: runningCampaign.order.status === "DELIVERING" ? "rgba(22, 163, 74, 0.2)" : "rgba(217, 119, 6, 0.2)",
                color: runningCampaign.order.status === "DELIVERING" ? "#22c55e" : "#f59e0b"
              }}>
                {runningCampaign.order.status}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {runningCampaigns.length > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#1a0636", padding: "4px 10px", borderRadius: 20, border: "1px solid #3b0764" }}>
                  <button
                    onClick={() => setActiveTrackerIdx((prev) => (prev - 1 + runningCampaigns.length) % runningCampaigns.length)}
                    style={{ background: "none", border: "none", color: "#d946ef", cursor: "pointer", fontWeight: 900, fontSize: 13 }}
                  >
                    ◀
                  </button>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#f3e8ff" }}>
                    {activeTrackerIdx + 1} / {runningCampaigns.length}
                  </span>
                  <button
                    onClick={() => setActiveTrackerIdx((prev) => (prev + 1) % runningCampaigns.length)}
                    style={{ background: "none", border: "none", color: "#d946ef", cursor: "pointer", fontWeight: 900, fontSize: 13 }}
                  >
                    ▶
                  </button>
                </div>
              )}
              <Link href={`/orders/${runningCampaign.order.id}`}
                style={{ fontSize: 11, fontWeight: 800, color: "#c084fc", textDecoration: "none" }}
                className="neo-btn">
                View Full Details →
              </Link>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
            {/* Left Column: Progress & Next Batch info */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Target reel URL */}
              <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>
                🎬 {runningCampaign.order.reel.platform} · ID: <span style={{ fontFamily: "monospace", color: "#f3e8ff", userSelect: "all" }}>{runningCampaign.order.id}</span> ·{" "}
                <span style={{ color: "#f3e8ff", fontWeight: 700 }}>
                  {runningCampaign.order.reel.url.length > 50
                    ? runningCampaign.order.reel.url.slice(0, 50) + "..."
                    : runningCampaign.order.reel.url}
                </span>
              </div>

              {/* Progress bar */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: "#a78bfa", fontWeight: 700 }}>Fulfillment Progress</span>
                  <span style={{ color: "#d946ef", fontWeight: 900 }}>{runningCampaign.order.progressPct}%</span>
                </div>
                <div style={{ width: "100%", height: 8, borderRadius: 6, background: "rgba(168, 85, 247, 0.1)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    borderRadius: 6,
                    width: `${runningCampaign.order.progressPct}%`,
                    background: "linear-gradient(90deg, #d946ef, #a855f7)",
                    transition: "width 0.5s ease"
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#a78bfa", fontWeight: 600 }}>
                  <span>👁 {runningCampaign.order.viewsDelivered.toLocaleString()} / {runningCampaign.order.viewsTarget.toLocaleString()} views</span>
                  <span>{runningCampaign.completedBatches} / {runningCampaign.totalBatches} batches complete</span>
                </div>
              </div>

              {/* Next Batch Box */}
              {(() => {
                const nextBatch = runningCampaign.chartData.find((b: any) => b.status === "SCHEDULED");
                if (!nextBatch) return <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 800 }}>✓ Campaign fully scheduled/completed</div>;

                const scale = runningCampaign.order.viewsTarget > 0 ? nextBatch.planned / runningCampaign.order.viewsTarget : 0;
                const bLikes = runningCampaign.order.likesTarget > 0 ? Math.round(runningCampaign.order.likesTarget * scale) : 0;
                const bSaves = runningCampaign.order.savesTarget > 0 ? Math.round(runningCampaign.order.savesTarget * scale) : 0;
                
                const engTexts = [];
                if (bLikes > 0) engTexts.push(`👍 ${bLikes}`);
                if (bSaves > 0) engTexts.push(`🔖 ${bSaves}`);
                const engStr = engTexts.length > 0 ? ` · ${engTexts.join(" · ")}` : "";

                // Trigger handled by LiveCountdown

                return (
                  <div style={{
                    borderRadius: 14,
                    padding: "12px 16px",
                    background: "rgba(217, 119, 6, 0.06)",
                    border: "1px solid rgba(217, 119, 6, 0.15)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 900, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Next Batch Dispatch</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#f3e8ff" }}>
                        👁 {nextBatch.planned.toLocaleString()} views{engStr}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: "#f59e0b" }}><LiveCountdown targetDateStr={nextBatch.scheduledAt} fallbackHour={nextBatch.hour} /></div>
                      <div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 600 }}>Batch #{runningCampaign.completedBatches + 1}</div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Right Column: Mini Cumulative Chart */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#a78bfa" }}>📉 Live Cumulative Growth</span>
                <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 600 }}>Pacing: {runningCampaign.order.curveStyle}</span>
              </div>
              <DashboardMiniChart data={runningCampaign.chartData} />
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {loading ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:16 }}>
          {[...Array(4)].map((_,i) => (
            <div key={i} style={{ borderRadius:20, height:130, background:N.bg, boxShadow:N.inset, animation:"pulse 2s infinite" }} />
          ))}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:16 }}>
          <StatCard label="Total Orders"    value={stats.totalOrders ?? 0}     sub="All time campaigns"           icon="📋" />
          <StatCard label="Live Now"        value={stats.activeOrders ?? stats.deliveringOrders ?? 0}    sub="Currently delivering"         icon="⚡" />
          <StatCard label="Views Sent"      value={(stats.viewsDelivered ?? stats.totalViewsDelivered ?? 0).toLocaleString()}  sub="Total organic views"          icon="👁" />
          <StatCard label="Active Routes"   value={activeRoutes}               sub="Delivery paths online"        icon="🛡️" />
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <p style={{ fontSize:11, fontWeight:800, color:N.muted, textTransform:"uppercase", letterSpacing:"0.12em", margin:"0 0 14px" }}>Quick Actions</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16 }}>
          {quickActions.map((a, i) => (
            <Link key={i} href={a.href} className="neo-qa"
              style={{
                textDecoration:"none", borderRadius:18, padding:"20px 18px",
                background:N.bg, boxShadow:N.raised,
                display:"flex", flexDirection:"column", gap:10,
                cursor:"pointer", transition:"all 0.2s",
              }}>
              <div style={{ width:42, height:42, borderRadius:13, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, background:N.bg, boxShadow:N.raisedSm }}>
                {a.icon}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:N.text, marginBottom:3 }}>{a.label}</div>
                <div style={{ fontSize:11, color:N.muted, fontWeight:600 }}>{a.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Get Started Steps */}
      <div>
        <p style={{ fontSize:11, fontWeight:800, color:N.muted, textTransform:"uppercase", letterSpacing:"0.12em", margin:"0 0 14px" }}>Get Started</p>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {steps.map((s, i) => (
            <Link key={i} href={s.href} className="neo-step"
              style={{
                textDecoration:"none", borderRadius:16, padding:"16px 20px",
                background:N.bg,
                boxShadow: s.done ? N.inset : N.raised,
                display:"flex", alignItems:"center", gap:16, transition:"all 0.2s",
              }}>
              <div style={{ width:40, height:40, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, background:N.bg, boxShadow: s.done ? N.inset : N.raisedSm }}>
                {s.done
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <span style={{ fontSize:11, fontWeight:900, color:N.accent, fontVariantNumeric:"tabular-nums" }}>{s.num}</span>
                }
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:800, color: s.done ? "#16a34a" : N.text, marginBottom:2 }}>{s.label}</div>
                <div style={{ fontSize:12, color:N.muted, fontWeight:600 }}>{s.desc}</div>
              </div>
              {!s.done && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={N.muted} strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
