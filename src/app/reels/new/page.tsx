"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generateDeliverySchedule, generateRawSchedule, calculateEngagementTargets } from "@/lib/delivery/curve";

// ── Types ───────────────────────────────────────────────────────
type Platform = "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
type CurveStyle = "ORGANIC" | "FAST" | "AGGRESSIVE" | "WHOP" | "CLIPSTAKE" | "CLIPSTAR" | "PICSART" | "CROSSWAVE"
  | "LINEAR" | "EXPONENTIAL" | "S_CURVE" | "BELL_CURVE" | "LOGARITHMIC" | "QUADRATIC" | "CUBIC"
  | "SINE_WAVE" | "COSINE_WAVE" | "SAWTOOTH" | "CHAOTIC" | "DOUBLE_BELL" | "STEP_LADDER"
  | "ALTERNATING" | "FIBONACCI" | "PARETO" | "MORNING_SURGE" | "NOON_PEAK" | "EVENING_BLAST"
  | "SIGMOID_DECAY" | "STEEP_WARMUP";

interface Panel {
  id: string; name: string; isActive: boolean;
  serviceIds: Record<string, Record<string, string>> | null;
}

const N = {
  bg:       "#eef2f7",
  raised:   "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm: "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  raisedLg: "14px 14px 28px #c8d0e7, -14px -14px 28px #ffffff",
  inset:    "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
  accent:   "#d97706",
  accentBg: "linear-gradient(135deg, #d97706, #ea580c)",
  text:     "#2d3748",
  muted:    "#718096",
  faint:    "#a0aec0",
  border:   "rgba(200, 208, 231, 0.4)",
};

const PLATFORM_ICONS: Record<Platform, string> = {
  INSTAGRAM: "📷", TIKTOK: "🎵", YOUTUBE: "▶️",
};
const CURVE_DESCRIPTIONS: Record<CurveStyle, { label: string; desc: string; warmup: number; peak: number; icon: string; category: string }> = {
  ORGANIC:       { label: "Organic S-Curve", desc: "Natural viral growth — slow warmup, steady peak, smooth decay.", warmup: 4, peak: 8, icon: "🌅", category: "Classic" },
  FAST:          { label: "Fast Burst",      desc: "Compressed 12h curve — quicker ramp, shorter peak.", warmup: 2, peak: 4, icon: "⚡", category: "Classic" },
  AGGRESSIVE:    { label: "Aggressive Spike",desc: "Rapid 6h burst — immediate surge. Higher visibility risk.", warmup: 1, peak: 2, icon: "🔥", category: "Classic" },
  WHOP:          { label: "Whop commerce",   desc: "Commerce activity profile — sustained midday plateau.", warmup: 5, peak: 10, icon: "💳", category: "Classic" },
  CLIPSTAKE:     { label: "Clipstake Wave",  desc: "Double-plateau step-wise curve simulating viral trigger prompts.", warmup: 3, peak: 6, icon: "🎲", category: "Classic" },
  CLIPSTAR:      { label: "Clipstar Burst",  desc: "Immediate sustained viral burst with long-tail retention.", warmup: 2, peak: 12, icon: "⭐", category: "Classic" },
  PICSART:       { label: "Picsart Creative",desc: "Creative designer pacing — afternoon peak with high interaction curves.", warmup: 4, peak: 8, icon: "🎨", category: "Classic" },
  CROSSWAVE:     { label: "Crosswave Multi", desc: "Oscillatory crest/trough waves simulating syndication.", warmup: 4, peak: 8, icon: "🌊", category: "Classic" },

  LINEAR:        { label: "Linear Pace",     desc: "Constant, equal-increment delivery rate over the entire campaign.", warmup: 0, peak: 0, icon: "📈", category: "Standard" },
  EXPONENTIAL:   { label: "Exponential Surge",desc: "Starts slowly and accelerates sharply. Ideal for countdowns.", warmup: 0, peak: 0, icon: "🚀", category: "Standard" },
  S_CURVE:       { label: "S-Curve Growth",  desc: "Slow ramp-up, rapid mid-campaign dispatch, and smooth saturation.", warmup: 0, peak: 0, icon: "📉", category: "Standard" },
  BELL_CURVE:    { label: "Bell Curve Dispatch",desc: "Symmetric pacing starting gently, peaking at mid-duration.", warmup: 0, peak: 0, icon: "🔔", category: "Standard" },
  LOGARITHMIC:   { label: "Logarithmic Warm-up",desc: "Surges immediately on launch, then maintains a decelerating pace.", warmup: 0, peak: 0, icon: "🪵", category: "Standard" },
  QUADRATIC:     { label: "Quadratic Velocity",desc: "Accelerates at a moderate squared rate.", warmup: 0, peak: 0, icon: "📐", category: "Standard" },
  CUBIC:         { label: "Cubic Accelerating",desc: "Aggressive third-degree curve with longer slow-phase and sharper final surge.", warmup: 0, peak: 0, icon: "🧮", category: "Standard" },

  SINE_WAVE:     { label: "Sine Wave Ripple", desc: "Alternate peaks and valleys of activity for natural testing.", warmup: 0, peak: 0, icon: "〰️", category: "Waves & Pulses" },
  COSINE_WAVE:   { label: "Cosine Wave Ripple",desc: "Starts at absolute peak output, dipping and recovering periodically.", warmup: 0, peak: 0, icon: "🎢", category: "Waves & Pulses" },
  SAWTOOTH:      { label: "Sawtooth Throttling",desc: "Linear ramp-up cycles that sharply drop back to baseline.", warmup: 0, peak: 0, icon: "🪚", category: "Waves & Pulses" },
  CHAOTIC:       { label: "Chaotic Wave",    desc: "Simulates pseudo-random fluctuations to mimic organic user patterns.", warmup: 0, peak: 0, icon: "🌀", category: "Waves & Pulses" },
  DOUBLE_BELL:   { label: "Double Bell Surge",desc: "Dual peaks centered around morning and evening high-traffic blocks.", warmup: 0, peak: 0, icon: "🐫", category: "Waves & Pulses" },
  STEP_LADDER:   { label: "Step Ladder",     desc: "Increments output in discrete, flat tiers.", warmup: 0, peak: 0, icon: "🪜", category: "Waves & Pulses" },
  ALTERNATING:   { label: "Alternating Pulse",desc: "Outputs either 100% or 0% at alternating steps.", warmup: 0, peak: 0, icon: "🫀", category: "Waves & Pulses" },
  FIBONACCI:     { label: "Fibonacci Pace",  desc: "Paces delivery according to the golden ratio sequence.", warmup: 0, peak: 0, icon: "🐚", category: "Specialized" },
  PARETO:        { label: "Pareto 80/20",    desc: "Dispatches 80% of volume in the first 20% of duration.", warmup: 0, peak: 0, icon: "📊", category: "Specialized" },

  MORNING_SURGE: { label: "Morning Surge",   desc: "Heavily front-loaded peak in the early hours to target feed checkings.", warmup: 0, peak: 0, icon: "🌅", category: "Surge Peaks" },
  NOON_PEAK:     { label: "Noon Peak",       desc: "Centered peak focusing on the typical lunch-break browsing slot.", warmup: 0, peak: 0, icon: "☀️", category: "Surge Peaks" },
  EVENING_BLAST: { label: "Evening Blast",   desc: "Back-loaded dispatch peak targeted at after-work leisure hours.", warmup: 0, peak: 0, icon: "🌆", category: "Surge Peaks" },
  SIGMOID_DECAY: { label: "Sigmoid Decay",   desc: "Starts at maximum volume and stays flat, before dropping in a smooth S-curve.", warmup: 0, peak: 0, icon: "🥀", category: "Surge Peaks" },
  STEEP_WARMUP:  { label: "Steep Warm-up",   desc: "Ramps up extremely quickly to max output within the first 10%.", warmup: 0, peak: 0, icon: "📈", category: "Surge Peaks" },
};

