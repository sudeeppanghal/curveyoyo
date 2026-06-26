"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ─── Data ─────────────────────────────────────────── */
const PANELS = [
  "SMMKings","Peakerr","JustAnotherPanel","SMMHeaven","NicePanel",
  "FollowersGain","Crescitaly","SmmFarm","SmmRaja","SmmPanel",
  "GrowthPanel","ViewsPanel","SMMPro","PanelBros","ViewStore",
];

const FEATURES = [
  {
    id:"panel", icon:"🔑", label:"your own panel",
    title:"Your panel, your balance, our engine",
    body:"Connect any SMM panel via API key. We deliver through your existing balance — zero middleman, zero markup. You stay in full control of your funds and relationships.",
    bullets:["Connect SMMKings, Peakerr, or any REST API panel","Zero markup — pay panel rates directly","Revoke access or swap panels anytime","AES-256 encrypted key storage"],
  },
  {
    id:"curve", icon:"📈", label:"organic curve",
    title:"Warmup → Peak → Decay. Built-in.",
    body:"Every campaign follows a logistic S-curve that matches how real viral content spreads. Configure duration, style, and intensity per reel.",
    bullets:["Logistic growth model (viral S-curve)","Warmup: first 2–4 hrs build naturally","Peak: hours 4–12, clustered at high-traffic windows","Decay: natural cooldown, no sudden stops"],
  },
  {
    id:"failover", icon:"⚡", label:"priority failover",
    title:"Multi-panel priority failover",
    body:"Set priority levels (1, 2, 3…) across your connected panels. If Panel 1 is busy or down, Panel 2 takes over automatically in under 1 second.",
    bullets:["Sub-1s panel switching","Set load %: Panel A=70%, B=25%, C=5%","Orders queue if all panels down","You're notified — customers never notice"],
  },
  {
    id:"preview", icon:"👁", label:"live preview",
    title:"See the curve before you confirm",
    body:"See the exact delivery schedule before the campaign goes live. Adjust pacing, duration, and style — the preview chart updates live.",
    bullets:["Interactive S-curve preview chart","Drag sliders — chart updates instantly","See exact hourly batch sizes","Confirm only when you're happy"],
  },
  {
    id:"agency", icon:"🏢", label:"agency stack",
    title:"Built for operators running at scale",
    body:"Bulk reel import, multi-client management, and unlimited campaigns. Everything you need to run an SMM operation without burning out.",
    bullets:["Bulk CSV reel import","Unlimited reels per account","Real-time dashboard with live order tracking","One dashboard, every client"],
  },
];

/* ─── Intersection Observer hook ──────────────────── */
function useScrollAnimate() {
  useEffect(() => {
    const els = document.querySelectorAll(".scroll-animate");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add("visible"); } }),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ─── Landing Page ─────────────────────────────────── */
