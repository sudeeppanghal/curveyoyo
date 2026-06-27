"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

/* ─── Color tokens ─────────────────────────────────── */
const C = {
  bg: "#06060a",
  bgCard: "rgba(255,255,255,0.025)",
  bgCardHover: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.07)",
  borderAcc: "rgba(245,158,11,0.25)",
  amber: "#F59E0B",
  amberD: "#D97706",
  orange: "#F97316",
  text: "#ffffff",
  textMuted: "#94a3b8",
  textFaint: "#475569",
  emerald: "#34d399",
  grad: "linear-gradient(135deg,#F59E0B 0%,#F97316 100%)",
};

/* ─── Panel list ────────────────────────────────────── */
const PANELS = [
  "SMMKings","Peakerr","JustAnotherPanel","SMMHeaven","NicePanel",
  "FollowersGain","Crescitaly","SmmFarm","SmmRaja","SmmPanel",
  "GrowthPanel","ViewsPanel","SMMPro","PanelBros","ViewStore",
];

/* ─── Features ──────────────────────────────────────── */
const FEATURES = [
  {
    id:"panel", icon:"🔑", label:"Your Panels",
    title:"Your panels, your balance, our engine",
    body:"Connect any SMM panel via API key. We deliver through your existing balance — zero middleman, zero markup. Full control of your funds at all times.",
    bullets:["Connect SMMKings, Peakerr, or any REST API","Zero markup — pay panel rates directly","Revoke or swap credentials anytime","AES-256 encrypted key storage"],
  },
  {
    id:"curve", icon:"📈", label:"S-Curve",
    title:"Warmup → Peak → Decay. Natural growth.",
    body:"Every campaign follows a logistic S-curve that mirrors how real viral content spreads. Configure duration, intensity, and style per order.",
    bullets:["Logistic growth model (viral S-curve)","Gradual warmup over first 2–4 hours","Peak clustered at high-traffic windows","Natural decay — no sudden stops"],
  },
  {
    id:"failover", icon:"⚡", label:"Failover",
    title:"Multi-panel priority failover routing",
    body:"Set priority levels across connected panels. If Panel 1 is slow or down, Panel 2 takes over automatically in under 1 second.",
    bullets:["Sub-1s automatic panel switching","Configure load split (A=70%, B=30%)","Orders queue if all panels are down","Instant failover notifications"],
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

/* ─── Inline style helpers ──────────────────────────── */
const flex = (align="center", justify="flex-start", gap=0, dir="row"): React.CSSProperties => ({
  display:"flex", alignItems:align, justifyContent:justify,
  gap: gap || undefined, flexDirection: dir as any,
});
const grid = (cols: string, gap: number): React.CSSProperties => ({
  display:"grid", gridTemplateColumns:cols, gap,
});

/* ══════════════════════════════════════════════════════
   HOME PAGE
══════════════════════════════════════════════════════ */
export default function Home() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [curveStyle, setCurveStyle] = useState<"ORGANIC"|"FAST"|"AGGRESSIVE">("ORGANIC");
  const [duration, setDuration] = useState(24);
  const [openFaq, setOpenFaq] = useState<number|null>(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive:true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const feat = FEATURES[activeFeature];

  /* ── Responsive columns via JS (since Tailwind isn't compiling) ── */
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const fn = () => setWide(window.innerWidth >= 900);
    fn();
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  return (
    <div style={{ background:C.bg, color:C.text, minHeight:"100vh", fontFamily:"Inter,-apple-system,BlinkMacSystemFont,sans-serif", overflowX:"hidden" }}>

      {/* ══ NAVBAR ══════════════════════════════════════════ */}
      <nav style={{
        position:"sticky", top:0, zIndex:100,
        borderBottom: `1px solid ${scrolled ? C.border : "transparent"}`,
        background: scrolled ? "rgba(6,6,10,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        padding: scrolled ? "12px 0" : "18px 0",
        transition:"all 0.3s",
      }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 24px", ...flex("center","space-between") }}>
          {/* Logo */}
          <Link href="/" style={{ textDecoration:"none", ...flex("center","flex-start",10) }}>
            <div style={{ width:36, height:36, borderRadius:10, background:C.grad, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:16, color:"#060608" }}>Y</div>
            <span style={{ fontWeight:700, fontSize:18, color:C.text, letterSpacing:"-0.5px" }}>YoyoSMM</span>
          </Link>
          {/* Nav links */}
          {wide && (
            <div style={flex("center","center",32)}>
              {[["Features","#features"],["How It Works","#hiw"],["Pricing","#pricing"],["FAQ","#faq"]].map(([l,h]) => (
                <a key={l} href={h} style={{ color:C.textMuted, textDecoration:"none", fontSize:14, transition:"color 0.2s" }}
                  onMouseEnter={e=>(e.currentTarget.style.color=C.text)}
                  onMouseLeave={e=>(e.currentTarget.style.color=C.textMuted)}>{l}</a>
              ))}
            </div>
          )}
          {/* CTA */}
          <div style={flex("center","flex-end",10)}>
            <Link href="/login" style={{ color:C.textMuted, textDecoration:"none", fontSize:14, padding:"8px 14px" }}>Sign In</Link>
            <Link href="/signup" style={{ background:C.grad, color:"#060608", textDecoration:"none", fontSize:14, fontWeight:700, padding:"10px 20px", borderRadius:10, boxShadow:"0 4px 20px rgba(245,158,11,0.15)" }}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section style={{ maxWidth:1100, margin:"0 auto", padding:"72px 24px 80px", textAlign:"center" }}>
        {/* Badge */}
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 14px", borderRadius:999, border:`1px solid ${C.borderAcc}`, background:"rgba(245,158,11,0.06)", marginBottom:28 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:C.amber, display:"inline-block", animation:"pulse-dot 2s ease-in-out infinite" }} />
          <span style={{ fontSize:12, fontWeight:600, color:C.amber, letterSpacing:"0.02em" }}>The Intelligent Layer On Top Of Your SMM Panels</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize:wide ? 60 : 36, fontWeight:900, lineHeight:1.1, letterSpacing:"-1.5px", marginBottom:24, color:C.text }}>
          Stop juggling SMM tabs.<br />
          <span style={{ background:"linear-gradient(90deg,#F59E0B,#F97316,#FBBF24)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            Run your panels like<br />a single engine.
          </span>
        </h1>

        {/* Sub */}
        <p style={{ fontSize:wide ? 19 : 15, color:C.textMuted, maxWidth:580, margin:"0 auto 40px", lineHeight:1.7 }}>
          Connect your existing SMM panel APIs. Automate priority failover, enforce organic delivery curves, and maintain balanced engagement ratios automatically.
        </p>

        {/* Buttons */}
        <div style={{ ...flex("center","center",14), flexWrap:"wrap", marginBottom:64 }}>
          <Link href="/signup" style={{ background:C.grad, color:"#060608", textDecoration:"none", fontSize:16, fontWeight:800, padding:"16px 36px", borderRadius:12, boxShadow:"0 8px 32px rgba(245,158,11,0.18)", letterSpacing:"-0.3px" }}>
            Start 1-Day Free Trial →
          </Link>
          <a href="#hiw" style={{ color:C.textMuted, textDecoration:"none", fontSize:16, fontWeight:600, padding:"16px 32px", borderRadius:12, border:`1px solid ${C.border}`, background:"rgba(255,255,255,0.03)" }}>
            See How It Works
          </a>
        </div>

        {/* 4 Mini Cards */}
        <div style={{ ...grid(wide ? "repeat(4,1fr)" : "repeat(2,1fr)", 16) }}>
          {[
            ["🔑","Bring Your Own Panel","Connect any REST API provider"],
            ["📈","Organic Pacing Curves","Warmup, peak, and decay phases"],
            ["⚡","Priority Failover","Auto-switch panels in <1s"],
            ["💰","One-Time Payment","$20 once for lifetime access"],
          ].map(([icon,title,desc]) => (
            <div key={title} style={{ padding:"20px 18px", borderRadius:16, border:`1px solid ${C.border}`, background:C.bgCard, textAlign:"left" }}>
              <div style={{ fontSize:24, marginBottom:12 }}>{icon}</div>
              <div style={{ fontWeight:700, fontSize:13, color:C.text, marginBottom:5 }}>{title}</div>
              <div style={{ fontSize:12, color:C.textFaint, lineHeight:1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ MARQUEE ═════════════════════════════════════════ */}
      <div style={{ borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}`, padding:"20px 0", background:"rgba(255,255,255,0.008)", overflow:"hidden" }}>
        <p style={{ textAlign:"center", fontSize:10, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", color:C.textFaint, marginBottom:14 }}>
          Compatible with any standard SMM API
        </p>
        <div style={{ position:"relative", overflow:"hidden" }}>
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:80, background:`linear-gradient(to right, ${C.bg}, transparent)`, zIndex:2, pointerEvents:"none" }} />
          <div style={{ position:"absolute", right:0, top:0, bottom:0, width:80, background:`linear-gradient(to left, ${C.bg}, transparent)`, zIndex:2, pointerEvents:"none" }} />
          <div className="landing-marquee">
            {[...PANELS,...PANELS].map((p,i) => (
              <span key={i} style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"8px 16px", margin:"0 6px", borderRadius:10, border:`1px solid ${C.border}`, background:"rgba(255,255,255,0.02)", fontSize:12, fontWeight:500, color:C.textMuted, whiteSpace:"nowrap" }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"rgba(245,158,11,0.5)", display:"inline-block" }} />{p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ══ STATS ═══════════════════════════════════════════ */}
      <section style={{ maxWidth:1100, margin:"0 auto", padding:"64px 24px" }}>
        <div style={{ ...grid(wide ? "repeat(3,1fr)" : "1fr", 20) }}>
          {[
            ["99.98%","Delivery Success Rate","Automatic failover catches downtime instantly"],
            ["< 1 Second","Panel Switch Speed","Zero delay when prioritizing backups"],
            ["120+","Supported Providers","Works with any standard REST API panel"],
          ].map(([val,title,desc]) => (
            <div key={title} style={{ padding:"36px 32px", borderRadius:20, border:`1px solid ${C.border}`, background:"linear-gradient(135deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.005) 100%)" }}>
              <div style={{ fontSize:wide ? 44 : 34, fontWeight:900, color:C.amber, marginBottom:6, letterSpacing:"-1px" }}>{val}</div>
              <div style={{ fontWeight:700, fontSize:15, color:C.text, marginBottom:8 }}>{title}</div>
              <div style={{ fontSize:13, color:C.textMuted, lineHeight:1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ FEATURES INTERACTIVE ════════════════════════════ */}
      <section id="features" style={{ maxWidth:1100, margin:"0 auto", padding:"64px 24px 80px" }}>
        {/* Section header */}
        <div style={{ textAlign:"center", marginBottom:52 }}>
          <h2 style={{ fontSize:wide ? 44 : 28, fontWeight:900, letterSpacing:"-1px", color:C.text, marginBottom:14 }}>Every feature built for professionals</h2>
          <p style={{ fontSize:15, color:C.textMuted, maxWidth:520, margin:"0 auto", lineHeight:1.7 }}>Toggle delivery styles or adjust duration to see how YoyoSMM paces campaigns dynamically.</p>
        </div>

        <div style={{ ...grid(wide ? "5fr 7fr" : "1fr", 28) }}>
          {/* LEFT: Controls */}
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
            {/* Style + Duration controls */}
            <div style={{ padding:24, borderRadius:20, border:`1px solid ${C.border}`, background:C.bgCard }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:C.textFaint, marginBottom:12 }}>
                1. Choose Delivery Style
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:24 }}>
                {(["ORGANIC","FAST","AGGRESSIVE"] as const).map(s => (
                  <button key={s} onClick={() => setCurveStyle(s)} style={{
                    padding:"10px 4px", borderRadius:10, border:`1px solid ${curveStyle===s ? C.borderAcc : C.border}`,
                    background: curveStyle===s ? "rgba(245,158,11,0.08)" : "transparent",
                    color: curveStyle===s ? C.amber : C.textMuted,
                    fontSize:11, fontWeight:700, cursor:"pointer", transition:"all 0.2s",
                  }}>{s}</button>
                ))}
              </div>
              <div style={{ ...flex("center","space-between"), marginBottom:10 }}>
                <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:C.textFaint }}>2. Duration</span>
                <span style={{ fontSize:13, fontWeight:800, color:C.amber }}>{duration} Hours</span>
              </div>
              <input type="range" min="6" max="72" step="6" value={duration} onChange={e=>setDuration(Number(e.target.value))}
                style={{ width:"100%", accentColor:C.amber }} />
              <div style={{ marginTop:20, paddingTop:20, borderTop:`1px solid ${C.border}`, display:"flex", flexDirection:"column", gap:10 }}>
                {["Smooth S-Curve delivery pacing","Dynamic batch calculations","No spikes — mimics actual viral traffic"].map(t => (
                  <div key={t} style={flex("center","flex-start",10)}>
                    <span style={{ color:C.emerald, fontSize:13 }}>✓</span>
                    <span style={{ fontSize:12, color:"#cbd5e1" }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature tabs */}
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {FEATURES.map((f,i) => (
                <button key={f.id} onClick={() => setActiveFeature(i)} style={{
                  padding:"12px 16px", borderRadius:12, border:`1px solid ${activeFeature===i ? C.borderAcc : C.border}`,
                  background: activeFeature===i ? "rgba(245,158,11,0.05)" : "transparent",
                  color: activeFeature===i ? C.amber : C.textMuted,
                  fontSize:13, fontWeight:600, cursor:"pointer", textAlign:"left", transition:"all 0.2s",
                  ...flex("center","flex-start",10),
                }}>
                  <span>{f.icon}</span><span>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: Feature detail + chart */}
          <div style={{ padding:wide ? 36 : 24, borderRadius:20, border:`1px solid ${C.border}`, background:C.bgCard, display:"flex", flexDirection:"column", gap:24 }}>
            <div style={flex("flex-start","flex-start",18)}>
              <div style={{ fontSize:32, padding:"12px 14px", borderRadius:14, border:`1px solid ${C.border}`, background:"rgba(255,255,255,0.02)", flexShrink:0 }}>{feat.icon}</div>
              <div>
                <h3 style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:10, letterSpacing:"-0.3px" }}>{feat.title}</h3>
                <p style={{ fontSize:13, color:C.textMuted, lineHeight:1.8, marginBottom:16 }}>{feat.body}</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 20px" }}>
                  {feat.bullets.map(b => (
                    <div key={b} style={flex("flex-start","flex-start",8)}>
                      <span style={{ color:C.amber, fontSize:12, marginTop:1, flexShrink:0 }}>✓</span>
                      <span style={{ fontSize:12, color:"#cbd5e1", lineHeight:1.5 }}>{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:24 }}>
              <CurveChart style={curveStyle} duration={duration} />
            </div>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════ */}
      <section id="hiw" style={{ borderTop:`1px solid ${C.border}`, padding:"80px 24px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:60 }}>
            <h2 style={{ fontSize:wide ? 44 : 28, fontWeight:900, letterSpacing:"-1px", color:C.text, marginBottom:14 }}>Simple onboarding</h2>
            <p style={{ fontSize:15, color:C.textMuted, maxWidth:460, margin:"0 auto" }}>Get fully set up and start pacing your campaigns in under three minutes.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:wide ? "repeat(4,1fr)" : "repeat(2,1fr)", gap:32 }}>
            {[
              ["01","Create Account","Sign up in 20 seconds. No credit card required to start your free trial."],
              ["02","Connect Panels","Add API credentials for SMM panels in Settings. Configure backup priorities."],
              ["03","Configure Campaign","Paste your Reel/Video URL, set views target, and pick pacing style."],
              ["04","Watch It Deliver","Sit back. We handle timing ratios, S-curve calculations, and failovers."],
            ].map(([step,title,desc]) => (
              <div key={step} style={{ textAlign:"center" }}>
                <div style={{ width:52, height:52, borderRadius:"50%", border:`1px solid ${C.border}`, background:"rgba(245,158,11,0.04)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:C.amber, margin:"0 auto 16px" }}>{step}</div>
                <div style={{ fontWeight:700, fontSize:15, color:C.text, marginBottom:8 }}>{title}</div>
                <div style={{ fontSize:12, color:C.textMuted, lineHeight:1.7, maxWidth:220, margin:"0 auto" }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ═════════════════════════════════════════ */}
      <section id="pricing" style={{ borderTop:`1px solid ${C.border}`, padding:"80px 24px" }}>
        <div style={{ maxWidth:480, margin:"0 auto", textAlign:"center" }}>
          <span style={{ display:"inline-block", padding:"6px 14px", borderRadius:999, border:`1px solid ${C.borderAcc}`, background:"rgba(245,158,11,0.06)", fontSize:11, fontWeight:700, color:C.amber, letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:20 }}>
            Limited-Time Special Offer
          </span>
          <h2 style={{ fontSize:wide ? 44 : 28, fontWeight:900, letterSpacing:"-1px", color:C.text, marginBottom:10 }}>One price. Lifetime access.</h2>
          <p style={{ fontSize:14, color:C.textMuted, marginBottom:40 }}>No subscriptions. No renewals. Own the timing layer forever.</p>

          <div style={{ position:"relative", borderRadius:24, border:`1px solid ${C.borderAcc}`, background:"rgba(245,158,11,0.015)", padding:wide ? "44px 48px" : "32px 24px", overflow:"hidden" }}>
            {/* Top accent line */}
            <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:C.grad }} />

            <div style={flex("center","center",10, "row" as any)}>
              <span style={{ color:C.textFaint, textDecoration:"line-through", fontSize:18 }}>$99</span>
              <span style={{ padding:"3px 10px", borderRadius:999, background:"rgba(52,211,153,0.1)", color:C.emerald, fontSize:11, fontWeight:800 }}>80% OFF</span>
            </div>

            <div style={{ fontSize:80, fontWeight:900, color:C.text, letterSpacing:"-3px", margin:"8px 0 4px" }}>$20</div>
            <p style={{ fontSize:12, color:C.textMuted, marginBottom:36 }}>One-time payment · Pay once, use forever</p>

            <div style={{ textAlign:"left", marginBottom:36, display:"flex", flexDirection:"column", gap:12 }}>
              {[
                "Unlimited Campaigns & Reels",
                "Unlimited Panel API Connections",
                "Organic, Fast & Aggressive pacing modes",
                "Multi-panel failover routing",
                "Bulk campaign CSV importer",
                "Real-time campaigns dashboard",
                "All future platform updates",
                "1-day free trial — no card required",
              ].map(f => (
                <div key={f} style={flex("center","flex-start",12)}>
                  <div style={{ width:20, height:20, borderRadius:"50%", background:"rgba(245,158,11,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:C.amber, flexShrink:0 }}>✓</div>
                  <span style={{ fontSize:13, color:"#cbd5e1" }}>{f}</span>
                </div>
              ))}
            </div>

            <Link href="/signup" style={{ display:"block", background:C.grad, color:"#060608", textDecoration:"none", fontSize:16, fontWeight:800, padding:"17px 0", borderRadius:12, textAlign:"center", letterSpacing:"-0.3px" }}>
              Get Lifetime Access
            </Link>
            <p style={{ fontSize:11, color:C.textFaint, marginTop:12 }}>Start with 1-day free trial. Cancel anytime before it ends.</p>
          </div>
        </div>
      </section>

      {/* ══ FAQ ═════════════════════════════════════════════ */}
      <section id="faq" style={{ borderTop:`1px solid ${C.border}`, padding:"80px 24px" }}>
        <div style={{ maxWidth:760, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:52 }}>
            <h2 style={{ fontSize:wide ? 44 : 28, fontWeight:900, letterSpacing:"-1px", color:C.text, marginBottom:12 }}>Frequently asked questions</h2>
            <p style={{ fontSize:14, color:C.textMuted }}>Need help? Email us at <a href="mailto:support@yoyosmm.online" style={{ color:C.amber, textDecoration:"none" }}>support@yoyosmm.online</a></p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {[
              ["Do I need to deposit funds or buy credits on YoyoSMM?","No. You connect your own SMM panel credentials using their API keys. Orders are placed directly through your existing panel accounts and balances — we charge zero markups and take no cuts."],
              ["Which SMM panels are supported?","Any panel using a standard REST API is supported. This includes Peakerr, SMMKings, JustAnotherPanel, and virtually all major SMM API providers. Simply enter your API key and endpoint in Settings."],
              ["How does multi-panel priority failover work?","You assign priorities to your panels (Panel A = Priority 1, Panel B = Priority 2). When Panel A fails or is slow, we switch to Panel B automatically in under one second — zero order drops."],
              ["What is S-Curve pacing?","Standard panels deliver views in one flat spike, which looks artificial to algorithms. Our engine spreads orders dynamically over your chosen duration — mimicking organic viral growth with warmup, peak, and natural decay phases."],
              ["Is the $20 payment truly a lifetime purchase?","Yes. One $20 purchase = lifetime access. No renewals, no monthly fees, and all future feature updates are included at no extra cost."],
              ["Is my API key secure?","All SMM panel API keys are AES-256 encrypted at rest. We never log keys in plaintext. You can revoke or swap credentials at any time from your settings."],
            ].map(([q,a],i) => (
              <div key={i} style={{ borderRadius:14, border:`1px solid ${openFaq===i ? C.borderAcc : C.border}`, background: openFaq===i ? "rgba(245,158,11,0.015)" : C.bgCard, overflow:"hidden", transition:"all 0.25s" }}>
                <button onClick={() => setOpenFaq(openFaq===i ? null : i)} style={{ width:"100%", background:"none", border:"none", cursor:"pointer", padding:"20px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, textAlign:"left" }}>
                  <span style={{ fontWeight:700, fontSize:14, color:C.text, lineHeight:1.5 }}>{q}</span>
                  <span style={{ color:C.amber, fontSize:22, fontWeight:300, transform: openFaq===i ? "rotate(45deg)" : "none", transition:"transform 0.2s", flexShrink:0 }}>+</span>
                </button>
                {openFaq===i && (
                  <div style={{ padding:"0 24px 20px" }}>
                    <p style={{ fontSize:13, color:C.textMuted, lineHeight:1.8 }}>{a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════ */}
      <footer style={{ borderTop:`1px solid ${C.border}`, background:"rgba(0,0,0,0.4)", padding:"60px 24px 40px" }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:wide ? "2fr 1fr 1fr 1fr" : "1fr 1fr", gap:40, marginBottom:48 }}>
            {/* Brand */}
            <div>
              <div style={flex("center","flex-start",10, "row" as any) as React.CSSProperties}>
                <div style={{ width:32, height:32, borderRadius:8, background:C.grad, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:14, color:"#060608" }}>Y</div>
                <span style={{ fontWeight:700, fontSize:16, color:C.text }}>YoyoSMM</span>
              </div>
              <p style={{ fontSize:12, color:C.textFaint, lineHeight:1.8, marginTop:14, maxWidth:240 }}>The intelligent scheduling and timing layer on top of SMM panels. Connect once, pace organically.</p>
            </div>
            {/* Product */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:C.text, marginBottom:16 }}>Product</div>
              {[["Features","#features"],["How It Works","#hiw"],["Pricing","#pricing"]].map(([l,h]) => (
                <a key={l} href={h} style={{ display:"block", fontSize:13, color:C.textFaint, textDecoration:"none", marginBottom:10 }}>{l}</a>
              ))}
            </div>
            {/* Company */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:C.text, marginBottom:16 }}>Company</div>
              {[["About","/about"],["Blog","/blog"],["Contact","/contact"]].map(([l,h]) => (
                <Link key={l} href={h} style={{ display:"block", fontSize:13, color:C.textFaint, textDecoration:"none", marginBottom:10 }}>{l}</Link>
              ))}
            </div>
            {/* Legal */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:C.text, marginBottom:16 }}>Legal</div>
              {[["Terms of Service","/terms"],["Privacy Policy","/privacy"]].map(([l,h]) => (
                <Link key={l} href={h} style={{ display:"block", fontSize:13, color:C.textFaint, textDecoration:"none", marginBottom:10 }}>{l}</Link>
              ))}
            </div>
          </div>
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:24, ...flex("center","space-between"), flexWrap:"wrap", gap:8 }}>
            <p style={{ fontSize:11, color:"#334155" }}>© {new Date().getFullYear()} YoyoSMM · www.yoyosmm.online · All rights reserved.</p>
            <p style={{ fontSize:11, color:"#334155" }}>Made with ❤️ for SMM operators worldwide</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Curve Chart ─────────────────────────────────── */
function CurveChart({ style, duration }: { style:"ORGANIC"|"FAST"|"AGGRESSIVE"; duration:number }) {
  const N = 26;
  const r = style==="ORGANIC" ? 0.4 : style==="FAST" ? 0.65 : 0.9;
  const t0 = style==="ORGANIC" ? duration*0.38 : style==="FAST" ? duration*0.28 : duration*0.18;
  const pts: number[] = [];
  for (let i=0;i<N;i++) {
    const x = (i/(N-1))*duration;
    const v = 100/(1+Math.exp(-r*(x-t0)));
    pts.push(Math.max(2, v + Math.sin(i*1.8)*1.5));
  }
  const max = Math.max(...pts);
  const W=520, H=160, pad=18;
  const xs = pts.map((_,i) => pad+(i/(N-1))*(W-2*pad));
  const ys = pts.map(p => H-pad-(p/max)*(H-2*pad));
  const line = xs.map((x,i) => `${i===0?"M":"L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  const area = line + ` L ${xs[N-1].toFixed(1)} ${H-pad} L ${xs[0].toFixed(1)} ${H-pad} Z`;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", color:"#475569" }}>Dynamic Pacing Curve</span>
        <span style={{ fontSize:11, fontWeight:700, color:"#F59E0B" }}>{style} · {duration}h</span>
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width:"100%", overflow:"visible" }}>
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25,0.5,0.75].map(r => (
          <line key={r} x1={pad} y1={H-pad-r*(H-2*pad)} x2={W-pad} y2={H-pad-r*(H-2*pad)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}
        <path d={area} fill="url(#cg)" />
        <path d={line} fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {[0,Math.floor(N/4),Math.floor(N/2),Math.floor(3*N/4),N-1].map(i => (
          <text key={i} x={xs[i]} y={H+2} fill="#475569" fontSize="8" textAnchor="middle">{Math.round((i/(N-1))*duration)}h</text>
        ))}
      </svg>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginTop:16 }}>
        {[
          ["🌅 Warmup", `0–${Math.round(duration*0.2)}h`, "Gradual Pacing"],
          ["⚡ Peak", `${Math.round(duration*0.2)}–${Math.round(duration*0.65)}h`, "High Volume"],
          ["🌙 Decay", `${Math.round(duration*0.65)}–${duration}h`, "Natural Cooldown"],
        ].map(([phase,range,action]) => (
          <div key={phase} style={{ padding:"10px 8px", borderRadius:10, border:"1px solid rgba(255,255,255,0.06)", background:"rgba(255,255,255,0.015)", textAlign:"center" }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:"0.05em" }}>{phase}</div>
            <div style={{ fontSize:12, fontWeight:800, color:"#F59E0B", margin:"4px 0 2px" }}>{range}</div>
            <div style={{ fontSize:10, color:"#334155" }}>{action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