// ── Premium Neon Animated Chart ──────────────────────────────────
function CurvePreview({
  views, durationHours, style, warmup, peak,
  likesRatio, savesRatio, sharesRatio, commentsRatio,
  likesOn, savesOn, sharesOn, commentsOn, engEnabled
}: {
  views: number; durationHours: number; style: CurveStyle; warmup: number; peak: number;
  likesRatio: number; savesRatio: number; sharesRatio: number; commentsRatio: number;
  likesOn: boolean; savesOn: boolean; sharesOn: boolean; commentsOn: boolean; engEnabled: boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playHour, setPlayHour] = useState(0);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  const batches = generateRawSchedule({
    totalViews: views,
    durationHours,
    warmupHours: warmup,
    peakHours: peak,
    style,
    engagementEnabled: engEnabled,
    likesRatioPct: likesOn ? likesRatio : 0,
    savesRatioPct: savesOn ? savesRatio : 0,
    sharesRatioPct: sharesOn ? sharesRatio : 0,
    commentsRatioPct: commentsOn ? commentsRatio : 0,
  });

  // Playhead simulation timer
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setPlayHour((h) => {
          if (h >= durationHours - 1) {
            setIsPlaying(false);
            return 0;
          }
          return h + 1;
        });
      }, Math.max(50, 3000 / durationHours)); // target ~3 seconds for full simulation
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, durationHours]);

  if (!batches.length) return null;

  const W = 550, H = 200, pad = 30;
  const maxViews = Math.max(...batches.map((b) => b.views), 1);

  // Helper to map index & quantity to coordinates
  const getCoords = (val: number, max: number, idx: number) => {
    const x = pad + (idx / (batches.length - 1)) * (W - 2 * pad);
    const y = H - pad - (val / max) * (H - 2 * pad);
    return { x, y };
  };

  const viewsPts = batches.map((b, i) => getCoords(b.views, maxViews, i));

  const makePath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  const makeFill = (pts: { x: number; y: number }[]) => [
    makePath(pts),
    `L ${pts.at(-1)!.x.toFixed(1)} ${H - pad}`,
    `L ${pts[0].x.toFixed(1)} ${H - pad} Z`,
  ].join(" ");

  const curveInfo = CURVE_DESCRIPTIONS[style];

  // Determine current active simulation batch
  const currentBatchIdx = isPlaying ? playHour : (batches.length - 1);
  const currentBatch = batches[currentBatchIdx];
  const currentPt = viewsPts[currentBatchIdx];
  const dispatchPct = Math.round((currentBatch.views / views) * 100);

  return (
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
      fontFamily: "inherit"
    }}>
      {/* Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16, color: "#a855f7" }}>📈</span>
            <h3 style={{ fontSize: 15, fontWeight: 900, color: "#f3e8ff", margin: 0 }}>Live Growth Plot</h3>
          </div>
          <p style={{ fontSize: 12, color: "#c084fc", margin: 0, fontWeight: 550, maxWidth: 380, lineHeight: 1.4 }}>
            {curveInfo.desc}
          </p>
        </div>
        <div style={{
          fontSize: 11,
          fontWeight: 800,
          background: "rgba(168, 85, 247, 0.15)",
          color: "#d946ef",
          padding: "4px 10px",
          borderRadius: 12,
          border: "1px solid rgba(168, 85, 247, 0.3)",
          letterSpacing: "0.05em"
        }}>
          Preset: {curveInfo.label}
        </div>
      </div>

      {/* SVG Neon Chart */}
      <div style={{ position: "relative", width: "100%", background: "#120324", borderRadius: 16, border: "1px solid #23083f", padding: "24px 8px 16px", overflow: "hidden" }}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="neonGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d946ef" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
            </linearGradient>

            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines (Y-axis percentages) */}
          {[0, 0.25, 0.5, 0.75, 1].map((val) => {
            const y = H - pad - val * (H - 2 * pad);
            return (
              <g key={val}>
                <line x1={pad} y1={y} x2={W - pad} y2={y} stroke="#230e3d" strokeWidth="1" strokeDasharray="3 3" />
                <text x={pad - 8} y={y + 3} fill="#a78bfa" fontSize="9" fontWeight="700" textAnchor="end">
                  {Math.round(val * 100)}
                </text>
              </g>
            );
          })}

          {/* X-axis labels (S0 to S8) */}
          {Array.from({ length: 9 }).map((_, i) => {
            const x = pad + (i / 8) * (W - 2 * pad);
            return (
              <g key={i}>
                <line x1={x} y1={H - pad} x2={x} y2={H - pad + 4} stroke="#3b1d60" strokeWidth="1" />
                <text x={x} y={H - pad + 15} fill="#a78bfa" fontSize="9" fontWeight="750" textAnchor="middle">
                  S{i}
                </text>
              </g>
            );
          })}

          {/* Curve Area & Line */}
          <g>
            <path d={makeFill(viewsPts)} fill="url(#neonGrad)" style={{ transition: "all 0.5s ease" }} />
            <path d={makePath(viewsPts)} fill="none" stroke="#d946ef" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonGlow)" style={{ transition: "all 0.5s ease" }} />
          </g>

          {/* Playhead vertical line & glowing node */}
          {currentPt && (
            <g>
              <line x1={currentPt.x} y1={pad} x2={currentPt.x} y2={H - pad} stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.6" />
              <circle cx={currentPt.x} cy={currentPt.y} r="6" fill="#ffffff" stroke="#d946ef" strokeWidth="3" filter="drop-shadow(0 0 6px #d946ef)" />
            </g>
          )}
        </svg>

        {/* Live playhead Tooltip box inside the SVG container */}
        {currentPt && (
          <div style={{
            position: "absolute",
            left: `${((currentPt.x - pad) / (W - 2 * pad)) * 80 + 10}%`,
            top: `${Math.min(70, ((currentPt.y - pad) / (H - 2 * pad)) * 80 + 10)}%`,
            background: "#0c0217",
            border: "1.5px solid #d946ef",
            borderRadius: 12,
            padding: "8px 12px",
            boxShadow: "0 4px 15px rgba(217, 70, 239, 0.25)",
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 100,
            transform: "translate(-50%, -100%)",
            transition: "all 0.1s linear"
          }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: "#f3e8ff" }}>
              S{Math.round((currentBatchIdx / (batches.length - 1)) * 8)}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#d946ef" }}>
              DispatchPct : {dispatchPct}%
            </span>
          </div>
        )}
      </div>

      {/* Control bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #1c0a35", paddingTop: 14 }}>
        <button onClick={() => setIsPlaying(!isPlaying)} className="neo-btn"
          style={{
            border: "none",
            background: isPlaying ? "#ea580c" : "#a855f7",
            color: "#ffffff",
            padding: "8px 16px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(168, 85, 247, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}>
          <span>{isPlaying ? "⏸ Pause" : "▶️ Simulate"}</span>
        </button>

        <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#a78bfa", fontWeight: 700 }}>
          <span>Duration: <strong style={{ color: "#f3e8ff" }}>{durationHours}h</strong></span>
          <span>Batches: <strong style={{ color: "#f3e8ff" }}>{batches.length}</strong></span>
          <span>Peak: <strong style={{ color: "#f3e8ff" }}>{peak}h</strong></span>
        </div>
      </div>
    </div>
  );
}

// ── Mini Sparkline Curve Chart ──────────────────────────────────
function MiniCurveChart({ style, active }: { style: CurveStyle; active: boolean }) {
  const points = Array.from({ length: 24 }, (_, t) => {
    const progress = t / 24;
    let val = 1.0;

    if (style === "LINEAR") {
      val = progress;
    } else if (style === "EXPONENTIAL") {
      val = Math.exp(progress * 3) / Math.exp(3);
    } else if (style === "S_CURVE" || style === "ORGANIC") {
      val = 1 / (1 + Math.exp(-6 * (progress - 0.5)));
    } else if (style === "BELL_CURVE") {
      val = Math.exp(-Math.pow((progress - 0.5) / 0.2, 2));
    } else if (style === "LOGARITHMIC") {
      val = Math.log(1 + 9 * progress) / Math.log(10);
    } else if (style === "QUADRATIC") {
      val = Math.pow(progress, 2);
    } else if (style === "CUBIC") {
      val = Math.pow(progress, 3);
    } else if (style === "SINE_WAVE") {
      val = 0.5 + 0.3 * Math.sin(progress * 4 * Math.PI);
    } else if (style === "COSINE_WAVE") {
      val = 0.5 + 0.3 * Math.cos(progress * 4 * Math.PI);
    } else if (style === "SAWTOOTH") {
      val = (t % 6) / 6;
    } else if (style === "CHAOTIC") {
      val = 0.4 + 0.2 * Math.sin(progress * 6 * Math.PI) + 0.2 * Math.cos(progress * 14 * Math.PI);
    } else if (style === "DOUBLE_BELL") {
      val = 0.5 * Math.exp(-Math.pow((progress - 0.25) / 0.1, 2)) + 0.5 * Math.exp(-Math.pow((progress - 0.75) / 0.1, 2));
    } else if (style === "STEP_LADDER") {
      val = Math.floor(progress * 4) / 4;
    } else if (style === "ALTERNATING") {
      val = (t % 2 === 0) ? 0.9 : 0.1;
    } else if (style === "FIBONACCI") {
      val = Math.pow(1.618, progress * 8) / Math.pow(1.618, 8);
    } else if (style === "PARETO") {
      val = Math.pow(1 - progress, 4);
    } else if (style === "MORNING_SURGE") {
      val = Math.exp(-Math.pow((progress - 0.15) / 0.1, 2));
    } else if (style === "NOON_PEAK") {
      val = Math.exp(-Math.pow((progress - 0.5) / 0.15, 2));
    } else if (style === "EVENING_BLAST") {
      val = Math.exp(-Math.pow((progress - 0.8) / 0.15, 2));
    } else if (style === "SIGMOID_DECAY") {
      val = 1 / (1 + Math.exp(10 * (progress - 0.85)));
    } else if (style === "STEEP_WARMUP") {
      val = (progress < 0.1) ? (progress / 0.1) : 1.0;
    } else {
      val = 1 / (1 + Math.exp(-1.2 * (t - 6)));
    }

    return val;
  });

  const maxVal = Math.max(...points, 0.001);
  const width = 80;
  const height = 24;
  const padding = 2;

  const pathD = points
    .map((v, i) => {
      const x = padding + (i / (points.length - 1)) * (width - 2 * padding);
      const y = height - padding - (v / maxVal) * (height - 2 * padding);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} style={{ overflow: "visible", marginTop: 4, display: "block" }}>
      <path
        d={pathD}
        fill="none"
        stroke={active ? N.accent : "#94a3b8"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter: active ? `drop-shadow(0 0 3px ${N.accent}80)` : "none",
          transition: "stroke 0.2s"
        }}
      />
    </svg>
  );
}

// ── Slider ───────────────────────────────────────────────────────
function Slider({ label, value, min, max, step = 1, onChange, format }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <span style={{ fontSize:13, fontWeight:700, color:N.text }}>{label}</span>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) onChange(val);
            }}
            style={{
              width: 80,
              padding: "4px 8px",
              borderRadius: 8,
              fontSize: 12,
              background: N.bg,
              border: "none",
              color: N.accent,
              fontWeight: 905,
              outline: "none",
              boxShadow: N.inset,
              textAlign: "right",
              fontFamily: "inherit"
            }}
            className="neo-input"
          />
          <span style={{ fontSize:12, fontWeight:700, color:N.muted }}>({format(value)})</span>
        </div>
      </div>
      <div style={{ padding:"8px", borderRadius:12, background:N.bg, boxShadow:N.inset }}>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ width:"100%", accentColor:N.accent, cursor:"pointer", display:"block" }} />
      </div>
    </div>
  );
}

// ── Engagement toggle row ─────────────────────────────────────────
function EngRow({ icon, label, enabled, ratio, maxRatio, count, onToggle, onRatio }: {
  icon: string; label: string; enabled: boolean; ratio: number;
  maxRatio: number; count: number; onToggle: () => void; onRatio: (v: number) => void;
}) {
  return (
    <div style={{ borderRadius:16, padding:16, background:N.bg, boxShadow: enabled ? N.raisedSm : N.inset, transition:"all 0.2s" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: enabled ? 16 : 0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:16 }}>{icon}</span>
          <span style={{ fontSize:13, fontWeight:800, color:N.text }}>{label}</span>
          {enabled && <span style={{ fontSize:12, color:N.accent, fontWeight:800 }}>→ {count.toLocaleString()}</span>}
        </div>
        <button onClick={onToggle} className="neo-btn"
          style={{ width:40, height:22, borderRadius:12, border:"none", cursor:"pointer", position:"relative", transition:"all 0.2s", background: enabled ? N.accent : "#cbd5e1", boxShadow:N.raisedSm }}>
          <div style={{ width:14, height:14, borderRadius:"50%", background:"#ffffff", top:4, left: enabled ? 22 : 4, position:"absolute", transition:"all 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
        </button>
      </div>
      {enabled && (
        <Slider label={`${ratio.toFixed(1)}% of views`} value={ratio} min={0.1} max={maxRatio} step={0.1}
          onChange={onRatio} format={(v) => `${v.toFixed(1)}%`} />
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function NewReelPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Bulk Mode state
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState(false);

  // Step 1
  const [platform, setPlatform] = useState<Platform>("INSTAGRAM");
  const [reelUrl, setReelUrl] = useState("");

  // Step 2
  const [views, setViews] = useState(10000);
  const [durationDays, setDurationDays] = useState(7);
  const [style, setStyle] = useState<CurveStyle>("ORGANIC");

  // Step 3 ── Engagement
  const [engEnabled, setEngEnabled] = useState(true);
  const [likesOn, setLikesOn] = useState(true);
  const [savesOn, setSavesOn] = useState(true);
  const [sharesOn, setSharesOn] = useState(false);
  const [commentsOn, setCommentsOn] = useState(false);
  const [likesRatio, setLikesRatio] = useState(4.0);
  const [savesRatio, setSavesRatio] = useState(2.0);
  const [sharesRatio, setSharesRatio] = useState(0.5);
  const [commentsRatio, setCommentsRatio] = useState(0.2);
  const [hasCustomizedEng, setHasCustomizedEng] = useState(false);
  const [smmLimits, setSmmLimits] = useState<{
    views: { min: number; max: number } | null;
    likes: { min: number; max: number } | null;
    saves: { min: number; max: number } | null;
    shares: { min: number; max: number } | null;
    comments: { min: number; max: number } | null;
  }>({ views: null, likes: null, saves: null, shares: null, comments: null });
  const [fetchingLimits, setFetchingLimits] = useState(false);

  useEffect(() => {
    fetch("/api/panels").then((r) => r.json()).then((d) => setPanels(d.panels ?? [])).catch(() => {});
    fetch("/api/templates").then((r) => r.json()).then((d) => setTemplates(d.templates ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    setFetchingLimits(true);
    fetch(`/api/panels/services?platform=${platform}`)
      .then(res => res.json())
      .then(d => {
        if (d.limits) {
          setSmmLimits(d.limits);
          if (d.limits.views && views < d.limits.views.min) {
            setViews(d.limits.views.min);
          }
        }
        setFetchingLimits(false);
      })
      .catch(() => setFetchingLimits(false));
  }, [platform]);

  useEffect(() => {
    if (hasCustomizedEng) return;
    if (views < 5000) {
      setLikesRatio(6.0); setSavesRatio(3.0); setSharesRatio(0.8); setCommentsRatio(0.3);
    } else if (views <= 50000) {
      setLikesRatio(4.0); setSavesRatio(2.0); setSharesRatio(0.5); setCommentsRatio(0.2);
    } else {
      setLikesRatio(2.0); setSavesRatio(1.0); setSharesRatio(0.2); setCommentsRatio(0.1);
    }
  }, [views, hasCustomizedEng]);

  const applyTemplate = (templateId: string) => {
    const t = templates.find((tmp) => tmp.id === templateId);
    if (!t) return;
    setSelectedTemplateId(templateId);
    setStyle(t.style);
    setDurationDays(Math.max(1, Math.round(t.durationHours / 24)));
    setLikesRatio(t.likesRatioPct);
    setSavesRatio(t.savesRatioPct);
    setSharesRatio(t.sharesRatioPct);
    setCommentsRatio(t.commentsRatioPct);

    const anyEng = t.likesRatioPct > 0 || t.savesRatioPct > 0 || t.sharesRatioPct > 0 || t.commentsRatioPct > 0;
    setEngEnabled(anyEng);
    setLikesOn(t.likesRatioPct > 0);
    setSavesOn(t.savesRatioPct > 0);
    setSharesOn(t.sharesRatioPct > 0);
    setCommentsOn(t.commentsRatioPct > 0);
    setHasCustomizedEng(true);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    setBulkError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) { setBulkError("CSV must contain headers and at least one data row"); return; }

        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        const expectedHeaders = ["url", "platform", "views", "duration_days", "curve_style"];
        const missing = expectedHeaders.filter(h => !headers.includes(h));
        if (missing.length > 0) { setBulkError(`Missing headers: ${missing.join(", ")}`); return; }

        const rows = lines.slice(1).map((line, idx) => {
          const vals = line.split(",").map(v => v.trim());
          const rowObj: any = { id: idx + 1 };
          headers.forEach((h, index) => { rowObj[h] = vals[index]; });

          rowObj.viewsVal = parseInt(rowObj.views) || 0;
          rowObj.durDays = parseInt(rowObj.duration_days) || 7;
          rowObj.styleVal = (rowObj.curve_style || "ORGANIC").toUpperCase();
          rowObj.isValid = rowObj.url && ["INSTAGRAM", "TIKTOK", "YOUTUBE"].includes((rowObj.platform || "").toUpperCase()) && rowObj.viewsVal >= 100 && rowObj.durDays >= 1;
          return rowObj;
        });

        setBulkRows(rows);
      } catch (err) {
        setBulkError("Failed to parse CSV file");
      }
    };
    reader.readAsText(file);
  };

  const triggerBulkCampaigns = async () => {
    const validRows = bulkRows.filter(r => r.isValid);
    if (!validRows.length) { setBulkError("No valid rows to schedule"); return; }
    setSubmitting(true);
    setBulkProgress({ current: 0, total: validRows.length });

    let count = 0;
    for (const row of validRows) {
      try {
        const platformUpper = row.platform.toUpperCase();
        const likesPct = parseFloat(row.likes_pct) || 0;
        const savesPct = parseFloat(row.saves_pct) || 0;
        const sharesPct = parseFloat(row.shares_pct) || 0;
        const commentsPct = parseFloat(row.comments_pct) || 0;

        const viewsTarget = row.viewsVal;
        const likesTarget = Math.round((likesPct / 100) * viewsTarget);
        const savesTarget = Math.round((savesPct / 100) * viewsTarget);
        const sharesTarget = Math.round((sharesPct / 100) * viewsTarget);
        const commentsTarget = Math.round((commentsPct / 100) * viewsTarget);
        const engagementEnabled = likesTarget > 0 || savesTarget > 0 || sharesTarget > 0 || commentsTarget > 0;

        let warmup = 4, peak = 8;
        if (row.styleVal === "FAST") { warmup = 2; peak = 4; }
        if (row.styleVal === "AGGRESSIVE") { warmup = 1; peak = 2; }

        await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reelUrl: row.url, platform: platformUpper, viewsTarget, durationHours: row.durDays * 24, curveStyle: row.styleVal,
            warmupHours: warmup, peakHours: peak, engagementEnabled, likesTarget, savesTarget, sharesTarget, commentsTarget,
            likesRatioPct: likesPct, savesRatioPct: savesPct, sharesRatioPct: sharesPct, commentsRatioPct: commentsPct,
          }),
        });
      } catch (e) {
        console.error("Bulk import failed for row:", row, e);
      }
      count++;
      setBulkProgress({ current: count, total: validRows.length });
    }

    setSubmitting(false); setBulkSuccess(true);
    setTimeout(() => { router.push("/orders"); }, 2000);
  };

  const downloadSampleCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "url,platform,views,duration_days,curve_style,likes_pct,saves_pct,shares_pct,comments_pct\n"
      + "https://www.instagram.com/reel/CtK89s_gH9k,INSTAGRAM,10000,7,ORGANIC,4.0,2.0,0.5,0.2\n"
      + "https://www.tiktok.com/@user/video/712345678,TIKTOK,25000,14,FAST,3.0,1.5,0.2,0.1\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bulk_campaigns_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const durationHours = durationDays * 24;
  const curveInfo = CURVE_DESCRIPTIONS[style];
  const eng = calculateEngagementTargets(
    views,
    engEnabled && likesOn ? likesRatio : 0,
    engEnabled && savesOn ? savesRatio : 0,
    engEnabled && sharesOn ? sharesRatio : 0,
    engEnabled && commentsOn ? commentsRatio : 0,
  );

  const canProceed1 = reelUrl.trim().length > 10;
  const minViewsRequired = smmLimits.views?.min ?? 100;
  const maxViewsRequired = smmLimits.views?.max ?? 10000000;
  const canProceed2 = views >= minViewsRequired && views <= maxViewsRequired && durationDays >= 1;

  const submit = useCallback(async () => {
    setSubmitting(true); setError("");
    try {
      if (saveAsTemplate && templateName.trim()) {
        await fetch("/api/templates", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: templateName.trim(), style, durationHours, warmupHours: curveInfo.warmup, peakHours: curveInfo.peak,
            decayHours: durationHours - curveInfo.warmup - curveInfo.peak,
            likesRatioPct: engEnabled && likesOn ? likesRatio : 0,
            savesRatioPct: engEnabled && savesOn ? savesRatio : 0,
            sharesRatioPct: engEnabled && sharesOn ? sharesRatio : 0,
            commentsRatioPct: engEnabled && commentsOn ? commentsRatio : 0,
          }),
        });
      }

      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reelUrl: reelUrl.trim(), platform, viewsTarget: views, durationHours, curveStyle: style, warmupHours: curveInfo.warmup, peakHours: curveInfo.peak,
          engagementEnabled: engEnabled, likesTarget: eng.likesTarget, savesTarget: eng.savesTarget, sharesTarget: eng.sharesTarget, commentsTarget: eng.commentsTarget,
          likesRatioPct: engEnabled && likesOn ? likesRatio : 0, savesRatioPct: engEnabled && savesOn ? savesRatio : 0,
          sharesRatioPct: engEnabled && sharesOn ? sharesRatio : 0, commentsRatioPct: engEnabled && commentsOn ? commentsRatio : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create order"); setSubmitting(false); return; }
      router.push(`/orders`);
    } catch (e) {
      setError(String(e)); setSubmitting(false);
    }
  }, [reelUrl, platform, views, durationHours, style, curveInfo, engEnabled, likesOn, savesOn, sharesOn, commentsOn, likesRatio, savesRatio, sharesRatio, commentsRatio, eng, router, saveAsTemplate, templateName]);

  return (
    <div style={{ maxWidth:640, display:"flex", flexDirection:"column", gap:24 }}>
      <style>{`
        .neo-input:focus{box-shadow:inset 6px 6px 12px #c8d0e7,inset -6px -6px 12px #ffffff,0 0 0 2px rgba(217,119,6,0.25) !important}
        .neo-btn:hover{transform:translateY(-1px);box-shadow:8px 8px 22px #c8d0e7,-8px -8px 22px #ffffff !important}
        .neo-btn:active{transform:none;box-shadow:inset 3px 3px 8px #c8d0e7,inset -1px -1px 4px #ffffff !important}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Header */}
      <div>
        <h1 style={{ fontSize:22, fontWeight:900, color:N.text, margin:"0 0 4px", letterSpacing:"-0.5px" }}>New Campaign</h1>
        <p style={{ fontSize:13, color:N.muted, margin:0, fontWeight:600 }}>Organic S-curve delivery with engagement</p>
      </div>

      {/* Mode Switcher */}
      <div style={{ display:"flex", gap:8, padding:6, borderRadius:16, background:N.bg, boxShadow:N.inset }}>
        <button onClick={() => setMode("single")}
          style={{ flex:1, border:"none", borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:700, transition:"all 0.2s", fontFamily:"inherit",
            background: mode === "single" ? N.bg : "transparent",
            color: mode === "single" ? N.accent : N.muted,
            boxShadow: mode === "single" ? N.raisedSm : "none",
            padding:"10px"
          }}>
          Single Campaign
        </button>
        <button onClick={() => setMode("bulk")}
          style={{ flex:1, border:"none", borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:700, transition:"all 0.2s", fontFamily:"inherit",
            background: mode === "bulk" ? N.bg : "transparent",
            color: mode === "bulk" ? N.accent : N.muted,
            boxShadow: mode === "bulk" ? N.raisedSm : "none",
            padding:"10px"
          }}>
          Bulk CSV Import
        </button>
      </div>

      {/* Single Mode Step 1 */}
      {mode === "single" && step === 1 && (
        <div style={{ borderRadius:24, padding:28, background:N.bg, boxShadow:N.raised, display:"flex", flexDirection:"column", gap:20, animation:"fadeUp 0.3s ease" }}>
          <h2 style={{ fontSize:14, fontWeight:800, color:N.text, margin:0 }}>1. Content Link</h2>

          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:N.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Select Platform</label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {(["INSTAGRAM", "TIKTOK", "YOUTUBE"] as Platform[]).map((p) => (
                <button key={p} onClick={() => setPlatform(p)} className="neo-btn"
                  style={{ padding:"12px 6px", borderRadius:12, border:"none", cursor:"pointer", transition:"all 0.2s",
                    background: N.bg,
                    color: platform === p ? N.accent : N.muted,
                    boxShadow: platform === p ? N.inset : N.raisedSm,
                    fontWeight:800, fontSize:12, display:"flex", alignItems:"center", justifyContent:"center", gap:6
                  }}>
                  <span>{PLATFORM_ICONS[p]}</span>
                  <span>{p.charAt(0) + p.slice(1).toLowerCase()}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:N.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Post / Reel URL</label>
            <input type="text" value={reelUrl} onChange={(e) => setReelUrl(e.target.value)} placeholder="https://www.instagram.com/reel/..."
              style={{ width:"100%", padding:"12px 14px", borderRadius:12, fontSize:13, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow:N.inset, fontFamily:"inherit" }}
              className="neo-input" />
          </div>

          <button onClick={() => setStep(2)} disabled={!canProceed1} className="neo-btn"
            style={{ width:"100%", padding:"14px", borderRadius:14, fontSize:14, fontWeight:800, border:"none", color:"#ffffff", background:N.accentBg, boxShadow:N.raisedSm, transition:"all 0.2s", opacity: canProceed1 ? 1 : 0.5, cursor: canProceed1 ? "pointer" : "not-allowed", marginTop:8 }}>
            Next: Views & Duration →
          </button>
        </div>
      )}

      {/* Single Mode Step 2 */}
      {mode === "single" && step === 2 && (
        <div style={{ borderRadius:24, padding:28, background:N.bg, boxShadow:N.raised, display:"flex", flexDirection:"column", gap:20, animation:"fadeUp 0.3s ease" }}>
          <h2 style={{ fontSize:14, fontWeight:800, color:N.text, margin:0 }}>2. Views & Duration</h2>

          {templates.length > 0 && (
            <div style={{ borderRadius:16, padding:16, background:N.bg, boxShadow:N.inset }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:N.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>Load Saved Preset</label>
              <select value={selectedTemplateId} onChange={(e) => applyTemplate(e.target.value)}
                style={{ width:"100%", padding:"10px 12px", borderRadius:10, fontSize:13, background:N.bg, color:N.text, border:"none", outline:"none", boxShadow:N.raisedSm }} className="neo-btn">
                <option value="">-- Choose template --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.style}, {t.durationHours}h)</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Slider label="Total Views" value={views} min={minViewsRequired} max={maxViewsRequired} step={100}
              onChange={setViews} format={(v) => v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
            {smmLimits.views && (
              <p style={{ fontSize:11, color:N.muted, marginTop:8, marginLeft:4, fontWeight:600 }}>
                💡 Panel Limits: Min <strong>{smmLimits.views.min.toLocaleString()}</strong> · Max <strong>{smmLimits.views.max.toLocaleString()}</strong>
              </p>
            )}
          </div>

          <Slider label="Duration" value={durationDays} min={1} max={90} step={1}
            onChange={setDurationDays} format={(v) => `${v} day${v === 1 ? "" : "s"}`} />

          {views / durationDays > 5000 && (
            <div style={{ padding:14, borderRadius:14, background:"rgba(217,119,6,0.1)", color:N.accent, display:"flex", flexDirection:"column", gap:4, fontSize:12, fontWeight:600, boxShadow:N.inset }}>
              <span style={{ fontWeight:800 }}>⚠️ Safe Pacing Recommendation</span>
              <span>Delivering more than 5,000 views/day is best for active pages. Consider spreading this target over at least <strong>{Math.ceil(views / 5000)} days</strong> to ensure natural velocity.</span>
            </div>
          )}

          <div>
            <p style={{ fontSize:13, fontWeight:700, color:N.text, marginBottom:12 }}>Delivery Style</p>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {["Classic", "Standard", "Waves & Pulses", "Surge Peaks", "Specialized"].map((cat) => {
                const catStyles = (Object.keys(CURVE_DESCRIPTIONS) as CurveStyle[]).filter(s => CURVE_DESCRIPTIONS[s].category === cat);
                if (catStyles.length === 0) return null;
                return (
                  <div key={cat}>
                    <p style={{ fontSize:10, fontWeight:900, color:N.muted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>{cat}</p>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(130px, 1fr))", gap:10 }}>
                      {catStyles.map((s) => (
                        <button key={s} onClick={() => { setStyle(s); setSelectedTemplateId(""); }} className="neo-btn"
                          style={{ padding:"14px 6px", borderRadius:14, border:"none", cursor:"pointer", transition:"all 0.2s", display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                            background: N.bg,
                            color: style === s ? N.accent : N.muted,
                            boxShadow: style === s ? N.inset : N.raisedSm,
                          }}>
                          <span style={{ fontSize:11, fontWeight:805, textAlign:"center" }}>{CURVE_DESCRIPTIONS[s].label}</span>
                          <MiniCurveChart style={s} active={style === s} />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize:12, color:N.muted, marginTop:14, fontWeight:600, lineHeight:1.5 }}>{curveInfo.desc}</p>
          </div>

          <CurvePreview
            views={views}
            durationHours={durationHours}
            style={style}
            warmup={curveInfo.warmup}
            peak={curveInfo.peak}
            likesRatio={likesRatio}
            savesRatio={savesRatio}
            sharesRatio={sharesRatio}
            commentsRatio={commentsRatio}
            likesOn={likesOn}
            savesOn={savesOn}
            sharesOn={sharesOn}
            commentsOn={commentsOn}
            engEnabled={engEnabled}
          />

          <div style={{ fontSize:12, color:N.muted, textAlign:"center", fontWeight:600 }}>
            ≈ {Math.round(views / durationDays).toLocaleString()} views/day · {durationHours} hourly batches (with ±15m time jitter)
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <button onClick={() => setStep(1)} style={{ padding:"12px", borderRadius:12, fontSize:13, fontWeight:700, border:"none", cursor:"pointer", color:N.muted, background:N.bg, boxShadow:N.raisedSm }} className="neo-btn">← Back</button>
            <button onClick={() => setStep(3)} disabled={!canProceed2} className="neo-btn"
              style={{ padding:"12px", borderRadius:12, fontSize:13, fontWeight:800, border:"none", color:"#ffffff", background:N.accentBg, boxShadow:N.raisedSm, opacity: canProceed2 ? 1 : 0.5 }}>
              Next: Engagement →
            </button>
          </div>
        </div>
      )}

      {/* Single Mode Step 3 */}
      {mode === "single" && step === 3 && (
        <div style={{ borderRadius:24, padding:28, background:N.bg, boxShadow:N.raised, display:"flex", flexDirection:"column", gap:16, animation:"fadeUp 0.3s ease" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <h2 style={{ fontSize:14, fontWeight:800, color:N.text, margin:0 }}>3. Balanced Engagement</h2>
              <p style={{ fontSize:12, color:N.muted, marginTop:2, fontWeight:600 }}>Delivered concurrently along your views schedule</p>
            </div>
            <button onClick={() => setEngEnabled((v) => !v)} className="neo-btn"
              style={{ padding:"6px 14px", borderRadius:10, fontSize:11, fontWeight:800, border:"none", cursor:"pointer",
                background: N.bg,
                color: engEnabled ? N.accent : N.muted,
                boxShadow: engEnabled ? N.raisedSm : N.inset
              }}>
              {engEnabled ? "✓ Active" : "Disabled"}
            </button>
          </div>

          {engEnabled && (
            <>
              <div style={{ padding:12, borderRadius:12, background:"rgba(217,119,6,0.08)", fontSize:12, color:N.accent, fontWeight:600 }}>
                💡 Balanced engagement ratios improve reach. Benchmarks have been pre-set for your views target.
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <EngRow icon="👍" label="Likes" enabled={likesOn} ratio={likesRatio} maxRatio={15} count={eng.likesTarget} onToggle={() => { setLikesOn((v) => !v); setHasCustomizedEng(true); }} onRatio={(v) => { setLikesRatio(v); setHasCustomizedEng(true); }} />
                <EngRow icon="🔖" label="Saves" enabled={savesOn} ratio={savesRatio} maxRatio={8} count={eng.savesTarget} onToggle={() => { setSavesOn((v) => !v); setHasCustomizedEng(true); }} onRatio={(v) => { setSavesRatio(v); setHasCustomizedEng(true); }} />
                <EngRow icon="📤" label="Shares" enabled={sharesOn} ratio={sharesRatio} maxRatio={5} count={eng.sharesTarget} onToggle={() => { setSharesOn((v) => !v); setHasCustomizedEng(true); }} onRatio={(v) => { setSharesRatio(v); setHasCustomizedEng(true); }} />
                <EngRow icon="💬" label="Comments" enabled={commentsOn} ratio={commentsRatio} maxRatio={3} count={eng.commentsTarget} onToggle={() => { setCommentsOn((v) => !v); setHasCustomizedEng(true); }} onRatio={(v) => { setCommentsRatio(v); setHasCustomizedEng(true); }} />
              </div>

              <div style={{ borderRadius:16, padding:18, background:N.bg, boxShadow:N.inset }}>
                <p style={{ fontSize:11, fontWeight:800, color:N.muted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Campaign Targets</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 16px", fontSize:13 }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:N.muted, fontWeight:600 }}>👁 Views</span><span style={{ fontWeight:800, color:N.text }}>{views.toLocaleString()}</span></div>
                  {likesOn && eng.likesTarget > 0 && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:N.muted, fontWeight:600 }}>👍 Likes</span><span style={{ fontWeight:800, color:"#16a34a" }}>{eng.likesTarget.toLocaleString()}</span></div>}
                  {savesOn && eng.savesTarget > 0 && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:N.muted, fontWeight:600 }}>🔖 Saves</span><span style={{ fontWeight:800, color:"#16a34a" }}>{eng.savesTarget.toLocaleString()}</span></div>}
                  {sharesOn && eng.sharesTarget > 0 && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:N.muted, fontWeight:600 }}>📤 Shares</span><span style={{ fontWeight:800, color:"#16a34a" }}>{eng.sharesTarget.toLocaleString()}</span></div>}
                  {commentsOn && eng.commentsTarget > 0 && <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:N.muted, fontWeight:600 }}>💬 Comments</span><span style={{ fontWeight:800, color:"#16a34a" }}>{eng.commentsTarget.toLocaleString()}</span></div>}
                </div>
              </div>
            </>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:8 }}>
            <button onClick={() => setStep(2)} style={{ padding:"12px", borderRadius:12, fontSize:13, fontWeight:700, border:"none", cursor:"pointer", color:N.muted, background:N.bg, boxShadow:N.raisedSm }} className="neo-btn">← Back</button>
            <button onClick={() => setStep(4)} style={{ padding:"12px", borderRadius:12, fontSize:13, fontWeight:800, border:"none", color:"#ffffff", background:N.accentBg, boxShadow:N.raisedSm }} className="neo-btn">
              Review Order →
            </button>
          </div>
        </div>
      )}

      {/* Single Mode Step 4 */}
      {mode === "single" && step === 4 && (
        <div style={{ borderRadius:24, padding:28, background:N.bg, boxShadow:N.raised, display:"flex", flexDirection:"column", gap:20, animation:"fadeUp 0.3s ease" }}>
          <h2 style={{ fontSize:14, fontWeight:800, color:N.text, margin:0 }}>4. Confirm Campaign</h2>

          <CurvePreview
            views={views}
            durationHours={durationHours}
            style={style}
            warmup={curveInfo.warmup}
            peak={curveInfo.peak}
            likesRatio={likesRatio}
            savesRatio={savesRatio}
            sharesRatio={sharesRatio}
            commentsRatio={commentsRatio}
            likesOn={likesOn}
            savesOn={savesOn}
            sharesOn={sharesOn}
            commentsOn={commentsOn}
            engEnabled={engEnabled}
          />

          <div style={{ display:"flex", flexDirection:"column", gap:10, padding:18, borderRadius:16, background:N.bg, boxShadow:N.inset }}>
            {[
              ["Platform", `${PLATFORM_ICONS[platform]} ${platform.charAt(0) + platform.slice(1).toLowerCase()}`],
              ["URL", reelUrl.length > 40 ? reelUrl.slice(0, 40) + "…" : reelUrl],
              ["Views Target", views.toLocaleString()],
              ["Duration", `${durationDays} day${durationDays === 1 ? "" : "s"} (${durationHours}h)`],
              ["Delivery Style", `${curveInfo.icon} ${curveInfo.label}`],
              ["Pacing Schedule", `${durationHours} hourly batches`],
              ...(engEnabled ? [
                ["Engagement Mode", "✅ Paced concurrently"],
                ...(likesOn && eng.likesTarget > 0 ? [["👍 Likes Target", `${eng.likesTarget.toLocaleString()} (${likesRatio}%)`]] : []),
                ...(savesOn && eng.savesTarget > 0 ? [["🔖 Saves Target", `${eng.savesTarget.toLocaleString()} (${savesRatio}%)`]] : []),
                ...(sharesOn && eng.sharesTarget > 0 ? [["📤 Shares Target", `${eng.sharesTarget.toLocaleString()} (${sharesRatio}%)`]] : []),
                ...(commentsOn && eng.commentsTarget > 0 ? [["💬 Comments Target", `${eng.commentsTarget.toLocaleString()} (${commentsRatio}%)`]] : []),
              ] : [["Engagement Mode", "⬜ Views only"]]),
            ].map(([k, v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                <span style={{ color:N.muted, fontWeight:600 }}>{k}</span>
                <span style={{ fontWeight:800, color:N.text, textAlign:"right" }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ borderRadius:16, padding:18, background:N.bg, boxShadow:N.inset, display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <input type="checkbox" id="saveTemp" checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} style={{ width:16, height:16, accentColor:N.accent, cursor:"pointer" }} />
              <label htmlFor="saveTemp" style={{ fontSize:13, fontWeight:700, color:N.text, cursor:"pointer" }}>💾 Save S-Curve configuration as template</label>
            </div>
            {saveAsTemplate && (
              <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Viral Reels 5-Day Pacing"
                style={{ width:"100%", padding:"10px 12px", borderRadius:10, fontSize:13, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow:N.raisedSm }}
                className="neo-input" />
            )}
          </div>

          {panels.length === 0 && (
            <div style={{ padding:12, borderRadius:12, background:"rgba(220,38,38,0.1)", color:"#dc2626", fontSize:12, fontWeight:700, border:"1px solid rgba(220,38,38,0.2)" }}>
              ⚠️ No connected SMM providers. <Link href="/panels" style={{ textDecoration:"underline", color:"#dc2626" }}>Connect a panel in Settings first</Link>
            </div>
          )}

          {error && <p style={{ fontSize:13, color:"#dc2626", margin:0, fontWeight:700 }}>{error}</p>}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <button onClick={() => setStep(3)} style={{ padding:"12px", borderRadius:12, fontSize:13, fontWeight:700, border:"none", cursor:"pointer", color:N.muted, background:N.bg, boxShadow:N.raisedSm }} className="neo-btn">← Back</button>
            <button onClick={submit} disabled={submitting || panels.length === 0} className="neo-btn"
              style={{ padding:"12px", borderRadius:12, fontSize:13, fontWeight:800, border:"none", color:"#ffffff", background:N.accentBg, boxShadow:N.raisedSm, opacity: (submitting || panels.length === 0) ? 0.5 : 1 }}>
              {submitting ? "Deploying…" : "🚀 Start Campaign"}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Mode UI */}
      {mode === "bulk" && (
        <div style={{ borderRadius:24, padding:28, background:N.bg, boxShadow:N.raised, display:"flex", flexDirection:"column", gap:20, animation:"fadeUp 0.3s ease" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <h2 style={{ fontSize:14, fontWeight:800, color:N.text, margin:0 }}>Bulk CSV Importer</h2>
            <button onClick={downloadSampleCSV} className="neo-btn"
              style={{ border:"none", background:"none", fontSize:12, fontWeight:800, color:N.accent, cursor:"pointer" }}>
              📥 Download Sample CSV
            </button>
          </div>

          <div onClick={() => document.getElementById("csvFile")?.click()}
            style={{ padding:"32px 16px", borderRadius:18, border:"2px dashed #cbd5e1", background:N.bg, boxShadow:N.inset, textAlign:"center", cursor:"pointer" }}>
            <input type="file" id="csvFile" accept=".csv" onChange={handleCSVUpload} style={{ display:"none" }} />
            <div style={{ fontSize:32, marginBottom:10 }}>📁</div>
            <p style={{ fontSize:13, fontWeight:800, color:N.text, margin:0 }}>{bulkFile ? bulkFile.name : "Select or drag & drop CSV file"}</p>
            <p style={{ fontSize:11, color:N.muted, margin:"4px 0 0", fontWeight:600 }}>CSV columns must match the template header format</p>
          </div>

          {bulkError && <p style={{ fontSize:12, color:"#dc2626", margin:0, fontWeight:700 }}>{bulkError}</p>}

          {bulkRows.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ maxHeight:200, overflowY:"auto", borderRadius:12, background:N.bg, boxShadow:N.inset, fontSize:12 }}>
                <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"left" }}>
                  <thead style={{ background:N.bg, borderBottom:`1px solid ${N.border}`, position:"sticky", top:0 }}>
                    <tr style={{ color:N.muted, fontWeight:800 }}>
                      <th style={{ padding:"8px 12px" }}>Row</th>
                      <th style={{ padding:"8px 12px" }}>Link</th>
                      <th style={{ padding:"8px 12px" }}>Plat</th>
                      <th style={{ padding:"8px 12px" }}>Views</th>
                      <th style={{ padding:"8px 12px" }}>Days</th>
                      <th style={{ padding:"8px 12px" }}>Valid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map(r => (
                      <tr key={r.id} style={{ borderBottom:`1px solid ${N.border}` }}>
                        <td style={{ padding:"8px 12px", color:N.muted }}>{r.id}</td>
                        <td style={{ padding:"8px 12px", color:N.text, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.url}</td>
                        <td style={{ padding:"8px 12px", color:N.muted }}>{r.platform}</td>
                        <td style={{ padding:"8px 12px", color:N.text, fontWeight:700 }}>{r.viewsVal.toLocaleString()}</td>
                        <td style={{ padding:"8px 12px", color:N.muted }}>{r.durDays}d</td>
                        <td style={{ padding:"8px 12px", fontWeight:800, color: r.isValid ? "#16a34a" : "#dc2626" }}>{r.isValid ? "✓" : "✗"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ fontSize:12, color:N.muted, fontWeight:600 }}>
                Campaigns ready to schedule: <strong style={{ color:N.text }}>{bulkRows.filter(r => r.isValid).length}</strong> of {bulkRows.length}
              </div>

              {bulkProgress && (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:N.muted, fontWeight:700 }}>
                    <span>Deploying campaigns…</span>
                    <span>{bulkProgress.current} / {bulkProgress.total}</span>
                  </div>
                  <div style={{ height:6, borderRadius:10, background:N.bg, boxShadow:N.inset, overflow:"hidden" }}>
                    <div style={{ height:"100%", background:N.accentBg, width:`${(bulkProgress.current / bulkProgress.total) * 100}%`, transition:"width 0.2s" }} />
                  </div>
                </div>
              )}

              {bulkSuccess && (
                <div style={{ padding:12, borderRadius:12, background:"rgba(22,163,74,0.1)", color:"#16a34a", fontSize:12, fontWeight:700, border:"1px solid rgba(22,163,74,0.2)" }}>
                  🎉 Bulk campaigns successfully deployed! Redirecting to dashboard…
                </div>
              )}

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <button onClick={() => { setBulkFile(null); setBulkRows([]); }} style={{ padding:"10px", borderRadius:12, fontSize:13, fontWeight:700, border:"none", cursor:"pointer", color:N.muted, background:N.bg, boxShadow:N.raisedSm }} className="neo-btn">Clear</button>
                <button onClick={triggerBulkCampaigns} disabled={submitting || bulkRows.filter(r => r.isValid).length === 0 || bulkSuccess} className="neo-btn"
                  style={{ padding:"10px", borderRadius:12, fontSize:13, fontWeight:800, border:"none", color:"#ffffff", background:N.accentBg, boxShadow:N.raisedSm, opacity: (submitting || bulkRows.filter(r => r.isValid).length === 0 || bulkSuccess) ? 0.5 : 1 }}>
                  {submitting ? "Deploying…" : "🚀 Start Bulk Campaigns"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
