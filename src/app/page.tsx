"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

/* ─── Data ─────────────────────────────────────────── */
const PANELS = [
  "SMMKings", "Peakerr", "JustAnotherPanel", "SMMHeaven", "NicePanel",
  "FollowersGain", "Crescitaly", "SmmFarm", "SmmRaja", "SmmPanel",
  "GrowthPanel", "ViewsPanel", "SMMPro", "PanelBros", "ViewStore",
];

const FEATURES = [
  {
    id: "panel",
    icon: "🔑",
    label: "Your Own Panels",
    title: "Your panels, your balance, our engine",
    body: "Connect any SMM panel via API key. We deliver through your existing balance — zero middleman, zero markup. You stay in full control of your funds.",
    bullets: [
      "Connect SMMKings, Peakerr, or any REST API panel",
      "Zero markup — pay panel rates directly",
      "Revoke access or swap credentials anytime",
      "AES-256 encrypted key storage",
    ],
  },
  {
    id: "curve",
    icon: "📈",
    label: "Organic S-Curve",
    title: "Warmup → Peak → Decay. Natural Growth.",
    body: "Every campaign follows a logistic S-curve that matches how real viral content spreads. Configure duration, style, and intensity per platform.",
    bullets: [
      "Logistic growth model (viral S-curve)",
      "Warmup phase: first 2–4 hrs build naturally",
      "Peak phase: hours 4–12, clustered at high-traffic windows",
      "Decay phase: natural cooldown, no sudden stops",
    ],
  },
  {
    id: "failover",
    icon: "⚡",
    label: "Priority Failover",
    title: "Multi-panel priority failover routing",
    body: "Set priority levels across your connected panels. If Panel 1 is busy, out of stock, or slow, Panel 2 takes over automatically in under 1 second.",
    bullets: [
      "Sub-1s automatic panel switching",
      "Configure load distribution (e.g. Panel A=70%, B=30%)",
      "Orders queue if all panels are temporarily down",
      "Receive instant notifications of failover events",
    ],
  },
  {
    id: "preview",
    icon: "👁",
    label: "Live Schedule",
    title: "See the curve before you confirm",
    body: "See the exact delivery schedule before the campaign goes live. Adjust pacing, duration, and style — the preview chart updates live.",
    bullets: [
      "Interactive S-curve preview chart",
      "Adjust sliders to watch the schedule change",
      "See exact hourly batch sizes before ordering",
      "Deploy with absolute confidence",
    ],
  },
  {
    id: "agency",
    icon: "🏢",
    label: "Reseller Stack",
    title: "Built for operators running at scale",
    body: "Bulk campaign imports, multi-client management, and unlimited campaigns. Everything you need to run an SMM operation without burning out.",
    bullets: [
      "Bulk CSV campaign importer",
      "Unlimited reels and platforms per account",
      "Real-time campaign diagnostic dashboard",
      "One dashboard, every client account",
    ],
  },
];

