import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  Volume2,
  VolumeX,
  RefreshCw,
  Settings,
  Download,
  DollarSign,
  TrendingUp,
  Clock,
  Zap,
  AlertCircle,
  MessageSquare,
  ExternalLink,
  Play
} from "lucide-react";
import { sound } from "./sound";
import { LocalNotifications } from "@capacitor/local-notifications";
import { KeepAwake } from "@capacitor-community/keep-awake";

interface Stats {
  totalDepositsLifetime: number;
  totalDepositsToday: number;
  totalDepositsMonth: number;
  pendingUpiCount: number;
  pendingCryptoCount: number;
  activeOrdersCount: number;
  openTicketsCount: number;
}

interface DepositItem {
  id: string;
  type: string;
  amount: number;
  amountUsdt?: number;
  currency: string;
  status: string;
  utrOrHash: string;
  userEmail: string;
  userName: string;
  createdAt: string;
}

interface OrderItem {
  id: string;
  userEmail: string;
  userName: string;
  platform: string;
  reelUrl: string;
  viewsTarget: number;
  viewsDelivered?: number;
  viewsStart?: number;
  progressPct?: number;
  cost: number;
  curveStyle: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
}

interface TicketItem {
  id: string;
  userEmail: string;
  userName: string;
  subject: string;
  status: string;
  createdAt: string;
}

interface ToastAlert {
  id: string;
  type: "deposit" | "order" | "ticket";
  title: string;
  message: string;
  time: Date;
}

