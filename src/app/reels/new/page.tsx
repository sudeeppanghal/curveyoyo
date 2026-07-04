"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generateDeliverySchedule, generateRawSchedule, calculateEngagementTargets, DeliveryBatch } from "@/lib/delivery/curve";
import { CURVE_DESCRIPTIONS_100 as CURVE_DESCRIPTIONS, STYLE_NEON_COLORS_100 as STYLE_NEON_COLORS, CURVE_100_LIST } from "@/lib/delivery/curve-styles-100";

// ── Types ───────────────────────────────────────────────────────
type Platform = "INSTAGRAM" | "TIKTOK" | "FACEBOOK";
type CurveStyle = string;

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
  INSTAGRAM: "📷", TIKTOK: "🎵", FACEBOOK: "📘",
};

// ── Custom Graph Drawing Canvas ──────────────────────────────────
type CtrlPoint = { x: number; y: number };

function evalSpline(pts: CtrlPoint[], t: number): number {
  if (pts.length === 0) return 0;
  if (pts.length === 1) return pts[0].y;
  if (t <= pts[0].x) return pts[0].y;
  if (t >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
  let i = 0;
  while (i < pts.length - 2 && pts[i + 1].x < t) i++;
  const p0 = pts[Math.max(0, i - 1)];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[Math.min(pts.length - 1, i + 2)];
  const segLen = p2.x - p1.x;
  const tt = segLen > 0 ? (t - p1.x) / segLen : 0;
  const h00 = 2*tt*tt*tt - 3*tt*tt + 1;
  const h10 = tt*tt*tt - 2*tt*tt + tt;
  const h01 = -2*tt*tt*tt + 3*tt*tt;
  const h11 = tt*tt*tt - tt*tt;
  const m1 = (p2.y - p0.y) / 2;
  const m2 = (p3.y - p1.y) / 2;
  return Math.max(0, Math.min(1, h00*p1.y + h10*m1 + h01*p2.y + h11*m2));
}

function makeSplinePath(pts: CtrlPoint[], toX: (n:number)=>number, toY: (n:number)=>number): string {
  if (pts.length < 2) return '';
  let d = `M ${toX(pts[0].x).toFixed(1)} ${toY(pts[0].y).toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p2x = pts[Math.max(0, i-2)];
    const p1x = pts[i-1];
    const cur = pts[i];
    const nxt = pts[Math.min(pts.length-1, i+1)];
    const cp1x = toX(p1x.x + (cur.x - p2x.x) / 6);
    const cp1y = toY(p1x.y + (cur.y - p2x.y) / 6);
    const cp2x = toX(cur.x - (nxt.x - p1x.x) / 6);
    const cp2y = toY(cur.y - (nxt.y - p1x.y) / 6);
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${toX(cur.x).toFixed(1)} ${toY(cur.y).toFixed(1)}`;
  }
  return d;
}

const PRESET_SHAPES: { label: string; icon: string; pts: CtrlPoint[] }[] = [
  { label: 'S-Curve',    icon: '~',  pts: [{x:0,y:0},{x:0.2,y:0.05},{x:0.5,y:0.5},{x:0.8,y:0.95},{x:1,y:1}] },
  { label: 'Early Peak', icon: 'EP', pts: [{x:0,y:0},{x:0.15,y:0.7},{x:0.4,y:0.9},{x:1,y:1}] },
  { label: 'Late Surge', icon: 'LS', pts: [{x:0,y:0},{x:0.5,y:0.1},{x:0.75,y:0.5},{x:0.9,y:0.9},{x:1,y:1}] },
  { label: 'Linear',     icon: '/',  pts: [{x:0,y:0},{x:0.33,y:0.33},{x:0.67,y:0.67},{x:1,y:1}] },
  { label: 'Bell Peak',  icon: 'BP', pts: [{x:0,y:0},{x:0.2,y:0.3},{x:0.5,y:1},{x:0.8,y:0.3},{x:1,y:0.05}] },
  { label: 'Step',       icon: '=',  pts: [{x:0,y:0},{x:0.33,y:0},{x:0.34,y:0.5},{x:0.66,y:0.5},{x:0.67,y:1},{x:1,y:1}] },
];

