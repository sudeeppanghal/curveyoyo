"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

/* ─── Whitish Neomorphism Theme Tokens ────────────────── */

const C = {

  bg: "#eef2f7",

  text: "#2d3748",

  textMuted: "#718096",

  textFaint: "#a0aec0",

  amber: "#d97706",

  amberLight: "rgba(217, 119, 6, 0.08)",

  emerald: "#16a34a",

  raised: "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",

  raisedSm: "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",

  raisedLg: "14px 14px 28px #c8d0e7, -14px -14px 28px #ffffff",

  inset: "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",

  insetSm: "inset 3px 3px 6px #c8d0e7, inset -3px -3px 6px #ffffff",

  grad: "linear-gradient(135deg, #d97706 0%, #ea580c 100%)",

};

const HOMEPAGE_CURVES_INFO: Record<string, { label: string; icon: string; bestFor: string; why: string; duration: string; details: string }> = {

  ORGANIC: {

    label: "Organic S-Curve",

    icon: "🌅",

    bestFor: "Standard viral reels & organic growth",

    why: "Mimics a typical viral trajectory where views build up slowly, peak, and then decay naturally.",

    duration: "24h - 168h (1-7 days)",

    details: "Warmup: 4h · Peak: 8h. Ideal for natural algorithmic growth."

  },

  FAST: {

    label: "Fast Burst",

    icon: "⚡",

    bestFor: "Instagram Clipper accounts",

    why: "Paces views within a compressed timeframe to catch early interest and boost immediate feed placement.",

    duration: "12h - 36h",

    details: "Warmup: 2h · Peak: 4h. Designed for fast-paced content schedules."

  },

  AGGRESSIVE: {

    label: "Aggressive Spike",

    icon: "🔥",

    bestFor: "Time-sensitive trends & announcements",

    why: "Triggers a rapid surge of views within hours to maximize initial shock value on high-velocity campaigns.",

    duration: "6h - 24h",

    details: "Warmup: 1h · Peak: 2h. High initial velocity, higher visibility rate."

  },

  WHOP: {

    label: "Whop commerce",

    icon: "💳",

    bestFor: "Whop Membership Drops & Product Launches",

    why: "Optimized for midday commerce traffic. Provides a sustained high-volume plateau during active shopping hours.",

    duration: "24h - 48h",

    details: "Warmup: 5h · Peak: 10h. Sustained plateau to match drop events."

  },

  CLIPSTAKE: {

    label: "Clipstake Wave",

    icon: "🎲",

    bestFor: "Clipstake engagement prompts & quizzes",

    why: "Double-plateau step-wise curve simulating viral trigger prompts and repeat user checking cycles.",

    duration: "24h - 72h",

    details: "Warmup: 3h · Peak: 6h. Dual-step shape designed to trigger interactive prompts."

  },

  CLIPSTAR: {

    label: "Clipstar Burst",

    icon: "⭐",

    bestFor: "Clipstar creators & long-tail campaigns",

    why: "Delivers an immediate sustained burst followed by a very flat, high-retention tail for prolonged visibility.",

    duration: "48h - 168h",

    details: "Warmup: 2h · Peak: 12h. Long-tail decay to simulate high audience retention."

  },

  PICSART: {

    label: "Picsart Creative",

    icon: "🎨",

    bestFor: "Picsart designers & creative portfolios",

    why: "Tailored to creative traffic, peaking in the afternoon with custom engagement rates matching peak creative hours.",

    duration: "24h - 72h",

    details: "Warmup: 4h · Peak: 8h. Designed for designer portfolios."

  },

  CROSSWAVE: {

    label: "Crosswave Multi",

    icon: "🌊",

    bestFor: "Cross-platform syndication",

    why: "Oscillatory crests and troughs simulating multiple syndication shares across different networks.",

    duration: "48h - 120h",

    details: "Warmup: 4h · Peak: 8h. Periodic wave patterns mimicking platform sharing schedules."

  }

};

const PANELS = [

  "SMMKings","Peakerr","JustAnotherPanel","SMMHeaven","NicePanel",

  "FollowersGain","Crescitaly","SmmFarm","SmmRaja","SmmPanel",

  "GrowthPanel","ViewsPanel","SMMPro","PanelBros","ViewStore",

];

