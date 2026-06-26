"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { curveForChart, calculateEngagementTargets } from "@/lib/delivery/curve";

// ── Types ───────────────────────────────────────────────────────
type Platform = "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
type CurveStyle = "ORGANIC" | "FAST" | "AGGRESSIVE";

interface Panel {
  id: string; name: string; isActive: boolean;
  serviceIds: Record<string, Record<string, string>> | null;
}

const PLATFORM_ICONS: Record<Platform, string> = {
  INSTAGRAM: "📷", TIKTOK: "🎵", YOUTUBE: "▶️",
};
const CURVE_DESCRIPTIONS: Record<CurveStyle, { label: string; desc: string; warmup: number; peak: number; icon: string }> = {
  ORGANIC:    { label: "Organic",    desc: "Natural viral growth — slow warmup, steady peak, smooth decay. Best for account health.", warmup: 4, peak: 8, icon: "🌅" },
  FAST:       { label: "Fast",       desc: "Compressed 12h curve — quicker ramp, shorter peak. Good for time-sensitive content.", warmup: 2, peak: 4, icon: "⚡" },
  AGGRESSIVE: { label: "Aggressive", desc: "Rapid 6h burst — immediate surge. Use sparingly, higher visibility risk.", warmup: 1, peak: 2, icon: "🔥" },
};

// ── Mini SVG Chart ───────────────────────────────────────────────
function CurvePreview({
  views, durationHours, style, warmup, peak,
  likesRatio, savesRatio,
}: {
  views: number; durationHours: number; style: CurveStyle; warmup: number; peak: number;
  likesRatio: number; savesRatio: number;
}) {
  const points = curveForChart({ totalViews: views, durationHours, style, warmupHours: warmup, peakHours: peak });
  if (!points.length) return null;
  const W = 400, H = 100, pad = 8;
  const maxViews = Math.max(...points.map((p) => p.views), 1);
  const pts = points.map((p, i) => ({
    x: pad + (i / Math.max(points.length - 1, 1)) * (W - 2 * pad),
    y: H - pad - (p.views / maxViews) * (H - 2 * pad),
  }));
  const likesPts = points.map((p, i) => ({
    x: pad + (i / Math.max(points.length - 1, 1)) * (W - 2 * pad),
    y: H - pad - ((p.likes ?? 0) / Math.max(...points.map((q) => q.likes ?? 0), 1)) * (H - 2 * pad),
  }));
  const line = (arr: { x: number; y: number }[]) =>
    arr.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const fill = (arr: { x: number; y: number }[], last: number) =>
    [line(arr), `L ${arr.at(-1)!.x.toFixed(1)} ${last}`, `L ${arr[0].x.toFixed(1)} ${last} Z`].join(" ");

  return (
    <div className="mt-4 rounded-xl overflow-hidden" style={{ background: "rgba(0,0,0,0.25)" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Views */}
        <path d={fill(pts, H - pad)} fill="url(#vg)" />
        <path d={line(pts)} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Likes overlay */}
        {likesRatio > 0 && (
          <>
            <path d={fill(likesPts, H - pad)} fill="url(#lg)" />
            <path d={line(likesPts)} fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 2" />
          </>
        )}
      </svg>
      <div className="px-3 pb-2 flex items-center gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block rounded bg-amber-400" /> Views</span>
        {likesRatio > 0 && <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block rounded bg-emerald-400" /> Likes</span>}
      </div>
    </div>
  );
}

// ── Slider ───────────────────────────────────────────────────────
function Slider({ label, value, min, max, step = 1, onChange, format }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-sm font-bold text-amber-400">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-amber-400"
        style={{ background: `linear-gradient(to right, #F59E0B ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.1) 0)` }} />
    </div>
  );
}