export default function Home() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [stickyDismissed, setStickyDismissed] = useState(false);
  const [progress, setProgress] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useScrollAnimate();

  /* Nav scroll + progress bar */
  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY;
      const total = document.body.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
      setNavScrolled(scrolled > 40);
      if (!stickyDismissed) setStickyVisible(scrolled > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [stickyDismissed]);

  const feat = FEATURES[activeFeature];

  return (
    <div className="min-h-screen text-white" style={{ background:"#0B0B0F", backgroundImage:"radial-gradient(ellipse 80% 50% at 50% -20%, rgba(245,158,11,0.13), transparent), linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)", backgroundSize:"auto, 60px 60px, 60px 60px" }}>

      {/* ── Page progress bar ── */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-[3px] pointer-events-none" style={{background:"rgba(245,158,11,0.12)"}}>
        <div id="page-progress-fill" className="h-full" style={{width:`${progress}%`, background:"linear-gradient(90deg, #F59E0B 0%, #EF4444 100%)", transition:"width 80ms linear"}} />
      </div>

      {/* ── Sticky bottom CTA ── */}
      {!stickyDismissed && (
        <div className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ${stickyVisible ? "translate-y-0" : "translate-y-full"}`} style={{background:"rgba(11,11,15,0.95)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:"1px solid rgba(245,158,11,0.15)"}}>
          <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-400 hidden sm:block truncate">🔥 Lifetime deal — pay once, use forever. Only <strong className="text-amber-400">$20</strong></p>
            <Link href="/signup" className="px-5 py-2.5 rounded-xl font-semibold text-sm text-[#0B0B0F] shrink-0 transition-all hover:opacity-90 hover:scale-[1.02]" style={{background:"#F59E0B"}}>Start 1-Day Free Trial →</Link>
            <button onClick={() => { setStickyDismissed(true); setStickyVisible(false); }} className="text-gray-600 hover:text-gray-400 text-xl leading-none shrink-0 w-7 h-7 flex items-center justify-center" aria-label="Dismiss">×</button>
          </div>
        </div>
      )}

      {/* ── Announcement bar ── */}
      <div className="w-full py-2.5 px-4 text-center text-xs font-medium" style={{background:"rgba(99,102,241,0.18)",color:"#a5b4fc",borderBottom:"1px solid rgba(99,102,241,0.2)"}}>
        🚀&nbsp; PC Desktop + Android App coming soon — Sign up now to get early access
      </div>

      {/* ── Navigation ── */}
      <nav className={`sticky top-[3px] z-50 border-b transition-all duration-300`} style={{background: navScrolled ? "rgba(11,11,15,0.95)" : "rgba(11,11,15,0.85)", backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)", borderColor:"rgba(255,255,255,0.06)"}}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{background:"#F59E0B",color:"#0B0B0F"}}>Y</div>
            <span className="font-semibold text-lg">YoyoSMM</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            {[["Features","#services"],["How It Works","#how-it-works"],["Pricing","#pricing"],["FAQ","#faq"],["Blog","/blog"]].map(([label,href])=>(
              <a key={label} href={href} className="text-gray-400 hover:text-white text-sm transition-colors duration-300">{label}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block px-4 py-2 rounded-full border text-sm font-medium transition-all duration-300 hover:bg-white/5" style={{borderColor:"rgba(255,255,255,0.06)"}}>Sign in</Link>
            <Link href="/signup" className="px-5 py-2.5 rounded-full bg-white text-[#0B0B0F] font-medium text-sm hover:opacity-95 transition-all duration-300 hover:shadow-lg hover:shadow-white/10">Get started</Link>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative max-w-6xl mx-auto px-6 pt-16 pb-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{background:"radial-gradient(ellipse 60% 60% at 50% 0%, rgba(245,158,11,0.08), transparent 70%)"}} />
        <div className="grid lg:grid-cols-2 gap-12 items-center relative">
          {/* Left copy */}
          <div className="text-center lg:text-left">
            <div className="animate-fade-in-up opacity-0">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-6 tracking-wide" style={{background:"rgba(99,102,241,0.18)",color:"#a5b4fc",border:"1px solid rgba(99,102,241,0.35)"}}>◆&nbsp; the layer that sits on top of your panels</span>
            </div>
            <div className="animate-fade-in-up opacity-0 delay-100 mb-6">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.15] text-white">
                Stop juggling three panel tabs.
                <span style={{display:"block"}}>
                  <span style={{background:"linear-gradient(135deg, #F59E0B 20%, #F97316 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", display:"inline-block"}}>Run them like one.</span>
                </span>
              </h1>
            </div>
            <div className="animate-fade-in-up opacity-0 delay-200 mb-8">
              <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Connect any SMM panel API and YoyoSMM handles the routing, failover, and organic delivery curves across Instagram, TikTok, and YouTube — automatically.
              </p>
            </div>
            <div className="animate-fade-in-up opacity-0 delay-300 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-4">
              <Link href="/signup" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-[#0B0B0F] font-semibold text-base hover:opacity-95 transition-all duration-300 hover:shadow-xl hover:shadow-white/15 text-center">Start 1-Day Free Trial →</Link>
              <a href="#how-it-works" className="w-full sm:w-auto px-8 py-4 rounded-2xl border font-medium text-sm transition-all duration-300 hover:bg-white/5 text-center" style={{borderColor:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.9)"}}>see it work</a>
            </div>
            <div className="animate-fade-in-up opacity-0 delay-400 flex flex-wrap justify-center lg:justify-start gap-3 text-sm">
              {["Connect the SMM panel you already use, we handle the curves","Organic curves with warmup, peak, and cooldown, built in","Multi-panel failover in under a second","Lifetime deal — pay $20 once, use forever"].map(t=>(
                <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.8)",border:"1px solid rgba(255,255,255,0.06)"}}>
                  <span style={{color:"#F59E0B"}}>✓</span> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — sign-in widget */}
          <div className="animate-fade-in-up opacity-0 delay-300 flex justify-center lg:justify-end">
            <div className="w-full max-w-sm rounded-2xl border p-8 shadow-xl" style={{background:"rgba(255,255,255,0.04)",borderColor:"rgba(255,255,255,0.06)"}}>
              <div className="flex justify-center mb-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg" style={{background:"#F59E0B",color:"#0B0B0F"}}>Y</div>
              </div>
              <h2 className="text-xl font-semibold text-white text-center mb-6">welcome back</h2>
              <Link href="/login" className="block w-full py-3.5 rounded-xl text-center font-medium text-white transition-all duration-300 hover:opacity-95" style={{background:"rgba(99,102,241,0.9)"}}>Sign in to dashboard</Link>
              <p className="text-center text-sm text-gray-400 mt-4">new here?{" "}<Link href="/signup" className="text-indigo-400 hover:underline">Create your account</Link></p>
              <div className="mt-6 pt-6 border-t" style={{borderColor:"rgba(255,255,255,0.06)"}}>
                <p className="text-center text-xs text-gray-500">🔒 Lifetime deal · $20 one-time · no monthly fees</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature pills strip ── */}
      <section className="border-y py-5" style={{borderColor:"rgba(255,255,255,0.06)"}}>
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap justify-center gap-3">
          {["connect your own panel API","organic, human-like delivery","multi-panel priority failover","cancel anytime, no lock-in","PC + Android app coming soon"].map(t=>(
            <span key={t} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium" style={{background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.9)",border:"1px solid rgba(255,255,255,0.06)"}}>
              <span style={{color:"#F59E0B"}}>✓</span> {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── Social proof logos ── */}
      <section className="border-y py-7" style={{borderColor:"rgba(255,255,255,0.06)"}}>
        <div className="max-w-5xl mx-auto px-6 scroll-animate">
          <p className="text-center text-xs font-semibold uppercase tracking-widest mb-6" style={{color:"#4b5563"}}>built for operators on</p>
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-10">
            {[["🛒","Whop"],["🚀","ProductHunt"],["✕","Twitter / X"],["🔴","Reddit"],["💬","Discord Communities"]].map(([icon,name])=>(
              <div key={name} className="flex items-center gap-2 transition-all duration-200 hover:opacity-100 select-none" style={{color:"#4b5563",opacity:0.7}}>
                <span className="text-lg">{icon}</span>
                <span className="text-sm font-semibold tracking-wide">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live stats grid ── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="scroll-animate text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4" style={{background:"rgba(16,185,129,0.12)",color:"#34d399",border:"1px solid rgba(52,211,153,0.25)"}}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 live-dot inline-block" />Live Platform Stats
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">delivering organic growth right now</h2>
        </div>
        <div className="scroll-animate rounded-2xl border grid grid-cols-2 sm:grid-cols-4 gap-0 overflow-hidden" style={{background:"rgba(255,255,255,0.03)",borderColor:"rgba(255,255,255,0.06)"}}>
          {[["Sub-1s","Multi-panel failover"],["60-second","API integration"],["Unlimited","Bulk reel imports"],["120+","Supported panel APIs"]].map(([val,label])=>(
            <div key={label} className="p-6 sm:p-8 text-center border-r border-b last:border-r-0" style={{borderColor:"rgba(255,255,255,0.06)"}}>
              <p className="text-2xl sm:text-3xl font-bold text-white">{val}</p>
              <p className="text-sm text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Problem / Solution ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="scroll-animate rounded-2xl border p-8 h-full" style={{background:"rgba(220,38,38,0.04)",borderColor:"rgba(220,38,38,0.15)"}}>
            <div className="flex items-center gap-3 mb-6"><span className="text-2xl">😤</span><h3 className="text-xl font-bold text-white">why flat panel delivery kills your reach</h3></div>
            <ul className="space-y-3">
              {["Flat 24/7 delivery creates unnatural traffic patterns that hurt long-term campaign performance","Single panel = single point of failure. Down for 1 hour, your orders disappear","No delivery preview — you're flying blind on every single order you place","Engagement ratios are imbalanced — all views, zero likes or saves","Balance locked with the panel — no flexibility, no control, no exit"].map(t=>(
                <li key={t} className="flex items-start gap-3 text-sm text-gray-400"><span className="mt-0.5 shrink-0 text-red-400">✗</span>{t}</li>
              ))}
            </ul>
          </div>
          <div className="scroll-animate rounded-2xl border p-8 h-full" style={{background:"rgba(245,158,11,0.05)",borderColor:"rgba(245,158,11,0.2)"}}>
            <div className="flex items-center gap-3 mb-6"><span className="text-2xl">✨</span><h3 className="text-xl font-bold text-white">what organic delivery actually looks like</h3></div>
            <ul className="space-y-3">
              {["Real growth curve with warmup, peak, and decay, modeled on natural traffic distribution","Multi-panel priority failover — Panel 1 down? Panel 2 activates in under 1 second","Full delivery preview before every campaign — see the exact curve before confirming","Balanced engagement ratios built in — likes, saves, shares proportional to views","Your own panel API and balance — total control, zero vendor lock-in"].map(t=>(
                <li key={t} className="flex items-start gap-3 text-sm text-gray-300"><span className="mt-0.5 shrink-0" style={{color:"#F59E0B"}}>✓</span>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Marquee ── */}
      <section className="py-6 overflow-hidden border-y" style={{borderColor:"rgba(255,255,255,0.06)"}}>
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-500 mb-5">Compatible with any SMM panel API</p>
        <div className="overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none" style={{background:"linear-gradient(90deg, #0B0B0F, transparent)"}} />
          <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none" style={{background:"linear-gradient(-90deg, #0B0B0F, transparent)"}} />
          <div className="landing-marquee gap-4">
            {[...PANELS,...PANELS].map((p,i)=>(
              <span key={i} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap mx-2" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.65)"}}>
                <span style={{color:"#F59E0B",fontSize:"0.6rem"}}>◆</span>{p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform support ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="scroll-animate text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">one engine, every major platform</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">Pick your platform when adding a reel — organic curve delivery, per-platform engagement ratios, and panel routing handled automatically.</p>
        </div>
        <div className="scroll-animate grid sm:grid-cols-2 gap-6">
          <div className="rounded-2xl border p-6" style={{background:"rgba(34,197,94,0.06)",borderColor:"rgba(34,197,94,0.2)"}}>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-4">✓ Live now</p>
            <div className="flex flex-wrap gap-2">
              {[["📷","Instagram"],["🎵","TikTok"],["▶️","YouTube"]].map(([icon,name])=>(
                <span key={name} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white" style={{background:"rgba(34,197,94,0.18)",border:"1px solid rgba(34,197,94,0.35)"}}><span className="text-base">{icon}</span>{name}</span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border p-6" style={{background:"rgba(255,255,255,0.03)",borderColor:"rgba(255,255,255,0.06)"}}>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">⏳ Coming soon</p>
            <div className="flex flex-wrap gap-2">
              {[["✕","X (Twitter)"],["👍","Facebook"],["👻","Snapchat"],["@","Threads"],["in","LinkedIn"]].map(([icon,name])=>(
                <span key={name} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium" style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.55)"}}><span className="text-base">{icon}</span>{name}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Why choose YoyoSMM (4 cards) ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="scroll-animate text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">why operators choose YoyoSMM</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[["🔑","your balance, your control","We're not a panel. We're the routing and timing layer that sits on top of yours. Connect your existing SMM API, deliver through your own balance, and you keep full control of the funds."],["📈","organic timing by default","Every order uses human-like warmup, peak-hour boosting, and a natural decay phase. It's the default behaviour. No extra setup."],["⚡","built for resellers","Multi-panel routing, priority failover, and bulk reel management. Built for operators running multiple accounts and a lot of clients."],["💰","lifetime deal — $20 once","No monthly subscriptions. No recurring fees. Pay $20 once and use YoyoSMM forever. Early adopter pricing — won't last."]].map(([icon,title,body])=>(
            <div key={title} className="scroll-animate rounded-2xl border p-6 h-full transition-all duration-300 hover:border-amber-500/20 hover:scale-[1.02]" style={{background:"rgba(255,255,255,0.03)",borderColor:"rgba(255,255,255,0.06)"}}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 icon-float" style={{background:"rgba(245,158,11,0.15)",color:"#F59E0B"}}>{icon}</div>
              <h3 className="font-semibold text-white text-lg mb-2">{title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-14">
          <div className="scroll-animate"><h2 className="text-3xl sm:text-4xl font-bold text-white">how it works</h2></div>
          <div className="scroll-animate"><Link href="/signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all duration-300 hover:opacity-95" style={{background:"rgba(99,102,241,0.9)"}}>open the dashboard →</Link></div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[["1","rgba(99,102,241,0.85)","sign up","Create your account in about twenty seconds. Start your 1-day free trial instantly — no credit card required."],["2","rgba(34,197,94,0.85)","connect your panel","Paste your panel's API URL and key in settings. Set a priority on each panel. We use your existing balance."],["3","rgba(245,158,11,0.85)","add a reel, see the curve","Paste a reel URL. Pick view and engagement targets. The growth curve renders before you confirm."],["4","rgba(236,72,153,0.85)","walk away","We handle timing, ratios, and panel failover. You watch it run live in the dashboard."]].map(([num,color,title,body])=>(
            <div key={num} className="scroll-animate text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white mx-auto mb-4" style={{background:color}}>{num}</div>
              <h3 className="font-semibold text-white mb-2">0{num} → {title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature grid (6 cards) ── */}
      <section id="services" className="max-w-6xl mx-auto px-6 py-24">
        <div className="scroll-animate text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">built for operators, not beginners</h2>
          <p className="text-gray-400 max-w-xl mx-auto">Every feature is designed for serious creators, agencies, and resellers who need delivery that performs, not delivery that just completes.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[["🔑","bring your own panel API","Not a middleman. Connect any SMM panel using your own API key. We deliver through your existing balance — you keep full control.",null],["📈","organic curve engine","Every campaign follows a growth curve that matches how real viral content actually spreads. You configure duration, style, and intensity on each reel.",null],["⚡","multi-panel priority failover","Set priority levels (1, 2, 3…) across your connected panels. If Panel 1 is busy or down, Panel 2 takes over automatically. Zero lost orders.",null],["🕐","peak-hour intelligence","Orders cluster during high-traffic windows and slow at night — what real engagement looks like. Mimics realistic audience-engagement timing patterns.",null],["👁","live campaign preview","See the exact delivery curve before the campaign goes live. Adjust pacing, duration, and style — the preview updates with you. No guessing.",null],["📱","PC and Android app","Desktop and mobile apps are in development. Manage campaigns, monitor delivery, and check orders from anywhere. Sign up for early access.","Coming Soon"]].map(([icon,title,body,badge])=>(
            <div key={title as string} className="scroll-animate">
              <div className={`rounded-2xl border p-6 h-full transition-all duration-300 hover:scale-[1.02] relative`} style={badge ? {background:"rgba(99,102,241,0.07)",borderColor:"rgba(99,102,241,0.3)"} : {background:"rgba(255,255,255,0.03)",backdropFilter:"blur(12px)",borderColor:"rgba(255,255,255,0.06)"}}>
                {badge && <span className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-xs font-semibold" style={{background:"rgba(99,102,241,0.25)",color:"#a5b4fc"}}>{badge}</span>}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4 icon-float" style={badge ? {background:"rgba(99,102,241,0.15)",color:"#a5b4fc"} : {background:"rgba(245,158,11,0.12)",color:"#F59E0B"}}>{icon}</div>
                <h3 className="font-semibold text-white text-lg mb-2 pr-20">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Interactive feature tabs ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="scroll-animate text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">every feature, built for operators</h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm">Click any feature to see exactly how it works and what it does for your delivery.</p>
        </div>
        <div className="scroll-animate flex flex-wrap justify-center gap-2 mb-8">
          {FEATURES.map((f,i)=>(
            <button key={f.id} onClick={()=>setActiveFeature(i)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200" style={activeFeature===i ? {background:"rgba(245,158,11,0.15)",color:"#F59E0B",border:"1px solid rgba(245,158,11,0.35)"} : {background:"rgba(255,255,255,0.04)",color:"rgba(255,255,255,0.5)",border:"1px solid rgba(255,255,255,0.07)"}}>
              <span>{f.icon}</span>{f.label}
            </button>
          ))}
        </div>
        <div className="scroll-animate rounded-2xl border p-8 sm:p-12 transition-all duration-300" style={{background:"rgba(255,255,255,0.03)",borderColor:"rgba(255,255,255,0.07)"}}>
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5" style={{background:"rgba(245,158,11,0.12)",color:"#F59E0B"}}>{feat.icon}</div>
              <h3 className="text-2xl font-bold text-white mb-3">{feat.title}</h3>
              <p className="text-gray-400 leading-relaxed mb-6">{feat.body}</p>
              <ul className="space-y-2.5">
                {feat.bullets.map(b=>(
                  <li key={b} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <span className="mt-0.5 shrink-0" style={{color:"#F59E0B"}}>✓</span>{b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl p-6 relative overflow-hidden" style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",minHeight:"220px"}}>
              <DeliveryCurveChart featureId={feat.id} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 py-24">
        <div className="scroll-animate text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4" style={{background:"rgba(245,158,11,0.12)",color:"#F59E0B",border:"1px solid rgba(245,158,11,0.25)"}}>
            🔥 Limited-Time Lifetime Deal
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">one price. forever.</h2>
          <p className="text-gray-400 max-w-xl mx-auto">No monthly subscriptions. No recurring charges. Pay once and own YoyoSMM for life.</p>
        </div>
        <div className="scroll-animate max-w-md mx-auto">
          <div className="relative rounded-3xl border p-8 sm:p-10 text-center overflow-hidden" style={{background:"rgba(245,158,11,0.06)",borderColor:"rgba(245,158,11,0.3)"}}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{background:"linear-gradient(90deg, #F59E0B, #F97316)"}} />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6" style={{background:"rgba(245,158,11,0.15)",color:"#F59E0B"}}>⚡ Lifetime Access</div>
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-gray-400 line-through text-xl">$99</span>
                <span className="text-xs px-2 py-0.5 rounded-full text-emerald-400 font-semibold" style={{background:"rgba(52,211,153,0.12)"}}>80% OFF</span>
              </div>
              <p className="text-6xl font-bold text-white">$20</p>
              <p className="text-gray-400 mt-2 text-sm">one-time payment · no renewals · ever</p>
            </div>
            <ul className="text-left space-y-3 mb-8">
              {["Unlimited reels & campaigns","Unlimited panel connections","Multi-panel priority failover","Organic S-curve delivery engine","Live delivery preview chart","Bulk CSV reel import","Real-time dashboard","1-day free trial included","Future updates included","PC + Android app (when released)"].map(f=>(
                <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{background:"rgba(245,158,11,0.15)",color:"#F59E0B"}}>✓</span>{f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="block w-full py-4 rounded-2xl font-bold text-lg text-[#0B0B0F] transition-all duration-300 hover:opacity-90 hover:scale-[1.02]" style={{background:"#F59E0B"}}>Get Lifetime Access — $20 →</Link>
            <p className="text-gray-500 text-xs mt-4">1-day free trial. Then $20 once. Cancel trial anytime.</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-24">
        <div className="scroll-animate text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">frequently asked questions</h2>
          <p className="text-gray-400">Can't find your answer? Email <a href="mailto:hello@yoyosmm.online" className="text-amber-400 hover:underline">hello@yoyosmm.online</a></p>
        </div>
        <div className="space-y-3">
          {[["Do I need to buy credits from YoyoSMM?","No. You connect your existing SMM panel account using its API URL and key. We deliver through your balance — we are not a panel, we are an organic delivery engine that sits on top of your panel. You keep full control of your funds."],["What SMM panels does it work with?","Any panel with a standard SMM API endpoint works. Popular options include SMMKings, Peakerr, JustAnotherPanel, and similar providers. You add the API URL and key in Settings — we handle the rest."],["How does multi-panel priority failover work?","You assign a priority number (1, 2, 3…) to each connected panel. When an order needs to be placed, we try Panel 1 first. If it's busy or fails, we automatically try Panel 2, then Panel 3. Zero lost orders, no manual switching."],["How does organic-style delivery affect campaign performance?","Gradual warmup, peak-hour clustering, realistic engagement ratios, and natural cooldown all spread delivery across natural traffic windows. The result is smoother delivery and more consistent campaign performance over time."],["Is the $20 really a one-time payment?","Yes, absolutely. $20 once, use YoyoSMM forever. No monthly fees, no annual renewals, no hidden charges. Future updates and the PC/Android app are also included."],["Is there a free trial?","Yes — 1-day free trial, no credit card required. You get full access to all features for 24 hours to test with your own SMM panel."],["How long does it take to set up?","Less than 5 minutes. Sign up, add your first SMM panel (copy-paste API key), and you're ready to place your first order."],["Is my API key safe?","Yes. API keys are AES-256 encrypted at rest, never logged in plain text, and never shared with anyone. You can revoke access anytime."]].map(([q,a],i)=>(
            <FAQItem key={i} question={q as string} answer={a as string} />
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="scroll-animate rounded-3xl p-12 relative overflow-hidden" style={{background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)"}}>
          <div className="absolute inset-0 pointer-events-none" style={{background:"radial-gradient(ellipse 60% 80% at 50% 50%, rgba(245,158,11,0.06), transparent)"}} />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to run your panels like one?</h2>
            <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">Join 500+ operators who deliver smarter. One-time $20, free trial included.</p>
            <Link href="/signup" className="inline-block px-10 py-4 rounded-2xl font-bold text-lg text-[#0B0B0F] transition-all duration-300 hover:opacity-90 hover:scale-[1.02]" style={{background:"#F59E0B"}}>Start 1-Day Free Trial →</Link>
            <p className="text-gray-500 text-sm mt-4">No credit card required · Cancel anytime · $20 lifetime after trial</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t" style={{borderColor:"rgba(255,255,255,0.06)"}}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{background:"#F59E0B",color:"#0B0B0F"}}>Y</div>
                <span className="font-semibold">YoyoSMM</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">Organic delivery engine for SMM operators. Connect any panel, deliver any platform.</p>
              <p className="text-xs text-gray-600 mt-3">support@yoyosmm.online</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-white mb-3">Product</h4>
              <ul className="space-y-2">
                {[["Features","#services"],["How it works","#how-it-works"],["Pricing","#pricing"],["FAQ","#faq"]].map(([label,href])=>(
                  <li key={label}><a href={href} className="text-sm text-gray-500 hover:text-white transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-white mb-3">Company</h4>
              <ul className="space-y-2">
                {[["About","/about"],["Blog","/blog"],["Contact","/contact"]].map(([label,href])=>(
                  <li key={label}><Link href={href} className="text-sm text-gray-500 hover:text-white transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-white mb-3">Legal</h4>
              <ul className="space-y-2">
                {[["Terms of Service","/terms"],["Privacy Policy","/privacy"],["Refund Policy","/refund"]].map(([label,href])=>(
                  <li key={label}><Link href={href} className="text-sm text-gray-500 hover:text-white transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{borderColor:"rgba(255,255,255,0.06)"}}>
            <p className="text-xs text-gray-600">© {new Date().getFullYear()} YoyoSMM · www.yoyosmm.online · All rights reserved.</p>
            <p className="text-xs text-gray-600">Made with ❤️ for SMM operators</p>
          </div>
        </div>
      </footer>

    </div>
  );
}

/* ─── Sub-components ────────────────────────────────── */

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border overflow-hidden transition-colors duration-200 scroll-animate" style={{background:"rgba(255,255,255,0.03)",borderColor: open ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.06)"}}>
      <button onClick={()=>setOpen(!open)} className="w-full px-6 py-5 flex justify-between items-start gap-4 text-left" aria-expanded={open}>
        <span className="font-semibold text-white text-sm sm:text-base leading-relaxed">{question}</span>
        <span className="text-amber-400 text-2xl leading-none shrink-0 transition-transform duration-300" style={{transform: open ? "rotate(45deg)" : "rotate(0)"}}>+</span>
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-gray-400 text-sm leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

function DeliveryCurveChart({ featureId }: { featureId: string }) {
  const points = generateCurvePoints(featureId);
  const max = Math.max(...points);
  const w = 280, h = 140, pad = 12;
  const xs = points.map((_,i) => pad + (i/(points.length-1))*(w-2*pad));
  const ys = points.map(p => h - pad - ((p/max)*(h-2*pad)));
  const d = xs.map((x,i) => `${i===0?"M":"L"} ${x} ${ys[i]}`).join(" ");
  const fill = [...xs.map((x,i)=>`${i===0?"M":"L"} ${x} ${ys[i]}`), `L ${xs[xs.length-1]} ${h-pad}`, `L ${xs[0]} ${h-pad}`, "Z"].join(" ");

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3 uppercase tracking-widest">Delivery curve preview</p>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="w-full">
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        <path d={fill} fill="url(#cg)" />
        <path d={d} fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {[0,6,12,18,23].map(i=>(
          <text key={i} x={xs[i]} y={h} fill="#6b7280" fontSize="9" textAnchor="middle">{i}h</text>
        ))}
      </svg>
      <div className="flex gap-4 mt-3">
        {[["🌅","Warmup","0-4h"],["⚡","Peak","4-12h"],["🌙","Decay","12-24h"]].map(([icon,label,range])=>(
          <div key={label} className="text-center">
            <div className="text-xs text-gray-500">{icon} {label}</div>
            <div className="text-xs text-amber-400 font-medium">{range}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function generateCurvePoints(featureId: string): number[] {
  const N = 24;
  return Array.from({length: N}, (_,t) => {
    const K = 100, r = featureId==="curve" ? 0.6 : featureId==="failover" ? 0.8 : 0.5, t0 = 8;
    const logistic = K / (1 + Math.exp(-r*(t-t0)));
    const noise = (Math.sin(t*2.3+1.2)*4 + Math.cos(t*1.7)*3) * 0.4;
    return Math.max(1, logistic + noise);
  });
}
