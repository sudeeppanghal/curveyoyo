import React, { useState, useEffect } from "react";
import {
  Home, Rocket, Package, Wallet, User, LogOut,
  PlusCircle, AlertCircle, RefreshCw,
  Copy, ExternalLink, Send, Sparkles,
  Zap, ChevronRight, MessageCircle, CheckCircle2, Clock
} from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

// ── API Configuration ──
// Points to the live YoYo SMM mobile server endpoint.
const API_URL = "https://www.yoyosmm.online/api/user-app";

// ── Curve Styles (Matching Backend & Web Design System) ──
import { CURVE_100_LIST, type CurveStyleConfig } from "./curve-styles-100";

const CATEGORIES = [
  "All (107)",
  ...Array.from(new Set(CURVE_100_LIST.map(c => c.category)))
];

// ── SVG Graph Renderer Component ──
function GrowthCurveGraph({ curve, progressPct = 0 }: { curve: CurveStyleConfig; progressPct?: number }) {
  const width = 340;
  const height = 120;
  const pad = 16;
  const graphW = width - pad * 2;
  const graphH = height - pad * 2;
  const points: string[] = [];

  for (let i = 0; i <= 20; i++) {
    const p = i / 20;
    const val = Math.max(0, Math.min(1, curve.evalCurve(p, p, 20)));
    const x = pad + p * graphW;
    const y = height - pad - val * graphH;
    points.push(`${x},${y}`);
  }

  const pathD = `M ${points[0]} ` + points.slice(1).map(pt => `L ${pt}`).join(" ");
  const areaD = `${pathD} L ${pad + graphW},${height - pad} L ${pad},${height - pad} Z`;

  // Progress dot position
  const currP = Math.min(1, Math.max(0, progressPct / 100));
  const currVal = Math.max(0, Math.min(1, curve.evalCurve(currP, currP, 20)));
  const dotX = pad + currP * graphW;
  const dotY = height - pad - currVal * graphH;

  return (
    <div style={{ width: "100%", background: "rgba(0,0,0,0.4)", borderRadius: 16, padding: 12, border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: curve.stroke, display: "flex", alignItems: "center", gap: 6 }}>
          <span>{curve.icon}</span> {curve.label}
        </span>
        {progressPct > 0 && (
          <span className="badge badge-cyan" style={{ fontSize: 10 }}>
            {progressPct}% DELIVERED
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 100, overflow: "visible" }}>
        <defs>
          <linearGradient id={`grad_${curve.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={curve.stroke} stopOpacity="0.35" />
            <stop offset="100%" stopColor={curve.stroke} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <path d={areaD} fill={`url(#grad_${curve.id})`} />
        <path d={pathD} fill="none" stroke={curve.stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {progressPct > 0 && (
          <g>
            <circle cx={dotX} cy={dotY} r="6" fill="#fff" stroke={curve.stroke} strokeWidth="3" />
            <circle cx={dotX} cy={dotY} r="12" fill={curve.stroke} opacity="0.3" className="animate-pulse-slow" />
          </g>
        )}
      </svg>
      <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6, lineHeight: 1.3 }}>
        {curve.desc}
      </p>
    </div>
  );
}

export default function App() {
  // ── Auth & Navigation State ──
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("yoyosmm_user_token"));
  const [email, setEmail] = useState<string | null>(() => localStorage.getItem("yoyosmm_user_email"));
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<"dashboard" | "new_order" | "my_orders" | "wallet" | "support">("dashboard");
  const [loading, setLoading] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authForm, setAuthForm] = useState({ email: "", password: "", name: "" });
  const [authError, setAuthError] = useState<string | null>(null);

  // ── Data State ──
  const [orders, setOrders] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [rates, setRates] = useState<Record<string, Record<string, number>>>({
    INSTAGRAM: { views: 3.0, likes: 5.0, saves: 5.0, shares: 8.0, comments: 15.0 },
    TIKTOK: { views: 3.0, likes: 5.0, saves: 5.0, shares: 8.0, comments: 15.0 },
    FACEBOOK: { views: 3.0, likes: 5.0, saves: 5.0, shares: 8.0, comments: 15.0 },
    YOUTUBE: { views: 3.0, likes: 5.0, saves: 5.0, shares: 8.0, comments: 15.0 },
  });
  const [settings, setSettings] = useState({ upiId: "yoyosmm@upi", upiQrCode: "", trc20Address: "", bep20Address: "", minDeposit: 500 });
  const [dataLoading, setDataLoading] = useState<boolean>(false);

  // ── New Order Form State ──
  const [platform, setPlatform] = useState<string>("INSTAGRAM");
  const [reelUrl, setReelUrl] = useState<string>("");
  const [viewsTarget, setViewsTarget] = useState<number>(5000);
  const [selectedCurve, setSelectedCurve] = useState<string>("ORGANIC");
  const [selectedCategory, setSelectedCategory] = useState<string>("All (107)");
  const [engEnabled, setEngEnabled] = useState<boolean>(true);
  const [likesPct, setLikesPct] = useState<number>(4.0);
  const [savesPct, setSavesPct] = useState<number>(2.0);
  const [sharesPct, setSharesPct] = useState<number>(0.5);
  const [commentsPct, setCommentsPct] = useState<number>(0.2);
  const [orderSubmitting, setOrderSubmitting] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // ── Deposit Form State ──
  const [depositTab, setDepositTab] = useState<"UPI" | "CRYPTO">("UPI");
  const [upiAmount, setUpiAmount] = useState<number>(500);
  const [upiUtr, setUpiUtr] = useState<string>("");
  const [cryptoAmount, setCryptoAmount] = useState<number>(20);
  const [cryptoNetwork, setCryptoNetwork] = useState<"TRC20" | "BEP20">("TRC20");
  const [cryptoTxHash, setCryptoTxHash] = useState<string>("");
  const [depositSubmitting, setDepositSubmitting] = useState<boolean>(false);
  const [depositMsg, setDepositMsg] = useState<string | null>(null);

  // ── Support Ticket Form State ──
  const [ticketSubject, setTicketSubject] = useState<string>("");
  const [ticketMsg, setTicketMsg] = useState<string>("");
  const [ticketSubmitting, setTicketSubmitting] = useState<boolean>(false);

  // ── Haptic feedback helper ──
  const triggerHaptic = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {}
  };

  // ── Fetch User Dashboard Data ──
  const fetchDashboardData = async () => {
    if (!token || !email) return;
    setDataLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_data", email, token }),
      });
      const d = await res.json();
      if (d.ok && d.user) {
        setUser(d.user);
        setOrders(d.orders || []);
        setDeposits(d.deposits || []);
        setTickets(d.tickets || []);
        if (d.rates) setRates(d.rates);
        if (d.settings) setSettings(d.settings);
      } else if (res.status === 401 || res.status === 404) {
        handleLogout();
      }
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (token && email) {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 10000); // Live poll every 10s
      return () => clearInterval(interval);
    }
  }, [token, email]);

  // ── Auth Handlers ──
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    triggerHaptic();

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: authMode,
          email: authForm.email,
          password: authForm.password,
          name: authForm.name,
        }),
      });
      const d = await res.json();
      if (d.ok) {
        localStorage.setItem("yoyosmm_user_token", d.token);
        localStorage.setItem("yoyosmm_user_email", d.user.email);
        setToken(d.token);
        setEmail(d.user.email);
        setUser(d.user);
        setView("dashboard");
      } else {
        setAuthError(d.error || "Authentication failed");
      }
    } catch (err: any) {
      setAuthError("Network error. Please make sure you are connected to the internet.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    triggerHaptic();
    localStorage.removeItem("yoyosmm_user_token");
    localStorage.removeItem("yoyosmm_user_email");
    setToken(null);
    setEmail(null);
    setUser(null);
  };

  // ── Calculate Order Price ──
  const calculatePrice = () => {
    const platRates = rates[platform] || rates.INSTAGRAM || { views: 3.0, likes: 5.0, saves: 5.0, shares: 8.0, comments: 15.0 };
    const viewsCost = (viewsTarget / 1000) * (platRates.views || 3.0);
    const likesCost = engEnabled ? ((viewsTarget * (likesPct / 100)) / 1000) * (platRates.likes || 5.0) : 0;
    const savesCost = engEnabled ? ((viewsTarget * (savesPct / 100)) / 1000) * (platRates.saves || 5.0) : 0;
    const sharesCost = engEnabled ? ((viewsTarget * (sharesPct / 100)) / 1000) * (platRates.shares || 8.0) : 0;
    const commentsCost = engEnabled ? ((viewsTarget * (commentsPct / 100)) / 1000) * (platRates.comments || 15.0) : 0;
    return parseFloat((viewsCost + likesCost + savesCost + sharesCost + commentsCost).toFixed(2));
  };

  const currentPrice = calculatePrice();

  // ── Place Order Handler ──
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reelUrl) {
      setOrderError("Please enter a valid Reel / Video URL");
      return;
    }
    if (!user || user.balance < currentPrice) {
      setOrderError(`Insufficient wallet balance (₹${user?.balance?.toFixed(2) || 0}). Please deposit ₹${(currentPrice - (user?.balance || 0)).toFixed(2)} more.`);
      setView("wallet");
      return;
    }

    setOrderSubmitting(true);
    setOrderError(null);
    triggerHaptic();

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "place_order",
          email, token,
          reelUrl, platform, viewsTarget,
          curveStyle: selectedCurve,
          engagementEnabled: engEnabled,
          likesRatioPct: likesPct,
          savesRatioPct: savesPct,
          sharesRatioPct: sharesPct,
          commentsRatioPct: commentsPct,
        }),
      });
      const d = await res.json();
      if (d.ok) {
        setReelUrl("");
        fetchDashboardData();
        setView("my_orders");
      } else {
        setOrderError(d.error || "Failed to place order");
      }
    } catch (e) {
      setOrderError("Network error placing order.");
    } finally {
      setOrderSubmitting(false);
    }
  };

  // ── Submit Deposit Handlers ──
  const handleUpiDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiUtr || upiUtr.length < 6) {
      setDepositMsg("❌ Please enter a valid 12-digit UTR number from your payment receipt.");
      return;
    }
    setDepositSubmitting(true);
    setDepositMsg(null);
    triggerHaptic();

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_upi_deposit", email, token, utr: upiUtr, amount: upiAmount }),
      });
      const d = await res.json();
      if (d.ok) {
        setUpiUtr("");
        setDepositMsg("✅ " + d.message);
        fetchDashboardData();
      } else {
        setDepositMsg("❌ " + (d.error || "Failed to submit deposit"));
      }
    } catch (e) {
      setDepositMsg("❌ Network error submitting deposit.");
    } finally {
      setDepositSubmitting(false);
    }
  };

  const handleCryptoDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cryptoTxHash || cryptoTxHash.length < 6) {
      setDepositMsg("❌ Please enter a valid Transaction Hash / TXID.");
      return;
    }
    setDepositSubmitting(true);
    setDepositMsg(null);
    triggerHaptic();

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit_crypto_deposit", email, token, txHash: cryptoTxHash, network: cryptoNetwork, usdtAmount: cryptoAmount }),
      });
      const d = await res.json();
      if (d.ok) {
        setCryptoTxHash("");
        setDepositMsg("✅ " + d.message);
        fetchDashboardData();
      } else {
        setDepositMsg("❌ " + (d.error || "Failed to submit crypto deposit"));
      }
    } catch (e) {
      setDepositMsg("❌ Network error submitting crypto deposit.");
    } finally {
      setDepositSubmitting(false);
    }
  };

  // ── Create Support Ticket Handler ──
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMsg) return;
    setTicketSubmitting(true);
    triggerHaptic();
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_ticket", email, token, subject: ticketSubject, message: ticketMsg }),
      });
      const d = await res.json();
      if (d.ok) {
        setTicketSubject("");
        setTicketMsg("");
        fetchDashboardData();
      }
    } catch (e) {}
    finally {
      setTicketSubmitting(false);
    }
  };

  // ── Render Login / Signup Screen if Not Authenticated ──
  if (!token || !email) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "radial-gradient(circle at top right, rgba(251,191,36,0.1), transparent 40%), var(--bg-main)" }}>
        <div className="glass-panel card-gold-glow animate-fade-in" style={{ width: "100%", maxWidth: 420, padding: 32 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg, #fbbf24, #ea580c)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 0 30px rgba(251,191,36,0.4)" }}>
              <Sparkles size={34} color="#000" strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.03em", color: "#fff" }}>
              YOYO <span style={{ color: "var(--gold)" }}>SMM</span>
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, fontWeight: 600 }}>
              The #1 AI Algorithmic Viral Boosting Engine
            </p>
          </div>

          <div style={{ display: "flex", background: "rgba(0,0,0,0.4)", borderRadius: 14, padding: 4, marginBottom: 20, border: "1px solid var(--border)" }}>
            <button
              onClick={() => { setAuthMode("login"); triggerHaptic(); }}
              style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: authMode === "login" ? "linear-gradient(135deg, #fbbf24, #ea580c)" : "transparent", color: authMode === "login" ? "#000" : "#94a3b8", fontWeight: 800, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode("signup"); triggerHaptic(); }}
              style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: authMode === "signup" ? "linear-gradient(135deg, #fbbf24, #ea580c)" : "transparent", color: authMode === "signup" ? "#000" : "#94a3b8", fontWeight: 800, fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}
            >
              Sign Up
            </button>
          </div>

          {authError && (
            <div style={{ background: "rgba(244,63,94,0.15)", border: "1px solid #f43f5e", color: "#fb7185", padding: "12px 16px", borderRadius: 12, fontSize: 13, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <AlertCircle size={18} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {authMode === "signup" && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>FULL NAME</label>
                <input
                  type="text"
                  required
                  placeholder="Sudeep Panghal"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  className="input-field"
                />
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>EMAIL ADDRESS</label>
              <input
                type="email"
                required
                placeholder="user@yoyosmm.online"
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>PASSWORD</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                className="input-field"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", marginTop: 8, padding: 16, fontSize: 15 }}>
              {loading ? "Please wait..." : authMode === "login" ? "Sign In to Dashboard" : "Create Account & Start"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-dim)", marginTop: 24 }}>
            🔒 256-Bit SSL Encrypted • YoYo SMM Organic Delivery
          </p>
        </div>
      </div>
    );
  }

  // ── Authenticated App Layout ──
  const activeOrdersCount = orders.filter(o => o.status === "DELIVERING" || o.status === "QUEUED" || o.status === "PAUSED").length;
  const completedOrdersCount = orders.filter(o => o.status === "COMPLETED").length;
  const totalSpent = orders.reduce((acc, o) => acc + (o.priceCharged || 0), 0);
  const selectedCurveObj = CURVE_100_LIST.find(c => c.id === selectedCurve) || CURVE_100_LIST[0];

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 88, background: "radial-gradient(circle at top left, rgba(251,191,36,0.08), transparent 40%), var(--bg-main)" }}>
      {/* ── Top Header ── */}
      <header className="glass-panel" style={{ borderRadius: 0, borderTop: "none", borderLeft: "none", borderRight: "none", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 900 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #fbbf24, #ea580c)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 15px rgba(251,191,36,0.3)" }}>
            <Sparkles size={20} color="#000" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
              YOYO SMM
              <span className="badge badge-gold" style={{ fontSize: 9 }}>PRO</span>
            </h1>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
              {user?.name || email?.split("@")[0]}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => { setView("wallet"); triggerHaptic(); }} className="glass-panel card-gold-glow" style={{ padding: "6px 12px", borderRadius: 20, display: "flex", alignItems: "center", gap: 6, border: "1px solid rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.1)", cursor: "pointer" }}>
            <Wallet size={15} color="#fbbf24" />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#fbbf24" }}>₹{user?.balance?.toFixed(2) || "0.00"}</span>
          </button>
          <button onClick={() => { fetchDashboardData(); triggerHaptic(); }} className="btn-secondary" style={{ padding: 8, borderRadius: 12 }} title="Refresh">
            <RefreshCw size={16} className={dataLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* ── Main Content Container ── */}
      <main style={{ padding: "20px", maxWidth: 800, margin: "0 auto" }}>
        {/* ── VIEW 1: DASHBOARD ── */}
        {view === "dashboard" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Wallet Banner */}
            <div className="glass-panel card-gold-glow" style={{ padding: 24, background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(0,0,0,0.6))", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Available Wallet Balance</span>
                <h2 style={{ fontSize: 36, fontWeight: 900, color: "#fff", margin: "4px 0" }}>₹{user?.balance?.toFixed(2) || "0.00"}</h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Instant algorithmic order execution enabled.</p>
              </div>
              <button onClick={() => { setView("wallet"); triggerHaptic(); }} className="btn-primary" style={{ padding: "14px 24px", fontSize: 15 }}>
                <PlusCircle size={18} />
                <span>Deposit Funds</span>
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <div className="glass-panel" style={{ padding: 16, textAlign: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>ACTIVE ORDERS</span>
                <p style={{ fontSize: 22, fontWeight: 900, color: "#00f2fe", marginTop: 4 }}>{activeOrdersCount}</p>
              </div>
              <div className="glass-panel" style={{ padding: 16, textAlign: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>COMPLETED</span>
                <p style={{ fontSize: 22, fontWeight: 900, color: "#10b981", marginTop: 4 }}>{completedOrdersCount}</p>
              </div>
              <div className="glass-panel" style={{ padding: 16, textAlign: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>TOTAL SPENT</span>
                <p style={{ fontSize: 22, fontWeight: 900, color: "#fbbf24", marginTop: 4 }}>₹{totalSpent.toFixed(0)}</p>
              </div>
            </div>

            {/* Quick Launch Card */}
            <div className="glass-panel card-cyan-glow" style={{ padding: 24, background: "linear-gradient(135deg, rgba(0,242,254,0.1), rgba(0,0,0,0.6))" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(0,242,254,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Rocket size={24} color="#00f2fe" />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>Launch New Viral Boosting</h3>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Select from 100+ YoYo SMM curves including Whop, Vyro & CrossWave.</p>
                </div>
              </div>
              <button onClick={() => { setView("new_order"); triggerHaptic(); }} className="btn-cyan" style={{ width: "100%", padding: 16, fontSize: 15 }}>
                <span>Start New Order Now</span>
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Recent Orders Preview with Detailed Progress */}
            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Active Campaigns Overview</h3>
                <button onClick={() => setView("my_orders")} style={{ background: "none", border: "none", color: "var(--gold)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>View All ({orders.length}) →</button>
              </div>
              {orders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-dim)" }}>
                  <Package size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                  <p style={{ fontWeight: 600 }}>No orders yet. Place your first viral boost campaign!</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {orders.slice(0, 3).map((o) => {
                    return (
                      <div key={o.id} style={{ background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 16, border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="badge badge-gold">{o.platform}</span>
                            <span className={`badge ${o.status === "COMPLETED" ? "badge-emerald" : "badge-cyan"}`}>{o.status}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#00f2fe" }}>{o.progressPct}% Completed</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#fff", marginBottom: 6 }}>
                          <span>Delivered: <b>{o.viewsDelivered?.toLocaleString() || 0}</b> / {o.viewsTarget?.toLocaleString()} Views</span>
                          <span style={{ color: "var(--text-muted)" }}>₹{o.priceCharged?.toFixed(2)}</span>
                        </div>
                        <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden" }}>
                          <div style={{ width: `${o.progressPct}%`, height: "100%", background: "linear-gradient(90deg, #00f2fe, #4facfe)", transition: "width 0.5s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VIEW 2: NEW ORDER ── */}
        {view === "new_order" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <Rocket color="#fbbf24" /> New YoYo SMM Campaign
              </h2>
              <span className="badge badge-gold">INSTANT START</span>
            </div>

            {orderError && (
              <div style={{ background: "rgba(244,63,94,0.15)", border: "1px solid #f43f5e", color: "#fb7185", padding: 14, borderRadius: 14, fontSize: 13, display: "flex", alignItems: "center", gap: 10 }}>
                <AlertCircle size={18} />
                <span>{orderError}</span>
              </div>
            )}

            <form onSubmit={handlePlaceOrder} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Step 1: Platform */}
              <div className="glass-panel" style={{ padding: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: "var(--gold)", textTransform: "uppercase", marginBottom: 12, display: "block" }}>1. SELECT PLATFORM</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {[
                    { id: "INSTAGRAM", name: "Reels", icon: "📷", color: "#ec4899" },
                    { id: "TIKTOK", name: "TikTok", icon: "🎵", color: "#00f2fe" },
                    { id: "FACEBOOK", name: "FB Reels", icon: "📘", color: "#3b82f6" },
                    { id: "YOUTUBE", name: "Shorts", icon: "▶️", color: "#ef4444" },
                  ].map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => { setPlatform(p.id); triggerHaptic(); }}
                      style={{ padding: "12px 8px", borderRadius: 14, border: platform === p.id ? `2px solid ${p.color}` : "1px solid var(--border)", background: platform === p.id ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.3)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all 0.2s" }}
                    >
                      <span style={{ fontSize: 24 }}>{p.icon}</span>
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Reel URL */}
              <div className="glass-panel" style={{ padding: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: "var(--gold)", textTransform: "uppercase", marginBottom: 8, display: "block" }}>2. VIDEO / REEL URL</label>
                <input
                  type="url"
                  required
                  placeholder={platform === "INSTAGRAM" ? "https://www.instagram.com/reel/C123..." : "https://vm.tiktok.com/..."}
                  value={reelUrl}
                  onChange={(e) => setReelUrl(e.target.value)}
                  className="input-field"
                />
              </div>

              {/* Step 3: Target Views */}
              <div className="glass-panel" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: "var(--gold)", textTransform: "uppercase" }}>3. TARGET VIEWS QUANTITY</label>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#00f2fe" }}>{viewsTarget.toLocaleString()} Views</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="100000"
                  step="500"
                  value={viewsTarget}
                  onChange={(e) => setViewsTarget(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--gold)", cursor: "pointer", marginBottom: 12 }}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[1000, 5000, 10000, 25000, 50000, 100000].map((num) => (
                    <button
                      type="button"
                      key={num}
                      onClick={() => { setViewsTarget(num); triggerHaptic(); }}
                      style={{ padding: "6px 12px", borderRadius: 10, border: viewsTarget === num ? "1px solid var(--gold)" : "1px solid var(--border)", background: viewsTarget === num ? "rgba(251,191,36,0.15)" : "rgba(0,0,0,0.3)", color: viewsTarget === num ? "var(--gold)" : "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer" }}
                    >
                      {num >= 1000 ? `${num / 1000}k` : num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 4: Algorithmic Curve Selector & Live Graph */}
              <div className="glass-panel" style={{ padding: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: "var(--gold)", textTransform: "uppercase", marginBottom: 12, display: "block" }}>4. ALGORITHMIC GROWTH CURVE</label>
                
                {/* Live Curve Preview Chart */}
                <div style={{ marginBottom: 16 }}>
                  <GrowthCurveGraph curve={selectedCurveObj} />
                </div>

                {/* Categories */}
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 12, scrollbarWidth: "none" }}>
                  {CATEGORIES.map(cat => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => { setSelectedCategory(cat); triggerHaptic(); }}
                      style={{
                        padding: "6px 12px", borderRadius: 20, whiteSpace: "nowrap", fontSize: 11, fontWeight: 700, cursor: "pointer",
                        background: selectedCategory === cat ? "var(--gold)" : "rgba(0,0,0,0.3)",
                        color: selectedCategory === cat ? "#000" : "#fff",
                        border: selectedCategory === cat ? "none" : "1px solid var(--border)"
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, maxHeight: 300, overflowY: "auto", padding: "4px 6px 12px 2px" }}>
                  {CURVE_100_LIST
                    .filter((item) => selectedCategory === "All (107)" || item.category === selectedCategory)
                    .map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => { setSelectedCurve(c.id); triggerHaptic(); }}
                      style={{ padding: "12px 8px", borderRadius: 14, border: selectedCurve === c.id ? `2px solid ${c.stroke}` : "1px solid var(--border)", background: selectedCurve === c.id ? "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.3) 100%)" : "rgba(0,0,0,0.3)", textAlign: "left", cursor: "pointer", transition: "all 0.2s", display: "flex", flexDirection: "column", gap: 6, boxShadow: selectedCurve === c.id ? `0 0 15px ${c.glow}` : "none" }}
                    >
                      <div style={{ fontSize: 20 }}>{c.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: selectedCurve === c.id ? c.stroke : "#fff" }}>
                        {c.label}
                      </div>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", lineClamp: 2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{c.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 5: Auto Engagement Ratios (Interactive Sliders) */}
              <div className="glass-panel" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 800, color: "var(--gold)", textTransform: "uppercase" }}>5. VIRAL ENGAGEMENT RATIOS</label>
                  <button
                    type="button"
                    onClick={() => { setEngEnabled(!engEnabled); triggerHaptic(); }}
                    className={`badge ${engEnabled ? "badge-emerald" : "badge-rose"}`}
                    style={{ cursor: "pointer" }}
                  >
                    {engEnabled ? "ENABLED" : "DISABLED"}
                  </button>
                </div>
                {engEnabled && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ background: "rgba(0,0,0,0.3)", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                        <span style={{ color: "#ff0055" }}>❤️ LIKES ({likesPct}%)</span>
                        <span style={{ color: "#fff" }}>{Math.round(viewsTarget * (likesPct / 100)).toLocaleString()} Likes</span>
                      </div>
                      <input type="range" min="0" max="20" step="0.5" value={likesPct} onChange={(e) => setLikesPct(Number(e.target.value))} style={{ width: "100%", accentColor: "#ff0055" }} />
                    </div>

                    <div style={{ background: "rgba(0,0,0,0.3)", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                        <span style={{ color: "#fbbf24" }}>🔖 SAVES ({savesPct}%)</span>
                        <span style={{ color: "#fff" }}>{Math.round(viewsTarget * (savesPct / 100)).toLocaleString()} Saves</span>
                      </div>
                      <input type="range" min="0" max="10" step="0.5" value={savesPct} onChange={(e) => setSavesPct(Number(e.target.value))} style={{ width: "100%", accentColor: "#fbbf24" }} />
                    </div>

                    <div style={{ background: "rgba(0,0,0,0.3)", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                        <span style={{ color: "#00f2fe" }}>↗️ SHARES ({sharesPct}%)</span>
                        <span style={{ color: "#fff" }}>{Math.round(viewsTarget * (sharesPct / 100)).toLocaleString()} Shares</span>
                      </div>
                      <input type="range" min="0" max="5" step="0.2" value={sharesPct} onChange={(e) => setSharesPct(Number(e.target.value))} style={{ width: "100%", accentColor: "#00f2fe" }} />
                    </div>

                    <div style={{ background: "rgba(0,0,0,0.3)", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                        <span style={{ color: "#a855f7" }}>💬 COMMENTS ({commentsPct}%)</span>
                        <span style={{ color: "#fff" }}>{Math.round(viewsTarget * (commentsPct / 100)).toLocaleString()} Comments</span>
                      </div>
                      <input type="range" min="0" max="2" step="0.1" value={commentsPct} onChange={(e) => setCommentsPct(Number(e.target.value))} style={{ width: "100%", accentColor: "#a855f7" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Price Summary & Submit Button */}
              <div className="glass-panel card-gold-glow" style={{ padding: 24, background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(0,0,0,0.8))" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>TOTAL CAMPAIGN COST</span>
                    <h3 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: "4px 0" }}>₹{currentPrice.toFixed(2)}</h3>
                    <p style={{ fontSize: 11, color: "var(--text-dim)" }}>Your Wallet: ₹{user?.balance?.toFixed(2) || "0.00"}</p>
                  </div>
                  {user && user.balance < currentPrice ? (
                    <span className="badge badge-rose">INSUFFICIENT FUNDS</span>
                  ) : (
                    <span className="badge badge-emerald">READY TO LAUNCH</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={orderSubmitting || !user || user.balance < currentPrice}
                  className="btn-primary"
                  style={{ width: "100%", padding: 18, fontSize: 16 }}
                >
                  <Rocket size={20} />
                  <span>{orderSubmitting ? "Launching Campaign..." : `Launch Campaign Now (₹${currentPrice.toFixed(2)})`}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── VIEW 3: MY ORDERS ── */}
        {view === "my_orders" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <Package color="#00f2fe" /> My YoYo SMM Campaigns
              </h2>
              <span className="badge badge-cyan">{orders.length} TOTAL</span>
            </div>

            {orders.length === 0 ? (
              <div className="glass-panel" style={{ textAlign: "center", padding: 48, color: "var(--text-dim)" }}>
                <Package size={48} style={{ margin: "0 auto 16px", opacity: 0.4 }} />
                <h3 style={{ fontSize: 18, color: "#fff", marginBottom: 8 }}>No Campaigns Yet</h3>
                <p style={{ marginBottom: 20 }}>Launch your first YoYo SMM algorithmic boost to see real-time growth tracking.</p>
                <button onClick={() => setView("new_order")} className="btn-primary">Launch Campaign</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {orders.map((o) => {
                  const curve = CURVE_100_LIST.find(c => c.id === o.curveStyle) || CURVE_100_LIST[0];
                  return (
                    <div key={o.id} className="glass-panel" style={{ padding: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span className="badge badge-gold">{o.platform}</span>
                            <span className={`badge ${o.status === "COMPLETED" ? "badge-emerald" : o.status === "DELIVERING" ? "badge-cyan" : "badge-purple"}`}>{o.status}</span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>₹{o.priceCharged?.toFixed(2) || "0.00"}</span>
                          </div>
                          <a href={o.reelUrl} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 700, color: "#00f2fe", textDecoration: "none", display: "flex", alignItems: "center", gap: 6, wordBreak: "break-all" }}>
                            <span>{o.reelUrl.slice(0, 42)}...</span>
                            <ExternalLink size={14} />
                          </a>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gold)", display: "block" }}>{o.progressPct}% COMPLETED</span>
                          <p style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginTop: 2 }}>{o.viewsDelivered?.toLocaleString()} / <span style={{ color: "var(--gold)" }}>{o.viewsTarget?.toLocaleString()}</span></p>
                        </div>
                      </div>

                      {/* Detailed Stats Row */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14, background: "rgba(0,0,0,0.3)", padding: 10, borderRadius: 10, border: "1px solid var(--border)", textAlign: "center" }}>
                        <div>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><Clock size={12} /> START</span>
                          <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginTop: 2 }}>{o.startCount || 0}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><Zap size={12} /> TARGET</span>
                          <p style={{ fontSize: 13, fontWeight: 800, color: "var(--gold)", marginTop: 2 }}>{o.viewsTarget?.toLocaleString()}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}><CheckCircle2 size={12} /> DELIVERED</span>
                          <p style={{ fontSize: 13, fontWeight: 800, color: "#00f2fe", marginTop: 2 }}>{o.viewsDelivered?.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                        <div style={{ width: `${o.progressPct}%`, height: "100%", background: "linear-gradient(90deg, #00f2fe, #4facfe)", transition: "width 0.5s ease" }} />
                      </div>

                      {/* Exact Growth Chart Matching Order Selection */}
                      <GrowthCurveGraph curve={curve} progressPct={o.progressPct} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── VIEW 4: WALLET & DEPOSIT ── */}
        {view === "wallet" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="glass-panel card-gold-glow" style={{ padding: 24, background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(0,0,0,0.8))", textAlign: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--gold)", textTransform: "uppercase" }}>CURRENT WALLET BALANCE</span>
              <h2 style={{ fontSize: 42, fontWeight: 900, color: "#fff", margin: "8px 0" }}>₹{user?.balance?.toFixed(2) || "0.00"}</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Funds never expire and are ready for 24/7 YoYo SMM campaigns.</p>
            </div>

            {depositMsg && (
              <div style={{ background: depositMsg.startsWith("✅") ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)", border: `1px solid ${depositMsg.startsWith("✅") ? "#10b981" : "#f43f5e"}`, color: depositMsg.startsWith("✅") ? "#34d399" : "#fb7185", padding: 14, borderRadius: 14, fontSize: 13, fontWeight: 700 }}>
                {depositMsg}
              </div>
            )}

            {/* Deposit Method Tabs */}
            <div style={{ display: "flex", background: "rgba(0,0,0,0.4)", borderRadius: 14, padding: 4, border: "1px solid var(--border)" }}>
              <button
                onClick={() => { setDepositTab("UPI"); triggerHaptic(); }}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: depositTab === "UPI" ? "linear-gradient(135deg, #fbbf24, #ea580c)" : "transparent", color: depositTab === "UPI" ? "#000" : "#94a3b8", fontWeight: 800, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}
              >
                🇮🇳 Instant UPI / QR Code
              </button>
              <button
                onClick={() => { setDepositTab("CRYPTO"); triggerHaptic(); }}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: depositTab === "CRYPTO" ? "linear-gradient(135deg, #00f2fe, #4facfe)" : "transparent", color: depositTab === "CRYPTO" ? "#000" : "#94a3b8", fontWeight: 800, fontSize: 14, cursor: "pointer", transition: "all 0.2s" }}
              >
                ⚡ Crypto USDT (0% Fee)
              </button>
            </div>

            {/* UPI Deposit Box */}
            {depositTab === "UPI" && (
              <form onSubmit={handleUpiDeposit} className="glass-panel" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ textAlign: "center" }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>Scan QR Code or Pay via UPI App</h3>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Minimum deposit is ₹{settings.minDeposit}. Instant credit after verification.</p>
                  
                  {settings.upiQrCode ? (
                    <div style={{ background: "#fff", padding: 16, borderRadius: 20, display: "inline-block", margin: "16px 0", boxShadow: "0 0 30px rgba(251,191,36,0.3)" }}>
                      <img src={settings.upiQrCode} alt="UPI QR" style={{ width: 180, height: 180, objectFit: "contain" }} />
                    </div>
                  ) : (
                    <div style={{ background: "rgba(255,255,255,0.05)", padding: 32, borderRadius: 20, margin: "16px 0", border: "1px dashed var(--border)" }}>
                      <p style={{ fontWeight: 700, color: "var(--gold)" }}>UPI ID: {settings.upiId}</p>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 16 }}>
                    <a
                      href={`upi://pay?pa=${settings.upiId}&pn=YoYoSMM&am=${upiAmount}&cu=INR`}
                      className="btn-cyan"
                      style={{ padding: "10px 18px", fontSize: 13 }}
                    >
                      <Zap size={16} /> Pay via GPay / PhonePe / Paytm App
                    </a>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>AMOUNT (₹)</label>
                  <input
                    type="number"
                    min={settings.minDeposit}
                    required
                    value={upiAmount}
                    onChange={(e) => setUpiAmount(Number(e.target.value))}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>12-DIGIT UTR / REFERENCE NUMBER</label>
                  <input
                    type="text"
                    required
                    placeholder="401234567890"
                    value={upiUtr}
                    onChange={(e) => setUpiUtr(e.target.value)}
                    className="input-field"
                  />
                </div>

                <button type="submit" disabled={depositSubmitting} className="btn-primary" style={{ width: "100%", padding: 16 }}>
                  {depositSubmitting ? "Verifying UTR..." : "Submit UPI Deposit for Verification"}
                </button>
              </form>
            )}

            {/* Crypto Deposit Box */}
            {depositTab === "CRYPTO" && (
              <form onSubmit={handleCryptoDeposit} className="glass-panel" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ textAlign: "center" }}>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>USDT Crypto Deposit</h3>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Zero transaction fees. Minimum deposit: $10 USDT.</p>
                  
                  <div style={{ display: "flex", justifyContent: "center", gap: 10, margin: "16px 0" }}>
                    <button type="button" onClick={() => setCryptoNetwork("TRC20")} className={`badge ${cryptoNetwork === "TRC20" ? "badge-cyan" : ""}`} style={{ padding: "8px 16px", cursor: "pointer", border: "1px solid var(--border)", background: cryptoNetwork === "TRC20" ? "rgba(0,242,254,0.2)" : "rgba(0,0,0,0.3)", color: "#fff" }}>USDT (TRC20)</button>
                    <button type="button" onClick={() => setCryptoNetwork("BEP20")} className={`badge ${cryptoNetwork === "BEP20" ? "badge-gold" : ""}`} style={{ padding: "8px 16px", cursor: "pointer", border: "1px solid var(--border)", background: cryptoNetwork === "BEP20" ? "rgba(251,191,36,0.2)" : "rgba(0,0,0,0.3)", color: "#fff" }}>USDT (BEP20)</button>
                  </div>

                  <div style={{ background: "rgba(0,0,0,0.4)", padding: 14, borderRadius: 12, border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", wordBreak: "break-all", gap: 10 }}>
                    <code style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700 }}>
                      {cryptoNetwork === "TRC20" ? (settings.trc20Address || "TRC20_WALLET_ADDRESS_NOT_SET") : (settings.bep20Address || "BEP20_WALLET_ADDRESS_NOT_SET")}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(cryptoNetwork === "TRC20" ? settings.trc20Address : settings.bep20Address);
                        triggerHaptic();
                        alert("Address copied!");
                      }}
                      className="btn-secondary"
                      style={{ padding: "6px 12px", fontSize: 11 }}
                    >
                      <Copy size={14} /> Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>USDT AMOUNT ($)</label>
                  <input type="number" min="10" required value={cryptoAmount} onChange={(e) => setCryptoAmount(Number(e.target.value))} className="input-field" />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>TRANSACTION HASH / TXID</label>
                  <input type="text" required placeholder="0xabc123... or Txyz..." value={cryptoTxHash} onChange={(e) => setCryptoTxHash(e.target.value)} className="input-field" />
                </div>

                <button type="submit" disabled={depositSubmitting} className="btn-cyan" style={{ width: "100%", padding: 16 }}>
                  {depositSubmitting ? "Submitting TXID..." : "Submit Crypto Deposit"}
                </button>
              </form>
            )}

            {/* Deposit History */}
            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 14 }}>Recent Deposit History</h3>
              {deposits.length === 0 ? (
                <p style={{ textAlign: "center", padding: 24, color: "var(--text-dim)", fontSize: 13 }}>No deposit transactions found yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {deposits.map((d) => (
                    <div key={d.id} style={{ background: "rgba(0,0,0,0.3)", padding: 12, borderRadius: 12, border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span className="badge badge-gold" style={{ marginBottom: 4 }}>{d.type}</span>
                        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Ref: {d.reference}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>{d.type.includes("CRYPTO") ? `$${d.amount}` : `₹${d.amount}`}</span>
                        <p style={{ fontSize: 11, fontWeight: 800, color: d.status === "CONFIRMED" ? "#10b981" : d.status === "REJECTED" ? "#f43f5e" : "#fbbf24", marginTop: 2 }}>{d.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VIEW 5: SUPPORT & PROFILE ── */}
        {view === "support" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="glass-panel" style={{ padding: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 54, height: 54, borderRadius: 16, background: "linear-gradient(135deg, #a855f7, #6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                  👑
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{user?.name || email?.split("@")[0]}</h3>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{user?.email}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="btn-secondary" style={{ borderColor: "#f43f5e", color: "#fb7185" }}>
                <LogOut size={16} /> Sign Out
              </button>
            </div>

            <div className="glass-panel" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <MessageCircle color="#a855f7" /> 24/7 Priority Support
              </h3>
              <form onSubmit={handleCreateTicket} style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                <input type="text" required placeholder="Subject (e.g. Speed up order #12345)" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} className="input-field" />
                <textarea required rows={3} placeholder="Describe your issue or custom requirement..." value={ticketMsg} onChange={(e) => setTicketMsg(e.target.value)} className="input-field" style={{ resize: "vertical" }} />
                <button type="submit" disabled={ticketSubmitting} className="btn-purple" style={{ padding: 14 }}>
                  <Send size={16} /> Submit Support Ticket
                </button>
              </form>

              <h4 style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 12 }}>Your Support Tickets ({tickets.length})</h4>
              {tickets.length === 0 ? (
                <p style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "center", padding: 20 }}>No support tickets opened yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {tickets.map((t) => (
                    <div key={t.id} style={{ background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 14, border: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <h5 style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{t.subject}</h5>
                        <span className={`badge ${t.status === "OPEN" ? "badge-gold" : "badge-emerald"}`}>{t.status}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>{t.message}</p>
                      {t.messages && t.messages.length > 1 && (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 10, marginTop: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gold)" }}>Admin Replies:</span>
                          {t.messages.filter((m: any) => m.sender === "ADMIN" || m.sender === "SUPPORT").map((m: any) => (
                            <div key={m.id} style={{ background: "rgba(251,191,36,0.1)", padding: 10, borderRadius: 8, marginTop: 6 }}>
                              <p style={{ fontSize: 12, color: "#fff" }}>{m.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Bottom Navigation Bar ── */}
      <nav className="bottom-nav">
        <button onClick={() => { setView("dashboard"); triggerHaptic(); }} className={`nav-item ${view === "dashboard" ? "active" : ""}`}>
          <Home size={22} />
          <span>Dashboard</span>
        </button>
        <button onClick={() => { setView("new_order"); triggerHaptic(); }} className={`nav-item ${view === "new_order" ? "active" : ""}`}>
          <Rocket size={22} />
          <span>Boost Now</span>
        </button>
        <button onClick={() => { setView("my_orders"); triggerHaptic(); }} className={`nav-item ${view === "my_orders" ? "active" : ""}`}>
          <Package size={22} />
          <span>My Orders</span>
        </button>
        <button onClick={() => { setView("wallet"); triggerHaptic(); }} className={`nav-item ${view === "wallet" ? "active" : ""}`}>
          <Wallet size={22} />
          <span>Deposit</span>
        </button>
        <button onClick={() => { setView("support"); triggerHaptic(); }} className={`nav-item ${view === "support" ? "active" : ""}`}>
          <User size={22} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}
