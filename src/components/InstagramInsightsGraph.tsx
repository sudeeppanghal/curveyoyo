'use client';

import React from 'react';

interface InstagramInsightsGraphProps {
  totalViews: number;
  durationHours: number;
  deliveredViews?: number;
  platform?: string;
}

export function InstagramInsightsGraph({
  totalViews = 30000,
  durationHours = 24,
  deliveredViews = 0,
  platform = "INSTAGRAM"
}: InstagramInsightsGraphProps) {
  // Milestone progress ratios matching the exact user image curve:
  // 0h: 0%, 1h: 0.83%, 2h: 2.33%, 4h: 9.33%, 6h: 15.00%, 7h: 22.67%,
  // 9h: 38.33%, 11h: 53.33%, 13h: 66.67%, 15h: 76.67%, 17h: 85.00%,
  // 19h: 91.00%, 21h: 95.33%, 23h: 98.00%, 24h: 100.00%
  const milestones = [
    { hourRatio: 0, pct: 0.00 },
    { hourRatio: 1/24, pct: 0.0083 },
    { hourRatio: 2/24, pct: 0.0233 },
    { hourRatio: 4/24, pct: 0.0933 },
    { hourRatio: 6/24, pct: 0.1500 },
    { hourRatio: 7/24, pct: 0.2267 },
    { hourRatio: 9/24, pct: 0.3833 },
    { hourRatio: 11/24, pct: 0.5333 },
    { hourRatio: 13/24, pct: 0.6667 },
    { hourRatio: 15/24, pct: 0.7667 },
    { hourRatio: 17/24, pct: 0.8500 },
    { hourRatio: 19/24, pct: 0.9100 },
    { hourRatio: 21/24, pct: 0.9533 },
    { hourRatio: 23/24, pct: 0.9800 },
    { hourRatio: 24/24, pct: 1.0000 },
  ];

  const W = 800;
  const H = 380;
  const padL = 60;
  const padR = 40;
  const padT = 50;
  const padB = 60;

  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Max Y value (e.g. 35k scale for 30k views, or 1.15 * totalViews)
  const maxY = Math.ceil((totalViews * 1.15) / 1000) * 1000 || 35000;

  const points = milestones.map((m) => {
    const timeHr = m.hourRatio * durationHours;
    const viewsVal = Math.round(m.pct * totalViews);
    const x = padL + m.hourRatio * chartW;
    const y = padT + (1 - viewsVal / maxY) * chartH;
    return { ...m, timeHr, viewsVal, x, y };
  });

  // SVG Smooth Cubic Bezier Path Generator
  const makeSmoothPath = (pts: typeof points) => {
    if (pts.length === 0) return "";
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cp1x = curr.x + (next.x - curr.x) * 0.4;
      const cp1y = curr.y;
      const cp2x = curr.x + (next.x - curr.x) * 0.6;
      const cp2y = next.y;
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
    }
    return d;
  };

  const pathD = makeSmoothPath(points);
  const fillD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${(padT + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padT + chartH).toFixed(1)} Z`;

  // Y-axis grid ticks
  const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((ratio) => {
    const val = Math.round((ratio * maxY) / 1000);
    const y = padT + (1 - ratio) * chartH;
    return { label: `${val}K`, y };
  });

  // X-axis grid ticks
  const xTicks = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].map((hr) => {
    const ratio = hr / 24;
    const scaledHr = Math.round(ratio * durationHours * 10) / 10;
    const x = padL + ratio * chartW;
    return { label: `${scaledHr}h`, x };
  });

  return (
    <div className="w-full bg-[#0c0d14] rounded-3xl p-6 border border-pink-500/30 backdrop-blur-2xl text-white space-y-4 font-sans shadow-2xl relative overflow-hidden">
      
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Instagram Reel Organic S-Curve
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            {totalViews.toLocaleString()} Views in {durationHours} Hours
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-pink-400 font-bold bg-pink-500/10 px-3 py-1.5 rounded-full border border-pink-500/20">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
          Cumulative Views
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto min-w-[650px] overflow-visible">
          <defs>
            <linearGradient id="magentaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D946EF" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#C084FC" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#D946EF" stopOpacity="0.0" />
            </linearGradient>

            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Horizontal Grid Lines */}
          {yTicks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={padL}
                y1={t.y}
                x2={W - padR}
                y2={t.y}
                stroke="#1f2937"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padL - 10}
                y={t.y + 4}
                textAnchor="end"
                className="text-[11px] font-mono fill-gray-400 font-bold"
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* Y-Axis Title */}
          <text
            x={-(padT + chartH / 2)}
            y={18}
            transform="rotate(-90)"
            textAnchor="middle"
            className="text-[10px] font-mono font-extrabold uppercase tracking-widest fill-gray-400"
          >
            CUMULATIVE VIEWS
          </text>

          {/* X-Axis Labels & Vertical Grid */}
          {xTicks.map((t, idx) => (
            <g key={idx}>
              <line
                x1={t.x}
                y1={padT}
                x2={t.x}
                y2={padT + chartH}
                stroke="#1f2937"
                strokeDasharray="2 2"
                strokeWidth="0.8"
              />
              <text
                x={t.x}
                y={H - padB + 20}
                textAnchor="middle"
                className="text-[11px] font-mono fill-gray-400 font-bold"
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* X-Axis Title */}
          <text
            x={padL + chartW / 2}
            y={H - 12}
            textAnchor="middle"
            className="text-[10px] font-mono font-extrabold uppercase tracking-widest fill-gray-400"
          >
            TIME (HOURS)
          </text>

          {/* Fill Gradient Area */}
          <path d={fillD} fill="url(#magentaGradient)" />

          {/* Smooth Magenta Curve Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#D946EF"
            strokeWidth="3.5"
            strokeLinecap="round"
            filter="url(#glow)"
          />

          {/* Milestone Circle Points & View Count Badges */}
          {points.map((p, idx) => (
            <g key={idx} className="group cursor-pointer">
              {/* Pulsing Outer Circle */}
              <circle
                cx={p.x}
                cy={p.y}
                r="6"
                fill="#D946EF"
                className="transition-all duration-300 group-hover:r-8"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r="3"
                fill="#FFFFFF"
              />

              {/* View Value Text Label Above Dot */}
              {p.viewsVal > 0 && (
                <text
                  x={p.x}
                  y={p.y - 12}
                  textAnchor="middle"
                  className="text-[10px] font-mono font-black fill-white bg-black/60 px-1 py-0.5 rounded"
                  style={{ textShadow: "0 0 6px #000" }}
                >
                  {p.viewsVal >= 10000 ? `${(p.viewsVal/1000).toFixed(1)}k` : p.viewsVal.toLocaleString()}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400 font-mono border-t border-white/10 pt-3 gap-2">
        <span>Natural S-Curve: Slow Start (0-2h) → Viral Expansion (8-16h) → Organic Plateau</span>
        <span className="text-pink-400 font-bold">100% Authentic Feed Distribution</span>
      </div>
    </div>
  );
}