export default function App() {
  // Config state - hardcoded to live production URL and secret by default!
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem("pyoneer_alert_url") || "https://www.yoyosmm.online");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("pyoneer_alert_key") || "yoyosmm_admin_sec_9e3a1f8b4d0c7e2d5a6c8e9b");
  const [pollInterval, setPollInterval] = useState(() => Number(localStorage.getItem("pyoneer_alert_interval")) || 5);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("pyoneer_alert_sound") !== "false");
  const [keepAwakeEnabled, setKeepAwakeEnabled] = useState(() => localStorage.getItem("pyoneer_keep_awake") !== "false");
  const [showSettings, setShowSettings] = useState(false);

  // Data state
  const [stats, setStats] = useState<Stats>({
    totalDepositsLifetime: 0,
    totalDepositsToday: 0,
    totalDepositsMonth: 0,
    pendingUpiCount: 0,
    pendingCryptoCount: 0,
    activeOrdersCount: 0,
    openTicketsCount: 0,
  });
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [activeOrders, setActiveOrders] = useState<OrderItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "deposits" | "orders" | "active_orders" | "tickets">("all");

  // PWA install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Toast alerts
  const [toasts, setToasts] = useState<ToastAlert[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef(true);

  // Sync sound setting
  useEffect(() => {
    sound.enabled = soundEnabled;
    localStorage.setItem("pyoneer_alert_sound", String(soundEnabled));
  }, [soundEnabled]);

  // Manage 24/7 KeepAwake & Native Notifications
  useEffect(() => {
    LocalNotifications.requestPermissions().catch(err => console.log("Notif perm err:", err));
    if (keepAwakeEnabled) {
      KeepAwake.keepAwake().catch(err => console.log("KeepAwake err:", err));
    } else {
      KeepAwake.allowSleep().catch(err => console.log("AllowSleep err:", err));
    }
    localStorage.setItem("pyoneer_keep_awake", String(keepAwakeEnabled));
  }, [keepAwakeEnabled]);

  // Capture PWA install event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else {
      alert("To install: In Chrome/Edge, click the install app icon in the address bar (top right). On iPhone Safari, tap Share → 'Add to Home Screen'.");
    }
  };

  // Fetch real-time live feed
  const fetchFeed = async () => {
    try {
      const cleanUrl = apiUrl.replace(/\/$/, "");
      const res = await fetch(`${cleanUrl}/api/admin/live-feed`, {
        headers: {
          "x-admin-secret": apiKey,
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to fetch data");

      setStats(data.stats);
      
      const newDeposits: DepositItem[] = data.recentDeposits || [];
      const newOrders: OrderItem[] = data.recentOrders || [];
      const newActiveOrders: OrderItem[] = data.activeOrders || [];
      const newTickets: TicketItem[] = data.recentTickets || [];

      setDeposits(newDeposits);
      setOrders(newOrders);
      setActiveOrders(newActiveOrders);
      setTickets(newTickets);
      setLastUpdated(new Date());
      setError(null);
      setLoading(false);

      // Check for new real-time items
      if (!isInitialLoad.current) {
        const newToasts: ToastAlert[] = [];

        newDeposits.forEach((d) => {
          if (!seenIdsRef.current.has(d.id)) {
            seenIdsRef.current.add(d.id);
            if (new Date(d.createdAt).getTime() > Date.now() - 30 * 60 * 1000) { // only alert if created within 30m
              sound.playDeposit();
              LocalNotifications.schedule({
                notifications: [
                  {
                    title: `💰 NEW DEPOSIT (${d.type})`,
                    body: `₹${d.amount.toLocaleString()} received from ${d.userEmail}`,
                    id: Math.floor(Math.random() * 1000000),
                    schedule: { at: new Date(Date.now() + 100) }
                  }
                ]
              }).catch(err => console.log("Notif err:", err));
              newToasts.push({
                id: d.id,
                type: "deposit",
                title: `💰 NEW DEPOSIT (${d.type})`,
                message: `₹${d.amount.toLocaleString()} received from ${d.userEmail}`,
                time: new Date(),
              });
            }
          }
        });

        newOrders.forEach((o) => {
          if (!seenIdsRef.current.has(o.id)) {
            seenIdsRef.current.add(o.id);
            if (new Date(o.createdAt).getTime() > Date.now() - 30 * 60 * 1000) {
              sound.playOrder();
              LocalNotifications.schedule({
                notifications: [
                  {
                    title: `🚀 NEW ORDER PLACED`,
                    body: `${o.viewsTarget.toLocaleString()} views (${o.curveStyle}) by ${o.userEmail}`,
                    id: Math.floor(Math.random() * 1000000),
                    schedule: { at: new Date(Date.now() + 100) }
                  }
                ]
              }).catch(err => console.log("Notif err:", err));
              newToasts.push({
                id: o.id,
                type: "order",
                title: `🚀 NEW ORDER PLACED`,
                message: `${o.viewsTarget.toLocaleString()} views (${o.curveStyle}) by ${o.userEmail}`,
                time: new Date(),
              });
            }
          }
        });

        newTickets.forEach((t) => {
          if (!seenIdsRef.current.has(t.id)) {
            seenIdsRef.current.add(t.id);
            if (new Date(t.createdAt).getTime() > Date.now() - 30 * 60 * 1000) {
              sound.playTicket();
              LocalNotifications.schedule({
                notifications: [
                  {
                    title: `🎫 NEW SUPPORT TICKET`,
                    body: `"${t.subject}" opened by ${t.userEmail}`,
                    id: Math.floor(Math.random() * 1000000),
                    schedule: { at: new Date(Date.now() + 100) }
                  }
                ]
              }).catch(err => console.log("Notif err:", err));
              newToasts.push({
                id: t.id,
                type: "ticket",
                title: `🎫 NEW SUPPORT TICKET`,
                message: `"${t.subject}" opened by ${t.userEmail}`,
                time: new Date(),
              });
            }
          }
        });

        if (newToasts.length > 0) {
          setToasts((prev) => [...newToasts, ...prev].slice(0, 5));
        }
      } else {
        // First load: just register existing IDs without sound
        newDeposits.forEach((d) => seenIdsRef.current.add(d.id));
        newOrders.forEach((o) => seenIdsRef.current.add(o.id));
        newTickets.forEach((t) => seenIdsRef.current.add(t.id));
        isInitialLoad.current = false;
      }
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError(err.message || "Failed to connect to backend");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, pollInterval * 1000);
    return () => clearInterval(interval);
  }, [apiUrl, apiKey, pollInterval]);

  const saveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("pyoneer_alert_url", apiUrl);
    localStorage.setItem("pyoneer_alert_key", apiKey);
    localStorage.setItem("pyoneer_alert_interval", String(pollInterval));
    setShowSettings(false);
    isInitialLoad.current = true; // reset seen cache to reload cleanly
    setLoading(true);
    fetchFeed();
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div style={{ minHeight: "100vh", padding: "24px", maxWidth: 1600, margin: "0 auto" }}>
      {/* ── Top Bar ── */}
      <header className="glass-panel" style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #fbbf24, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(251,191,36,0.4)" }}>
            <Bell size={24} color="#000" strokeWidth={2.5} className="animate-pulse-slow" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em", color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
              PYONEER LIVE ALERTS
              <span className="badge badge-gold">PWA ADMIN</span>
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
              Real-time financial, boost order & ticket monitor
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.3)", padding: "6px 14px", borderRadius: 20, border: "1px solid var(--border)", fontSize: 12, fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: error ? "#ef4444" : "#22c55e", boxShadow: error ? "0 0 10px #ef4444" : "0 0 10px #22c55e" }} />
            {error ? "Offline / Auth Error" : "Live Streaming"}
            {lastUpdated && <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>({lastUpdated.toLocaleTimeString()})</span>}
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="btn-secondary"
            title={soundEnabled ? "Sound Alerts Enabled" : "Sound Alerts Muted"}
            style={{ padding: "8px 14px" }}
          >
            {soundEnabled ? <Volume2 size={18} color="#fbbf24" /> : <VolumeX size={18} color="#ef4444" />}
            <span>{soundEnabled ? "Sound ON" : "Muted"}</span>
          </button>

          <button
            onClick={() => setKeepAwakeEnabled(!keepAwakeEnabled)}
            className="btn-secondary"
            title={keepAwakeEnabled ? "24/7 Keep Awake Active (Prevents screen and processor from sleeping)" : "Normal Sleep Allowed"}
            style={{ padding: "8px 14px", borderColor: keepAwakeEnabled ? "#22c55e" : "", background: keepAwakeEnabled ? "rgba(34,197,94,0.15)" : "" }}
          >
            <Zap size={18} color={keepAwakeEnabled ? "#4ade80" : "#94a3b8"} />
            <span style={{ color: keepAwakeEnabled ? "#4ade80" : "", fontWeight: 700 }}>{keepAwakeEnabled ? "🔒 24/7 Active" : "Sleep Normal"}</span>
          </button>

          <button onClick={fetchFeed} className="btn-secondary" style={{ padding: "8px 14px" }} title="Refresh Now">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>

          <button onClick={() => setShowSettings(true)} className="btn-secondary" style={{ padding: "8px 14px" }}>
            <Settings size={16} />
            <span>Config</span>
          </button>

          <button onClick={handleInstallApp} className="btn-primary" style={{ padding: "8px 16px" }}>
            <Download size={16} />
            <span>Install App</span>
          </button>
        </div>
      </header>

      {/* ── Toast Alert Banners ── */}
      {toasts.length > 0 && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}>
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`glass-panel animate-flash ${t.type === "deposit" ? "glow-border-gold" : t.type === "order" ? "glow-border-cyan" : "glow-border-green"}`}
              style={{ padding: 16, background: "rgba(18, 3, 36, 0.95)", borderLeft: `6px solid ${t.type === "deposit" ? "#fbbf24" : t.type === "order" ? "#06b6d4" : "#22c55e"}`, cursor: "pointer", boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }}
              onClick={() => removeToast(t.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: t.type === "deposit" ? "#fbbf24" : t.type === "order" ? "#22d3ee" : "#4ade80", display: "flex", alignItems: "center", gap: 6 }}>
                  {t.type === "deposit" && <DollarSign size={16} />}
                  {t.type === "order" && <Zap size={16} />}
                  {t.type === "ticket" && <MessageSquare size={16} />}
                  {t.title}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Just now</span>
              </div>
              <p style={{ fontSize: 13, color: "#fff", fontWeight: 700, margin: 0 }}>{t.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="glass-panel" style={{ padding: 16, background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <AlertCircle size={24} color="#ef4444" />
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, color: "#f87171", margin: 0 }}>Connection Failed</h4>
            <p style={{ fontSize: 12, color: "#fca5a5", margin: 0 }}>{error} — Check if your Pyoneer server is running at <code>{apiUrl}</code> and your Admin Secret Key matches.</p>
          </div>
          <button onClick={() => setShowSettings(true)} className="btn-secondary" style={{ background: "rgba(239,68,68,0.2)", borderColor: "#ef4444" }}>Check Config</button>
        </div>
      )}

      {/* ── 4 Top Stat Cards ── */}
      <div className="grid-stats">
        <div className="glass-card glow-border-gold">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Deposits (Lifetime)</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(251,191,36,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DollarSign size={20} color="#fbbf24" />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#fbbf24", letterSpacing: "-0.03em" }}>
            ₹{stats.totalDepositsLifetime.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <TrendingUp size={14} color="#22c55e" /> Verified UPI + Crypto balance
          </div>
        </div>

        <div className="glass-card glow-border-green">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Today's Deposits</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={20} color="#22c55e" />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#4ade80", letterSpacing: "-0.03em" }}>
            ₹{stats.totalDepositsToday.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            This Month: <strong style={{ color: "#fff" }}>₹{stats.totalDepositsMonth.toLocaleString()}</strong>
          </div>
        </div>

        <div className={`glass-card ${stats.pendingUpiCount + stats.pendingCryptoCount > 0 ? "glow-border-cyan animate-pulse-slow" : ""}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Pending Verifications</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(6,182,212,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={20} color="#22d3ee" />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: stats.pendingUpiCount + stats.pendingCryptoCount > 0 ? "#22d3ee" : "#fff", letterSpacing: "-0.03em" }}>
            {stats.pendingUpiCount + stats.pendingCryptoCount}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            UPI: <strong style={{ color: "#fbbf24" }}>{stats.pendingUpiCount}</strong> | Crypto: <strong style={{ color: "#a855f7" }}>{stats.pendingCryptoCount}</strong>
          </div>
        </div>

        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Active Boost Orders</span>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(168,85,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={20} color="#c084fc" />
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>
            {stats.activeOrdersCount}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
            Open Support Tickets: <strong style={{ color: stats.openTicketsCount > 0 ? "#f87171" : "#4ade80" }}>{stats.openTicketsCount}</strong>
          </div>
        </div>
      </div>

      {/* ── Segmented Scrollable Filter Pill Bar ── */}
      <div className="tab-bar-scroll">
        <button
          onClick={() => setActiveTab("all")}
          className={`btn-secondary ${activeTab === "all" ? "glow-border-gold" : ""}`}
          style={{ background: activeTab === "all" ? "rgba(251,191,36,0.25)" : "", color: activeTab === "all" ? "#fbbf24" : "" }}
        >
          🌐 All Live Streams ({deposits.length + orders.length + activeOrders.length + tickets.length})
        </button>
        <button
          onClick={() => setActiveTab("active_orders")}
          className={`btn-secondary ${activeTab === "active_orders" ? "glow-border-purple" : ""}`}
          style={{ background: activeTab === "active_orders" ? "rgba(168,85,247,0.25)" : "", color: activeTab === "active_orders" ? "#c084fc" : "" }}
        >
          ⚡ Active Progress ({activeOrders.length})
        </button>
        <button
          onClick={() => setActiveTab("deposits")}
          className={`btn-secondary ${activeTab === "deposits" ? "glow-border-gold" : ""}`}
          style={{ background: activeTab === "deposits" ? "rgba(251,191,36,0.25)" : "", color: activeTab === "deposits" ? "#fbbf24" : "" }}
        >
          💰 Deposits ({deposits.length})
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`btn-secondary ${activeTab === "orders" ? "glow-border-cyan" : ""}`}
          style={{ background: activeTab === "orders" ? "rgba(6,182,212,0.25)" : "", color: activeTab === "orders" ? "#22d3ee" : "" }}
        >
          🚀 Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("tickets")}
          className={`btn-secondary ${activeTab === "tickets" ? "glow-border-green" : ""}`}
          style={{ background: activeTab === "tickets" ? "rgba(34,197,94,0.25)" : "", color: activeTab === "tickets" ? "#4ade80" : "" }}
        >
          🎫 Support ({tickets.length})
        </button>
      </div>

      {/* ── Columnar Live Stream Grid (Mobile Optimized) ── */}
      <div className={`grid-feeds ${activeTab === "all" ? "grid-feeds-multi" : ""}`}>
        {/* 1. Deposits Stream */}
        {(activeTab === "all" || activeTab === "deposits") && (
          <div className="glass-panel" style={{ padding: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 900, color: "#fbbf24", marginBottom: 14, display: "flex", alignItems: "center", gap: 8, letterSpacing: "0.03em" }}>
              <DollarSign size={18} /> LIVE DEPOSIT FEED ({deposits.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {deposits.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>No recent deposits found</div>
              ) : (
                deposits.map((d) => (
                  <div key={d.id} className="glass-card" style={{ padding: 14, borderLeft: d.status === "PENDING" ? "4px solid #22d3ee" : "4px solid #fbbf24" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span className="badge badge-gold">{d.type}</span>
                      <span className={`badge ${d.status === "CONFIRMED" || d.status === "APPROVED" ? "badge-green" : d.status === "PENDING" ? "badge-cyan" : "badge-red"}`}>{d.status}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <span style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>₹{d.amount.toLocaleString()}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(d.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>User: <strong style={{ color: "#e2e8f0" }}>{d.userEmail}</strong></div>
                    <div style={{ fontSize: 11, color: "#718096", marginTop: 4, wordBreak: "break-all" }}>Ref: {d.utrOrHash}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 2. Orders Stream */}
        {(activeTab === "all" || activeTab === "orders") && (
          <div className="glass-panel" style={{ padding: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 900, color: "#22d3ee", marginBottom: 14, display: "flex", alignItems: "center", gap: 8, letterSpacing: "0.03em" }}>
              <Zap size={18} /> LIVE BOOST ORDER FEED ({orders.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {orders.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>No recent orders found</div>
              ) : (
                orders.map((o) => (
                  <div key={o.id} className="glass-card" style={{ padding: 14, borderLeft: "4px solid #06b6d4" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span className="badge badge-cyan">{o.platform} • {o.curveStyle}</span>
                      <span className="badge badge-purple">{o.status}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{o.viewsTarget.toLocaleString()} Views</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#fbbf24" }}>₹{o.cost.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>User: <strong style={{ color: "#e2e8f0" }}>{o.userEmail}</strong></div>
                    {o.reelUrl && (
                      <a href={o.reelUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#38bdf8", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                        View Reel <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 3. Active Orders Progress Stream */}
        {(activeTab === "all" || activeTab === "active_orders") && (
          <div className="glass-panel" style={{ padding: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 900, color: "#c084fc", marginBottom: 14, display: "flex", alignItems: "center", gap: 8, letterSpacing: "0.03em" }}>
              <Zap size={18} /> ACTIVE ORDERS PROGRESS ({activeOrders.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeOrders.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>No active boost orders running</div>
              ) : (
                activeOrders.map((o) => {
                  const progress = o.progressPct || 0;
                  const delivered = (o.viewsDelivered || 0).toLocaleString();
                  const target = o.viewsTarget.toLocaleString();
                  return (
                    <div key={o.id} className="glass-card" style={{ padding: 14, borderLeft: "4px solid #a855f7" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span className="badge badge-purple">{o.platform} • {o.curveStyle}</span>
                        <span className="badge badge-cyan">{o.status}</span>
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>
                          {delivered} / <span style={{ color: "#c084fc" }}>{target}</span> views
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#4ade80" }}>{progress}%</span>
                      </div>

                      {/* Glowing Progress Bar */}
                      <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                        <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #38bdf8, #a855f7)", borderRadius: 4, transition: "width 0.5s ease" }} />
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
                        <span>User: <strong style={{ color: "#e2e8f0" }}>{o.userEmail}</strong></span>
                        <span style={{ color: "#fbbf24" }}>₹{o.cost.toFixed(2)}</span>
                      </div>

                      {o.reelUrl && (
                        <a href={o.reelUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#38bdf8", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                          View Target Reel <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 4. Tickets Stream */}
        {(activeTab === "all" || activeTab === "tickets") && (
          <div className="glass-panel" style={{ padding: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 900, color: "#4ade80", marginBottom: 14, display: "flex", alignItems: "center", gap: 8, letterSpacing: "0.03em" }}>
              <MessageSquare size={18} /> LIVE SUPPORT TICKETS ({tickets.length})
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {tickets.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>No recent tickets found</div>
              ) : (
                tickets.map((t) => (
                  <div key={t.id} className="glass-card" style={{ padding: 14, borderLeft: t.status === "OPEN" ? "4px solid #ef4444" : "4px solid #22c55e" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span className={`badge ${t.status === "OPEN" ? "badge-red" : "badge-green"}`}>{t.status}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 4 }}>"{t.subject}"</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>From: <strong style={{ color: "#e2e8f0" }}>{t.userEmail}</strong></div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Settings Modal ── */}
      {showSettings && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: 500, padding: 28, background: "#120324", border: "1px solid var(--accent-purple)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <Settings size={20} color="#fbbf24" /> ALERTS CONFIGURATION
              </h3>
              <button onClick={() => setShowSettings(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", fontWeight: 800 }}>✕</button>
            </div>

            <form onSubmit={saveSettings} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "var(--text-muted)", marginBottom: 6 }}>MAIN WEBSITE API URL</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="e.g. http://localhost:3000 or https://pyoneer.in"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)", color: "#fff", fontSize: 13, fontWeight: 600 }}
                  required
                />
                <p style={{ fontSize: 11, color: "#718096", marginTop: 4 }}>Enter the base URL where your Pyoneer backend is hosted.</p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "var(--text-muted)", marginBottom: 6 }}>ADMIN SECRET KEY</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter ADMIN_SECRET from .env"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)", color: "#fff", fontSize: 13, fontWeight: 600 }}
                  required
                />
                <p style={{ fontSize: 11, color: "#718096", marginTop: 4 }}>Matches <code>ADMIN_SECRET</code> in your main server .env file.</p>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "var(--text-muted)", marginBottom: 6 }}>POLLING SPEED (SECONDS)</label>
                <select
                  value={pollInterval}
                  onChange={(e) => setPollInterval(Number(e.target.value))}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: 10, background: "#1e0a3c", border: "1px solid var(--border)", color: "#fff", fontSize: 13, fontWeight: 600 }}
                >
                  <option value={3}>3 seconds (Ultra Fast)</option>
                  <option value={5}>5 seconds (Fast)</option>
                  <option value={10}>10 seconds (Recommended)</option>
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                </select>
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 4 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#fbbf24", marginBottom: 10 }}>🔊 TEST AUDIO CHIMES</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => sound.playDeposit()} className="btn-secondary" style={{ flex: 1, padding: "8px 10px", fontSize: 11, background: "rgba(251,191,36,0.15)", borderColor: "#fbbf24", color: "#fbbf24" }}>
                    <Play size={12} /> Deposit Ka-Ching 💰
                  </button>
                  <button type="button" onClick={() => sound.playOrder()} className="btn-secondary" style={{ flex: 1, padding: "8px 10px", fontSize: 11, background: "rgba(6,182,212,0.15)", borderColor: "#06b6d4", color: "#22d3ee" }}>
                    <Play size={12} /> Order Launch 🚀
                  </button>
                  <button type="button" onClick={() => sound.playTicket()} className="btn-secondary" style={{ flex: 1, padding: "8px 10px", fontSize: 11, background: "rgba(34,197,94,0.15)", borderColor: "#22c55e", color: "#4ade80" }}>
                    <Play size={12} /> Ticket Beep 🎫
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: "center" }}>Save & Re-connect</button>
                <button type="button" onClick={() => setShowSettings(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