/* ─── Redesigned Homepage ─────────────────────────── */
export default function Home() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);
  const [curveStyle, setCurveStyle] = useState<"ORGANIC" | "FAST" | "AGGRESSIVE">("ORGANIC");
  const [duration, setDuration] = useState(24);

  // Monitor nav scroll
  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const currentFeat = FEATURES[activeFeature];

  return (
    <div className="min-h-screen text-slate-100 selection:bg-amber-500/20 selection:text-amber-400" style={{ background: "#060608", backgroundImage: "radial-gradient(circle at 50% -10%, rgba(245,158,11,0.08) 0%, transparent 60%), radial-gradient(circle at 0% 40%, rgba(99,102,241,0.03) 0%, transparent 40%)" }}>
      
      {/* ── Navbar ── */}
      <nav className={`sticky top-0 z-50 border-b transition-all duration-300 ${navScrolled ? "bg-[#060608]/90 backdrop-blur-md border-white/5 py-3" : "bg-transparent border-transparent py-5"}`}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-base transition-transform group-hover:scale-105" style={{ background: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)", color: "#060608" }}>
              Y
            </div>
            <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">YoyoSMM</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            {[["Features", "#features"], ["How It Works", "#how-it-works"], ["Pricing", "#pricing"], ["FAQ", "#faq"]].map(([label, href]) => (
              <a key={label} href={href} className="text-sm text-slate-400 hover:text-slate-200 transition-colors duration-200">{label}</a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] shadow-lg shadow-amber-500/10" style={{ background: "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)", color: "#060608" }}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <header className="max-w-6xl mx-auto px-6 pt-16 pb-20 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6 border border-amber-500/20 bg-amber-500/5 text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> The Intelligent Layer On Top Of Your SMM Panels
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-[1.12] mb-6">
          Stop juggling SMM tabs.<br />
          <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">Run your panels like a single engine.</span>
        </h1>

        <p className="text-slate-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          Connect your existing SMM panel APIs. Automate priority failover, enforce organic delivery curves, and maintain balanced engagement ratios automatically.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/signup" className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold transition-all duration-200 hover:scale-[1.02] shadow-xl shadow-amber-500/10 text-center" style={{ background: "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)", color: "#060608" }}>
            Start 1-Day Free Trial →
          </Link>
          <a href="#how-it-works" className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/10 bg-white/5 text-slate-300 font-semibold text-base transition-all duration-200 hover:bg-white/10 text-center">
            See How It Works
          </a>
        </div>

        {/* ── Highlight features list ── */}
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
          {[
            ["🔑", "Bring Your Own Panel", "Connect any REST API provider"],
            ["📈", "Organic Pacing Curves", "Warmup, peak, and decay phases"],
            ["⚡", "Priority Failover", "Auto-switch panels in <1s"],
            ["💰", "One-Time Payment", "$20 once for lifetime access"]
          ].map(([icon, title, desc]) => (
            <div key={title} className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md">
              <span className="text-2xl mb-3 block">{icon}</span>
              <h3 className="font-semibold text-white text-sm mb-1">{title}</h3>
              <p className="text-slate-500 text-xs">{desc}</p>
            </div>
          ))}
        </div>
      </header>

      {/* ── Partner Panel Marquee ── */}
      <section className="border-y border-white/5 py-6 bg-white/[0.01] overflow-hidden">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-600 mb-4">Compatible with any standard SMM API</p>
        <div className="relative w-full overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#060608] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#060608] to-transparent z-10 pointer-events-none" />
          <div className="landing-marquee flex gap-4">
            {[...PANELS, ...PANELS].map((p, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-slate-400 border border-white/5 bg-white/[0.02] mx-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/40" /> {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Stats / Social Proof ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["99.98%", "Delivery Success Rate", "Automatic failover catches downtime instantly"],
            ["< 1 Second", "Panel Switch Speed", "Zero delay when prioritizing backups"],
            ["120+", "Supported Providers", "Works with any standard REST API panel"]
          ].map(([val, title, desc]) => (
            <div key={title} className="p-8 rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent">
              <h3 className="text-3xl sm:text-4xl font-extrabold text-amber-400 mb-1">{val}</h3>
              <p className="font-semibold text-white text-sm mb-2">{title}</p>
              <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Interactive Demo Section ── */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Every feature built for professionals</h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">Toggle curve styles or duration to see how YoyoSMM handles delivery pacing dynamically before launching.</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Controls + Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-6">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 block">1. Choose Delivery Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["ORGANIC", "FAST", "AGGRESSIVE"] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => setCurveStyle(style)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                        curveStyle === style
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : "border-white/5 bg-white/[0.01] text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  <span>2. Duration</span>
                  <span className="text-amber-400 font-bold">{duration} Hours</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="72"
                  step="6"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div className="pt-4 border-t border-white/5 space-y-3">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <span className="text-emerald-400">✓</span> Smooth S-Curve delivery pacing
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <span className="text-emerald-400">✓</span> Dynamic batch calculations
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <span className="text-emerald-400">✓</span> No spikes — mimics actual viral traffic
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {FEATURES.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFeature(i)}
                  className={`flex-1 py-3 px-2 rounded-xl text-center text-xs font-semibold border transition-all ${
                    activeFeature === i
                      ? "border-amber-500/30 bg-amber-500/5 text-amber-400"
                      : "border-white/5 bg-white/[0.01] text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Graph Render */}
          <div className="lg:col-span-7 rounded-2xl border border-white/5 bg-white/[0.02] p-8 space-y-6">
            <div className="flex items-start gap-4">
              <span className="text-3xl p-3 rounded-xl bg-white/[0.02] border border-white/5">{currentFeat.icon}</span>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">{currentFeat.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">{currentFeat.body}</p>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {currentFeat.bullets.map((b) => (
                    <li key={b} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-amber-500 shrink-0">✓</span> {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5">
              <InteractiveCurveChart style={curveStyle} duration={duration} />
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Simple onboarding</h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">Get fully set up and start pacing your campaigns in under three minutes.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {[
            ["01", "Create Account", "Sign up in 20 seconds. No credit card required to start your free trial."],
            ["02", "Connect Panels", "Add API credentials for SMM panels in settings. Configure backup priorities."],
            ["03", "Configure Campaign", "Paste your Reel/Video URL, set views target, and pick pacing style."],
            ["04", "Watch it Deliver", "Sit back. We handle timing ratios, S-curve calculations, and failovers."]
          ].map(([step, title, desc]) => (
            <div key={step} className="text-center space-y-3 relative group">
              <div className="w-12 h-12 rounded-full border border-white/10 bg-white/[0.02] flex items-center justify-center text-sm font-bold text-amber-400 mx-auto transition-transform group-hover:scale-105">
                {step}
              </div>
              <h3 className="font-semibold text-white text-base">{title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing Section ── */}
      <section id="pricing" className="max-w-4xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold border border-amber-500/20 bg-amber-500/5 text-amber-400 mb-3">
            Limited-Time Special Offer
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">One price. Lifetime access.</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">No subscriptions. No renewals. Own the timing layer for life.</p>
        </div>

        <div className="max-w-md mx-auto rounded-3xl border border-amber-500/30 bg-amber-500/[0.02] p-8 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-slate-500 line-through text-lg">$99</span>
            <span className="text-xs px-2 py-0.5 rounded-full text-emerald-400 font-bold bg-emerald-500/10">80% OFF</span>
          </div>

          <p className="text-6xl font-extrabold text-white mb-2">$20</p>
          <p className="text-slate-400 text-xs mb-8">One-time payment · Pay once, use forever</p>

          <ul className="text-left space-y-3 mb-8">
            {[
              "Unlimited Campaigns & Reels",
              "Unlimited Panel API Connections",
              "Pacing engine (Organic, Fast, Aggressive)",
              "Multi-panel failover routing logic",
              "Bulk campaign CSV importer",
              "Real-time campaigns dashboard",
              "Future platform updates included",
              "1-day free trial (no card required)"
            ].map((f) => (
              <li key={f} className="flex items-center gap-3 text-xs text-slate-300">
                <span className="w-4 h-4 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center text-[10px]">✓</span> {f}
              </li>
            ))}
          </ul>

          <Link href="/signup" className="block w-full py-4 rounded-xl font-bold text-slate-900 transition-all duration-200 hover:opacity-90 hover:scale-[1.02]" style={{ background: "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)" }}>
            Get Lifetime Access
          </Link>
          <p className="text-slate-500 text-[10px] mt-3">Start with 1-day free trial. Cancel anytime.</p>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-20 border-t border-white/5">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Frequently asked questions</h2>
          <p className="text-slate-400 text-sm">Need help? Get in touch at <a href="mailto:support@yoyosmm.online" className="text-amber-400 hover:underline">support@yoyosmm.online</a></p>
        </div>

        <div className="space-y-4">
          {[
            ["Do I need to deposit funds or buy credits on YoyoSMM?", "No. You connect your own SMM panel credentials using their API keys. Orders are placed through your existing panel accounts and balances directly—we charge zero markups and take no middleman cuts."],
            ["Which SMM panels are supported?", "Any panel that uses a standard REST API is supported. This includes Peakerr, SMMKings, JustAnotherPanel, and almost all major SMM API providers. Simply enter your API key and endpoint in settings."],
            ["How does multi-panel priority failover work?", "You assign prioritizations to your panels (e.g. Panel A = Priority 1, Panel B = Priority 2). When placing an order, if Panel A fails, returns an error, or is slow, we switch to Panel B instantly, ensuring zero order drops."],
            ["What is S-Curve pacing?", "Standard panels deliver views in a single flat spike, which looks artificial. Our engine schedules orders dynamically over a set duration, mimicking organic growth with gradual warmup, peak traffic hours, and natural decay."],
            ["Is the $20 payment truly a lifetime purchase?", "Yes. A single $20 purchase grants lifetime access to the platform. No renewals, no hidden costs, and all future feature updates are included."],
            ["Is my API key secure?", "Completely. All SMM panel API keys are AES-256 encrypted at rest. We never log keys in plaintext, and you can swap or revoke credentials at any time."]
          ].map(([q, a], i) => (
            <FAQItem key={i} question={q} answer={a} />
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 bg-[#060608] py-12">
        <div className="max-w-6xl mx-auto px-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-[#060608]" style={{ background: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)" }}>
                Y
              </div>
              <span className="font-semibold text-white text-base">YoyoSMM</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">The intelligent scheduling and timing layer on top of SMM panels. Connect once, pace organically.</p>
          </div>
          <div>
            <h4 className="font-semibold text-xs text-white uppercase tracking-wider mb-3">Product</h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-xs text-white uppercase tracking-wider mb-3">Company</h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-xs text-white uppercase tracking-wider mb-3">Legal</h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-slate-600">© {new Date().getFullYear()} YoyoSMM · www.yoyosmm.online · All rights reserved.</p>
          <p className="text-[10px] text-slate-600">Made with ❤️ for SMM operators</p>
        </div>
      </footer>
    </div>
  );
}

/* ─── Helper Components ────────────────────────────── */

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-xl border transition-all ${open ? "border-amber-500/20 bg-amber-500/[0.01]" : "border-white/5 bg-white/[0.01] hover:bg-white/[0.02]"}`}>
      <button onClick={() => setOpen(!open)} className="w-full px-6 py-5 flex justify-between items-center gap-4 text-left">
        <span className="font-semibold text-white text-sm sm:text-base">{question}</span>
        <span className={`text-amber-500 text-xl transition-transform duration-200 ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

function InteractiveCurveChart({ style, duration }: { style: "ORGANIC" | "FAST" | "AGGRESSIVE"; duration: number }) {
  const N = 24;
  const points: number[] = [];
  
  // Parameter tuning based on controls
  const r = style === "ORGANIC" ? 0.45 : style === "FAST" ? 0.7 : 0.95;
  const t0 = style === "ORGANIC" ? duration * 0.35 : style === "FAST" ? duration * 0.25 : duration * 0.15;
  const K = 100;

  for (let t = 0; t < N; t++) {
    const x = (t / (N - 1)) * duration;
    const logistic = K / (1 + Math.exp(-r * (x - t0)));
    const noise = (Math.sin(t * 2) * 3 + Math.cos(t * 1.5) * 2) * 0.45;
    points.push(Math.max(2, logistic + noise));
  }

  const max = Math.max(...points);
  const w = 480, h = 180, pad = 16;
  const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (w - 2 * pad));
  const ys = points.map((p) => h - pad - (p / max) * (h - 2 * pad));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
  const fill = [...xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`), `L ${xs[xs.length - 1]} ${h - pad}`, `L ${xs[0]} ${h - pad}`, "Z"].join(" ");

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-slate-500">
        <span>Dynamic Pacing Curve</span>
        <span className="text-amber-500">{style} - {duration}h</span>
      </div>
      <div className="w-full overflow-hidden">
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.00" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={pad}
              y1={h - pad - ratio * (h - 2 * pad)}
              x2={w - pad}
              y2={h - pad - ratio * (h - 2 * pad)}
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="1"
            />
          ))}
          <path d={fill} fill="url(#chartGradient)" />
          <path d={d} fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* X axis labels */}
          {[0, 6, 12, 18, 23].map((i) => {
            const labelValue = Math.round((i / 23) * duration);
            return (
              <text key={i} x={xs[i]} y={h} fill="#475569" fontSize="8" textAnchor="middle">
                {labelValue}h
              </text>
            );
          })}
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center pt-2">
        {[
          ["🌅 Warmup", `0 - ${Math.round(duration * 0.2)}h`, "Gradual Pacing"],
          ["⚡ Peak", `${Math.round(duration * 0.2)} - ${Math.round(duration * 0.65)}h`, "High Volume Boost"],
          ["🌙 Decay", `${Math.round(duration * 0.65)} - ${duration}h`, "Natural Cooldown"]
        ].map(([phase, range, action]) => (
          <div key={phase} className="p-3 rounded-lg border border-white/5 bg-white/[0.01]">
            <div className="text-[10px] font-semibold text-slate-500 uppercase">{phase}</div>
            <div className="text-xs font-bold text-amber-400 my-0.5">{range}</div>
            <div className="text-[9px] text-slate-600">{action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
