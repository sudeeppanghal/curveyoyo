"use client";

import React, { useState } from "react";

const C = {
  bg: "#eef2f7",
  raised: "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm: "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  raisedLg: "12px 12px 24px #c8d0e7, -12px -12px 24px #ffffff",
  inset: "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
  insetSm: "inset 3px 3px 6px #c8d0e7, inset -3px -3px 6px #ffffff",
  amber: "#d97706",
  amberLight: "#fef3c7",
  text: "#2d3748",
  textMuted: "#718096",
  border: "rgba(200, 208, 231, 0.4)",
  grad: "linear-gradient(135deg, #d97706, #ea580c)",
  red: "#ef4444",
  green: "#10b981",
};

const COMPETITORS = [
  { id: "all", name: "All Major Panels (Avg)", subtitle: "Peakerr, JAP, SMMKings, Crescitaly", dropRate: "68%", botFlag: "High Risk", reach: "-50% Penalty" },
  { id: "peakerr", name: "Peakerr / JAP", subtitle: "Reseller API Wrapper Panels", dropRate: "62%", botFlag: "High Risk", reach: "-45% Penalty" },
  { id: "smmkings", name: "SMMKings / Crescitaly", subtitle: "Legacy Flat Delivery Engines", dropRate: "74%", botFlag: "Severe Risk", reach: "-65% Penalty" },
  { id: "others", name: "Standard Resellers", subtitle: "3rd-Party Dependent Panels", dropRate: "58%", botFlag: "Moderate-High", reach: "-30% Penalty" },
];

