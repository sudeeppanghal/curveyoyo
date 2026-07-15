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
    <NeoCard style={{ padding:"16px 14px" }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ width:38, height:38, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, background:N.bg, boxShadow:N.raisedSm }}>
          {icon}
        </div>
        <div style={{ fontSize:9, fontWeight:800, color:"#16a34a", background:"rgba(22,163,74,0.1)", padding:"2px 6px", borderRadius:5 }}>LIVE</div>
      </div>
      <div style={{ fontSize:22, fontWeight:900, color:N.text, letterSpacing:"-0.5px", marginBottom:2 }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div style={{ fontSize:10, fontWeight:800, color:N.muted, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:10, color:N.muted, fontWeight:600 }}>{sub}</div>
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

  // Ghost user SMM states
  const [ghostPref, setGhostPref] = useState<string | null>(null);
  const [ghostPanels, setGhostPanels] = useState<any[]>([]);
  const [savingGhostPref, setSavingGhostPref] = useState(false);
  const [ghostSavedMsg, setGhostSavedMsg] = useState("");
  const [ghostCustomServices, setGhostCustomServices] = useState<Record<string, Record<string, string>>>({});
  const [activeOverrideTab, setActiveOverrideTab] = useState<string>("instagram");
  const [activeConsoleTab, setActiveConsoleTab] = useState<"routing" | "balances">("routing");
  const [panelStatuses, setPanelStatuses] = useState<any[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);

  useEffect(() => {
    if (userEmail.toLowerCase() === "kg44314@gmail.com") {
      fetch("/api/settings/ghost-smm")
        .then(res => res.json())
        .then(data => {
          if (data) {
            setGhostPref(data.ghostSmmPreference);
            setGhostPanels(data.panels || []);
            if (data.ghostCustomServices) {
              try {
                setGhostCustomServices(JSON.parse(data.ghostCustomServices));
              } catch {}
            }
          }
        })
        .catch(console.error);
    }
  }, [userEmail]);

  const handleGhostPrefChange = async (val: string) => {
    setSavingGhostPref(true);
    setGhostSavedMsg("");
    try {
      const res = await fetch("/api/settings/ghost-smm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ghostSmmPreference: val === "default" ? null : val })
      });
      if (res.ok) {
        const data = await res.json();
        setGhostPref(data.ghostSmmPreference);
        setGhostSavedMsg("✓ Provider preference saved");
        setTimeout(() => setGhostSavedMsg(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
    setSavingGhostPref(false);
  };

  const handleGhostCustomServiceSave = async (platform: string, type: string, val: string) => {
    setSavingGhostPref(true);
    setGhostSavedMsg("");
    
    const updated = { ...ghostCustomServices };
    if (!updated[platform]) {
      updated[platform] = {};
    }
    updated[platform][type] = val.trim();

    try {
      const res = await fetch("/api/settings/ghost-smm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ghostCustomServices: JSON.stringify(updated) })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ghostCustomServices) {
          setGhostCustomServices(JSON.parse(data.ghostCustomServices));
        }
        setGhostSavedMsg("✓ Service overrides saved");
        setTimeout(() => setGhostSavedMsg(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
    setSavingGhostPref(false);
  };

  const fetchPanelStatuses = async () => {
    setLoadingStatuses(true);
    setGhostSavedMsg("");
    try {
      const res = await fetch("/api/settings/ghost-smm/balances");
      if (res.ok) {
        const data = await res.json();
        setPanelStatuses(data.panels || []);
        setGhostSavedMsg("✓ API Balances Refreshed");
        setTimeout(() => setGhostSavedMsg(""), 3000);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingStatuses(false);
  };

  const renderGhostSmmSelector = () => {
    const platforms = ["instagram", "youtube", "tiktok", "telegram", "facebook", "twitter"];
    const serviceTypes = ["views", "likes", "saves", "shares", "comments", "reposts"];

    return (
      <div style={{
        borderRadius: 24,
        background: "linear-gradient(135deg, #170d24 0%, #0d0716 100%)",
        border: "1.5px solid rgba(168, 85, 247, 0.35)",
        boxShadow: "0 12px 36px rgba(0,0,0,0.6), 0 0 40px rgba(168, 85, 247, 0.1)",
        padding: "24px 28px",
        marginBottom: 24,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        animation: "fadeUp 0.4s ease-out"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>🕵️‍♂️</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", letterSpacing: "-0.3px" }}>Ghost SMM Router (Private Console)</div>
              <div style={{ fontSize: 12, color: "#a78bfa", fontWeight: 600 }}>Decoupled custom API and service mapping settings for anonymous testing.</div>
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {savingGhostPref && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #a78bfa22", borderTopColor: "#a78bfa", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>Updating...</span>
              </div>
            )}
            {loadingStatuses && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #38bdf822", borderTopColor: "#38bdf8", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8" }}>Checking Balances...</span>
              </div>
            )}
            {ghostSavedMsg && (
              <span style={{ fontSize: 12, fontWeight: 800, color: "#22c55e", animation: "pulse 1s infinite" }}>{ghostSavedMsg}</span>
            )}
          </div>
        </div>

        {/* Console Tab Navigation */}
        <div style={{ display: "flex", gap: 8, borderBottom: "1px solid rgba(168, 85, 247, 0.15)", paddingBottom: 10 }}>
          <button
            onClick={() => setActiveConsoleTab("routing")}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 800,
              border: "none",
              cursor: "pointer",
              background: activeConsoleTab === "routing" ? "rgba(168, 85, 247, 0.25)" : "transparent",
              color: activeConsoleTab === "routing" ? "#fff" : "#94a3b8",
              transition: "all 0.2s"
            }}
          >
            🔀 Router Settings
          </button>
          <button
            onClick={() => {
              setActiveConsoleTab("balances");
              if (panelStatuses.length === 0) fetchPanelStatuses();
            }}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 800,
              border: "none",
              cursor: "pointer",
              background: activeConsoleTab === "balances" ? "rgba(168, 85, 247, 0.25)" : "transparent",
              color: activeConsoleTab === "balances" ? "#fff" : "#94a3b8",
              transition: "all 0.2s"
            }}
          >
            💰 API Keys & Balances
          </button>
        </div>

        {/* Tab Content 1: SMM Router & Overrides */}
        {activeConsoleTab === "routing" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* 1. Select SMM Panel Provider */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Select Default Provider / API Key</label>
              <select
                value={ghostPref || "default"}
                onChange={(e) => handleGhostPrefChange(e.target.value)}
                disabled={savingGhostPref}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 14,
                  background: "#0c0612",
                  border: "1px solid rgba(168, 85, 247, 0.25)",
                  color: "#f8fafc",
                  fontSize: 14,
                  fontWeight: 700,
                  outline: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <option value="default">Use Global Fallbacks / Priorities (Default)</option>
                {ghostPanels.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.apiUrl.replace("https://", "")})</option>
                ))}
              </select>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "rgba(168, 85, 247, 0.15)" }} />

            {/* 2. Custom Service ID Overrides */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Custom Service ID Overrides</div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Specify exact SMM panel Service IDs to force route your campaigns. Leave empty to use default panel configurations.</div>
              </div>

              {/* Platform Tabs */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", background: "#0c0612", padding: 6, borderRadius: 14, border: "1px solid rgba(168, 85, 247, 0.1)" }}>
                {platforms.map(p => (
                  <button
                    key={p}
                    onClick={() => setActiveOverrideTab(p)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 800,
                      border: "none",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      letterSpacing: "0.02em",
                      background: activeOverrideTab === p ? "rgba(168, 85, 247, 0.2)" : "transparent",
                      color: activeOverrideTab === p ? "#d8b4fe" : "#94a3b8",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Custom Overrides Grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 16,
                background: "#0c0612",
                padding: 20,
                borderRadius: 16,
                border: "1px solid rgba(168, 85, 247, 0.15)"
              }}>
                {serviceTypes.map(type => {
                  const currentVal = ghostCustomServices[activeOverrideTab]?.[type] || "";
                  return (
                    <div key={type} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "capitalize" }}>{type} Service ID</label>
                      <input
                        type="text"
                        placeholder="Panel default"
                        value={currentVal}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGhostCustomServices(prev => {
                            const updated = { ...prev };
                            if (!updated[activeOverrideTab]) updated[activeOverrideTab] = {};
                            updated[activeOverrideTab][type] = val;
                            return updated;
                          });
                        }}
                        onBlur={(e) => handleGhostCustomServiceSave(activeOverrideTab, type, e.target.value)}
                        disabled={savingGhostPref}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 10,
                          background: "#140a1d",
                          border: "1px solid rgba(168, 85, 247, 0.15)",
                          color: "#fff",
                          fontSize: 13,
                          fontWeight: 700,
                          outline: "none",
                          transition: "all 0.2s"
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 2: API Keys & Balance Monitor */}
        {activeConsoleTab === "balances" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 2 }}>API Live Connection Status & Balances</div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Real-time status of all provider credentials configured in the system.</div>
              </div>
              <button
                onClick={fetchPanelStatuses}
                disabled={loadingStatuses}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  background: "rgba(56, 189, 248, 0.15)",
                  color: "#38bdf8",
                  transition: "all 0.2s"
                }}
              >
                🔄 Refresh Balances
              </button>
            </div>

            {/* Balances List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {panelStatuses.map((p: any) => {
                const isSelected = ghostPref === p.id;
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: isSelected ? "rgba(168, 85, 247, 0.08)" : "#0c0612",
                      padding: "16px 20px",
                      borderRadius: 16,
                      border: isSelected ? "1.5px solid rgba(168, 85, 247, 0.4)" : "1px solid rgba(168, 85, 247, 0.1)",
                      flexWrap: "wrap",
                      gap: 16
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{p.name}</span>
                        {isSelected && (
                          <span style={{ fontSize: 9, fontWeight: 900, background: "rgba(168, 85, 247, 0.25)", color: "#c084fc", padding: "2px 6px", borderRadius: 6 }}>ACTIVE DEFAULT</span>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>{p.apiUrl}</div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                      {/* Connection status */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                        <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>Connection</span>
                        {p.status === "LIVE" ? (
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#22c55e" }}>🟢 LIVE</span>
                        ) : p.status === "INVALID_KEY" ? (
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#ef4444" }}>🔴 INVALID KEY</span>
                        ) : p.status === "OFFLINE" ? (
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#ef4444" }}>🔴 OFFLINE</span>
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#f59e0b" }}>🟡 {p.status}</span>
                        )}
                      </div>

                      {/* API Balance */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                        <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>API Balance</span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: p.status === "LIVE" ? "#fff" : "#64748b" }}>{p.balance}</span>
                      </div>

                      {/* Select preferred panel */}
                      <button
                        onClick={() => handleGhostPrefChange(isSelected ? "default" : p.id)}
                        disabled={savingGhostPref}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 10,
                          fontSize: 11,
                          fontWeight: 800,
                          border: "none",
                          cursor: "pointer",
                          background: isSelected ? "rgba(239, 68, 68, 0.15)" : "rgba(168, 85, 247, 0.15)",
                          color: isSelected ? "#ef4444" : "#c084fc",
                          transition: "all 0.2s"
                        }}
                      >
                        {isSelected ? "Deselect" : "Use As Default"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

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
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .neo-qa:hover{box-shadow:10px 10px 24px #c8d0e7,-5px -5px 14px #ffffff !important;transform:translateY(-2px)}
        .neo-qa:active{box-shadow:inset 4px 4px 10px #c8d0e7,inset -2px -2px 6px #ffffff !important;transform:none}
        .neo-step:hover{box-shadow:6px 6px 16px #c8d0e7,-3px -3px 10px #ffffff !important}
        .promo-card-animated{position:relative;overflow:hidden;animation:neonGlow 4s infinite ease-in-out}
        .promo-card-animated::after{content:'';position:absolute;top:0;left:-150%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.12) 50%,transparent);transform:skewX(-20deg);pointer-events:none;animation:shimmerSweep 5s infinite ease-in-out}
        .digit-box-pulse{animation:digitBreathe 3s infinite ease-in-out}
        @keyframes neonGlow{0%,100%{border-color:rgba(168,85,247,.25);box-shadow:0 12px 36px rgba(0,0,0,.6),0 0 15px rgba(168,85,247,.1)}50%{border-color:rgba(236,72,153,.55);box-shadow:0 12px 40px rgba(0,0,0,.65),0 0 25px rgba(236,72,153,.25)}}
        @keyframes shimmerSweep{0%{left:-150%}30%{left:150%}100%{left:150%}}
        @keyframes digitBreathe{0%,100%{transform:scale(1);border-color:rgba(168,85,247,.35);box-shadow:0 4px 12px rgba(168,85,247,.2)}50%{transform:scale(1.04);border-color:rgba(168,85,247,.65);box-shadow:0 6px 18px rgba(168,85,247,.45);color:#fff}}

        /* ── Mobile stats 2-col grid ── */
        .stats-grid-mob {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width:600px) {
          .stats-grid-mob { grid-template-columns: repeat(4, 1fr); gap:16px; }
        }

        /* ── Quick Actions horizontal scroll on mobile ── */
        .qa-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }
        @media (max-width:599px) {
          .qa-grid {
            display: flex;
            gap: 10px;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding-bottom: 4px;
          }
          .qa-grid::-webkit-scrollbar { display:none; }
          .qa-grid > * { flex-shrink:0; width:140px; }
        }

        /* ── Campaign tracker mobile stack ── */
        .tracker-cols {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
        }
        @media (max-width:599px) {
          .tracker-cols { grid-template-columns: 1fr; gap:16px; }
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

      {/* Ghost User SMM Selector */}
      {userEmail.toLowerCase() === "kg44314@gmail.com" && renderGhostSmmSelector()}

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

      {/* Announcement Banner */}
      {announcement && (announcement.title || announcement.description) && (
        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <a
            href={announcement.targetLink || undefined}
            onClick={(e) => {
              if (!announcement.targetLink) {
                e.preventDefault();
              }
            }}
            style={{ textDecoration: "none", width: "100%", maxWidth: 1025, cursor: announcement.targetLink ? "pointer" : "default" }}
          >
            <div
              style={{
                borderRadius: 24,
                background: "linear-gradient(135deg, #1e1b4b 0%, #111827 50%, #030712 100%)",
                border: "1.5px solid rgba(168, 85, 247, 0.3)",
                boxShadow: "0 12px 36px rgba(0,0,0,0.5), 0 0 60px rgba(168, 85, 247, 0.08)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 20,
                padding: "24px 32px",
                marginBottom: 20,
                width: "100%",
                boxSizing: "border-box",
                flexWrap: "wrap",
                transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
              }}
              onMouseEnter={e => {
                if (announcement.targetLink) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.55)";
                  e.currentTarget.style.boxShadow = "0 18px 44px rgba(0,0,0,0.6), 0 0 80px rgba(168, 85, 247, 0.14)";
                }
              }}
              onMouseLeave={e => {
                if (announcement.targetLink) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.3)";
                  e.currentTarget.style.boxShadow = "0 12px 36px rgba(0,0,0,0.5), 0 0 60px rgba(168, 85, 247, 0.08)";
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 20, flex: 1, minWidth: 280 }}>
                {/* Image or Icon */}
                {announcement.imageUrl ? (
                  <img
                    src={announcement.imageUrl}
                    alt="Promo"
                    style={{
                      width: 80,
                      height: 80,
                      minWidth: 80,
                      borderRadius: 16,
                      objectFit: "cover",
                      boxShadow: "0 8px 24px rgba(168, 85, 247, 0.3)",
                      border: "1px solid rgba(168, 85, 247, 0.2)",
                    }}
                  />
                ) : (
                  <div style={{
                    width: 56,
                    height: 56,
                    minWidth: 56,
                    borderRadius: 18,
                    background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 24px rgba(168, 85, 247, 0.4)",
                  }}>
                    <span style={{ fontSize: 28 }}>📢</span>
                  </div>
                )}

                {/* Text Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    {announcement.title && (
                      <span style={{ fontSize: 18, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.3px" }}>
                        {announcement.title}
                      </span>
                    )}
                    {announcement.offerEnabled && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#f472b6",
                        background: "rgba(244, 114, 182, 0.12)",
                        border: "1px solid rgba(244, 114, 182, 0.25)",
                        borderRadius: 6,
                        padding: "2px 8px",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}>
                        Active Offer
                      </span>
                    )}
                  </div>
                  {announcement.description && (
                    <p style={{ fontSize: 13, color: "#9ca3af", margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                      {announcement.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Countdown or Arrow CTA */}
              {announcement.offerEnabled && announcement.endsAt ? (
                <div style={{ minWidth: 260, display: "flex", justifyContent: "center" }}>
                  <AnnouncementCountdown targetDate={announcement.endsAt} />
                </div>
              ) : (
                announcement.targetLink && (
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(168, 85, 247, 0.1)",
                    border: "1.5px solid rgba(168, 85, 247, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#a855f7",
                    fontWeight: 900,
                    fontSize: 18,
                    transition: "all 0.2s"
                  }}>
                    →
                  </div>
                )
              )}
            </div>
          </a>
        </div>
      )}

      {/* Telegram Join Banner */}
      <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
        <a
          href="https://t.me/yoyosmmonline"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none", width: "100%", maxWidth: 1025 }}
        >
          <div
            className="telegram-banner"
            style={{
              borderRadius: 24,
              background: "linear-gradient(135deg, #0c1a2e 0%, #0a1628 50%, #051224 100%)",
              border: "1.5px solid rgba(34, 158, 217, 0.3)",
              boxShadow: "0 12px 36px rgba(0,0,0,0.5), 0 0 60px rgba(34, 158, 217, 0.08)",
              overflow: "hidden",
              cursor: "pointer",
              marginBottom: 28,
              width: "100%",
              boxSizing: "border-box",
              transition: "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.borderColor = "rgba(34, 158, 217, 0.55)";
              e.currentTarget.style.boxShadow = "0 18px 44px rgba(0,0,0,0.6), 0 0 80px rgba(34, 158, 217, 0.14)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.borderColor = "rgba(34, 158, 217, 0.3)";
              e.currentTarget.style.boxShadow = "0 12px 36px rgba(0,0,0,0.5), 0 0 60px rgba(34, 158, 217, 0.08)";
            }}
          >
            {/* Telegram Icon */}
            <div 
              className="telegram-icon-wrapper"
              style={{
                width: 56,
                height: 56,
                minWidth: 56,
                borderRadius: 18,
                background: "linear-gradient(135deg, #229ED9 0%, #0088cc 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px rgba(34, 158, 217, 0.4)",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.944 3.49101C21.874 3.32801 21.737 3.20401 21.567 3.14901C21.397 3.09401 21.21 3.11501 21.056 3.20401L2.43503 13.967C2.25703 14.07 2.14803 14.257 2.14403 14.464C2.14003 14.671 2.24203 14.863 2.41603 14.972L7.33603 18.04C7.48703 18.134 7.67603 18.141 7.83403 18.058L13.118 15.289L9.77103 19.349C9.64503 19.502 9.60503 19.71 9.66403 19.901C9.72303 20.092 9.87103 20.235 10.059 20.282C10.106 20.294 10.154 20.3 10.201 20.3C10.342 20.3 10.48 20.244 10.581 20.143L13.791 16.933L17.72 19.383C17.854 19.467 18.012 19.501 18.169 19.481C18.326 19.461 18.469 19.388 18.567 19.273L21.967 4.27301C22.012 4.07501 22.014 3.65401 21.944 3.49101Z" fill="white"/>
              </svg>
            </div>

            {/* Text Content */}
            <div className="telegram-text-wrapper" style={{ flex: 1, minWidth: 0 }}>
              <div 
                className="telegram-title-row"
                style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}
              >
                <span style={{ fontSize: 16, fontWeight: 900, color: "#ffffff", letterSpacing: "-0.3px" }}>
                  Join Our Official Telegram Channel
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#22d3ee",
                  background: "rgba(34, 211, 238, 0.12)",
                  border: "1px solid rgba(34, 211, 238, 0.25)",
                  borderRadius: 6,
                  padding: "2px 8px",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}>LIVE UPDATES</span>
              </div>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, fontWeight: 500, lineHeight: 1.5 }}>
                Get <strong style={{ color: "#38bdf8" }}>instant service updates</strong>, exclusive discount coupons, server status alerts & secret viral pacing tips — all in real time.
              </p>
            </div>

            {/* CTA Button */}
            <div 
              className="telegram-cta-button"
              style={{
                minWidth: "fit-content",
                padding: "12px 22px",
                borderRadius: 14,
                background: "linear-gradient(135deg, #229ED9 0%, #0088cc 100%)",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                gap: 7,
                boxShadow: "0 6px 18px rgba(34, 158, 217, 0.35)",
                whiteSpace: "nowrap",
              }}
            >
              <span>🚀</span>
              <span>Join Now</span>
            </div>
          </div>
        </a>
      </div>


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

          <div className="tracker-cols">
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

              {/* Intelligent Verification Queue UI display */}
              {runningCampaign.verificationQueueItems && runningCampaign.verificationQueueItems.length > 0 && (
                <div style={{
                  padding: 16,
                  borderRadius: 16,
                  background: "rgba(168, 85, 247, 0.04)",
                  border: "1px solid rgba(168, 85, 247, 0.12)",
                  boxShadow: "inset 0 1px 1px rgba(255, 255, 255, 0.02)"
                }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: "#d946ef", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    🛡️ Intelligent View Verification Pacing
                  </div>
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                    {runningCampaign.verificationQueueItems.map((item: any) => {
                      const isPassed = item.verifyStatus === "PASSED";
                      const isFailed = item.verifyStatus === "FAILED";
                      const isVerifying = item.verifyStatus === "VERIFYING";
                      const isProcessing = item.providerStatus === "PROCESSING";
                      
                      let color = "#a78bfa";
                      let bg = "rgba(168, 85, 247, 0.05)";
                      let border = "1px dashed rgba(168, 85, 247, 0.2)";
                      let statusText = "Pending";

                      if (isPassed) {
                        color = "#22c55e";
                        bg = "rgba(34, 197, 94, 0.08)";
                        border = "1px solid rgba(34, 197, 94, 0.25)";
                        statusText = "Passed";
                      } else if (isFailed) {
                        color = "#ef4444";
                        bg = "rgba(239, 68, 68, 0.08)";
                        border = "1px solid rgba(239, 68, 68, 0.25)";
                        statusText = "Failed";
                      } else if (isVerifying) {
                        color = "#3b82f6";
                        bg = "rgba(59, 130, 246, 0.08)";
                        border = "1px solid rgba(59, 130, 246, 0.25)";
                        statusText = "Verifying";
                      } else if (isProcessing) {
                        color = "#f59e0b";
                        bg = "rgba(245, 158, 11, 0.08)";
                        border = "1px solid rgba(245, 158, 11, 0.25)";
                        statusText = "Delivering";
                      }

                      return (
                        <div key={item.id} style={{
                          flex: "0 0 105px",
                          borderRadius: 12,
                          padding: "10px",
                          background: bg,
                          border: border,
                          fontSize: 11,
                          color: color,
                          fontWeight: 700,
                          textAlign: "center"
                        }}>
                          <div style={{ whiteSpace: "nowrap" }}>Part #{item.partNumber}</div>
                          <div style={{ fontSize: 10, opacity: 0.9, marginTop: 2 }}>{item.requestedViews.toLocaleString()}</div>
                          <div style={{ fontSize: 9, opacity: 0.7, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{statusText}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
        <div className="stats-grid-mob">
          {[...Array(4)].map((_,i) => (
            <div key={i} style={{ borderRadius:20, height:110, background:N.bg, boxShadow:N.inset, animation:"pulse 2s infinite" }} />
          ))}
        </div>
      ) : (
        <div className="stats-grid-mob">
          <StatCard label="Total Orders"    value={stats.totalOrders ?? 0}     sub="All time campaigns"     icon="📋" />
          <StatCard label="Live Now"        value={stats.activeOrders ?? stats.deliveringOrders ?? 0}    sub="Currently delivering" icon="⚡" />
          <StatCard label="Views Sent"      value={(stats.viewsDelivered ?? stats.totalViewsDelivered ?? 0).toLocaleString()}  sub="Total organic views"  icon="👁" />
          <StatCard label="Active Routes"   value={activeRoutes}               sub="Delivery paths online"  icon="🛡️" />
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <p style={{ fontSize:11, fontWeight:800, color:N.muted, textTransform:"uppercase", letterSpacing:"0.12em", margin:"0 0 12px" }}>Quick Actions</p>
        <div className="qa-grid">
          {quickActions.map((a, i) => (
            <Link key={i} href={a.href} className="neo-qa"
              style={{
                textDecoration:"none", borderRadius:16, padding:"16px 14px",
                background:N.bg, boxShadow:N.raised,
                display:"flex", flexDirection:"column", gap:8,
                cursor:"pointer", transition:"all 0.2s",
              }}>
              <div style={{ width:38, height:38, borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, background:N.bg, boxShadow:N.raisedSm }}>
                {a.icon}
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:800, color:N.text, marginBottom:2 }}>{a.label}</div>
                <div style={{ fontSize:10, color:N.muted, fontWeight:600, lineHeight:1.4 }}>{a.desc}</div>
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