const FEATURES = [

  {

    id:"panel", icon:"⚡", label:"Delivery Network",

    title:"Proprietary high-speed timing delivery network",

    body:"We deliver organic views and engagement through our proprietary high-speed timing network. Add funds to your wallet to start high-impact campaigns instantly.",

    bullets:["Drip-feed pacing for organic growth","Automated engagement ratios (likes, saves, comments)","Secure wallet system with instant deposits","24/7 campaign tracking & monitoring"],

  },

  {

    id:"curve", icon:"📈", label:"S-Curve",

    title:"Warmup → Peak → Decay. Natural growth.",

    body:"Every campaign follows a logistic S-curve that mirrors how real viral content spreads. Configure duration, intensity, and style per order.",

    bullets:["Logistic growth model (viral S-curve)","Gradual warmup over first 2–4 hours","Peak clustered at high-traffic windows","Natural decay — no sudden stops"],

  },

  {

    id:"failover", icon:"🛡️", label:"Infrastructure",

    title:"Fail-safe automated routing infrastructure",

    body:"Our automated routing infrastructure utilizes multiple active delivery paths. If any path experiences delay, the engine redirects instantly to ensure zero drops.",

    bullets:["Sub-1s automatic path routing","Continuous path performance monitoring","Orders queue automatically if paths are busy","Guaranteed delivery with zero order losses"],

  },

  {

    id:"preview", icon:"👁", label:"Live Preview",

    title:"See the curve before you confirm",

    body:"See the exact hourly delivery schedule before the campaign goes live. Adjust pacing and duration — the preview chart updates in real time.",

    bullets:["Interactive S-curve preview chart","Sliders update the schedule live","See exact hourly batch sizes","Deploy with absolute confidence"],

  },

  {

    id:"agency", icon:"🏢", label:"Reseller",

    title:"Built for operators running at scale",

    body:"Bulk campaign imports, unlimited campaigns, real-time diagnostics. Everything you need to run an SMM operation at scale.",

    bullets:["Bulk CSV campaign importer","Unlimited reels and platforms","Real-time campaign diagnostics","One dashboard, every campaign"],

  },

];

const flex = (align="center", justify="flex-start", gap=0, dir="row"): React.CSSProperties => ({

  display:"flex", alignItems:align, justifyContent:justify,

  gap: gap || undefined, flexDirection: dir as any,

});

const grid = (cols: string, gap: number): React.CSSProperties => ({

  display:"grid", gridTemplateColumns:cols, gap,

});