function CustomGraphDesigner({
  views, durationHours, engEnabled,
  likesRatio, savesRatio, sharesRatio, commentsRatio,
  likesOn, savesOn, sharesOn, commentsOn,
  onScheduleChange,
}: {
  views: number; durationHours: number; engEnabled: boolean;
  likesRatio: number; savesRatio: number; sharesRatio: number; commentsRatio: number;
  likesOn: boolean; savesOn: boolean; sharesOn: boolean; commentsOn: boolean;
  onScheduleChange: (s: DeliveryBatch[]) => void;
}) {
  const W = 560, H = 260;
  const PAD = { t: 24, r: 20, b: 40, l: 52 };
  const CW = W - PAD.l - PAD.r;
  const CH = H - PAD.t - PAD.b;

  const [ctrlPts, setCtrlPts] = useState<CtrlPoint[]>([
    {x:0,y:0},{x:0.2,y:0.05},{x:0.5,y:0.5},{x:0.8,y:0.95},{x:1,y:1},
  ]);
  const [draggingIdx, setDraggingIdx] = useState<number|null>(null);
  const [hoverIdx,    setHoverIdx]    = useState<number|null>(null);
  const [tooltip, setTooltip]         = useState<{x:number;y:number;label:string}|null>(null);
  const svgRef = useRef<SVGSVGElement|null>(null);

  const toSvgX = (nx: number) => PAD.l + nx * CW;
  const toSvgY = (ny: number) => PAD.t + (1 - ny) * CH;
  const fromSvg = (sx: number, sy: number): CtrlPoint => ({
    x: Math.max(0, Math.min(1, (sx - PAD.l) / CW)),
    y: Math.max(0, Math.min(1, 1 - (sy - PAD.t) / CH)),
  });
  const getSvgCoords = (e: React.MouseEvent|React.TouchEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const scX = W / rect.width, scY = H / rect.height;
    if ('touches' in e) {
      const t = (e as React.TouchEvent).touches[0];
      return { sx: (t.clientX - rect.left)*scX, sy: (t.clientY - rect.top)*scY };
    }
    const m = e as React.MouseEvent;
    return { sx: (m.clientX - rect.left)*scX, sy: (m.clientY - rect.top)*scY };
  };

  const buildSchedule = useCallback((pts: CtrlPoint[]): DeliveryBatch[] => {
    const sorted = [...pts].sort((a,b) => a.x - b.x);
    const intMins = Math.max(30, Math.round((durationHours*60) / Math.min(96, durationHours*2)));
    const steps   = Math.max(2, Math.round((durationHours*60) / intMins));
    const batches: DeliveryBatch[] = [];
    let prevCum = 0;
    for (let s = 0; s < steps; s++) {
      const t = s / (steps - 1);
      const cumFrac  = evalSpline(sorted, t);
      const cumViews = Math.round(cumFrac * views);
      const bViews   = Math.max(0, cumViews - prevCum);
      const hr = t * durationHours;
      batches.push({
        hour: hr, views: bViews,
        likes:    engEnabled && likesOn    ? Math.round(bViews * likesRatio    / 100) : 0,
        saves:    engEnabled && savesOn    ? Math.round(bViews * savesRatio    / 100) : 0,
        shares:   engEnabled && sharesOn   ? Math.round(bViews * sharesRatio   / 100) : 0,
        comments: engEnabled && commentsOn ? Math.round(bViews * commentsRatio / 100) : 0,
        scheduledTime: new Date(Date.now() + hr*3600000).toISOString(),
        scheduledDelayMs: hr * 3600000,
      });
      prevCum = cumViews;
    }
    return batches;
  }, [views, durationHours, engEnabled, likesOn, savesOn, sharesOn, commentsOn, likesRatio, savesRatio, sharesRatio, commentsRatio]);

  useEffect(() => {
    const id = setTimeout(() => onScheduleChange(buildSchedule(ctrlPts)), 0);
    return () => clearTimeout(id);
  }, [ctrlPts, buildSchedule, onScheduleChange]);

  const handleMove = (e: React.MouseEvent<SVGSVGElement>|React.TouchEvent<SVGSVGElement>) => {
    if (draggingIdx === null) return;
    e.preventDefault();
    const {sx, sy} = getSvgCoords(e);
    const norm = fromSvg(sx, sy);
    const newPts = [...ctrlPts];
    const idx = draggingIdx;
    if (idx === 0)                    newPts[idx] = {x:0, y: norm.y};
    else if (idx === newPts.length-1) newPts[idx] = {x:1, y: norm.y};
    else {
      const prevX = newPts[idx-1].x + 0.02;
      const nextX = newPts[idx+1].x - 0.02;
      newPts[idx] = {x: Math.max(prevX, Math.min(nextX, norm.x)), y: norm.y};
    }
    setCtrlPts(newPts);
    const p = newPts[idx];
    setTooltip({x: toSvgX(p.x), y: toSvgY(p.y),
      label: `${Math.round(p.y*100)}% @ ${Math.round(p.x*durationHours*10)/10}h`});
  };
  const handleUp = () => { setDraggingIdx(null); setTooltip(null); };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingIdx !== null) return;
    const {sx, sy} = getSvgCoords(e);
    const norm = fromSvg(sx, sy);
    if (ctrlPts.some(p => Math.hypot(toSvgX(p.x)-sx, toSvgY(p.y)-sy) < 18)) return;
    setCtrlPts([...ctrlPts, norm].sort((a,b) => a.x - b.x));
  };

  const handleDblClick = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (ctrlPts.length <= 2) return;
    setCtrlPts(ctrlPts.filter((_,i) => i !== idx));
  };

  const sorted = [...ctrlPts].sort((a,b) => a.x - b.x);
  const pathD  = makeSplinePath(sorted, toSvgX, toSvgY);
  const lp     = sorted[sorted.length-1];
  const fillD  = pathD ? `${pathD} L ${toSvgX(lp.x).toFixed(1)} ${(PAD.t+CH).toFixed(1)} L ${toSvgX(0).toFixed(1)} ${(PAD.t+CH).toFixed(1)} Z` : '';
  const gridXs = [0, 0.25, 0.5, 0.75, 1];
  const gridYs = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div style={{background:'#08010f',border:'1.5px solid #1c0a35',borderRadius:20,padding:20,display:'flex',flexDirection:'column',gap:14}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flexWrap:'wrap'}}>
        <div>
          <p style={{margin:0,fontSize:13,fontWeight:900,color:'#f3e8ff'}}>Draw Your Delivery Curve</p>
          <p style={{margin:'2px 0 0',fontSize:11,color:'#a78bfa',fontWeight:600}}>Drag dots · Click canvas to add · Double-click to remove</p>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {PRESET_SHAPES.map(ps => (
            <button key={ps.label} onClick={()=>setCtrlPts(ps.pts)}
              style={{padding:'5px 10px',borderRadius:8,border:'1px solid #2d0a52',background:'#120324',color:'#c084fc',fontSize:11,fontWeight:700,cursor:'pointer'}}>
              {ps.icon} {ps.label}
            </button>
          ))}
        </div>
      </div>

      <svg ref={svgRef} width='100%' viewBox={`0 0 ${W} ${H}`}
        style={{display:'block',cursor:draggingIdx!==null?'grabbing':'crosshair',userSelect:'none',touchAction:'none'}}
        onMouseMove={handleMove} onMouseUp={handleUp} onMouseLeave={handleUp}
        onTouchMove={handleMove} onTouchEnd={handleUp}
        onClick={handleCanvasClick}>
        <defs>
          <linearGradient id='cgGrad' x1='0' y1='0' x2='1' y2='0'>
            <stop offset='0%' stopColor='#7c3aed'/><stop offset='100%' stopColor='#d946ef'/>
          </linearGradient>
          <linearGradient id='cgFill' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stopColor='#d946ef' stopOpacity='0.35'/>
            <stop offset='100%' stopColor='#7c3aed' stopOpacity='0.02'/>
          </linearGradient>
        </defs>
        {gridXs.map((gx,i)=><line key={`gx${i}`} x1={toSvgX(gx)} y1={PAD.t} x2={toSvgX(gx)} y2={PAD.t+CH} stroke='#1c0a35' strokeWidth='1' strokeDasharray={gx===0||gx===1?undefined:'3,4'}/>)}
        {gridYs.map((gy,i)=><line key={`gy${i}`} x1={PAD.l} y1={toSvgY(gy)} x2={PAD.l+CW} y2={toSvgY(gy)} stroke='#1c0a35' strokeWidth='1' strokeDasharray={gy===0||gy===1?undefined:'3,4'}/>)}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t+CH} stroke='#3f1b6d' strokeWidth='1.5'/>
        <line x1={PAD.l} y1={PAD.t+CH} x2={PAD.l+CW} y2={PAD.t+CH} stroke='#3f1b6d' strokeWidth='1.5'/>
        {fillD && <path d={fillD} fill='url(#cgFill)'/>}
        {pathD && <path d={pathD} fill='none' stroke='url(#cgGrad)' strokeWidth='2.5' strokeLinecap='round' style={{filter:'drop-shadow(0 0 6px rgba(217,70,239,0.7))'}}/>}
        {gridXs.map((gx,i)=><text key={`lx${i}`} x={toSvgX(gx)} y={PAD.t+CH+20} textAnchor='middle' fill='#6b21a8' fontSize='10' fontWeight='700'>{Math.round(gx*durationHours)}h</text>)}
        {gridYs.map((gy,i)=><text key={`ly${i}`} x={PAD.l-6} y={toSvgY(gy)+4} textAnchor='end' fill='#6b21a8' fontSize='10' fontWeight='700'>{Math.round(gy*100)}%</text>)}
        {sorted.map((pt,i)=>i>0&&(
          <line key={`cn${i}`} x1={toSvgX(sorted[i-1].x)} y1={toSvgY(sorted[i-1].y)} x2={toSvgX(pt.x)} y2={toSvgY(pt.y)} stroke='#2d0a52' strokeWidth='1' strokeDasharray='3,4'/>
        ))}
        {ctrlPts.map((pt,idx)=>{
          const sx=toSvgX(pt.x),sy=toSvgY(pt.y);
          const isDrag=draggingIdx===idx,isHov=hoverIdx===idx;
          return (
            <g key={idx}>
              <circle cx={sx} cy={sy} r={isDrag?20:isHov?16:12} fill='rgba(217,70,239,0.08)' stroke={isDrag?'#d946ef':'#7c3aed'} strokeWidth='1'/>
              <circle cx={sx} cy={sy} r={isDrag?10:isHov?8:6} fill={isDrag?'#d946ef':'#7c3aed'} stroke='#f3e8ff' strokeWidth='2'
                style={{cursor:'grab',filter:isDrag?'drop-shadow(0 0 10px #d946ef)':isHov?'drop-shadow(0 0 6px #7c3aed)':'none'}}
                onMouseDown={e=>{e.stopPropagation();setDraggingIdx(idx);}}
                onMouseEnter={()=>setHoverIdx(idx)} onMouseLeave={()=>setHoverIdx(null)}
                onDoubleClick={e=>handleDblClick(idx,e)}
                onTouchStart={e=>{e.stopPropagation();setDraggingIdx(idx);}}
              />
              <text x={sx} y={sy-14} textAnchor='middle' fill='#c084fc' fontSize='9' fontWeight='800'>{idx+1}</text>
            </g>
          );
        })}
        {tooltip&&(
          <g>
            <rect x={tooltip.x-36} y={tooltip.y-32} width={72} height={20} rx={6} fill='#1a0636' stroke='#d946ef' strokeWidth='1'/>
            <text x={tooltip.x} y={tooltip.y-18} textAnchor='middle' fill='#f3e8ff' fontSize='10' fontWeight='800'>{tooltip.label}</text>
          </g>
        )}
      </svg>
      <div style={{display:'flex',gap:20,fontSize:11,color:'#a78bfa',fontWeight:700,flexWrap:'wrap'}}>
        <span>Points: <strong style={{color:'#f3e8ff'}}>{ctrlPts.length}</strong></span>
        <span>Duration: <strong style={{color:'#f3e8ff'}}>{durationHours}h</strong></span>
        <span>Total views: <strong style={{color:'#f3e8ff'}}>{views.toLocaleString()}</strong></span>
      </div>
    </div>
  );
}