// ── Engagement toggle row ─────────────────────────────────────────
function EngRow({ icon, label, enabled, ratio, maxRatio, count, onToggle, onRatio }: {
  icon: string; label: string; enabled: boolean; ratio: number;
  maxRatio: number; count: number; onToggle: () => void; onRatio: (v: number) => void;
}) {
  return (
    <div className="rounded-xl border p-4 transition-all" style={{ background: enabled ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.02)", borderColor: enabled ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-sm font-medium text-white">{label}</span>
          {enabled && <span className="text-xs text-amber-400 font-semibold">→ {count.toLocaleString()}</span>}
        </div>
        <button onClick={onToggle} className="w-10 h-5 rounded-full relative transition-all flex-shrink-0"
          style={{ background: enabled ? "#F59E0B" : "rgba(255,255,255,0.12)" }}>
          <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all shadow"
            style={{ left: enabled ? "calc(100% - 18px)" : "2px" }} />
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

  // Step 3 — Engagement
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
  }, []);

  // Update engagement defaults dynamically based on account size benchmarks
  useEffect(() => {
    if (hasCustomizedEng) return;
    if (views < 5000) {
      setLikesRatio(6.0);
      setSavesRatio(3.0);
      setSharesRatio(0.8);
      setCommentsRatio(0.3);
    } else if (views <= 50000) {
      setLikesRatio(4.0);
      setSavesRatio(2.0);
      setSharesRatio(0.5);
      setCommentsRatio(0.2);
    } else {
      setLikesRatio(2.0);
      setSavesRatio(1.0);
      setSharesRatio(0.2);
      setCommentsRatio(0.1);
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
        if (lines.length < 2) {
          setBulkError("CSV must contain headers and at least one data row");
          return;
        }

        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        const expectedHeaders = ["url", "platform", "views", "duration_days", "curve_style"];
        const missing = expectedHeaders.filter(h => !headers.includes(h));
        if (missing.length > 0) {
          setBulkError(`Missing headers: ${missing.join(", ")}`);
          return;
        }

        const rows = lines.slice(1).map((line, idx) => {
          const vals = line.split(",").map(v => v.trim());
          const rowObj: any = { id: idx + 1 };
          headers.forEach((h, index) => {
            rowObj[h] = vals[index];
          });

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
    if (!validRows.length) {
      setBulkError("No valid rows to schedule");
      return;
    }

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
            reelUrl: row.url,
            platform: platformUpper,
            viewsTarget,
            durationHours: row.durDays * 24,
            curveStyle: row.styleVal,
            warmupHours: warmup,
            peakHours: peak,
            engagementEnabled,
            likesTarget,
            savesTarget,
            sharesTarget,
            commentsTarget,
            likesRatioPct: likesPct,
            savesRatioPct: savesPct,
            sharesRatioPct: sharesPct,
            commentsRatioPct: commentsPct,
          }),
        });
      } catch (e) {
        console.error("Bulk import failed for row:", row, e);
      }
      count++;
      setBulkProgress({ current: count, total: validRows.length });
    }

    setSubmitting(false);
    setBulkSuccess(true);
    setTimeout(() => {
      router.push("/orders");
    }, 2000);
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
  const canProceed2 = views >= 100 && durationDays >= 1;

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError("");
    try {
      // If user opted to save current parameters as a template
      if (saveAsTemplate && templateName.trim()) {
        await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: templateName.trim(),
            style,
            durationHours,
            warmupHours: curveInfo.warmup,
            peakHours: curveInfo.peak,
            decayHours: durationHours - curveInfo.warmup - curveInfo.peak,
            likesRatioPct: engEnabled && likesOn ? likesRatio : 0,
            savesRatioPct: engEnabled && savesOn ? savesRatio : 0,
            sharesRatioPct: engEnabled && sharesOn ? sharesRatio : 0,
            commentsRatioPct: engEnabled && commentsOn ? commentsRatio : 0,
          }),
        });
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reelUrl: reelUrl.trim(),
          platform,
          viewsTarget: views,
          durationHours,
          curveStyle: style,
          warmupHours: curveInfo.warmup,
          peakHours: curveInfo.peak,
          engagementEnabled: engEnabled,
          likesTarget:    eng.likesTarget,
          savesTarget:    eng.savesTarget,
          sharesTarget:   eng.sharesTarget,
          commentsTarget: eng.commentsTarget,
          likesRatioPct:    engEnabled && likesOn    ? likesRatio    : 0,
          savesRatioPct:    engEnabled && savesOn    ? savesRatio    : 0,
          sharesRatioPct:   engEnabled && sharesOn   ? sharesRatio   : 0,
          commentsRatioPct: engEnabled && commentsOn ? commentsRatio : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create order"); setSubmitting(false); return; }
      router.push(`/orders/${data.orderId}`);
    } catch (e) {
      setError(String(e));
      setSubmitting(false);
    }
  }, [reelUrl, platform, views, durationHours, style, curveInfo, engEnabled, likesOn, savesOn, sharesOn, commentsOn, likesRatio, savesRatio, sharesRatio, commentsRatio, eng, router, saveAsTemplate, templateName]);

  const steps = ["Content", "Views & Duration", "Engagement", "Confirm"];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">New Campaign</h1>
        <p className="text-gray-400 text-sm mt-1">Organic S-curve delivery with engagement</p>
      </div>

      {/* Mode Switcher */}
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
        <button onClick={() => setMode("single")} className="flex-1 py-2 text-sm font-medium rounded-lg text-center transition-all" style={mode === "single" ? { background: "rgba(245,158,11,0.15)", color: "#F59E0B" } : { color: "#6b7280" }}>
          Single Campaign
        </button>
        <button onClick={() => setMode("bulk")} className="flex-1 py-2 text-sm font-medium rounded-lg text-center transition-all" style={mode === "bulk" ? { background: "rgba(245,158,11,0.15)", color: "#F59E0B" } : { color: "#6b7280" }}>
          Bulk CSV Import
        </button>
      </div>

      {/* ── STEP 2, 3, 4 wrapper (Single mode) ── */}
      {mode === "single" && step === 2 && (
        <div className="rounded-2xl border p-6 space-y-6" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
          <h2 className="font-semibold text-white">2. Views & Duration</h2>

          {templates.length > 0 && (
            <div className="rounded-xl border p-4 mb-4" style={{ background: "rgba(255,255,255,0.01)", borderColor: "rgba(255,255,255,0.06)" }}>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Load Saved S-Curve Preset</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => applyTemplate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0B0B0F]/80 border outline-none focus:ring-2 focus:ring-amber-500/40"
                style={{ borderColor: "rgba(255,255,255,0.08)" }}
              >
                <option value="">-- Select Template --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.style}, {t.durationHours}h)</option>
                ))}
              </select>
            </div>
          )}

          <Slider label="Total Views" value={views} min={1000} max={1000000} step={1000}
            onChange={setViews} format={(v) => v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />

          <Slider label="Duration" value={durationDays} min={1} max={90} step={1}
            onChange={setDurationDays} format={(v) => `${v} day${v === 1 ? "" : "s"}`} />

          {/* Safe Delivery Alert */}
          {views / durationDays > 5000 && (
            <div className="p-4 rounded-xl border text-xs text-amber-300 bg-amber-500/10 flex flex-col gap-1" style={{ borderColor: "rgba(245,158,11,0.25)" }}>
              <span className="font-bold flex items-center gap-1">⚠️ Safe Delivery Alert</span>
              <span>Delivering more than 5,000 views per day is recommended only for established accounts. For smaller pages, we advise increasing campaign duration to at least <strong>{Math.ceil(views / 5000)} days</strong> to avoid machine-detection flags.</span>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-300 mb-3">Delivery Style</p>
            <div className="grid grid-cols-3 gap-3">
              {(["ORGANIC", "FAST", "AGGRESSIVE"] as CurveStyle[]).map((s) => (
                <button key={s} onClick={() => { setStyle(s); setSelectedTemplateId(""); }}
                  className="py-3 px-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all"
                  style={style === s ? { background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.4)" } : { background: "rgba(255,255,255,0.04)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="text-base">{CURVE_DESCRIPTIONS[s].icon}</span>
                  <span>{CURVE_DESCRIPTIONS[s].label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">{curveInfo.desc}</p>
          </div>

          {/* Live S-curve preview */}
          <CurvePreview views={views} durationHours={durationHours} style={style} warmup={curveInfo.warmup} peak={curveInfo.peak} likesRatio={likesRatio} savesRatio={0} />

          <div className="text-xs text-gray-600 text-center">
            ≈ {Math.round(views / durationDays).toLocaleString()} views/day · {durationDays * 24} hourly batches
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setStep(1)} className="py-3 rounded-xl text-sm text-gray-400 border hover:bg-white/5 transition" style={{ borderColor: "rgba(255,255,255,0.08)" }}>← Back</button>
            <button onClick={() => setStep(3)} disabled={!canProceed2}
              className="py-3 rounded-xl font-bold text-[#0B0B0F] disabled:opacity-40 transition" style={{ background: "#F59E0B" }}>
              Next: Engagement →
            </button>
          </div>
        </div>
      )}

      {mode === "single" && step === 3 && (
        <div className="rounded-2xl border p-6 space-y-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">3. Organic Engagement</h2>
              <p className="text-xs text-gray-500 mt-0.5">Delivered on the same S-curve as views</p>
            </div>
            <button onClick={() => setEngEnabled((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={engEnabled ? { background: "rgba(245,158,11,0.12)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.3)" } : { background: "rgba(255,255,255,0.06)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.07)" }}>
              {engEnabled ? "✓ Enabled" : "Disabled"}
            </button>
          </div>

          {engEnabled && (
            <>
              <div className="p-3 rounded-xl text-xs text-amber-300" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
                💡 Balanced engagement looks organic — all views with zero likes/saves is unnatural and reduces reach. Default benchmarks loaded for your account size.
              </div>
              <div className="space-y-3">
                <EngRow icon="👍" label="Likes" enabled={likesOn} ratio={likesRatio} maxRatio={15} count={eng.likesTarget} onToggle={() => { setLikesOn((v) => !v); setHasCustomizedEng(true); }} onRatio={(v) => { setLikesRatio(v); setHasCustomizedEng(true); }} />
                <EngRow icon="🔖" label="Saves" enabled={savesOn} ratio={savesRatio} maxRatio={8} count={eng.savesTarget} onToggle={() => { setSavesOn((v) => !v); setHasCustomizedEng(true); }} onRatio={(v) => { setSavesRatio(v); setHasCustomizedEng(true); }} />
                <EngRow icon="📤" label="Shares" enabled={sharesOn} ratio={sharesRatio} maxRatio={5} count={eng.sharesTarget} onToggle={() => { setSharesOn((v) => !v); setHasCustomizedEng(true); }} onRatio={(v) => { setSharesRatio(v); setHasCustomizedEng(true); }} />
                <EngRow icon="💬" label="Comments" enabled={commentsOn} ratio={commentsRatio} maxRatio={3} count={eng.commentsTarget} onToggle={() => { setCommentsOn((v) => !v); setHasCustomizedEng(true); }} onRatio={(v) => { setCommentsRatio(v); setHasCustomizedEng(true); }} />
              </div>

              {/* Engagement summary */}
              <div className="rounded-xl border p-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
                <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">Campaign Summary</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">👁 Views</span><span className="font-semibold text-white">{views.toLocaleString()}</span></div>
                  {likesOn && eng.likesTarget > 0 && <div className="flex justify-between"><span className="text-gray-400">👍 Likes</span><span className="font-semibold text-emerald-400">{eng.likesTarget.toLocaleString()}</span></div>}
                  {savesOn && eng.savesTarget > 0 && <div className="flex justify-between"><span className="text-gray-400">🔖 Saves</span><span className="font-semibold text-emerald-400">{eng.savesTarget.toLocaleString()}</span></div>}
                  {sharesOn && eng.sharesTarget > 0 && <div className="flex justify-between"><span className="text-gray-400">📤 Shares</span><span className="font-semibold text-emerald-400">{eng.sharesTarget.toLocaleString()}</span></div>}
                  {commentsOn && eng.commentsTarget > 0 && <div className="flex justify-between"><span className="text-gray-400">💬 Comments</span><span className="font-semibold text-emerald-400">{eng.commentsTarget.toLocaleString()}</span></div>}
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button onClick={() => setStep(2)} className="py-3 rounded-xl text-sm text-gray-400 border hover:bg-white/5 transition" style={{ borderColor: "rgba(255,255,255,0.08)" }}>← Back</button>
            <button onClick={() => setStep(4)} className="py-3 rounded-xl font-bold text-[#0B0B0F] transition" style={{ background: "#F59E0B" }}>
              Review Order →
            </button>
          </div>
        </div>
      )}

      {mode === "single" && step === 4 && (
        <div className="rounded-2xl border p-6 space-y-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
          <h2 className="font-semibold text-white">4. Confirm Campaign</h2>

          {/* Final preview chart */}
          <CurvePreview views={views} durationHours={durationHours} style={style} warmup={curveInfo.warmup} peak={curveInfo.peak} likesRatio={engEnabled && likesOn ? likesRatio : 0} savesRatio={0} />

          {/* Full summary */}
          <div className="space-y-2 rounded-xl border p-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
            {[
              ["Platform", `${PLATFORM_ICONS[platform]} ${platform.charAt(0) + platform.slice(1).toLowerCase()}`],
              ["URL", reelUrl.length > 40 ? reelUrl.slice(0, 40) + "…" : reelUrl],
              ["Views Target", views.toLocaleString()],
              ["Duration", `${durationDays} day${durationDays === 1 ? "" : "s"} (${durationHours}h)`],
              ["Delivery Style", `${curveInfo.icon} ${curveInfo.label}`],
              ["Batches", `${durationHours} hourly ticks`],
              ...(engEnabled ? [
                ["Engagement", "✅ Enabled"],
                ...(likesOn && eng.likesTarget > 0 ? [["👍 Likes", `${eng.likesTarget.toLocaleString()} (${likesRatio}%)`]] : []),
                ...(savesOn && eng.savesTarget > 0 ? [["🔖 Saves", `${eng.savesTarget.toLocaleString()} (${savesRatio}%)`]] : []),
                ...(sharesOn && eng.sharesTarget > 0 ? [["📤 Shares", `${eng.sharesTarget.toLocaleString()} (${sharesRatio}%)`]] : []),
                ...(commentsOn && eng.commentsTarget > 0 ? [["💬 Comments", `${eng.commentsTarget.toLocaleString()} (${commentsRatio}%)`]] : []),
              ] : [["Engagement", "⬜ Disabled"]]),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-gray-500">{k}</span>
                <span className="text-white font-medium text-right">{v}</span>
              </div>
            ))}
          </div>

          {/* Save as Template Checkbox */}
          <div className="rounded-xl border p-4 flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.01)", borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="saveTemp" checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} className="w-4 h-4 accent-amber-400 cursor-pointer" />
              <label htmlFor="saveTemp" className="text-sm font-medium text-gray-300 cursor-pointer">💾 Save these curve settings as a template</label>
            </div>
            {saveAsTemplate && (
              <div>
                <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template Name (e.g. Viral 7-Day Curve)" className="w-full px-3 py-2 rounded-lg text-sm text-white bg-[#0B0B0F]/80 border outline-none focus:ring-2 focus:ring-amber-500/40" style={{ borderColor: "rgba(255,255,255,0.08)" }} />
              </div>
            )}
          </div>

          {panels.length === 0 && (
            <div className="p-3 rounded-xl text-xs text-red-400" style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.2)" }}>
              ⚠️ No active panels connected. <a href="/panels" className="underline">Add a panel first</a>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setStep(3)} className="py-3 rounded-xl text-sm text-gray-400 border hover:bg-white/5 transition" style={{ borderColor: "rgba(255,255,255,0.08)" }}>← Back</button>
            <button onClick={submit} disabled={submitting || panels.length === 0}
              className="py-3 rounded-xl font-bold text-[#0B0B0F] disabled:opacity-40 disabled:cursor-not-allowed transition"
              style={{ background: "#F59E0B" }}>
              {submitting ? "Starting…" : "🚀 Start Campaign"}
            </button>
          </div>
        </div>
      )}

      {/* ── BULK MODE UI ── */}
      {mode === "bulk" && (
        <div className="rounded-2xl border p-6 space-y-6" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Bulk Campaign Scheduler</h2>
            <button onClick={downloadSampleCSV} className="text-xs text-amber-400 font-semibold hover:underline bg-transparent border-none cursor-pointer">
              📥 Download Sample CSV
            </button>
          </div>

          <div className="p-4 rounded-xl border border-dashed text-center cursor-pointer transition hover:bg-white/[0.01]" style={{ borderColor: "rgba(255,255,255,0.1)" }} onClick={() => document.getElementById("csvFile")?.click()}>
            <input type="file" id="csvFile" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            <div className="text-3xl mb-2">📁</div>
            <p className="text-sm text-white font-medium">{bulkFile ? bulkFile.name : "Click to Upload CSV Campaign List"}</p>
            <p className="text-xs text-gray-500 mt-1">Accepts .csv files matching the template structure</p>
          </div>

          {bulkError && <p className="text-red-400 text-xs font-semibold">{bulkError}</p>}

          {bulkRows.length > 0 && (
            <div className="space-y-4">
              <div className="max-h-60 overflow-y-auto rounded-xl border text-xs" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <table className="w-full text-left">
                  <thead style={{ background: "rgba(255,255,255,0.02)" }}>
                    <tr className="text-gray-500 uppercase font-semibold">
                      {["Row", "Reel URL", "Plat", "Views", "Days", "Style", "Valid"].map(h => (
                        <th key={h} className="px-3 py-2">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bulkRows.map(r => (
                      <tr key={r.id} className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                        <td className="px-3 py-2 text-gray-500">{r.id}</td>
                        <td className="px-3 py-2 text-white truncate max-w-[150px]" title={r.url}>{r.url}</td>
                        <td className="px-3 py-2 text-gray-400">{r.platform}</td>
                        <td className="px-3 py-2 text-white font-semibold">{r.viewsVal.toLocaleString()}</td>
                        <td className="px-3 py-2 text-gray-400">{r.durDays}d</td>
                        <td className="px-3 py-2 text-gray-400">{r.styleVal}</td>
                        <td className="px-3 py-2">
                          <span className={r.isValid ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                            {r.isValid ? "✓" : "✗"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-gray-500">
                Ready to schedule: <strong>{bulkRows.filter(r => r.isValid).length}</strong> / {bulkRows.length} campaigns.
              </div>

              {bulkProgress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Scheduling campaigns…</span>
                    <span>{bulkProgress.current} / {bulkProgress.total}</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }} />
                  </div>
                </div>
              )}

              {bulkSuccess && (
                <div className="p-3 rounded-xl text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/25">
                  🎉 Bulk campaigns successfully scheduled! Redirecting to orders dashboard…
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setBulkFile(null); setBulkRows([]); }} className="py-2.5 rounded-xl text-sm text-gray-400 border hover:bg-white/5 transition" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  Clear Upload
                </button>
                <button onClick={triggerBulkCampaigns} disabled={submitting || bulkRows.filter(r => r.isValid).length === 0 || bulkSuccess} className="py-2.5 rounded-xl text-sm font-bold text-[#0B0B0F] disabled:opacity-40 transition" style={{ background: "#F59E0B" }}>
                  {submitting ? "Scheduling…" : "🚀 Start Bulk Campaigns"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