export default function Home() {

  const [activeFeature, setActiveFeature] = useState(0);

  const [scrolled, setScrolled] = useState(false);

  const [curveStyle, setCurveStyle] = useState<"ORGANIC"|"FAST"|"AGGRESSIVE"|"WHOP"|"CLIPSTAKE"|"CLIPSTAR"|"PICSART"|"CROSSWAVE">("ORGANIC");

  const [duration, setDuration] = useState(24);

  const [openFaq, setOpenFaq] = useState<number|null>(null);

  useEffect(() => {

    const fn = () => setScrolled(window.scrollY > 40);

    window.addEventListener("scroll", fn, { passive:true });

    return () => window.removeEventListener("scroll", fn);

  }, []);

  const feat = FEATURES[activeFeature];

  const [wide, setWide] = useState(true);

  useEffect(() => {

    const fn = () => setWide(window.innerWidth >= 900);

    fn();

    window.addEventListener("resize", fn);

    return () => window.removeEventListener("resize", fn);

  }, []);

  return (

    <div style={{ background:C.bg, color:C.text, minHeight:"100vh", fontFamily:"'Inter', -apple-system, sans-serif", overflowX:"hidden" }}>

      <style>{`

        @keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:0.4; } }

        .landing-marquee {

          display: flex;

          gap: 16px;

          animation: marquee 25s linear infinite;

          width: max-content;

        }

        @keyframes marquee {

          0% { transform: translateX(0); }

          100% { transform: translateX(-50%); }

        }

      `}</style>

      {/* ══ NAVBAR ══════════════════════════════════════════ */}

      <nav style={{

        position:"sticky", top:0, zIndex:100,

        background: scrolled ? "rgba(238, 242, 247, 0.85)" : "transparent",

        backdropFilter: scrolled ? "blur(16px)" : "none",

        boxShadow: scrolled ? "0 10px 30px rgba(200, 208, 231, 0.4)" : "none",

        padding: scrolled ? "12px 0" : "20px 0",

        transition:"all 0.3s ease",

      }}>

        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px", ...flex("center","space-between") }}>

          {/* Logo */}

          <Link href="/" style={{ textDecoration:"none", ...flex("center","flex-start",12) }}>

            <div style={{ width:38, height:38, borderRadius:12, background:C.grad, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:18, color:"#ffffff", boxShadow:C.raisedSm }}>Y</div>

            <span style={{ fontWeight:800, fontSize:20, color:C.text, letterSpacing:"-0.5px" }}>YoyoSMM</span>

          </Link>

          {/* Nav links */}

          {wide && (

            <div style={{ ...flex("center","center",8), background:C.bg, padding:"6px 12px", borderRadius:999, boxShadow:C.insetSm }}>

              {[["Features","#features"],["How It Works","#hiw"],["Pricing","#pricing"],["FAQ","#faq"]].map(([l,h]) => (

                <a key={l} href={h} style={{ color:C.textMuted, textDecoration:"none", fontSize:13, fontWeight:600, padding:"6px 16px", borderRadius:999, transition:"all 0.2s" }}

                  className="neo-btn"

                  onMouseEnter={e=>(e.currentTarget.style.color=C.amber)}

                  onMouseLeave={e=>(e.currentTarget.style.color=C.textMuted)}>{l}</a>

              ))}

            </div>

          )}

          {/* CTA */}

          <div style={flex("center","flex-end",12)}>

            <Link href="/login" style={{ color:C.textMuted, textDecoration:"none", fontSize:14, fontWeight:600, padding:"8px 16px", borderRadius:10 }} className="neo-btn">Sign In</Link>

            <Link href="/signup" style={{ background:C.grad, color:"#ffffff", textDecoration:"none", fontSize:14, fontWeight:800, padding:"10px 22px", borderRadius:10, boxShadow:C.raisedSm }} className="neo-btn">

              Get Started

            </Link>

          </div>

        </div>

      </nav>

      {/* ══ HERO ════════════════════════════════════════════ */}

      <section style={{ maxWidth:1100, margin:"0 auto", padding:"80px 24px 80px", textAlign:"center" }}>

        {/* Badge */}

        <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"8px 18px", borderRadius:999, background:C.bg, boxShadow:C.inset, marginBottom:32 }}>

          <span style={{ width:8, height:8, borderRadius:"50%", background:C.amber, display:"inline-block", animation:"pulse-dot 2s ease-in-out infinite" }} />

          <span style={{ fontSize:12, fontWeight:700, color:C.amber, letterSpacing:"0.02em" }}>Premium Organic Pacing SMM Panel</span>

        </div>

        {/* Headline */}

        <h1 style={{ fontSize:wide ? 56 : 34, fontWeight:900, lineHeight:1.15, letterSpacing:"-1.5px", marginBottom:28, color:C.text }}>

          Stop juggling SMM tabs.<br />

          <span style={{ background:"linear-gradient(90deg, #d97706, #ea580c, #f59e0b)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>

            Run your panels like a single engine.

          </span>

        </h1>

        {/* Sub */}

        <p style={{ fontSize:wide ? 18 : 15, color:C.textMuted, maxWidth:620, margin:"0 auto 44px", lineHeight:1.75, fontWeight:500 }}>

          Access our premium timing delivery network. Automate organic pacing schedules, enforce custom curves, and maintain balanced engagement ratios automatically.

        </p>

        {/* Buttons */}

        <div style={{ ...flex("center","center",16), flexWrap:"wrap", marginBottom:72 }}>

          <Link href="/signup" style={{ background:C.grad, color:"#ffffff", textDecoration:"none", fontSize:16, fontWeight:800, padding:"16px 36px", borderRadius:12, boxShadow:C.raisedLg, letterSpacing:"-0.3px" }} className="neo-btn">

            Create Free Account →

          </Link>

          <a href="#hiw" style={{ color:C.text, textDecoration:"none", fontSize:16, fontWeight:700, padding:"16px 32px", borderRadius:12, background:C.bg, boxShadow:C.raised }} className="neo-btn">

            See How It Works

          </a>

        </div>

        {/* 4 Mini Cards */}

        <div style={{ ...grid(wide ? "repeat(4,1fr)" : "repeat(2,1fr)", 20) }}>

          {[

            ["🔑","Timing Delivery System","Custom pacing curves for viral growth"],

            ["📈","Organic Pacing Curves","Warmup, peak, and decay phases"],

            ["⚡","Fail-Safe Infrastructure","Multi-path routing prevents delays"],

            ["💰","No Upfront Fees","Free account, pay custom SMM rates"],

          ].map(([icon,title,desc]) => (

            <div key={title} style={{ padding:"28px 24px", borderRadius:20, background:C.bg, boxShadow:C.raised, textAlign:"left" }}>

              <div style={{ fontSize:28, marginBottom:16, width:48, height:48, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", background:C.bg, boxShadow:C.raisedSm }}>{icon}</div>

              <div style={{ fontWeight:800, fontSize:15, color:C.text, marginBottom:8 }}>{title}</div>

              <div style={{ fontSize:13, color:C.textMuted, lineHeight:1.6 }}>{desc}</div>

            </div>

          ))}

        </div>

      </section>

      {/* ══ MARQUEE ═════════════════════════════════════════ */}

      <div style={{ padding:"32px 0", background:C.bg, boxShadow:C.inset, overflow:"hidden" }}>

        <p style={{ textAlign:"center", fontSize:11, fontWeight:800, letterSpacing:"0.12em", textTransform:"uppercase", color:C.textMuted, marginBottom:18 }}>

          Compatible with any standard SMM API

        </p>

        <div style={{ position:"relative", overflow:"hidden" }}>

          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:100, background:`linear-gradient(to right, ${C.bg}, transparent)`, zIndex:2, pointerEvents:"none" }} />

          <div style={{ position:"absolute", right:0, top:0, bottom:0, width:100, background:`linear-gradient(to left, ${C.bg}, transparent)`, zIndex:2, pointerEvents:"none" }} />

          <div className="landing-marquee">

            {[...PANELS,...PANELS].map((p,i) => (

              <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 20px", margin:"0 8px", borderRadius:12, background:C.bg, boxShadow:C.raisedSm, fontSize:13, fontWeight:700, color:C.textMuted, whiteSpace:"nowrap" }}>

                <span style={{ width:8, height:8, borderRadius:"50%", background:C.amber, display:"inline-block" }} />{p}

              </span>

            ))}

          </div>

        </div>

      </div>

      {/* ══ STATS ═══════════════════════════════════════════ */}

      <section style={{ maxWidth:1100, margin:"0 auto", padding:"80px 24px" }}>

        <div style={{ ...grid(wide ? "repeat(3,1fr)" : "1fr", 24) }}>

          {[

            ["99.98%","Delivery Success Rate","Proprietary timing engine ensures seamless delivery"],

            ["< 1 Second","Batch Routing Speed","Zero delay when scheduling pacing campaigns"],

            ["10k+","Active Campaigns","Powering high-retention views and organic engagement"],

          ].map(([val,title,desc]) => (

            <div key={title} style={{ padding:"40px 32px", borderRadius:24, background:C.bg, boxShadow:C.raised }}>

              <div style={{ fontSize:wide ? 46 : 36, fontWeight:900, color:C.amber, marginBottom:10, letterSpacing:"-1px" }}>{val}</div>

              <div style={{ fontWeight:800, fontSize:16, color:C.text, marginBottom:10 }}>{title}</div>

              <div style={{ fontSize:14, color:C.textMuted, lineHeight:1.6 }}>{desc}</div>

            </div>

          ))}

        </div>

      </section>

      {/* ══ FEATURES INTERACTIVE ════════════════════════════ */}

      <section id="features" style={{ maxWidth:1100, margin:"0 auto", padding:"60px 24px 80px" }}>

        {/* Section header */}

        <div style={{ textAlign:"center", marginBottom:60 }}>

          <h2 style={{ fontSize:wide ? 40 : 28, fontWeight:900, letterSpacing:"-1px", color:C.text, marginBottom:16 }}>Interactive Pacing Showcase</h2>

          <p style={{ fontSize:15, color:C.textMuted, maxWidth:600, margin:"0 auto", lineHeight:1.7 }}>

            We support custom delivery algorithms optimized for the major creator platforms. Click any style below to visualize how the campaign dispatches over time.

          </p>

        </div>

        <div style={{ ...grid(wide ? "5fr 7fr" : "1fr", 32) }}>

          {/* LEFT: Controls */}

          <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

            {/* Style + Duration controls */}

            <div style={{ padding:28, borderRadius:24, background:C.bg, boxShadow:C.raised }}>

              <div style={{ fontSize:11, fontWeight:800, letterSpacing:"0.08em", textTransform:"uppercase", color:C.textMuted, marginBottom:16 }}>

                1. Choose Delivery Style

              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(90px, 1fr))", gap:10, marginBottom:28 }}>

                {(["ORGANIC","FAST","AGGRESSIVE","WHOP","CLIPSTAKE","CLIPSTAR","PICSART","CROSSWAVE"] as const).map(s => (

                  <button key={s} onClick={() => setCurveStyle(s)} style={{

                    padding:"10px 4px", borderRadius:12, border:"none",

                    background: curveStyle===s ? C.bg : "transparent",

                    color: curveStyle===s ? C.amber : C.textMuted,

                    fontSize:11, fontWeight:800, cursor:"pointer", transition:"all 0.2s",

                    boxShadow: curveStyle===s ? C.inset : C.raisedSm,

                  }}>{s}</button>

                ))}

              </div>

              <div style={{ ...flex("center","space-between"), marginBottom:12 }}>

                <span style={{ fontSize:11, fontWeight:800, letterSpacing:"0.08em", textTransform:"uppercase", color:C.textMuted }}>2. Duration</span>

                <span style={{ fontSize:14, fontWeight:800, color:C.amber }}>{duration} Hours</span>

              </div>

              <div style={{ padding:"8px", borderRadius:12, background:C.bg, boxShadow:C.inset }}>

                <input type="range" min="6" max="72" step="6" value={duration} onChange={e=>setDuration(Number(e.target.value))}

                  style={{ width:"100%", accentColor:C.amber, display:"block", cursor:"pointer" }} />

              </div>

              {/* Best Use Case Card */}

              {(() => {

                const info = HOMEPAGE_CURVES_INFO[curveStyle];

                if (!info) return null;

                return (

                  <div style={{

                    marginTop: 20,

                    padding: 16,

                    borderRadius: 16,

                    background: C.bg,

                    boxShadow: C.inset,

                    display: "flex",

                    flexDirection: "column",

                    gap: 8,

                    border: "1px solid rgba(217, 119, 6, 0.12)",

                    textAlign: "left"

                  }}>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

                      <span style={{ fontSize: 16 }}>{info.icon}</span>

                      <span style={{ fontSize: 13, fontWeight: 900, color: C.amber }}>{info.label}</span>

                    </div>

                    <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>

                      🎯 Best For: <span style={{ color: C.amber }}>{info.bestFor}</span>

                    </div>

                    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, fontWeight: 600 }}>

                      {info.why}

                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, paddingTop: 8, borderTop: `1px solid rgba(200, 208, 231, 0.3)`, fontSize: 10, color: C.textMuted, fontWeight: 700 }}>

                      <span>⏱ Rec. Duration: {info.duration}</span>

                      <span>{info.details}</span>

                    </div>

                  </div>

                );

              })()}

              <div style={{ marginTop:24, paddingTop:24, borderTop:`1px solid #c8d0e7`, display:"flex", flexDirection:"column", gap:12 }}>

                {["Smooth S-Curve delivery pacing","Dynamic batch calculations","No spikes — mimics actual viral traffic"].map(t => (

                  <div key={t} style={flex("center","flex-start",12)}>

                    <span style={{ color:C.emerald, fontSize:14, fontWeight:800 }}>✓</span>

                    <span style={{ fontSize:13, color:C.textMuted, fontWeight:600 }}>{t}</span>

                  </div>

                ))}

              </div>

            </div>

            {/* Feature tabs */}

            <div style={{ display:"flex", flexDirection:"column", gap:10, padding:10, borderRadius:20, background:C.bg, boxShadow:C.inset }}>

              {FEATURES.map((f,i) => (

                <button key={f.id} onClick={() => setActiveFeature(i)} style={{

                  padding:"14px 20px", borderRadius:14, border:"none",

                  background: activeFeature===i ? C.bg : "transparent",

                  color: activeFeature===i ? C.amber : C.textMuted,

                  fontSize:14, fontWeight:700, cursor:"pointer", textAlign:"left", transition:"all 0.2s",

                  boxShadow: activeFeature===i ? C.raisedSm : "none",

                  ...flex("center","flex-start",12),

                }}>

                  <span style={{ fontSize:18 }}>{f.icon}</span><span style={{ flex:1 }}>{f.label}</span>

                </button>

              ))}

            </div>

          </div>

          {/* RIGHT: Feature detail + chart */}

          <div style={{ padding:wide ? 40 : 24, borderRadius:24, background:C.bg, boxShadow:C.raised, display:"flex", flexDirection:"column", gap:28 }}>

            <div style={flex("flex-start","flex-start",20)}>

              <div style={{ fontSize:32, width:64, height:64, borderRadius:16, background:C.bg, boxShadow:C.raisedSm, flexShrink:0, display:"flex", alignItems:"center", justifyItems:"center", justifyContent:"center" }}>{feat.icon}</div>

              <div>

                <h3 style={{ fontSize:22, fontWeight:900, color:C.text, marginBottom:10, letterSpacing:"-0.3px" }}>{feat.title}</h3>

                <p style={{ fontSize:14, color:C.textMuted, lineHeight:1.8, marginBottom:20, fontWeight:500 }}>{feat.body}</p>

                <div style={{ display:"grid", gridTemplateColumns:wide ? "1fr 1fr" : "1fr", gap:"10px 20px" }}>

                  {feat.bullets.map(b => (

                    <div key={b} style={flex("flex-start","flex-start",8)}>

                      <span style={{ color:C.amber, fontSize:13, marginTop:1, flexShrink:0, fontWeight:800 }}>✓</span>

                      <span style={{ fontSize:13, color:C.textMuted, lineHeight:1.5, fontWeight:600 }}>{b}</span>

                    </div>

                  ))}

                </div>

              </div>

            </div>

            <div style={{ borderTop:`1px solid #c8d0e7`, paddingTop:28, background:C.bg, borderRadius:16, padding:20, boxShadow:C.inset }}>

              <CurveChart style={curveStyle} duration={duration} />

            </div>

          </div>

        </div>

      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════ */}

      <section id="hiw" style={{ borderTop:`1px solid #c8d0e7`, padding:"80px 24px" }}>

        <div style={{ maxWidth:1100, margin:"0 auto" }}>

          <div style={{ textAlign:"center", marginBottom:60 }}>

            <h2 style={{ fontSize:wide ? 40 : 28, fontWeight:900, letterSpacing:"-1px", color:C.text, marginBottom:16 }}>Simple onboarding</h2>

            <p style={{ fontSize:15, color:C.textMuted, maxWidth:500, margin:"0 auto", lineHeight:1.7 }}>Get fully set up and start pacing your campaigns in under three minutes.</p>

          </div>

          <div style={{ display:"grid", gridTemplateColumns:wide ? "repeat(4,1fr)" : "repeat(2,1fr)", gap:32 }}>

            {[

              ["01","Create Account","Create your account in under 20 seconds to access the organic delivery dashboard."],

              ["02","Deposit Funds","Add funds instantly using UPI (minimum ₹500) to top up your campaign wallet."],

              ["03","Configure Campaign","Paste your Reel/Video URL, choose your engagement targets (views, likes, saves, comments), and pick a pacing style."],

              ["04","Launch & Grow","Sit back and watch. Our timing engine paces your orders organically to match your chosen curve."],

            ].map(([step,title,desc]) => (

              <div key={step} style={{ textAlign:"center", padding:24, borderRadius:20, background:C.bg, boxShadow:C.raised }}>

                <div style={{ width:52, height:52, borderRadius:"50%", background:C.bg, boxShadow:C.inset, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, color:C.amber, margin:"0 auto 20px" }}>{step}</div>

                <div style={{ fontWeight:800, fontSize:15, color:C.text, marginBottom:10 }}>{title}</div>

                <div style={{ fontSize:13, color:C.textMuted, lineHeight:1.7 }}>{desc}</div>

              </div>

            ))}

          </div>

        </div>

      </section>

      {/* ══ FAQ ═════════════════════════════════════════════ */}

      <section id="faq" style={{ borderTop:`1px solid #c8d0e7`, padding:"80px 24px" }}>

        <div style={{ maxWidth:760, margin:"0 auto" }}>

          <div style={{ textAlign:"center", marginBottom:60 }}>

            <h2 style={{ fontSize:wide ? 40 : 28, fontWeight:900, letterSpacing:"-1px", color:C.text, marginBottom:16 }}>Frequently asked questions</h2>

            <p style={{ fontSize:15, color:C.textMuted, fontWeight:500 }}>Need help? Email us at <a href="mailto:support@yoyosmm.online" style={{ color:C.amber, textDecoration:"none", fontWeight:700 }}>support@yoyosmm.online</a></p>

          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

            {[

              ["Do I need to deposit funds to start?","Yes. To launch campaign pacing, you add funds to your wallet using UPI (minimum ₹500). Your charges are calculated per order on-demand, according to our competitive custom pricing rates."],

              ["Which platforms are supported?","We currently support organic views and engagement (likes, saves, shares, comments) for Instagram, TikTok, and YouTube, with full S-curve timing options."],

              ["How does your fail-safe delivery network work?","Our engine utilizes multiple redundant delivery routes. If any route experiences network delay, the system redirects the batch to an active backup path instantly (in under a second) ensuring zero drops."],

              ["What is S-Curve pacing?","Standard panels deliver views in one flat spike, which looks artificial to algorithms. Our engine spreads orders dynamically over your chosen duration — mimicking organic viral growth with warmup, peak, and natural decay phases."],

              ["How does the wallet deposit work?","You can deposit funds into your platform wallet instantly using UPI (minimum ₹500). The funds reflect in your dashboard balance immediately upon admin verification of the UTR number."],

              ["Is my transaction and campaign data secure?","Yes. All transaction logs, wallet deposits, video links, and campaign settings are fully private and encrypted. We never share your order details with third parties."],

            ].map(([q,a],i) => (

              <div key={i} style={{ borderRadius:20, background:C.bg, boxShadow: openFaq===i ? C.inset : C.raised, overflow:"hidden", transition:"all 0.25s" }}>

                <button onClick={() => setOpenFaq(openFaq===i ? null : i)} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", padding:"24px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, textAlign:"left" }}>

                  <span style={{ fontWeight:800, fontSize:15, color:C.text, lineHeight:1.5 }}>{q}</span>

                  <span style={{ color:C.amber, fontSize:22, fontWeight:700, transform: openFaq===i ? "rotate(45deg)" : "none", transition:"transform 0.2s", flexShrink:0 }}>+</span>

                </button>

                {openFaq===i && (

                  <div style={{ padding:"0 24px 24px" }}>

                    <p style={{ fontSize:14, color:C.textMuted, lineHeight:1.8, fontWeight:500 }}>{a}</p>

                  </div>

                )}

              </div>

            ))}

          </div>

        </div>

      </section>

      {/* ══ FOOTER ═════════════════════════════════════════ */}

      <footer style={{ borderTop:`1px solid #c8d0e7`, background:C.bg, padding:"60px 24px 40px", boxShadow:"inset 0 10px 20px rgba(200, 208, 231, 0.2)" }}>

        <div style={{ maxWidth:1100, margin:"0 auto" }}>

          <div style={{ display:"grid", gridTemplateColumns:wide ? "2fr 1fr 1fr 1fr" : "1fr 1fr", gap:40, marginBottom:48 }}>

            {/* Brand */}

            <div>

              <div style={flex("center","flex-start",12, "row" as any)}>

                <div style={{ width:34, height:34, borderRadius:10, background:C.grad, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:16, color:"#ffffff", boxShadow:C.raisedSm }}>Y</div>

                <span style={{ fontWeight:800, fontSize:18, color:C.text }}>YoyoSMM</span>

              </div>

              <p style={{ fontSize:13, color:C.textMuted, lineHeight:1.8, marginTop:16, maxWidth:240, fontWeight:500 }}>The premium organic SMM panel with built-in timing layers. Add funds to your wallet, pace organically.</p>

            </div>

            {/* Product */}

            <div>

              <div style={{ fontSize:12, fontWeight:800, letterSpacing:"0.08em", textTransform:"uppercase", color:C.text, marginBottom:18 }}>Product</div>

              {[["Features","#features"],["How It Works","#hiw"]].map(([l,h]) => (

                <a key={l} href={h} style={{ display:"block", fontSize:14, color:C.textMuted, textDecoration:"none", marginBottom:12, fontWeight:600 }}>{l}</a>

              ))}

            </div>

            {/* Company */}

            <div>

              <div style={{ fontSize:12, fontWeight:800, letterSpacing:"0.08em", textTransform:"uppercase", color:C.text, marginBottom:18 }}>Company</div>

              {[["About","/about"],["Blog","/blog"],["Contact","/contact"]].map(([l,h]) => (

                <Link key={l} href={h} style={{ display:"block", fontSize:14, color:C.textMuted, textDecoration:"none", marginBottom:12, fontWeight:600 }}>{l}</Link>

              ))}

            </div>

            {/* Legal */}

            <div>

              <div style={{ fontSize:12, fontWeight:800, letterSpacing:"0.08em", textTransform:"uppercase", color:C.text, marginBottom:18 }}>Legal</div>

              {[["Terms of Service","/terms"],["Privacy Policy","/privacy"]].map(([l,h]) => (

                <Link key={l} href={h} style={{ display:"block", fontSize:14, color:C.textMuted, textDecoration:"none", marginBottom:12, fontWeight:600 }}>{l}</Link>

              ))}

            </div>

          </div>

          <div style={{ borderTop:`1px solid #c8d0e7`, paddingTop:24, ...flex("center","space-between"), flexWrap:"wrap", gap:12 }}>

            <p style={{ fontSize:12, color:C.textMuted, fontWeight:500 }}>© {new Date().getFullYear()} YoyoSMM · www.yoyosmm.online · All rights reserved.</p>

            <p style={{ fontSize:12, color:C.textMuted, fontWeight:500 }}>Made with ❤️ for SMM operators worldwide</p>

          </div>

        </div>

      </footer>

    </div>

  );

}