// ── Premium Neon Animated Chart ──────────────────────────────────
function CurvePreview({
  views, durationHours, style, warmup, peak,
  likesRatio, savesRatio, sharesRatio, commentsRatio,
  likesOn, savesOn, sharesOn, commentsOn, engEnabled,
  schedule,
  isCustomMode = false,
  selectedBatchIndex = null,
  onSelectBatch = null,
  onChangeSchedule = null,
}: {
  views: number; durationHours: number; style: CurveStyle; warmup: number; peak: number;
  likesRatio: number; savesRatio: number; sharesRatio: number; commentsRatio: number;
  likesOn: boolean; savesOn: boolean; sharesOn: boolean; commentsOn: boolean; engEnabled: boolean;
  schedule: any[];
  isCustomMode?: boolean;
  selectedBatchIndex?: number | null;
  onSelectBatch?: ((idx: number) => void) | null;
  onChangeSchedule?: ((newSchedule: any[]) => void) | null;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playHour, setPlayHour] = useState(0);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);

  const batches = schedule;

  // Playhead simulation timer
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setPlayHour((h) => {
          if (h >= batches.length - 1 || h >= durationHours - 1) {
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

  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  if (!batches.length) return null;

  // Calculate cumulative views for each batch (legacy support for drag handlers)
  let runningViewsSum = 0;
  const cumulativeBatches = batches.map((b) => {
    runningViewsSum += b.views;
    return {
      ...b,
      cumulativeViews: runningViewsSum,
    };
  });

  const W = 550, H = 200, pad = 30;
  const maxVal = Math.max(...batches.map((b) => b.views), 1);
  const neon = STYLE_NEON_COLORS[style] || STYLE_NEON_COLORS.ORGANIC;

  // Helper to map index & quantity to coordinates
  const getCoords = (val: number, max: number, idx: number, hour: number) => {
    const x = isCustomMode
      ? pad + (hour / durationHours) * (W - 2 * pad)
      : pad + (idx / (batches.length - 1)) * (W - 2 * pad);
    const y = H - pad - (val / max) * (H - 2 * pad);
    return { x, y };
  };

  const viewsPts = batches.map((b, i) => getCoords(b.views, maxVal, i, b.hour));

  const makePath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  const makeFill = (pts: { x: number; y: number }[]) => [
    makePath(pts),
    `L ${pts.at(-1)!.x.toFixed(1)} ${H - pad}`,
    `L ${pts[0].x.toFixed(1)} ${H - pad} Z`,
  ].join(" ");

  const curveInfo = CURVE_DESCRIPTIONS[style] || CURVE_DESCRIPTIONS["ORGANIC"] || { label: "Organic S-Curve", desc: "Natural viral growth — slow warmup, steady peak, smooth decay.", warmup: 4, peak: 8, icon: "🌅", category: "Classic", num: 6 };

  // Determine current active simulation batch
  const safeIdx = Math.max(0, Math.min(isPlaying ? playHour : (batches.length - 1), batches.length - 1));
  const currentBatchIdx = isNaN(safeIdx) ? 0 : safeIdx;
  const currentBatch = batches[currentBatchIdx] || { hour: 0, views: 0, likes: 0, saves: 0, shares: 0, comments: 0 };
  const currentPt = viewsPts[currentBatchIdx] || { x: 0, y: 0 };
  const dispatchPct = Math.round(((currentBatch.views || 0) / maxVal) * 100);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (draggingIdx === null || !onChangeSchedule || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    const svgY = (mouseY / rect.height) * H;
    
    const heightPx = H - 2 * pad;
    const relativeY = H - pad - svgY;
    const fractionY = relativeY / heightPx;
    let proposedCumulative = Math.round(fractionY * maxVal);
    
    const prevCumulative = draggingIdx > 0 ? cumulativeBatches[draggingIdx - 1].cumulativeViews : 0;
    const nextCumulative = draggingIdx < cumulativeBatches.length - 1 ? cumulativeBatches[draggingIdx + 1].cumulativeViews : maxVal;
    
    proposedCumulative = Math.max(prevCumulative, Math.min(nextCumulative, proposedCumulative));
    
    let proposedHour = schedule[draggingIdx].hour;
    if (isCustomMode && draggingIdx > 0) {
      const mouseX = e.clientX - rect.left;
      const svgX = (mouseX / rect.width) * W;
      const widthPx = W - 2 * pad;
      const relativeX = svgX - pad;
      const fractionX = relativeX / widthPx;
      proposedHour = fractionX * durationHours;
      
      const prevHour = schedule[draggingIdx - 1].hour;
      const nextHour = draggingIdx < schedule.length - 1 ? schedule[draggingIdx + 1].hour : durationHours;
      proposedHour = Math.max(prevHour + 0.05, Math.min(nextHour - 0.05, proposedHour));
    }

    const newSchedule = [...schedule];
    newSchedule[draggingIdx] = {
      ...newSchedule[draggingIdx],
      views: proposedCumulative - prevCumulative,
      hour: proposedHour,
      scheduledTime: new Date(Date.now() + proposedHour * 60 * 60 * 1000).toISOString(),
    };
    if (draggingIdx < newSchedule.length - 1) {
      newSchedule[draggingIdx + 1] = {
        ...newSchedule[draggingIdx + 1],
        views: nextCumulative - proposedCumulative,
      };
    }
    
    onChangeSchedule(newSchedule);
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (draggingIdx === null || !onChangeSchedule || !svgRef.current) return;
    const touch = e.touches[0];
    const rect = svgRef.current.getBoundingClientRect();
    const mouseY = touch.clientY - rect.top;
    const svgY = (mouseY / rect.height) * H;
    
    const heightPx = H - 2 * pad;
    const relativeY = H - pad - svgY;
    const fractionY = relativeY / heightPx;
    let proposedCumulative = Math.round(fractionY * maxVal);
    
    const prevCumulative = draggingIdx > 0 ? cumulativeBatches[draggingIdx - 1].cumulativeViews : 0;
    const nextCumulative = draggingIdx < cumulativeBatches.length - 1 ? cumulativeBatches[draggingIdx + 1].cumulativeViews : maxVal;
    
    proposedCumulative = Math.max(prevCumulative, Math.min(nextCumulative, proposedCumulative));
    
    let proposedHour = schedule[draggingIdx].hour;
    if (isCustomMode && draggingIdx > 0) {
      const mouseX = touch.clientX - rect.left;
      const svgX = (mouseX / rect.width) * W;
      const widthPx = W - 2 * pad;
      const relativeX = svgX - pad;
      const fractionX = relativeX / widthPx;
      proposedHour = fractionX * durationHours;
      
      const prevHour = schedule[draggingIdx - 1].hour;
      const nextHour = draggingIdx < schedule.length - 1 ? schedule[draggingIdx + 1].hour : durationHours;
      proposedHour = Math.max(prevHour + 0.05, Math.min(nextHour - 0.05, proposedHour));
    }

    const newSchedule = [...schedule];
    newSchedule[draggingIdx] = {
      ...newSchedule[draggingIdx],
      views: proposedCumulative - prevCumulative,
      hour: proposedHour,
      scheduledTime: new Date(Date.now() + proposedHour * 60 * 60 * 1000).toISOString(),
    };
    if (draggingIdx < newSchedule.length - 1) {
      newSchedule[draggingIdx + 1] = {
        ...newSchedule[draggingIdx + 1],
        views: nextCumulative - proposedCumulative,
      };
    }
    
    onChangeSchedule(newSchedule);
  };

  const handleMouseUp = () => {
    setDraggingIdx(null);
  };

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
            <h3 style={{ fontSize: 15, fontWeight: 900, color: "#f3e8ff", margin: 0 }}>
              {isCustomMode ? "✏️ Custom Graph Designer" : "Live Growth Plot"}
            </h3>
          </div>
          <p style={{ fontSize: 12, color: "#c084fc", margin: 0, fontWeight: 550, maxWidth: 380, lineHeight: 1.4 }}>
            {isCustomMode 
              ? "Drag the glowing dots up and down on the graph to adjust the batch view pacing."
              : curveInfo.desc}
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
          {isCustomMode ? "Mode: Custom Graph" : `Preset: ${curveInfo.label}`}
        </div>
      </div>

      {/* SVG Neon Chart */}
      <div style={{ position: "relative", width: "100%", background: "#120324", borderRadius: 16, border: "1px solid #23083f", padding: "24px 8px 16px", overflow: "hidden" }}>
        <svg
          ref={svgRef}
          width="100%"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ overflow: "visible" }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
        >
          <defs>
            <linearGradient id="neonGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={neon.stroke} stopOpacity="0.4" />
              <stop offset="100%" stopColor={neon.stop} stopOpacity="0" />
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
                  {Math.round((val * maxVal) / views * 100)}%
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {Array.from({ length: 9 }).map((_, i) => {
            const x = pad + (i / 8) * (W - 2 * pad);
            const hourLabel = `${Math.round((i / 8) * durationHours)}h`;
            return (
              <g key={i}>
                <line x1={x} y1={H - pad} x2={x} y2={H - pad + 4} stroke="#3b1d60" strokeWidth="1" />
                <text x={x} y={H - pad + 15} fill="#a78bfa" fontSize="9" fontWeight="750" textAnchor="middle">
                  {hourLabel}
                </text>
              </g>
            );
          })}

          {/* Curve Area & Line */}
          <g>
            <path d={makeFill(viewsPts)} fill="url(#neonGrad)" style={{ transition: draggingIdx !== null ? "none" : "all 0.5s ease" }} />
            <path d={makePath(viewsPts)} fill="none" stroke={neon.stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonGlow)" style={{ transition: draggingIdx !== null ? "none" : "all 0.5s ease" }} />
          </g>

          {/* Interactive dots in custom mode */}
          {isCustomMode && viewsPts.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={selectedBatchIndex === idx ? 8 : 4.5}
              fill={selectedBatchIndex === idx ? "#22c55e" : neon.stroke}
              stroke="#ffffff"
              strokeWidth={selectedBatchIndex === idx ? 2.5 : 1.5}
              style={{ cursor: "move", filter: selectedBatchIndex === idx ? "drop-shadow(0 0 6px #22c55e)" : "none" }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingIdx(idx);
                if (onSelectBatch) onSelectBatch(idx);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setDraggingIdx(idx);
                if (onSelectBatch) onSelectBatch(idx);
              }}
            />
          ))}

          {/* Playhead vertical line & glowing node */}
          {!isCustomMode && currentPt && (
            <g>
              <line x1={currentPt.x} y1={pad} x2={currentPt.x} y2={H - pad} stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="2 2" opacity="0.6" />
              <circle cx={currentPt.x} cy={currentPt.y} r="14" fill="none" stroke={neon.stroke} strokeWidth="1.5" opacity="0.8">
                <animate attributeName="r" values="6;22;6" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0;0.8" dur="2.4s" repeatCount="indefinite" />
              </circle>
              <circle cx={currentPt.x} cy={currentPt.y} r="6" fill={neon.glow} opacity="0.6">
                <animate attributeName="r" values="6;14;6" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle cx={currentPt.x} cy={currentPt.y} r="6" fill="#ffffff" stroke={neon.stroke} strokeWidth="3" filter={`drop-shadow(0 0 6px ${neon.stroke})`} />
            </g>
          )}
        </svg>

        {/* Live playhead Tooltip box inside the SVG container */}
        {!isCustomMode && currentPt && (
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
              Hour: {Math.round(currentBatch.hour)}h
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#d946ef" }}>
              Views: {(currentBatch?.views ?? 0).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Control bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #1c0a35", paddingTop: 14 }}>
        {!isCustomMode ? (
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
        ) : (
          <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
            <span>💡 Click a dot to edit manually or drag it vertically</span>
          </div>
        )}

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
  const info = CURVE_DESCRIPTIONS[style];
  const points = useMemo(() => {
    const batches = generateRawSchedule({
      totalViews: 10000,
      durationHours: 24,
      warmupHours: info?.warmup ?? 4,
      peakHours: info?.peak ?? 8,
      style,
      engagementEnabled: false,
      tzOffsetHours: 0,
    });
    return batches.map((b) => b.views);
  }, [style, info?.warmup, info?.peak]);

  const maxVal = Math.max(...points, 1);
  const width = 100;
  const height = 30;
  const padding = 2;

  const pathD = points
    .map((v: number, i: number) => {
      const x = padding + (i / (points.length - 1)) * (width - 2 * padding);
      const y = height - padding - (v / maxVal) * (height - 2 * padding);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const fillD = `${pathD} L ${width - padding} ${height} L ${padding} ${height} Z`;

  const neon = STYLE_NEON_COLORS[style] || STYLE_NEON_COLORS.ORGANIC || { stroke: "#d946ef", glow: "rgba(217, 70, 239, 0.4)", stop: "#a855f7" };
  const gradId = `mini-grad-${style}`;

  return (
    <svg width={width} height={height} style={{ overflow: "visible", marginTop: 6, display: "block", width: "100%" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={neon.stroke} stopOpacity={active ? "0.45" : "0.25"} />
          <stop offset="100%" stopColor={neon.stroke} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gradId})`} />
      <path
        d={pathD}
        fill="none"
        stroke={neon.stroke}
        strokeWidth={active ? "2.5" : "2"}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter: active ? `drop-shadow(0 0 8px ${neon.stroke})` : `drop-shadow(0 0 3px ${neon.stroke})`,
          transition: "all 0.25s ease"
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
function EngRow({ icon, label, enabled, ratio, maxRatio, count, minLimit, views, onToggle, onRatio }: {
  icon: string; label: string; enabled: boolean; ratio: number;
  maxRatio: number; count: number; minLimit?: number; views: number; onToggle: () => void; onRatio: (v: number) => void;
}) {
  const rawCount = Math.round((ratio / 100) * views);
  const isEnforcedMin = enabled && rawCount > 0 && minLimit !== undefined && rawCount < minLimit;
  
  return (
    <div style={{ borderRadius:16, padding:16, background:N.bg, boxShadow: enabled ? N.raisedSm : N.inset, transition:"all 0.2s", border: isEnforcedMin ? "1px solid #f59e0b" : "none" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: enabled ? 16 : 0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:16 }}>{icon}</span>
          <span style={{ fontSize:13, fontWeight:800, color:N.text }}>{label}</span>
          {enabled && <span style={{ fontSize:12, color: isEnforcedMin ? "#d97706" : N.accent, fontWeight:800 }}>→ {count.toLocaleString()}</span>}
        </div>
        <button onClick={onToggle} className="neo-btn"
          style={{ width:40, height:22, borderRadius:12, border:"none", cursor:"pointer", position:"relative", transition:"all 0.2s", background: enabled ? N.accent : "#cbd5e1", boxShadow:N.raisedSm }}>
          <div style={{ width:14, height:14, borderRadius:"50%", background:"#ffffff", top:4, left: enabled ? 22 : 4, position:"absolute", transition:"all 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
        </button>
      </div>
      {enabled && (
        <>
          <Slider label={`${ratio.toFixed(1)}% of views`} value={ratio} min={0.1} max={maxRatio} step={0.1}
            onChange={onRatio} format={(v) => `${v.toFixed(1)}%`} />
          {isEnforcedMin && (
            <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: 10, background: "rgba(217, 119, 6, 0.1)", color: "#d97706", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <span>⚠️ Automatically adjusted to the minimum requirement of {minLimit} {label.toLowerCase()}.</span>
            </div>
          )}
        </>
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
  const [schedule, setSchedule] = useState<DeliveryBatch[]>([]);
  const [expandedSchedule, setExpandedSchedule] = useState(false);
  const [pricingInfo, setPricingInfo] = useState<{
    walletMode: boolean;
    balance: number;
    rates: Record<string, Record<string, number>>;
  } | null>(null);

  // Custom Mode state
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customSchedule, setCustomSchedule] = useState<DeliveryBatch[]>([]);
  const [selectedBatchIndex, setSelectedBatchIndex] = useState<number | null>(null);
  const [smmLimits, setSmmLimits] = useState<{
    views: { min: number; max: number } | null;
    likes: { min: number; max: number } | null;
    saves: { min: number; max: number } | null;
    shares: { min: number; max: number } | null;
    comments: { min: number; max: number } | null;
  }>({ views: null, likes: null, saves: null, shares: null, comments: null });
  const [fetchingLimits, setFetchingLimits] = useState(false);

  const customSumViews = customSchedule.reduce((a, b) => a + b.views, 0);
  const customSumLikes = customSchedule.reduce((a, b) => a + b.likes, 0);
  const customSumSaves = customSchedule.reduce((a, b) => a + b.saves, 0);
  const customSumShares = customSchedule.reduce((a, b) => a + b.shares, 0);
  const customSumComments = customSchedule.reduce((a, b) => a + b.comments, 0);

  const formatDateForInput = (date: Date) => {
    const padZero = (n: number) => String(n).padStart(2, "0");
    const yyyy = date.getFullYear();
    const mm = padZero(date.getMonth() + 1);
    const dd = padZero(date.getDate());
    const hh = padZero(date.getHours());
    const min = padZero(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  };

  const formatLocalTime = (date: Date) => {
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const getMinLimit = (type: "views" | "likes" | "saves" | "shares" | "comments") => {
    return smmLimits[type]?.min ?? {
      views: 100,
      likes: 10,
      saves: 10,
      shares: 10,
      comments: 5
    }[type];
  };

  const getCustomScheduleErrors = () => {
    if (!isCustomMode) return [];
    const errors: string[] = [];
    customSchedule.forEach((batch, idx) => {
      const batchNum = idx + 1;
      const minV = getMinLimit("views");

      if (batch.views > 0 && batch.views < minV) {
        errors.push(`Batch #${batchNum}: Views (${batch.views}) is below service minimum (${minV})`);
      }
    });
    return errors;
  };

  const customScheduleErrors = getCustomScheduleErrors();
  const hasCustomScheduleErrors = customScheduleErrors.length > 0;

  const updateSelectedBatchField = (field: keyof DeliveryBatch, val: any) => {
    if (selectedBatchIndex === null) return;
    const newSchedule = [...customSchedule];
    newSchedule[selectedBatchIndex] = {
      ...newSchedule[selectedBatchIndex],
      [field]: val,
    };
    setCustomSchedule(newSchedule);
  };

  const scaleScheduleToTargets = () => {
    if (customSchedule.length === 0) return;
    
    // Scale Views
    const viewsSum = customSchedule.reduce((a, b) => a + b.views, 0);
    const scaleViews = viewsSum > 0 ? (views / viewsSum) : 0;
    
    // If likes ratio etc are enabled, we can also scale engagements to match target targets
    const targetLikes = engEnabled && likesOn ? eng.likesTarget : 0;
    const targetSaves = engEnabled && savesOn ? eng.savesTarget : 0;
    const targetShares = engEnabled && sharesOn ? eng.sharesTarget : 0;
    const targetComments = engEnabled && commentsOn ? eng.commentsTarget : 0;
    
    const sumLikes = customSchedule.reduce((a, b) => a + b.likes, 0);
    const sumSaves = customSchedule.reduce((a, b) => a + b.saves, 0);
    const sumShares = customSchedule.reduce((a, b) => a + b.shares, 0);
    const sumComments = customSchedule.reduce((a, b) => a + b.comments, 0);
    
    const scaleLikes = sumLikes > 0 ? (targetLikes / sumLikes) : 0;
    const scaleSaves = sumSaves > 0 ? (targetSaves / sumSaves) : 0;
    const scaleShares = sumShares > 0 ? (targetShares / sumShares) : 0;
    const scaleComments = sumComments > 0 ? (targetComments / sumComments) : 0;
    
    let newSchedule = customSchedule.map((batch) => {
      return {
        ...batch,
        views: Math.max(0, Math.round(batch.views * scaleViews)),
        likes: Math.max(0, Math.round(batch.likes * scaleLikes)),
        saves: Math.max(0, Math.round(batch.saves * scaleSaves)),
        shares: Math.max(0, Math.round(batch.shares * scaleShares)),
        comments: Math.max(0, Math.round(batch.comments * scaleComments)),
      };
    });
    
    // Fix rounding drift
    const finalSumViews = newSchedule.reduce((a, b) => a + b.views, 0);
    const diffViews = views - finalSumViews;
    if (diffViews !== 0 && newSchedule.length > 0) {
      newSchedule[newSchedule.length - 1].views = Math.max(0, newSchedule[newSchedule.length - 1].views + diffViews);
    }
    
    const finalSumLikes = newSchedule.reduce((a, b) => a + b.likes, 0);
    const diffLikes = targetLikes - finalSumLikes;
    if (diffLikes !== 0 && newSchedule.length > 0) {
      newSchedule[newSchedule.length - 1].likes = Math.max(0, newSchedule[newSchedule.length - 1].likes + diffLikes);
    }

    const finalSumSaves = newSchedule.reduce((a, b) => a + b.saves, 0);
    const diffSaves = targetSaves - finalSumSaves;
    if (diffSaves !== 0 && newSchedule.length > 0) {
      newSchedule[newSchedule.length - 1].saves = Math.max(0, newSchedule[newSchedule.length - 1].saves + diffSaves);
    }

    const finalSumShares = newSchedule.reduce((a, b) => a + b.shares, 0);
    const diffShares = targetShares - finalSumShares;
    if (diffShares !== 0 && newSchedule.length > 0) {
      newSchedule[newSchedule.length - 1].shares = Math.max(0, newSchedule[newSchedule.length - 1].shares + diffShares);
    }

    const finalSumComments = newSchedule.reduce((a, b) => a + b.comments, 0);
    const diffComments = targetComments - finalSumComments;
    if (diffComments !== 0 && newSchedule.length > 0) {
      newSchedule[newSchedule.length - 1].comments = Math.max(0, newSchedule[newSchedule.length - 1].comments + diffComments);
    }
    
    setCustomSchedule(newSchedule);
  };

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
  const [selectedViewsService, setSelectedViewsService] = useState<"views" | "reach_impressions_views">("views");
  const [durationDays, setDurationDays] = useState(7);
  const [style, setStyle] = useState<CurveStyle>("SLOW_START");
  const [selectedCategory, setSelectedCategory] = useState("All (107)");

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

  useEffect(() => {
    fetch("/api/panels").then((r) => r.json()).then((d) => setPanels(d.panels ?? [])).catch(() => {});
    fetch("/api/templates").then((r) => r.json()).then((d) => setTemplates(d.templates ?? [])).catch(() => {});
    
    // Fetch pricing settings
    fetch("/api/orders/pricing")
      .then(res => res.json())
      .then(d => {
        if (d && d.walletMode) setPricingInfo(d);
      })
      .catch(() => {});
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

  useEffect(() => {
    const info = CURVE_DESCRIPTIONS[style];
    if (!info) return;
    // Defer heavy schedule computation off the main thread to prevent UI freeze
    const timer = setTimeout(() => {
      const s = generateRawSchedule({
        totalViews: views,
        durationHours: durationDays * 24,
        warmupHours: info.warmup,
        peakHours: info.peak,
        style,
        engagementEnabled: engEnabled,
        likesRatioPct: likesOn ? likesRatio : 0,
        savesRatioPct: savesOn ? savesRatio : 0,
        sharesRatioPct: sharesOn ? sharesRatio : 0,
        commentsRatioPct: commentsOn ? commentsRatio : 0,
      });
      setSchedule(s);
    }, 0);
    return () => clearTimeout(timer);
  }, [views, durationDays, style, engEnabled, likesOn, likesRatio, savesOn, savesRatio, sharesOn, sharesRatio, commentsOn, commentsRatio]);

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
          rowObj.isValid = rowObj.url && ["INSTAGRAM", "TIKTOK", "FACEBOOK"].includes((rowObj.platform || "").toUpperCase()) && rowObj.viewsVal >= 100 && rowObj.durDays >= 1;
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
  const curveInfo = CURVE_DESCRIPTIONS[style] || CURVE_DESCRIPTIONS["ORGANIC"] || { label: "Organic S-Curve", desc: "Natural viral growth — slow warmup, steady peak, smooth decay.", warmup: 4, peak: 8, icon: "🌅", category: "Classic", num: 6 };
  const eng = calculateEngagementTargets(
    views,
    engEnabled && likesOn ? likesRatio : 0,
    engEnabled && savesOn ? savesRatio : 0,
    engEnabled && sharesOn ? sharesRatio : 0,
    engEnabled && commentsOn ? commentsRatio : 0,
  );

  const totalViews = isCustomMode ? customSchedule.reduce((a, b) => a + b.views, 0) : views;
  const totalLikes = engEnabled && likesOn ? (isCustomMode ? customSchedule.reduce((a, b) => a + b.likes, 0) : eng.likesTarget) : 0;
  const totalSaves = engEnabled && savesOn ? (isCustomMode ? customSchedule.reduce((a, b) => a + b.saves, 0) : eng.savesTarget) : 0;
  const totalShares = engEnabled && sharesOn ? (isCustomMode ? customSchedule.reduce((a, b) => a + b.shares, 0) : eng.sharesTarget) : 0;
  const totalComments = engEnabled && commentsOn ? (isCustomMode ? customSchedule.reduce((a, b) => a + b.comments, 0) : eng.commentsTarget) : 0;

  const calculateTotalCost = () => {
    if (!pricingInfo || !pricingInfo.walletMode) return 0;
    const rates = pricingInfo.rates[platform] || { views: 3.0, reach_impressions_views: 4.5, likes: 5.0, saves: 5.0, shares: 8.0, comments: 15.0 };

    const viewsRateKey = (platform === "INSTAGRAM" && selectedViewsService === "reach_impressions_views") ? "reach_impressions_views" : "views";
    const viewsCost = (totalViews / 1000) * (rates[viewsRateKey] ?? rates.views ?? 3.0);
    const likesCost = (totalLikes / 1000) * (rates.likes ?? 5.0);
    const savesCost = (totalSaves / 1000) * (rates.saves ?? 5.0);
    const sharesCost = (totalShares / 1000) * (rates.shares ?? 8.0);
    const commentsCost = (totalComments / 1000) * (rates.comments ?? 15.0);

    return viewsCost + likesCost + savesCost + sharesCost + commentsCost;
  };

  const totalCost = calculateTotalCost();
  const hasInsufficientBalance = pricingInfo?.walletMode ? (pricingInfo.balance < totalCost) : false;

  const canProceed1 = reelUrl.trim().length > 10;
  const minViewsRequired = smmLimits.views?.min ?? 100;
  const maxViewsRequired = smmLimits.views?.max ?? 10000000;
  const canProceed2 = views >= minViewsRequired && views <= maxViewsRequired && durationDays >= 1 && (!isCustomMode || !hasCustomScheduleErrors);

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
          customSchedule: isCustomMode ? customSchedule : null,
          viewsType: platform === "INSTAGRAM" ? selectedViewsService : "views",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create order"); setSubmitting(false); return; }
      router.push(`/orders`);
    } catch (e) {
      setError(String(e)); setSubmitting(false);
    }
  }, [reelUrl, platform, views, durationHours, style, curveInfo, engEnabled, likesOn, savesOn, sharesOn, commentsOn, likesRatio, savesRatio, sharesRatio, commentsRatio, eng, router, saveAsTemplate, templateName, isCustomMode, customSchedule]);

  return (
    <div style={{ maxWidth: step === 2 ? 1100 : 640, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 24, transition: "max-width 0.3s ease-in-out" }}>
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
              {(["INSTAGRAM", "TIKTOK", "FACEBOOK"] as Platform[]).map((p) => (
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

          {platform === "INSTAGRAM" && (
            <div style={{ borderRadius:16, padding:18, background:N.bg, boxShadow:N.inset, border:`1.5px solid ${selectedViewsService === "reach_impressions_views" ? "#d946ef" : N.border}`, transition:"all 0.2s" }}>
              <label style={{ display:"block", fontSize:11, fontWeight:800, color:N.muted, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                Select Instagram View Type
              </label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <button
                  type="button"
                  onClick={() => setSelectedViewsService("views")}
                  className="neo-btn"
                  style={{
                    padding:"12px 14px", borderRadius:12, border:"none", cursor:"pointer", transition:"all 0.2s",
                    background: N.bg,
                    color: selectedViewsService === "views" ? N.accent : N.muted,
                    boxShadow: selectedViewsService === "views" ? N.inset : N.raisedSm,
                    fontWeight:800, fontSize:13, display:"flex", flexDirection:"column", alignItems:"center", gap:4
                  }}>
                  <span>Standard Views</span>
                  <span style={{ fontSize:10, fontWeight:600, opacity:0.8 }}>Regular Reel Views</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedViewsService("reach_impressions_views")}
                  className="neo-btn"
                  style={{
                    padding:"12px 14px", borderRadius:12, border:"none", cursor:"pointer", transition:"all 0.2s",
                    background: N.bg,
                    color: selectedViewsService === "reach_impressions_views" ? "#d946ef" : N.muted,
                    boxShadow: selectedViewsService === "reach_impressions_views" ? N.inset : N.raisedSm,
                    fontWeight:800, fontSize:13, display:"flex", flexDirection:"column", alignItems:"center", gap:4
                  }}>
                  <span>Reach & Impressions ⭐</span>
                  <span style={{ fontSize:10, fontWeight:600, opacity:0.8 }}>Best for Clipstake</span>
                </button>
              </div>
              {selectedViewsService === "reach_impressions_views" && (
                <div style={{ marginTop:12, padding:12, borderRadius:10, background:"rgba(217, 70, 239, 0.1)", color:"#c026d3", fontSize:12, fontWeight:600, lineHeight:1.4 }}>
                  💡 <strong>Why this service?</strong> Delivers organic Reach, Profile Impressions, and Reel Views together. Optimized and <strong>best for Clipstake</strong> where reach & impressions are required for creator payouts!
                </div>
              )}
            </div>
          )}

          <div>
            <Slider label="Total Views" value={views} min={minViewsRequired} max={maxViewsRequired} step={100}
              onChange={setViews} format={(v) => v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
            {smmLimits.views && (
              <p style={{ fontSize:11, color:N.muted, marginTop:8, marginLeft:4, fontWeight:600 }}>
                💡 Service Limits: Min <strong>{smmLimits.views.min.toLocaleString()}</strong> · Max <strong>{smmLimits.views.max.toLocaleString()}</strong>
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

          {/* Custom Mode Toggle Switch */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderRadius: 16,
            background: isCustomMode ? "#1a0636" : N.bg,
            border: isCustomMode ? "1.5px solid #d946ef" : `1.5px solid ${N.border}`,
            boxShadow: isCustomMode ? "0 0 15px rgba(217, 70, 239, 0.15)" : N.inset,
            transition: "all 0.25s ease",
            marginTop: 8
          }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: isCustomMode ? "#f3e8ff" : N.text }}>
                ✏️ Customize Pacing Graph Manually
              </h4>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: isCustomMode ? "#c084fc" : N.muted, fontWeight: 600 }}>
                Adjust views and engagement for each batch/dot individually.
              </p>
            </div>
            <button onClick={() => {
              if (!isCustomMode) {
                setCustomSchedule(schedule.map(b => ({
                  ...b,
                  scheduledTime: new Date(Date.now() + b.hour * 60 * 60 * 1000).toISOString()
                })));
                setSelectedBatchIndex(0);
              }
              setIsCustomMode(!isCustomMode);
            }} className="neo-btn"
              style={{
                padding: "8px 16px",
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: 12,
                background: isCustomMode ? "#d946ef" : N.accent,
                color: "#ffffff",
                boxShadow: isCustomMode ? "0 4px 12px rgba(217, 70, 239, 0.3)" : "none"
              }}>
              {isCustomMode ? "✓ Custom Mode: ON" : "Turn ON Custom Graph"}
            </button>
          </div>

          {isCustomMode ? (
            /* Custom Mode: drawing canvas */
            <div style={{marginTop:8}}>
              <CustomGraphDesigner
                views={views} durationHours={durationHours} engEnabled={engEnabled}
                likesRatio={likesRatio} savesRatio={savesRatio} sharesRatio={sharesRatio} commentsRatio={commentsRatio}
                likesOn={likesOn} savesOn={savesOn} sharesOn={sharesOn} commentsOn={commentsOn}
                onScheduleChange={setCustomSchedule}
              />
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:16}}>
                <div style={{background:'#0c0218',border:'1px solid #1c0a35',borderRadius:16,padding:16,display:'flex',flexDirection:'column',gap:8}}>
                  <p style={{margin:0,fontSize:11,fontWeight:900,color:'#c084fc',textTransform:'uppercase',letterSpacing:'0.06em'}}>Allocated Totals</p>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,fontSize:12,fontWeight:750}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      <span style={{color:'#a78bfa'}}>Views:</span>
                      <span style={{color:customSumViews===views?'#22c55e':'#f59e0b'}}>{customSumViews.toLocaleString()} / {views.toLocaleString()}</span>
                    </div>
                    {likesOn&&<div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#a78bfa'}}>Likes:</span><span style={{color:'#c084fc'}}>{customSumLikes.toLocaleString()}</span></div>}
                    {savesOn&&<div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#a78bfa'}}>Saves:</span><span style={{color:'#c084fc'}}>{customSumSaves.toLocaleString()}</span></div>}
                    {sharesOn&&<div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#a78bfa'}}>Shares:</span><span style={{color:'#c084fc'}}>{customSumShares.toLocaleString()}</span></div>}
                    {commentsOn&&<div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#a78bfa'}}>Comments:</span><span style={{color:'#c084fc'}}>{customSumComments.toLocaleString()}</span></div>}
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:4}}>
                    <button onClick={scaleScheduleToTargets} style={{flex:1,padding:'6px',borderRadius:8,border:'1px solid rgba(168,85,247,0.4)',background:'rgba(168,85,247,0.15)',color:'#a855f7',fontSize:11,fontWeight:800,cursor:'pointer'}}>Scale to Targets</button>
                    <button onClick={()=>{setCustomSchedule(schedule.map(b=>({...b,scheduledTime:new Date(Date.now()+b.hour*3600000).toISOString()})));setSelectedBatchIndex(0);}} style={{padding:'6px 10px',borderRadius:8,border:'1px solid rgba(220,38,38,0.3)',background:'rgba(220,38,38,0.12)',color:'#dc2626',fontSize:11,fontWeight:800,cursor:'pointer'}}>Reset</button>
                  </div>
                </div>
                <div style={{background:'#0c0218',border:'1px solid #1c0a35',borderRadius:16,padding:16,display:'flex',flexDirection:'column',gap:8}}>
                  <p style={{margin:0,fontSize:11,fontWeight:900,color:'#c084fc',textTransform:'uppercase',letterSpacing:'0.06em'}}>Validation</p>
                  {hasCustomScheduleErrors
                    ?<div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:100,overflowY:'auto'}}>{customScheduleErrors.slice(0,4).map((e,i)=><span key={i} style={{fontSize:11,color:'#f87171',fontWeight:700}}>- {e}</span>)}{customScheduleErrors.length>4&&<span style={{fontSize:11,color:'#f87171'}}>+{customScheduleErrors.length-4} more</span>}</div>
                    :<div style={{display:'flex',alignItems:'center',gap:8,flex:1}}><span style={{fontSize:12,color:'#22c55e',fontWeight:700}}>All batches valid</span></div>
                  }
                  <p style={{margin:0,fontSize:10,color:'#6b21a8',fontWeight:600}}>{customSchedule.filter(b=>b.views>0).length} active batches</p>
                </div>
              </div>

              {/* Manual Batch Details Editor */}
              <div style={{
                background: "#08010f",
                border: "1.5px solid #1c0a35",
                borderRadius: 20,
                padding: 20,
                marginTop: 16,
                display: "flex",
                flexDirection: "column",
                gap: 14
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: "#f3e8ff" }}>✏️ Edit Batch Details Manually</p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#a78bfa", fontWeight: 600 }}>Modify views, delay time, or date for any specific batch</p>
                  </div>
                  <select
                    value={selectedBatchIndex !== null && selectedBatchIndex < customSchedule.length ? selectedBatchIndex : 0}
                    onChange={(e) => setSelectedBatchIndex(Number(e.target.value))}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      background: "#120324",
                      border: "1px solid #2d0a52",
                      color: "#c084fc",
                      fontSize: 12,
                      fontWeight: 700,
                      outline: "none",
                      cursor: "pointer"
                    }}
                  >
                    {customSchedule.map((b, idx) => (
                      <option key={idx} value={idx}>
                        Batch #{idx + 1} (Offset: {Math.round(b.hour * 10) / 10}h - {(b?.views ?? 0).toLocaleString()} views)
                      </option>
                    ))}
                  </select>
                </div>

                {customSchedule.length > 0 && (() => {
                  const activeIdx = selectedBatchIndex !== null && selectedBatchIndex < customSchedule.length ? selectedBatchIndex : 0;
                  const batch = customSchedule[activeIdx];
                  if (!batch) return null;
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>Views</label>
                        <input
                          type="number"
                          value={batch.views}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value));
                            const newSchedule = [...customSchedule];
                            newSchedule[activeIdx] = {
                              ...newSchedule[activeIdx],
                              views: val,
                            };
                            setCustomSchedule(newSchedule);
                          }}
                          style={{
                            padding: "8px",
                            borderRadius: 8,
                            background: "#120324",
                            border: "1px solid #2d0a52",
                            color: "#f3e8ff",
                            fontSize: 12,
                            fontWeight: 750,
                            outline: "none"
                          }}
                        />
                      </div>

                      {likesOn && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>Likes</label>
                          <input
                            type="number"
                            value={batch.likes}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              const newSchedule = [...customSchedule];
                              newSchedule[activeIdx] = {
                                ...newSchedule[activeIdx],
                                likes: val,
                              };
                              setCustomSchedule(newSchedule);
                            }}
                            style={{
                              padding: "8px",
                              borderRadius: 8,
                              background: "#120324",
                              border: "1px solid #2d0a52",
                              color: "#f3e8ff",
                              fontSize: 12,
                              fontWeight: 750,
                              outline: "none"
                            }}
                          />
                        </div>
                      )}

                      {savesOn && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>Saves</label>
                          <input
                            type="number"
                            value={batch.saves}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              const newSchedule = [...customSchedule];
                              newSchedule[activeIdx] = {
                                ...newSchedule[activeIdx],
                                saves: val,
                              };
                              setCustomSchedule(newSchedule);
                            }}
                            style={{
                              padding: "8px",
                              borderRadius: 8,
                              background: "#120324",
                              border: "1px solid #2d0a52",
                              color: "#f3e8ff",
                              fontSize: 12,
                              fontWeight: 750,
                              outline: "none"
                            }}
                          />
                        </div>
                      )}

                      {sharesOn && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>Shares</label>
                          <input
                            type="number"
                            value={batch.shares}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              const newSchedule = [...customSchedule];
                              newSchedule[activeIdx] = {
                                ...newSchedule[activeIdx],
                                shares: val,
                              };
                              setCustomSchedule(newSchedule);
                            }}
                            style={{
                              padding: "8px",
                              borderRadius: 8,
                              background: "#120324",
                              border: "1px solid #2d0a52",
                              color: "#f3e8ff",
                              fontSize: 12,
                              fontWeight: 750,
                              outline: "none"
                            }}
                          />
                        </div>
                      )}

                      {commentsOn && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>Comments</label>
                          <input
                            type="number"
                            value={batch.comments}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              const newSchedule = [...customSchedule];
                              newSchedule[activeIdx] = {
                                ...newSchedule[activeIdx],
                                comments: val,
                              };
                              setCustomSchedule(newSchedule);
                            }}
                            style={{
                              padding: "8px",
                              borderRadius: 8,
                              background: "#120324",
                              border: "1px solid #2d0a52",
                              color: "#f3e8ff",
                              fontSize: 12,
                              fontWeight: 750,
                              outline: "none"
                            }}
                          />
                        </div>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>Delay (Hours)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={Math.round(batch.hour * 10) / 10}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value));
                            const newSchedule = [...customSchedule];
                            const targetBatch = {
                              ...newSchedule[activeIdx],
                              hour: val,
                              scheduledTime: new Date(Date.now() + val * 60 * 60 * 1000).toISOString(),
                            };
                            newSchedule[activeIdx] = targetBatch;
                            
                            const sorted = [...newSchedule].sort((a, b) => a.hour - b.hour);
                            const newIdx = sorted.findIndex(b => b.scheduledTime === targetBatch.scheduledTime);
                            setCustomSchedule(sorted);
                            if (newIdx !== -1) setSelectedBatchIndex(newIdx);
                          }}
                          style={{
                            padding: "8px",
                            borderRadius: 8,
                            background: "#120324",
                            border: "1px solid #2d0a52",
                            color: "#f3e8ff",
                            fontSize: 12,
                            fontWeight: 750,
                            outline: "none"
                          }}
                        />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa" }}>Scheduled Time</label>
                        <input
                          type="datetime-local"
                          value={formatDateForInput(new Date(batch.scheduledTime || Date.now()))}
                          onChange={(e) => {
                            const dateVal = new Date(e.target.value);
                            const diffMs = dateVal.getTime() - Date.now();
                            const diffHours = Math.max(0, diffMs / (60 * 60 * 1000));
                            const newSchedule = [...customSchedule];
                            const targetBatch = {
                              ...newSchedule[activeIdx],
                              hour: diffHours,
                              scheduledTime: dateVal.toISOString(),
                            };
                            newSchedule[activeIdx] = targetBatch;
                            
                            const sorted = [...newSchedule].sort((a, b) => a.hour - b.hour);
                            const newIdx = sorted.findIndex(b => b.scheduledTime === targetBatch.scheduledTime);
                            setCustomSchedule(sorted);
                            if (newIdx !== -1) setSelectedBatchIndex(newIdx);
                          }}
                          style={{
                            padding: "8px",
                            borderRadius: 8,
                            background: "#120324",
                            border: "1px solid #2d0a52",
                            color: "#f3e8ff",
                            fontSize: 12,
                            fontWeight: 750,
                            outline: "none"
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            /* Standard Mode: two-column preset picker + chart */
            <div style={{display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:32,alignItems:'start',marginTop:8}}>
              <div style={{background:'#08010f',border:'1px solid #1c0a35',borderRadius:24,padding:24,boxShadow:'0 10px 30px rgba(0,0,0,0.5)',color:'#f3e8ff',display:'flex',flexDirection:'column',gap:16}}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 900, color: "#f3e8ff", margin: "0 0 4px 0", letterSpacing: "-0.3px" }}>3. Drip Pacing &amp; Flow Settings (107 Neon Growth Graphs &amp; Clipping Profiles)</h3>
                      <p style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, margin: 0 }}>Select from 107 specialized neon animated growth algorithms &amp; clipping platform profiles to customize your delivery</p>
                    </div>
                  </div>

                  {/* Category Filter Tabs */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, padding: "4px 0" }}>
                    {[
                      "All (107)", "Whop Clips", "Clipster", "Content Rewards", "Clipstake", "Crosswave", "Picksart", "Pearpop", "JoinBrands", "Trend.io", "Insense"
                    ].map((cat) => {
                      const isCatActive = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: isCatActive ? 800 : 600,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            background: isCatActive ? "linear-gradient(135deg, #d946ef, #8b5cf6)" : "#130428",
                            color: isCatActive ? "#ffffff" : "#a78bfa",
                            border: isCatActive ? "1px solid #f0abfc" : "1px solid #261047",
                            boxShadow: isCatActive ? "0 0 12px rgba(217, 70, 239, 0.5)" : "none",
                          }}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  {/* 100 Neon Cards Grid */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                    gap: 12,
                    maxHeight: 620,
                    overflowY: "auto",
                    padding: "4px 6px 12px 2px",
                    scrollBehavior: "smooth"
                  }}>
                    {CURVE_100_LIST
                      .filter((item) => selectedCategory === "All (107)" || item.category === selectedCategory)
                      .map((item) => {
                        const s = item.id;
                        const isSelected = style === s;
                        const neon = STYLE_NEON_COLORS[s] || STYLE_NEON_COLORS.ORGANIC || { stroke: "#d946ef", glow: "rgba(217, 70, 239, 0.4)" };
                        return (
                          <button
                            key={s}
                            onClick={() => { setStyle(s); setSelectedTemplateId(""); }}
                            style={{
                              padding: "12px 8px",
                              borderRadius: 14,
                              cursor: "pointer",
                              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              gap: 6,
                              background: isSelected ? "linear-gradient(180deg, #2a0b4e 0%, #130428 100%)" : "#0a0117",
                              border: isSelected ? `2px solid ${neon.stroke}` : "1px solid #1e0b36",
                              boxShadow: isSelected
                                ? `0 0 20px ${neon.glow}, inset 0 0 12px rgba(255, 255, 255, 0.1)`
                                : "0 4px 10px rgba(0, 0, 0, 0.6)",
                              color: isSelected ? "#ffffff" : "#a78bfa",
                              position: "relative",
                              overflow: "hidden",
                              textAlign: "left",
                              width: "100%",
                              transform: isSelected ? "translateY(-2px)" : "none"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 900,
                                color: neon.stroke,
                                background: "rgba(255,255,255,0.05)",
                                padding: "2px 6px",
                                borderRadius: 6,
                                flexShrink: 0
                              }}>
                                #{item.num}
                              </span>
                              <span style={{
                                fontSize: 11.5,
                                fontWeight: isSelected ? 800 : 700,
                                color: isSelected ? "#ffffff" : "#e2e8f0",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                              }}>
                                {item.label}
                              </span>
                            </div>
                            <MiniCurveChart style={s} active={isSelected} />
                          </button>
                        );
                      })}
                  </div>
                </div>
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
                schedule={schedule}
                isCustomMode={false}
                selectedBatchIndex={null}
                onSelectBatch={null}
                onChangeSchedule={null}
              />
            </div>
          )}

          <div style={{ fontSize:12, color:N.muted, textAlign:"center", fontWeight:600 }}>
            {isCustomMode 
              ? `≈ ${Math.round(customSumViews / durationDays).toLocaleString()} views/day · Custom schedule with ${customSchedule.filter(b => b.views > 0).length} active batches`
              : `≈ ${Math.round(views / durationDays).toLocaleString()} views/day · ${durationHours} hourly batches (with ±5m time jitter)`}
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
                <EngRow icon="👍" label="Likes" enabled={likesOn} ratio={likesRatio} maxRatio={15} count={eng.likesTarget} minLimit={10} views={views} onToggle={() => { setLikesOn((v) => !v); setHasCustomizedEng(true); }} onRatio={(v) => { setLikesRatio(v); setHasCustomizedEng(true); }} />
                <EngRow icon="🔖" label="Saves" enabled={savesOn} ratio={savesRatio} maxRatio={8} count={eng.savesTarget} minLimit={10} views={views} onToggle={() => { setSavesOn((v) => !v); setHasCustomizedEng(true); }} onRatio={(v) => { setSavesRatio(v); setHasCustomizedEng(true); }} />
                <EngRow icon="📤" label="Shares" enabled={sharesOn} ratio={sharesRatio} maxRatio={5} count={eng.sharesTarget} minLimit={10} views={views} onToggle={() => { setSharesOn((v) => !v); setHasCustomizedEng(true); }} onRatio={(v) => { setSharesRatio(v); setHasCustomizedEng(true); }} />
                <EngRow icon="💬" label="Comments" enabled={commentsOn} ratio={commentsRatio} maxRatio={3} count={eng.commentsTarget} minLimit={5} views={views} onToggle={() => { setCommentsOn((v) => !v); setHasCustomizedEng(true); }} onRatio={(v) => { setCommentsRatio(v); setHasCustomizedEng(true); }} />
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

          {((totalLikes > 0 && totalLikes < 50) || (totalSaves > 0 && totalSaves < 50) || (totalShares > 0 && totalShares < 50) || (totalComments > 0 && totalComments < 20)) && (
            <div style={{ padding: 14, borderRadius: 14, background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", fontSize: 12, fontWeight: 700, lineHeight: 1.4 }}>
              ⚠️ Organic Pacing Warning: Your total engagement targets (e.g., Likes: {totalLikes}) are quite low. Our AI splits your delivery into multiple small micro-batches over time. Supplier panels require a strict minimum (usually 10 per request). Because your micro-batches may be smaller than 10, the supplier may reject them, resulting in non-delivery. We recommend ordering more views or increasing engagement percentages so your targets exceed 50!
            </div>
          )}

          <CurvePreview
            views={isCustomMode ? customSchedule.reduce((a, b) => a + b.views, 0) : views}
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
            schedule={isCustomMode ? customSchedule : schedule}
            isCustomMode={isCustomMode}
          />

          <div style={{ borderRadius: 16, background: N.bg, boxShadow: N.inset, padding: 12 }}>
            <button onClick={() => setExpandedSchedule(!expandedSchedule)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                textAlign: "left",
                fontSize: 12,
                fontWeight: 800,
                color: N.text,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
              <span>📊 View Detailed Batch-by-Batch Timeline ({(isCustomMode ? customSchedule : schedule).filter(b => b.views > 0).length} active batches)</span>
              <span>{expandedSchedule ? "▲ Hide" : "▼ Show"}</span>
            </button>
            
            {expandedSchedule && (
              <div style={{
                maxHeight: 250,
                overflowY: "auto",
                marginTop: 12,
                paddingRight: 6,
                display: "flex",
                flexDirection: "column",
                gap: 8
              }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.5fr 1fr 2.5fr",
                  borderBottom: `1.5px solid ${N.border}`,
                  paddingBottom: 6,
                  fontSize: 10,
                  fontWeight: 900,
                  color: N.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}>
                  <span>Batch</span>
                  <span>Trigger Time</span>
                  <span style={{ textAlign: "right" }}>Views</span>
                  <span style={{ textAlign: "right" }}>Engagement</span>
                </div>
                {(isCustomMode ? customSchedule : schedule).filter(b => b.views > 0).map((batch, idx) => {
                  const triggerDate = batch.scheduledTime 
                    ? new Date(batch.scheduledTime)
                    : new Date(Date.now() + batch.hour * 60 * 60 * 1000);
                  
                  const timeText = idx === 0 && !batch.scheduledTime
                    ? "⚡ Instant" 
                    : formatLocalTime(triggerDate);
                  
                  const engTexts = [];
                  if (batch.likes > 0) engTexts.push(`👍 ${batch.likes}`);
                  if (batch.saves > 0) engTexts.push(`🔖 ${batch.saves}`);
                  if (batch.shares > 0) engTexts.push(`📤 ${batch.shares}`);
                  if (batch.comments > 0) engTexts.push(`💬 ${batch.comments}`);
                  const engStr = engTexts.length > 0 ? engTexts.join(" · ") : "None";

                  return (
                    <div key={idx} style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1.5fr 1fr 2.5fr",
                      fontSize: 12,
                      fontWeight: 700,
                      color: N.text,
                      padding: "4px 0",
                      borderBottom: `1px solid rgba(200, 208, 231, 0.2)`
                    }}>
                      <span style={{ color: N.muted }}>#{idx + 1}</span>
                      <span style={{ color: "#d97706" }}>{timeText}</span>
                      <span style={{ textAlign: "right", fontWeight: 800 }}>{(batch?.views ?? 0).toLocaleString()}</span>
                      <span style={{ textAlign: "right", fontSize: 11, color: "#16a34a" }}>{engStr}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:10, padding:18, borderRadius:16, background:N.bg, boxShadow:N.inset }}>
            {[
              ["Platform", `${PLATFORM_ICONS[platform]} ${platform.charAt(0) + platform.slice(1).toLowerCase()}`],
              ["URL", reelUrl.length > 40 ? reelUrl.slice(0, 40) + "…" : reelUrl],
              ["Views Target", (isCustomMode ? customSchedule.reduce((a, b) => a + b.views, 0) : views).toLocaleString()],
              ["Duration", `${durationDays} day${durationDays === 1 ? "" : "s"} (${durationHours}h)`],
              ["Delivery Style", isCustomMode ? "✏️ Custom Graph Pacing" : `${curveInfo.icon} ${curveInfo.label}`],
              ["Pacing Schedule", `${(isCustomMode ? customSchedule : schedule).filter(b => b.views > 0).length} active batches`],
              ...(engEnabled ? [
                ["Engagement Mode", "✅ Paced concurrently"],
                ...(likesOn && (isCustomMode ? customSchedule.reduce((a, b) => a + b.likes, 0) : eng.likesTarget) > 0 ? [["👍 Likes Target", `${(isCustomMode ? customSchedule.reduce((a, b) => a + b.likes, 0) : eng.likesTarget).toLocaleString()}`]] : []),
                ...(savesOn && (isCustomMode ? customSchedule.reduce((a, b) => a + b.saves, 0) : eng.savesTarget) > 0 ? [["🔖 Saves Target", `${(isCustomMode ? customSchedule.reduce((a, b) => a + b.saves, 0) : eng.savesTarget).toLocaleString()}`]] : []),
                ...(sharesOn && (isCustomMode ? customSchedule.reduce((a, b) => a + b.shares, 0) : eng.sharesTarget) > 0 ? [["📤 Shares Target", `${(isCustomMode ? customSchedule.reduce((a, b) => a + b.shares, 0) : eng.sharesTarget).toLocaleString()}`]] : []),
                ...(commentsOn && (isCustomMode ? customSchedule.reduce((a, b) => a + b.comments, 0) : eng.commentsTarget) > 0 ? [["💬 Comments Target", `${(isCustomMode ? customSchedule.reduce((a, b) => a + b.comments, 0) : eng.commentsTarget).toLocaleString()}`]] : []),
              ] : [["Engagement Mode", "⬜ Views only"]]),
              ...(pricingInfo?.walletMode ? [
                ["Campaign Cost", `₹ ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
                ["Wallet Balance", `₹ ${pricingInfo.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
              ] : [])
            ].map(([k, v]) => {
              const isCost = k === "Campaign Cost";
              const isBalance = k === "Wallet Balance";
              return (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
                  <span style={{ color:N.muted, fontWeight:600 }}>{k}</span>
                  <span style={{
                    fontWeight: 800,
                    color: isCost ? "#ea580c" : isBalance ? (hasInsufficientBalance ? "#dc2626" : "#16a34a") : N.text,
                    textAlign: "right"
                  }}>{v}</span>
                </div>
              );
            })}
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

          {panels.length === 0 && !pricingInfo?.walletMode && (
            <div style={{ padding:12, borderRadius:12, background:"rgba(220,38,38,0.1)", color:"#dc2626", fontSize:12, fontWeight:700, border:"1px solid rgba(220,38,38,0.2)" }}>
              ⚠️ No active delivery providers. Please <Link href="/panels" style={{ textDecoration:"underline", color:"#dc2626" }}>connect a provider on the Panels page first</Link>.
            </div>
          )}

          {hasInsufficientBalance && (
            <div style={{ padding:12, borderRadius:12, background:"rgba(220,38,38,0.1)", color:"#dc2626", fontSize:12, fontWeight:700, border:"1px solid rgba(220,38,38,0.2)" }}>
              ⚠️ Insufficient Wallet Balance. You need ₹{totalCost.toFixed(2)} to place this order (Current: ₹{pricingInfo?.balance.toFixed(2)}). <Link href="/billing" style={{ textDecoration:"underline", color:"#dc2626" }}>Please go to Billing to add funds.</Link>
            </div>
          )}

          {error && <p style={{ fontSize:13, color:"#dc2626", margin:0, fontWeight:700 }}>{error}</p>}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <button onClick={() => setStep(3)} style={{ padding:"12px", borderRadius:12, fontSize:13, fontWeight:700, border:"none", cursor:"pointer", color:N.muted, background:N.bg, boxShadow:N.raisedSm }} className="neo-btn">← Back</button>
            <button onClick={submit} disabled={submitting || (panels.length === 0 && !pricingInfo?.walletMode) || hasInsufficientBalance} className="neo-btn"
              style={{ padding:"12px", borderRadius:12, fontSize:13, fontWeight:800, border:"none", color:"#ffffff", background:N.accentBg, boxShadow:N.raisedSm, opacity: (submitting || (panels.length === 0 && !pricingInfo?.walletMode) || hasInsufficientBalance) ? 0.5 : 1 }}>
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