export default function BenchmarkSection({ wide }: { wide: boolean }) {
  const [activeTab, setActiveTab] = useState("all");
  const comp = COMPETITORS.find(c => c.id === activeTab) || COMPETITORS[0];

  return (
    <section id="benchmark" style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 24px" }}>
      <style>{`
        @keyframes pulse-amber {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.3); opacity: 1; box-shadow: 0 0 16px #ea580c; }
        }
        @keyframes pulse-red {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 1; box-shadow: 0 0 12px #ef4444; }
        }
        @keyframes dash-move {
          to { stroke-dashoffset: -40; }
        }
        .animate-dash {
          animation: dash-move 2s linear infinite;
        }
        .bench-tab {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .bench-tab:hover {
          transform: translateY(-2px);
        }
      `}</style>

      {/* Section Header */}
      <div style={{ textAlign: "center", marginBottom: 50 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 999, background: C.bg, boxShadow: C.insetSm, fontSize: 12, fontWeight: 800, color: C.amber, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 16 }}>
          <span>◆</span> Independent Direct Wholesale Architecture
        </div>
        <h2 style={{ fontSize: wide ? 42 : 30, fontWeight: 900, color: C.text, letterSpacing: "-1px", marginBottom: 16, lineHeight: 1.2 }}>
          Why YoyoSMM Outperforms Every Major SMM Panel
        </h2>
        <p style={{ fontSize: 16, color: C.textMuted, maxWidth: 720, margin: "0 auto", lineHeight: 1.7 }}>
          We are not a dependent reseller wrapper. While legacy panels rely on third-party APIs with flat machine spikes that trigger algorithm suppression, YoyoSMM operates its own direct wholesale delivery infrastructure powered by proprietary Logistic S-Curve pacing.
        </p>
      </div>

      {/* Competitor Selector Tabs */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 }}>
        {COMPETITORS.map((c) => {
          const isActive = activeTab === c.id;
          return (
            <div
              key={c.id}
              onClick={() => setActiveTab(c.id)}
              className="bench-tab"
              style={{
                padding: "12px 24px",
                borderRadius: 16,
                background: isActive ? C.grad : C.bg,
                color: isActive ? "#ffffff" : C.text,
                boxShadow: isActive ? C.raisedSm : C.raised,
                fontWeight: 800,
                fontSize: 14,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <span>{c.name}</span>
              <span style={{ fontSize: 11, opacity: isActive ? 0.9 : 0.6, fontWeight: 600 }}>{c.subtitle}</span>
            </div>
          );
        })}
      </div>

      {/* Animated Graph Showcase Container */}
      <div style={{ padding: wide ? "40px 48px" : "24px 20px", borderRadius: 28, background: C.bg, boxShadow: C.raisedLg, marginBottom: 48, position: "relative", overflow: "hidden" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: C.text, margin: 0 }}>48-Hour Delivery Velocity & Algorithmic Impact</h3>
            <p style={{ fontSize: 13, color: C.textMuted, margin: "4px 0 0" }}>Real-time telemetry comparison: YoyoSMM Logistic S-Curve vs. {comp.name}</p>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center", fontSize: 13, fontWeight: 700 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: C.grad, display: "inline-block", boxShadow: "0 0 8px #d97706" }} />
              <span style={{ color: C.text }}>YoyoSMM (Logistic S-Curve)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: C.red, display: "inline-block" }} />
              <span style={{ color: C.textMuted }}>{comp.name} (Flat Spike)</span>
            </div>
          </div>
        </div>

        {/* SVG Animated Graph */}
        <div style={{ position: "relative", width: "100%", height: wide ? 340 : 260, background: "rgba(255,255,255,0.4)", borderRadius: 20, boxShadow: C.inset, padding: "20px 20px 40px 50px", boxSizing: "border-box" }}>
          
          {/* Y-Axis Labels */}
          <div style={{ position: "absolute", left: 12, top: 20, bottom: 40, display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: C.textMuted }}>
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>

          {/* Grid Lines */}
          <svg width="100%" height="100%" viewBox="0 0 800 240" preserveAspectRatio="none" style={{ overflow: "visible" }}>
            <line x1="0" y1="0" x2="800" y2="0" stroke={C.border} strokeDasharray="4 4" />
            <line x1="0" y1="60" x2="800" y2="60" stroke={C.border} strokeDasharray="4 4" />
            <line x1="0" y1="120" x2="800" y2="120" stroke={C.border} strokeDasharray="4 4" />
            <line x1="0" y1="180" x2="800" y2="180" stroke={C.border} strokeDasharray="4 4" />
            <line x1="0" y1="240" x2="800" y2="240" stroke={C.border} />

            {/* Legacy Panel Flat Spike Curve (Red Dashed) */}
            <path
              d="M 0 240 L 40 20 L 160 20 L 220 160 L 400 180 L 600 200 L 800 210"
              fill="none"
              stroke={C.red}
              strokeWidth="3.5"
              strokeDasharray="8 6"
              className="animate-dash"
              style={{ opacity: 0.85 }}
            />
            {/* Legacy Red Warning Node */}
            <circle cx="160" cy="20" r="6" fill={C.red} style={{ animation: "pulse-red 1.5s infinite" }} />
            <circle cx="220" cy="160" r="6" fill={C.red} />

            {/* YoyoSMM Logistic S-Curve (Amber Glowing Solid) */}
            <defs>
              <linearGradient id="amberGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ea580c" />
                <stop offset="50%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <linearGradient id="amberArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d97706" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d="M 0 240 C 100 238, 180 220, 260 140 C 340 60, 440 15, 600 12 C 700 10, 760 10, 800 10 L 800 240 L 0 240 Z"
              fill="url(#amberArea)"
            />
            <path
              d="M 0 240 C 100 238, 180 220, 260 140 C 340 60, 440 15, 600 12 C 700 10, 760 10, 800 10"
              fill="none"
              stroke="url(#amberGrad)"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            {/* YoyoSMM Glowing Nodes */}
            <circle cx="260" cy="140" r="6" fill="#ea580c" style={{ animation: "pulse-amber 2s infinite" }} />
            <circle cx="600" cy="12" r="8" fill="#f59e0b" style={{ animation: "pulse-amber 1.5s infinite" }} />
          </svg>

          {/* Callout Badges on Graph */}
          <div style={{ position: "absolute", left: wide ? "18%" : "12%", top: wide ? "12%" : "8%", background: "rgba(239, 68, 68, 0.9)", color: "#fff", padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, boxShadow: "0 4px 12px rgba(239,68,68,0.3)", pointerEvents: "none" }}>
            🚨 Legacy Spike: Bot Purge & {comp.dropRate} Drop-off
          </div>

          <div style={{ position: "absolute", right: wide ? "12%" : "6%", top: wide ? "18%" : "25%", background: C.grad, color: "#fff", padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 800, boxShadow: "0 6px 16px rgba(217,119,6,0.4)", pointerEvents: "none" }}>
            🚀 YoyoSMM S-Curve: +340% Algorithmic Boost (Zero Drops)
          </div>

          {/* X-Axis Timeline Labels */}
          <div style={{ position: "absolute", left: 50, right: 20, bottom: 10, display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: C.textMuted }}>
            <span>0h (Launch)</span>
            <span>6h (Warmup)</span>
            <span>12h (Acceleration)</span>
            <span>24h (Peak Reach)</span>
            <span>36h (Decay)</span>
            <span>48h (Completed)</span>
          </div>
        </div>
      </div>

      {/* Detailed Side-by-Side Comparison Cards */}
      <div style={{ display: "grid", gridTemplateColumns: wide ? "repeat(3, 1fr)" : "1fr", gap: 24 }}>
        
        <div style={{ padding: "32px 28px", borderRadius: 24, background: C.bg, boxShadow: C.raised, borderTop: `4px solid ${C.amber}` }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>⚡</div>
          <h4 style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 8 }}>100% Independent Wholesale Nodes</h4>
          <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6, margin: 0 }}>
            Unlike reseller panels that chain API requests through third parties (adding lag and markups), YoyoSMM directly controls its delivery infrastructure. No dependencies, instant failover.
          </p>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}`, fontSize: 13, fontWeight: 800, color: C.green }}>
            ✓ 0ms Middleman Latency · Wholesale Rates
          </div>
        </div>

        <div style={{ padding: "32px 28px", borderRadius: 24, background: C.bg, boxShadow: C.raised, borderTop: `4px solid ${C.green}` }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>🛡️</div>
          <h4 style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 8 }}>Zero Bot Detection & Drop Protection</h4>
          <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6, margin: 0 }}>
            Flat delivery machines trigger social platform AI security filters. Our logistic S-curve mimics organic human virality, achieving a 0.02% detection rate and bulletproof retention.
          </p>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}`, fontSize: 13, fontWeight: 800, color: C.green }}>
            ✓ 99.98% Retention Rate · Lifetime Guarantee
          </div>
        </div>

        <div style={{ padding: "32px 28px", borderRadius: 24, background: C.bg, boxShadow: C.raised, borderTop: `4px solid #3b82f6` }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>📈</div>
          <h4 style={{ fontSize: 18, fontWeight: 900, color: C.text, marginBottom: 8 }}>Algorithmic Recommendation Boost</h4>
          <p style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.6, margin: 0 }}>
            By pacing engagement during platform peak hours and tapering smoothly, your content signals authenticity to TikTok, IG, and YouTube recommendation algorithms for exponential organic reach.
          </p>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}`, fontSize: 13, fontWeight: 800, color: "#3b82f6" }}>
            ✓ +340% Avg. Recommendation Multiplier
          </div>
        </div>

      </div>
    </section>
  );
}