/* ─── Curve Chart ─────────────────────────────────── */

function CurveChart({ style, duration }: { style: "ORGANIC" | "FAST" | "AGGRESSIVE" | "WHOP" | "CLIPSTAKE" | "CLIPSTAR" | "PICSART" | "CROSSWAVE"; duration:number }) {

  const N = 26;

  const pts: number[] = [];

  for (let i = 0; i < N; i++) {

    const x = (i / (N - 1)) * duration;

    let v = 0;

    if (style === "ORGANIC") {

      const peak = duration * 0.45;

      const sigma = duration * 0.18;

      v = 100 * Math.exp(-Math.pow(x - peak, 2) / (2 * Math.pow(sigma, 2)));

    } else if (style === "FAST") {

      const peak = duration * 0.18;

      const sigma = duration * 0.12;

      v = 100 * Math.exp(-Math.pow(x - peak, 2) / (2 * Math.pow(sigma, 2)));

    } else if (style === "AGGRESSIVE") {

      const peak = duration * 0.8;

      const sigma = duration * 0.12;

      v = 100 * Math.exp(-Math.pow(x - peak, 2) / (2 * Math.pow(sigma, 2)));

    } else if (style === "WHOP") {

      v = 40 + 35 * Math.sin((x * Math.PI * 2.5) / duration) + 25 * (x / duration);

    } else if (style === "CLIPSTAKE") {

      const p1 = duration * 0.25, s1 = duration * 0.08;

      const p2 = duration * 0.72, s2 = duration * 0.08;

      v = 50 * Math.exp(-Math.pow(x - p1, 2) / (2 * Math.pow(s1, 2))) +

          55 * Math.exp(-Math.pow(x - p2, 2) / (2 * Math.pow(s2, 2)));

    } else if (style === "CLIPSTAR") {

      v = 85 * Math.exp(-Math.pow(x - duration * 0.22, 2) / (2 * Math.pow(duration * 0.08, 2))) +

          15 * Math.exp(-Math.pow(x - duration * 0.65, 2) / (2 * Math.pow(duration * 0.22, 2)));

    } else if (style === "PICSART") {

      v = 55 + 5 * Math.sin((x * Math.PI * 5) / duration);

    } else if (style === "CROSSWAVE") {

      const cycle = Math.floor((x / duration) * 6) % 2;

      v = cycle === 0 ? 80 : 15;

    }

    pts.push(Math.max(3, v + Math.sin(i * 1.2) * 1.0));

  }

  const max = Math.max(...pts);

  const W=520, H=160, pad=18;

  const xs = pts.map((_,i) => pad+(i/(N-1))*(W-2*pad));

  const ys = pts.map(p => H-pad-(p/max)*(H-2*pad));

  const line = xs.map((x,i) => `${i===0?"M":"L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");

  const area = line + ` L ${xs[N-1].toFixed(1)} ${H-pad} L ${xs[0].toFixed(1)} ${H-pad} Z`;

  return (

    <div>

      <style>{`

        @keyframes neon-flow {

          0% { stroke-dashoffset: 50; }

          100% { stroke-dashoffset: 0; }

        }

        @keyframes pulse-opacity {

          0%, 100% { opacity: 0.28; }

          50% { opacity: 0.10; }

        }

        .neon-glow-line {

          filter: drop-shadow(0 0 5px #ea580c) drop-shadow(0 0 10px rgba(234, 88, 12, 0.4));

        }

      `}</style>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>

        <span style={{ fontSize:12, fontWeight:800, letterSpacing:"0.08em", textTransform:"uppercase", color:C.textMuted }}>Dynamic Pacing Curve</span>

        <span style={{ fontSize:12, fontWeight:800, color:C.amber }}>{style} · {duration}h</span>

      </div>

      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width:"100%", overflow:"visible" }}>

        <defs>

          <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">

            <stop offset="0%" stopColor="#ea580c" stopOpacity="1" />

            <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />

          </linearGradient>

        </defs>

        {[0.25,0.5,0.75].map(r => (

          <line key={r} x1={pad} y1={H-pad-r*(H-2*pad)} x2={W-pad} y2={H-pad-r*(H-2*pad)} stroke="#c8d0e7" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />

        ))}

        <path d={area} fill="url(#cg)" style={{ animation: "pulse-opacity 3s ease-in-out infinite" }} />

        <path d={line} fill="none" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="neon-glow-line" />

        <path d={line} fill="none" stroke="#ffd9a3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="10,25" style={{ animation: "neon-flow 2s linear infinite" }} />

        {xs.map((x,i) => (

          i % 4 === 0 && <circle key={i} cx={x} cy={ys[i]} r="4.5" fill="#ffd9a3" stroke="#ea580c" strokeWidth="1.5" style={{ filter: "drop-shadow(0 0 3px #ea580c)" }} />

        ))}

        {[0,Math.floor(N/4),Math.floor(N/2),Math.floor(3*N/4),N-1].map(i => (

          <text key={i} x={xs[i]} y={H+2} fill={C.textMuted} fontSize="9" fontWeight="700" textAnchor="middle">{Math.round((i/(N-1))*duration)}h</text>

        ))}

      </svg>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginTop:24 }}>

        {[

          ["🌅 Warmup", `0–${Math.round(duration*0.2)}h`, "Gradual Pacing"],

          ["⚡ Peak", `${Math.round(duration*0.2)}–${Math.round(duration*0.65)}h`, "High Volume"],

          ["🌙 Decay", `${Math.round(duration*0.65)}–${duration}h`, "Natural Cooldown"],

        ].map(([phase,range,action]) => (

          <div key={phase} style={{ padding:"12px 8px", borderRadius:12, background:C.bg, boxShadow:C.raisedSm, textAlign:"center" }}>

            <div style={{ fontSize:10, fontWeight:800, color:C.textMuted, textTransform:"uppercase", letterSpacing:"0.05em" }}>{phase}</div>

            <div style={{ fontSize:13, fontWeight:900, color:C.amber, margin:"6px 0 2px" }}>{range}</div>

            <div style={{ fontSize:10, color:C.textMuted, fontWeight:600 }}>{action}</div>

          </div>

        ))}

      </div>

    </div>

  );

}
