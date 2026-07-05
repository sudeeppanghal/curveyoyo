"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BlogsTab } from "./BlogsTab";
import { AutoSyncTab } from "./AutoSyncTab";
import { N } from "@/lib/theme";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AdminSettings {

  trc20Address: string | null;

  bep20Address: string | null;

  priceUsdt: number;

  siteName: string;

  freeTrialHours: number;

  maintenanceMode: boolean;

  supportEmail: string | null;

  upiId: string | null;

  upiQrCode: string | null;

  minDeposit: number;
  apifyKeys: string | null;

}

interface User {

  id: string;

  email: string;

  name: string | null;

  plan: string;

  createdAt: string;

  lifetimeUnlocked: boolean;

  _count: { orders: number; panels: number };

  subscription: { status: string; paidAt: string } | null;
  walletMode: boolean;
  balance: number;

}

interface Payment {

  id: string;

  txHash: string;

  network: string;

  status: string;

  amountUsdt: number | null;

  createdAt: string;

  user: { email: string; name: string | null };

}

type AdminTab = "settings" | "users" | "payments" | "upi_payments" | "admin_panels" | "campaigns" | "failed_orders" | "system" | "tickets" | "affiliates" | "blogs" | "auto_sync";



const PLAN_COLORS: Record<string, string> = {

  FREE: "#718096",

  TRIAL: "#4f46e5",

  LIFETIME: "#16a34a",

  SUSPENDED: "#dc2626",

};

export default function AdminPage() {

  const router = useRouter();

  const [secret, setSecret] = useState("");

  const [authed, setAuthed] = useState(false);

  const [tab, setTab] = useState<AdminTab>("settings");
  const [panelSubTab, setPanelSubTab] = useState<"defaults" | "accounts">("defaults");

  const [settings, setSettings] = useState<AdminSettings>({

    trc20Address: "",

    bep20Address: "",

    priceUsdt: 20,

    siteName: "YoyoSMM",

    freeTrialHours: 24,

    maintenanceMode: false,

    supportEmail: "",

    upiId: "",

    upiQrCode: "",

    minDeposit: 500,
    apifyKeys: "",

  });

  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [adminChatTicketId, setAdminChatTicketId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState("");
  const [adminReplying, setAdminReplying] = useState(false);

  const [payments, setPayments] = useState<Payment[]>([]);

  const [orders, setOrders] = useState<any[]>([]);

  const [systemData, setSystemData] = useState<{

    events: any[];

    panels: any[];

    orderStats: { status: string; count: number }[];

    eventStats: { status: string; count: number }[];

    totalDepositInr?: number;

    totalRevenueInr?: number;

    totalProfitInr?: number;

    dailyFinancials?: any[];

    excludedAdminAccounts?: string[];

  }>({ events: [], panels: [], orderStats: [], eventStats: [], totalDepositInr: 0, totalRevenueInr: 0, totalProfitInr: 0, dailyFinancials: [] });

  const [loading, setLoading] = useState(false);

  const [saved, setSaved] = useState("");

  const [error, setError] = useState("");

  const [affiliateData, setAffiliateData] = useState<any>(null);
  const [affiliateLoading, setAffiliateLoading] = useState(false);
  const [affiliateSearchEmail, setAffiliateSearchEmail] = useState("bizanomarketing.carrd.co@gmail.com");

  const [historyUser, setHistoryUser] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const openUserHistory = async (u: any) => {
    setHistoryUser(u);
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/admin/users/" + u.id + "/history", {
        headers: { "x-admin-secret": localStorage.getItem("yoyo_admin_secret") || "" }
      });
      const data = await res.json();
      setHistoryData(data.deposits || []);
    } catch {
      alert("Error loading history");
    } finally {
      setHistoryLoading(false);
    }
  };


  const fetchAffiliateStats = async (emailToSearch: string) => {
    setAffiliateLoading(true);
    try {
      const res = await fetch(`/api/affiliate/stats?email=${encodeURIComponent(emailToSearch)}`, {
        headers: { "x-admin-secret": localStorage.getItem("yoyo_admin_secret") || "" }
      });
      const d = await res.json();
      if (d.success) setAffiliateData(d);
      setAffiliateLoading(false);
    } catch {
      setAffiliateLoading(false);
    }
  };

  const [orderQuery, setOrderQuery] = useState("");

  const [orderFilter, setOrderFilter] = useState("All");

  const [userQuery, setUserQuery] = useState("");
  const [userSort, setUserSort] = useState("newest");
  const [userFilter, setUserFilter] = useState("all");

  // New UPI Payments & Admin Panels States

  const [upiPayments, setUpiPayments] = useState<any[]>([]);

  const [adminPanels, setAdminPanels] = useState<any[]>([]);
  const [checkingAdminBalances, setCheckingAdminBalances] = useState<boolean>(false);
  const [verifyingPanelId, setVerifyingPanelId] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const [selectedPanelId, setSelectedPanelId] = useState("");

  const [liveServices, setLiveServices] = useState<any[]>([]);

  const [savedServices, setSavedServices] = useState<any[]>([]);

  const [fetchingServices, setFetchingServices] = useState(false);
  const [isManualInput, setIsManualInput] = useState(false);

  const [savingService, setSavingService] = useState(false);

  const [chartMetric, setChartMetric] = useState<"profit" | "revenue">("profit");
  const [serviceSearch, setServiceSearch] = useState("");
  const [servicePlatformFilter, setServicePlatformFilter] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);

  // New Panel fields

  const [newPanelName, setNewPanelName] = useState("");

  const [newPanelApiUrl, setNewPanelApiUrl] = useState("");

  const [newPanelApiKey, setNewPanelApiKey] = useState("");

  const [newPanelPriority, setNewPanelPriority] = useState("1");

  const [newPanelLoadPercentage, setNewPanelLoadPercentage] = useState("100");

  // Service Pricing fields

  const [pricingPlatform, setPricingPlatform] = useState("INSTAGRAM");

  const [pricingType, setPricingType] = useState("views");

  const [pricingServiceId, setPricingServiceId] = useState("");

  const [pricingOriginalRate, setPricingOriginalRate] = useState("");

  const [pricingCustomRate, setPricingCustomRate] = useState("");

  const [pricingName, setPricingName] = useState("");
  const [pricingFallbacks, setPricingFallbacks] = useState<{ serviceId: string; originalRate: string; customRate: string; name: string }[]>([]);

  const [pricingMultiplier, setPricingMultiplier] = useState("");

  const [pricingMin, setPricingMin] = useState("");

  const [pricingMax, setPricingMax] = useState("");

  const handleMultiplierChange = (multValue: string, customOriginalRate?: string) => {

    setPricingMultiplier(multValue);

    const m = parseFloat(multValue);

    const orig = parseFloat(customOriginalRate ?? pricingOriginalRate);

    if (!isNaN(m) && !isNaN(orig)) {

      const customVal = (orig * 83 * m).toFixed(2);

      setPricingCustomRate(customVal);

    } else {

      setPricingCustomRate("");

    }

  };
  useEffect(() => {
    const savedSecret = localStorage.getItem("yoyo_admin_secret");
    if (savedSecret) {
      setSecret(savedSecret);
      loadAll(savedSecret);
    }
  }, []);

  const headers = { "Content-Type": "application/json", "x-admin-secret": secret };

  const loadAll = async (overrideSecret?: string) => {

    setLoading(true);

    setError("");

    try {
      const activeSecret = overrideSecret || secret;
      const sRes = await fetch("/api/admin/settings", { headers: { "Content-Type": "application/json", "x-admin-secret": activeSecret } });
      if (sRes.status === 403) {
        setError("Wrong admin secret");
        setAuthed(false);
        setLoading(false);
        return;
      }
      if (!sRes.ok) {
        setError(`Server error ${sRes.status} — check DATABASE_URL in Vercel env vars`);
        setAuthed(false);
        setLoading(false);
        return;
      }
      const s = await sRes.json();
      if (s.settings) setSettings(s.settings);
      setAuthed(true);
      localStorage.setItem("yoyo_admin_secret", activeSecret);
      const activeHeaders = { "Content-Type": "application/json", "x-admin-secret": activeSecret };
      const [uRes, pRes, oRes, sysRes, upiRes, apRes, tRes] = await Promise.all([
        fetch("/api/admin/users",    { headers: activeHeaders }),
        fetch("/api/admin/payments", { headers: activeHeaders }),
        fetch("/api/admin/orders",   { headers: activeHeaders }),
        fetch("/api/admin/system",   { headers: activeHeaders }),
        fetch("/api/admin/upi-payments", { headers: activeHeaders }),
        fetch("/api/admin/panels?action=health",   { headers: activeHeaders }),
        fetch("/api/tickets",        { headers: activeHeaders }),
      ]);

      if (uRes.ok)   { const u = await uRes.json();   setUsers(u.users ?? []); }

      if (pRes.ok)   { const p = await pRes.json();   setPayments(p.payments ?? []); }

      if (oRes.ok)   { const o = await oRes.json();   setOrders(o.orders ?? []); }

      if (sysRes.ok) { const sys = await sysRes.json(); setSystemData(sys ?? { events: [], panels: [], orderStats: [], eventStats: [] }); }
      if (tRes && tRes.ok) { const tData = await tRes.json(); setTickets(tData.tickets ?? []); }

      // Load UPI Payments

      try {

        const upiData = await upiRes.json();

        if (upiData.payments) setUpiPayments(upiData.payments);

      } catch (err) {}

      // Load Admin Panels

      try {

        const apData = await apRes.json();

        if (apData.panels) {
          setAdminPanels(apData.panels);
          if (apData.panels.length > 0) {
            handleLoadServices(apData.panels[0].id);
          }
        }

      } catch (err) {}

    } catch (e) {

      setError(`Network error: ${String(e)}`);

    }

    setLoading(false);

  };

  const handleCampaignAction = async (orderId: string, action: "pause" | "resume" | "cancel" | "refill") => {

    setSaved("Processing…");

    try {

      const res = await fetch("/api/admin/orders", {

        method: "PATCH",

        headers,

        body: JSON.stringify({ orderId, action }),

      });

      const data = await res.json();

      if (res.ok) {

        setSaved(action === "refill" ? "Refill triggered!" : "Campaign updated!");

        setTimeout(() => setSaved(""), 2000);

        loadAll();

      } else {

        setError(data.error ?? "Action failed");

        setTimeout(() => setError(""), 3000);

      }

    } catch (e) {

      setError(String(e));

      setTimeout(() => setError(""), 3000);

    }

  };

  const saveSettings = async () => {

    const res = await fetch("/api/admin/settings", { method: "PATCH", headers, body: JSON.stringify(settings) });

    if (res.ok) {

      setSaved("Saved!");

      setTimeout(() => setSaved(""), 2000);

    } else {

      setError("Save failed");

    }

  };

  // UPI Deposits Tab Actions

  const handleUpiAction = async (paymentId: string, action: "approve" | "reject", rejectedReason?: string) => {

    setSaved("Processing…");

    try {

      const res = await fetch("/api/admin/upi-payments", {

        method: "POST",

        headers,

        body: JSON.stringify({ paymentId, action, rejectedReason }),

      });

      if (res.ok) {

        setSaved(`Payment ${action === "approve" ? "Approved" : "Rejected"}!`);

        setTimeout(() => setSaved(""), 2000);

        loadAll();

      } else {

        const errJson = await res.json();

        setError(errJson.error ?? "Payment action failed");

        setTimeout(() => setError(""), 3000);

      }

    } catch (e) {

      setError(String(e));

      setTimeout(() => setError(""), 3000);

    }

  };

  const handleCryptoAction = async (paymentId: string, action: "approve" | "reject", inrAmount?: number, rejectedReason?: string) => {
    setSaved("Processing…");
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers,
        body: JSON.stringify({ paymentId, action, inrAmount, rejectedReason }),
      });
      if (res.ok) {
        setSaved(`Crypto Payment ${action === "approve" ? "Approved" : "Rejected"}!`);
        setTimeout(() => setSaved(""), 2000);
        loadAll();
      } else {
        const errJson = await res.json();
        setError(errJson.error ?? "Crypto action failed");
        setTimeout(() => setError(""), 3000);
      }
    } catch (e) {
      setError(String(e));
      setTimeout(() => setError(""), 3000);
    }
  };

  // Admin Panels Tab Actions

  const handleAddPanel = async () => {

    if (!newPanelName.trim() || !newPanelApiUrl.trim() || !newPanelApiKey.trim()) {

      setError("Name, API URL, and API Key are required");

      setTimeout(() => setError(""), 3000);

      return;

    }

    setSaved("Adding panel…");

    try {

      const res = await fetch("/api/admin/panels", {

        method: "POST",

        headers,

        body: JSON.stringify({

          name: newPanelName.trim(),

          apiUrl: newPanelApiUrl.trim(),

          apiKey: newPanelApiKey.trim(),

          priority: parseInt(newPanelPriority) || 1,

          loadPercentage: parseInt(newPanelLoadPercentage) || 100,

        }),

      });

      if (res.ok) {

        setSaved("Admin SMM Panel added!");

        setNewPanelName("");

        setNewPanelApiUrl("");

        setNewPanelApiKey("");

        setNewPanelPriority("1");

        setNewPanelLoadPercentage("100");

        setTimeout(() => setSaved(""), 2000);

        loadAll();

      } else {

        const errJson = await res.json();

        setError(errJson.error ?? "Failed to add panel");

        setTimeout(() => setError(""), 3000);

      }

    } catch (e) {

      setError(String(e));

      setTimeout(() => setError(""), 3000);

    }

  };

  const handleVerifyConnection = async (panelId: string) => {
    setVerifyingPanelId(panelId);
    setVerificationResult(null);
    try {
      const res = await fetch(`/api/admin/panels?action=test&id=${panelId}`, { headers });
      const data = await res.json();
      if (res.ok && data.ok) {
        const balText = data.balance !== undefined ? ` — Balance: $${Number(data.balance).toFixed(2)} ${data.currency ?? "USD"}` : "";
        setVerificationResult({ id: panelId, success: true, message: `Connection verified! Panel is ONLINE.${balText}` });
        // Refresh panel list state to show ONLINE status & balance in table
        const apRes = await fetch("/api/admin/panels?action=health", { headers });
        if (apRes.ok) {
          const apData = await apRes.json();
          if (apData.panels) setAdminPanels(apData.panels);
        }
      } else {
        setVerificationResult({ id: panelId, success: false, message: data.error ?? "Failed to connect to SMM panel API." });
      }
    } catch (err: any) {
      setVerificationResult({ id: panelId, success: false, message: `Network error: ${err.message || String(err)}` });
    } finally {
      setVerifyingPanelId(null);
    }
  };

  const handleCheckAdminBalances = async () => {
    setCheckingAdminBalances(true);
    try {
      const res = await fetch("/api/admin/panels?action=health", { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.panels) setAdminPanels(data.panels);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingAdminBalances(false);
    }
  };

  const handleDeletePanel = async (id: string) => {

    if (!confirm("Are you sure you want to delete this admin SMM panel?")) return;

    setSaved("Deleting panel…");

    try {

      const res = await fetch(`/api/admin/panels?id=${id}`, {

        method: "DELETE",

        headers,

      });

      if (res.ok) {

        setSaved("Panel deleted!");

        setTimeout(() => setSaved(""), 2000);

        loadAll();

        if (selectedPanelId === id) {

          setSelectedPanelId("");

          setLiveServices([]);

          setSavedServices([]);

        }

      } else {

        setError("Failed to delete panel");

        setTimeout(() => setError(""), 3000);

      }

    } catch (e) {

      setError(String(e));

      setTimeout(() => setError(""), 3000);

    }

  };

  const handleLoadServices = async (panelId: string) => {
    setSelectedPanelId(panelId);
    setLiveServices([]);
    setSavedServices([]);
    setIsManualInput(false); // Default to dropdown select mode when switching panels

    // 1. Fetch saved services config immediately (fast DB query)
    try {
      const savedRes = await fetch(`/api/admin/services?panelId=${panelId}`, { headers });
      if (savedRes.ok) {
        const savedJson = await savedRes.json();
        setSavedServices(savedJson.services ?? []);
      }
    } catch (e) {
      console.error("Failed to load saved services configuration", e);
    }

    // 2. Fetch live services list from external SMM API in background
    setFetchingServices(true);
    try {
      const liveRes = await fetch(`/api/admin/services?action=fetch&panelId=${panelId}`, { headers });
      if (liveRes.ok) {
        const liveJson = await liveRes.json();
        setLiveServices(liveJson.services ?? []);
      } else {
        const errJson = await liveRes.json();
        setError(errJson.error ?? "Failed to load live services from SMM API");
        setTimeout(() => setError(""), 4000);
      }
    } catch (e) {
      setError(String(e));
      setTimeout(() => setError(""), 3000);
    } finally {
      setFetchingServices(false);
    }
  };

  const handleSyncAllServices = async () => {
    if (!selectedPanelId) return;
    setSyncingAll(true);
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "sync_all", panelId: selectedPanelId })
      });
      const data = await res.json();
      if (res.ok) {
        setSaved(data.message || "Synced successfully across all API keys!");
        setTimeout(() => setSaved(""), 4000);
      } else {
        setError(data.error || "Failed to sync");
        setTimeout(() => setError(""), 3000);
      }
    } catch (e) {
      setError(String(e));
    }
    setSyncingAll(false);
  };

  const handleSaveServicePrice = async () => {

    if (!selectedPanelId || !pricingServiceId || !pricingCustomRate) {

      setError("Please select a service and input custom price");

      setTimeout(() => setError(""), 3000);

      return;

    }

    setSavingService(true);

    try {

      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers,
        body: JSON.stringify({
          panelId: selectedPanelId,
          platform: pricingPlatform,
          type: pricingType,
          serviceId: pricingServiceId,
          originalRate: parseFloat(pricingOriginalRate) || 0,
          customRate: parseFloat(pricingCustomRate),
          name: pricingName,
          minQuantity: pricingMin ? parseInt(pricingMin) : 10,
          fallbackServiceIds: pricingFallbacks.filter((f: any) => f.serviceId.trim() !== "").map((f: any) => ({
            serviceId: f.serviceId.trim(),
            originalRate: parseFloat(f.originalRate) || 0,
            customRate: parseFloat(f.customRate) || 0,
            name: f.name.trim()
          }))
        }),
      });

      if (res.ok) {
        setSaved(`✅ Successfully mapped Service #${pricingServiceId} across all API keys!`);
        setPricingOriginalRate("");
        setPricingCustomRate("");
        setPricingName("");
        setPricingFallbacks([]);
        setTimeout(() => setSaved(""), 2000);

        // Refresh saved services config
        const savedRes = await fetch(`/api/admin/services?panelId=${selectedPanelId}`, { headers });
        if (savedRes.ok) {
          const savedJson = await savedRes.json();
          setSavedServices(savedJson.services ?? []);
        }
      } else {
        const errJson = await res.json();
        setError(errJson.error ?? "Failed to save pricing");
        setTimeout(() => setError(""), 3000);
      }

    } catch (e) {

      setError(String(e));

      setTimeout(() => setError(""), 3000);

    } finally {

      setSavingService(false);

    }

  };

  const userAction = async (userId: string, action: string, extra?: any) => {

    await fetch("/api/admin/users", { method: "PATCH", headers, body: JSON.stringify({ userId, action, ...extra }) });

    loadAll();

  };

  const impersonateUser = async (userId: string) => {

    setSaved("Authenticating as user…");

    try {

      const res = await fetch("/api/admin/impersonate", {

        method: "POST",

        headers,

        body: JSON.stringify({ userId }),

      });

      const data = await res.json();

      if (res.ok && data.redirectTo) {

        setSaved("Redirecting…");

        window.location.href = data.redirectTo;

      } else {

        setError(data.error ?? "Failed to impersonate");

        setTimeout(() => setError(""), 3000);

      }

    } catch (e) {

      setError(String(e));

      setTimeout(() => setError(""), 3000);

    }

  };

  // Auth Screen REDESIGNED

  if (!authed) return (

    <div style={{

      minHeight: "100vh",

      display: "flex",

      alignItems: "center",

      justifyContent: "center",

      background: N.bg,

      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",

      padding: "16px",

    }}>

      <style>{`

        .neo-input:focus {

          box-shadow: inset 6px 6px 12px #c8d0e7, inset -6px -6px 12px #ffffff, 0 0 0 2px rgba(217, 119, 6, 0.25) !important;

        }

        .neo-btn:hover {

          transform: translateY(-1px);

          box-shadow: 8px 8px 22px #c8d0e7, -8px -8px 22px #ffffff !important;

        }

        .neo-btn:active {

          transform: none;

          box-shadow: inset 3px 3px 8px #c8d0e7, inset -1px -1px 4px #ffffff !important;

        }

      `}</style>

      <div style={{

        width: "100%",

        maxWidth: 380,

        borderRadius: 24,

        padding: 36,

        background: N.bg,

        boxShadow: N.raised,

        display: "flex",

        flexDirection: "column",

        gap: 24,

        textAlign: "center"

      }}>

        <div>

          <div style={{

            width: 48,

            height: 48,

            borderRadius: "50%",

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            margin: "0 auto 16px",

            fontSize: 22,

            fontWeight: 900,

            color: "#ffffff",

            background: N.accentBg,

            boxShadow: N.raisedSm,

          }}>Y</div>

          <h1 style={{ fontSize: 20, fontWeight: 900, color: N.text, margin: 0, letterSpacing: "-0.5px" }}>Admin Panel</h1>

          <p style={{ color: N.muted, fontSize: 13, fontWeight: 600, marginTop: 6, margin: 0 }}>Enter admin secret key to continue</p>

        </div>

        <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)}

          onKeyDown={(e) => e.key === "Enter" && loadAll()}

          placeholder="Admin secret key…"

          className="neo-input"

          style={{

            width: "100%",

            padding: "14px 18px",

            borderRadius: 12,

            fontSize: 13,

            fontWeight: 600,

            color: N.text,

            background: N.bg,

            border: "none",

            boxShadow: N.inset,

            outline: "none",

            boxSizing: "border-box"

          }} />

        {error && <p style={{ color: "#dc2626", fontSize: 12, fontWeight: 700, margin: 0 }}>⚠️ {error}</p>}

        <button onClick={() => loadAll()} className="neo-btn"

          style={{

            width: "100%",

            padding: "14px",

            borderRadius: 12,

            fontSize: 13,

            fontWeight: 850,

            border: "none",

            color: "#ffffff",

            background: N.accentBg,

            boxShadow: N.raisedSm,

            cursor: "pointer",

          }}>

          {loading ? "Verifying..." : "Enter Admin Panel →"}

        </button>

      </div>

    </div>

  );

  // Main Dashboard REDESIGNED

  const displayedUsers = users
    .filter((u) => {
      if (userFilter === "wallet" && !u.walletMode) return false;
      if (userFilter === "lifetime" && !u.lifetimeUnlocked && u.plan !== "LIFETIME") return false;
      if (userQuery.trim()) {
        const q = userQuery.toLowerCase().trim();
        const emailMatch = u.email?.toLowerCase().includes(q);
        const nameMatch = u.name?.toLowerCase().includes(q);
        const idMatch = u.id?.toLowerCase().includes(q);
        if (!emailMatch && !nameMatch && !idMatch) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (userSort === "balance_desc") return (b.balance || 0) - (a.balance || 0);
      if (userSort === "balance_asc") return (a.balance || 0) - (b.balance || 0);
      if (userSort === "orders_desc") return (b._count?.orders || 0) - (a._count?.orders || 0);
      if (userSort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (

    <div style={{

      minHeight: "100vh",

      background: N.bg,

      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",

      padding: "40px 16px",

      boxSizing: "border-box"

    }}>

      <style>{`

        .neo-input:focus {

          box-shadow: inset 6px 6px 12px #c8d0e7, inset -6px -6px 12px #ffffff, 0 0 0 2px rgba(217, 119, 6, 0.25) !important;

        }

        .neo-btn:hover {

          transform: translateY(-1px);

          box-shadow: 8px 8px 22px #c8d0e7, -8px -8px 22px #ffffff !important;

        }

        .neo-btn:active {

          transform: none;

          box-shadow: inset 3px 3px 8px #c8d0e7, inset -1px -1px 4px #ffffff !important;

        }

        .hover-row:hover {

          background: rgba(200, 208, 231, 0.15) !important;

        }

        @keyframes fadeUp {

          from { opacity: 0; transform: translateY(8px); }

          to { opacity: 1; transform: translateY(0); }

        }

      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>

        {/* Header */}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>

            <div style={{

              width: 42,

              height: 42,

              borderRadius: "50%",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              fontSize: 20,

              fontWeight: 900,

              color: "#ffffff",

              background: N.accentBg,

              boxShadow: N.raisedSm,

            }}>Y</div>

            <div>

              <h1 style={{ fontSize: 22, fontWeight: 900, color: N.text, margin: 0, letterSpacing: "-0.5px" }}>YoyoSMM Admin</h1>

              <p style={{ color: N.muted, fontSize: 13, fontWeight: 600, margin: 0, marginTop: 2 }}>Manage platform configurations and global statistics</p>

            </div>

          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />

            {saved && (

              <span style={{

                padding: "8px 14px",

                borderRadius: 10,

                fontSize: 12,

                color: "#16a34a",

                fontWeight: 800,

                background: "rgba(22, 163, 74, 0.08)",

                boxShadow: N.inset,

              }}>✓ {saved}</span>

            )}

            <button onClick={() => router.push("/dashboard")} className="neo-btn"

              style={{

                padding: "10px 18px",

                borderRadius: 12,

                fontSize: 12,

                fontWeight: 850,

                border: "none",

                background: N.bg,

                color: N.muted,

                boxShadow: N.raisedSm,

                cursor: "pointer",

              }}>

              ← Dashboard

            </button>

          </div>

        </div>

        {/* Stats Grid */}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24 }}>

          {[

            ["👥", "Total Users", users.length],

            ["💎", "Total Deposit", `₹ ${(systemData.totalDepositInr ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`],

            ["📈", "Total Revenue", `₹ ${(systemData.totalRevenueInr ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`],

            ["💰", "Total Profit", `₹ ${(systemData.totalProfitInr ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`],

          ].map(([icon, label, val]) => (

            <div key={label} style={{

              borderRadius: 20,

              padding: "24px 20px",

              background: N.bg,

              boxShadow: N.raised,

              display: "flex",

              alignItems: "center",

              gap: 16

            }}>

              <div style={{

                width: 46,

                height: 46,

                borderRadius: 14,

                background: N.bg,

                boxShadow: N.inset,

                display: "flex",

                alignItems: "center",

                justifyContent: "center",

                fontSize: 22

              }}>{icon}</div>

              <div>

                <p style={{ fontSize: 20, fontWeight: 900, color: N.text, margin: 0 }}>{val}</p>

                <p style={{ color: N.muted, fontSize: 11, fontWeight: 700, margin: 0, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>

              </div>

            </div>

          ))}

        </div>

        {/* Financial & Profit Analytics Chart Component */}
        <div style={{
          borderRadius: 24,
          padding: 28,
          background: N.bg,
          boxShadow: N.raised,
          border: `1.5px solid ${N.border}`,
          display: "flex",
          flexDirection: "column",
          gap: 20
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ fontSize: 18, fontWeight: 900, color: N.text, margin: 0 }}>📊 Financial Performance & Profit Analytics</h2>
                <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 20, background: "rgba(34, 197, 94, 0.1)", color: "#16a34a", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
                  ✨ Excludes Admin Account (arpitasumanekka@gmail.com)
                </span>
              </div>
              <p style={{ fontSize: 12, color: N.muted, margin: "6px 0 0", fontWeight: 600 }}>
                Live daily tracking of gross revenue vs net SMM delivery profit margins across all user orders
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setChartMetric("profit")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  background: chartMetric === "profit" ? N.bg : "transparent",
                  boxShadow: chartMetric === "profit" ? N.inset : "none",
                  color: chartMetric === "profit" ? "#16a34a" : N.muted,
                  transition: "all 0.2s ease"
                }}
              >
                💰 Net Profit (₹)
              </button>
              <button
                onClick={() => setChartMetric("revenue")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  background: chartMetric === "revenue" ? N.bg : "transparent",
                  boxShadow: chartMetric === "revenue" ? N.inset : "none",
                  color: chartMetric === "revenue" ? "#a855f7" : N.muted,
                  transition: "all 0.2s ease"
                }}
              >
                📈 Gross Revenue (₹)
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            <div style={{ padding: 16, borderRadius: 16, background: N.bg, boxShadow: N.inset, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: N.muted, textTransform: "uppercase" }}>Net SMM Profit</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#16a34a" }}>₹ {(systemData.totalProfitInr ?? 0).toLocaleString()}</span>
            </div>
            <div style={{ padding: 16, borderRadius: 16, background: N.bg, boxShadow: N.inset, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: N.muted, textTransform: "uppercase" }}>Total Order Revenue</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#a855f7" }}>₹ {(systemData.totalRevenueInr ?? 0).toLocaleString()}</span>
            </div>
            <div style={{ padding: 16, borderRadius: 16, background: N.bg, boxShadow: N.inset, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: N.muted, textTransform: "uppercase" }}>Total User Deposits</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#3b82f6" }}>₹ {(systemData.totalDepositInr ?? 0).toLocaleString()}</span>
            </div>
            <div style={{ padding: 16, borderRadius: 16, background: N.bg, boxShadow: N.inset, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: N.muted, textTransform: "uppercase" }}>Avg Delivery Margin</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#f59e0b" }}>
                {systemData.totalRevenueInr ? ((systemData.totalProfitInr! / systemData.totalRevenueInr!) * 100).toFixed(1) : "0"}%
              </span>
            </div>
          </div>

          {(!systemData.dailyFinancials || systemData.dailyFinancials.length === 0) ? (
            <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: N.muted, fontWeight: 700, fontSize: 13 }}>
              Loading financial analytics...
            </div>
          ) : (
            <div style={{ padding: "16px 8px 0", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: 160, gap: 8, paddingBottom: 8, borderBottom: `1.5px dashed ${N.border}` }}>
                {systemData.dailyFinancials.map((d: any, idx: number) => {
                  const maxVal = Math.max(1, ...systemData.dailyFinancials!.map((x: any) => chartMetric === "profit" ? x.profit : x.revenue));
                  const val = chartMetric === "profit" ? d.profit : d.revenue;
                  const heightPct = Math.max(8, Math.min(100, (val / maxVal) * 100));
                  const barColor = chartMetric === "profit" ? "linear-gradient(180deg, #22c55e 0%, #16a34a 100%)" : "linear-gradient(180deg, #c084fc 0%, #a855f7 100%)";

                  return (
                    <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: chartMetric === "profit" ? "#16a34a" : "#a855f7", opacity: val > 0 ? 1 : 0.5 }}>
                        ₹{val}
                      </div>
                      <div style={{
                        width: "100%",
                        maxWidth: 36,
                        height: `${heightPct}%`,
                        borderRadius: "8px 8px 4px 4px",
                        background: val === 0 ? N.inset : barColor,
                        boxShadow: val > 0 ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
                        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        cursor: "pointer"
                      }} title={`${d.date}: ₹${val} (${d.orders} orders)`} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                {systemData.dailyFinancials.map((d: any, idx: number) => (
                  <div key={idx} style={{ flex: 1, textAlign: "center", fontSize: 10, fontWeight: 700, color: N.muted }}>
                    {d.date}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tab switch bar */}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, borderBottom: `1px solid ${N.border}`, paddingBottom: 16 }}>

          {(["settings", "users", "payments", "upi_payments", "admin_panels", "campaigns", "failed_orders", "system", "tickets", "affiliates", "blogs", "auto_sync"] as AdminTab[]).map((t) => {

            const iconMap: Record<AdminTab, string> = {

              settings: "⚙️ ",

              users: "👥 ",

              payments: "💰 ",

              upi_payments: "🇮🇳 ",

              admin_panels: "🚀 ",

              campaigns: "📦 ",
              failed_orders: "🚨 ",

              system: "⚡ ",
              tickets: "✉️ ",
              affiliates: "🤝 ",
              blogs: "📝 ",
              auto_sync: "🔄 "
            };

            return (

              <button key={t} onClick={() => setTab(t)} className="neo-btn"

                style={{

                  padding: "10px 20px",

                  borderRadius: 12,

                  fontSize: 13,

                  fontWeight: 800,

                  border: "none",

                  cursor: "pointer",

                  background: N.bg,

                  color: tab === t ? N.accent : N.muted,

                  boxShadow: tab === t ? N.inset : N.raisedSm,

                  display: "flex",

                  alignItems: "center",

                  gap: 6

                }}>

                <span>{iconMap[t]}</span>

                <span style={{ textTransform: "capitalize" }}>{t.replace("_", " ")}</span>

              </button>

            );

          })}

        </div>

        {/* Tab Contents wrapper */}

        <div style={{ borderRadius: 24, padding: 32, background: N.bg, boxShadow: N.raised, minHeight: 280, display: "flex", flexDirection: "column", gap: 24 }}>

          {/* ── SETTINGS TAB ─── */}

          {tab === "settings" && (

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

               <div>

                 <h2 style={{ color: N.text, fontSize: 15, fontWeight: 900, margin: "0 0 6px" }}>⚙️ Global System Settings</h2>

                 <p style={{ color: N.muted, fontSize: 12, margin: 0, fontWeight: 600 }}>Configure active brand names and client support channels</p>

               </div>

               <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                 <div>

                   <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: N.muted, marginBottom: 8 }}>🏷️ Brand Site Name</label>

                   <input value={settings.siteName ?? "YoyoSMM"}

                     onChange={(e) => setSettings((p) => ({ ...p, siteName: e.target.value }))}

                     placeholder="YoyoSMM"

                     className="neo-input"

                     style={{

                       width: "100%",

                       padding: "14px 18px",

                       borderRadius: 12,

                       fontSize: 13,

                       fontWeight: 600,

                       color: N.text,

                       background: N.bg,

                       border: "none",

                       boxShadow: N.inset,

                       outline: "none",

                       boxSizing: "border-box"

                     }} />

                 </div>

                <div>

                  <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: N.muted, marginBottom: 8 }}>📧 Support Email</label>

                  <input value={settings.supportEmail ?? ""} onChange={(e) => setSettings((p) => ({ ...p, supportEmail: e.target.value }))}

                    placeholder="support@yoyosmm.online"

                    className="neo-input"

                    style={{

                      width: "100%",

                      padding: "14px 18px",

                      borderRadius: 12,

                      fontSize: 13,

                      fontWeight: 600,

                      color: N.text,

                      background: N.bg,

                      border: "none",

                      boxShadow: N.inset,

                      outline: "none",

                      boxSizing: "border-box"

                    }} />

                </div>

                <div style={{ borderTop: `1.5px solid ${N.border}`, paddingTop: 20 }}>

                  <h2 style={{ color: N.text, fontSize: 15, fontWeight: 900, margin: "0 0 6px" }}>🇮🇳 UPI Wallet Settings</h2>

                  <p style={{ color: N.muted, fontSize: 12, margin: "0 0 16px", fontWeight: 600 }}>Configuration for the manual UPI Deposit wallet system</p>

                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                  <div>

                    <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: N.muted, marginBottom: 8 }}>UPI ID / VPA</label>

                    <input value={settings.upiId ?? ""} onChange={(e) => setSettings((p) => ({ ...p, upiId: e.target.value }))}

                      placeholder="merchant@upi"

                      className="neo-input"

                      style={{

                        width: "100%",

                        padding: "14px 18px",

                        borderRadius: 12,

                        fontSize: 13,

                        fontWeight: 600,

                        color: N.text,

                        background: N.bg,

                        border: "none",

                        boxShadow: N.inset,

                        outline: "none",

                        boxSizing: "border-box"

                      }} />

                  </div>

                  <div>

                    <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: N.muted, marginBottom: 8 }}>UPI QR Code Image URL</label>

                    <input value={settings.upiQrCode ?? ""} onChange={(e) => setSettings((p) => ({ ...p, upiQrCode: e.target.value }))}

                      placeholder="https://imgur.com/myqrcode.png"

                      className="neo-input"

                      style={{

                        width: "100%",

                        padding: "14px 18px",

                        borderRadius: 12,

                        fontSize: 13,

                        fontWeight: 600,

                        color: N.text,

                        background: N.bg,

                        border: "none",

                        boxShadow: N.inset,

                        outline: "none",

                        boxSizing: "border-box"

                      }} />

                  </div>

                </div>

                <div>

                  <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: N.muted, marginBottom: 8 }}>🪙 Minimum Deposit Amount (INR)</label>

                  <input type="number" value={settings.minDeposit ?? 500} onChange={(e) => setSettings((p) => ({ ...p, minDeposit: parseFloat(e.target.value) || 0 }))}

                    placeholder="500"

                    className="neo-input"

                    style={{

                      width: "100%",

                      padding: "14px 18px",

                      borderRadius: 12,

                      fontSize: 13,

                      fontWeight: 600,

                      color: N.text,

                      background: N.bg,

                      border: "none",

                      boxShadow: N.inset,

                      outline: "none",

                      boxSizing: "border-box"

                    }} />

                </div>

                <div>

                  <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: N.muted, marginBottom: 8 }}>🕷️ Apify API Keys (Comma Separated)</label>

                  <input type="text" value={settings.apifyKeys ?? ""} onChange={(e) => setSettings((p) => ({ ...p, apifyKeys: e.target.value }))}

                    placeholder="apify_api_key1, apify_api_key2"

                    className="neo-input"

                    style={{ width: "100%", padding: "14px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600, color: N.text, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", boxSizing: "border-box" }} />

                </div>

                <div>

                  <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: N.muted, marginBottom: 8 }}>💎 USDT (TRC20) Wallet Address</label>

                  <input value={settings.trc20Address ?? ""} onChange={(e) => setSettings((p) => ({ ...p, trc20Address: e.target.value }))}

                    placeholder="T..."

                    className="neo-input"

                    style={{ width: "100%", padding: "14px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600, color: N.text, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", boxSizing: "border-box" }} />

                </div>

                <div>

                  <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: N.muted, marginBottom: 8 }}>💎 USDT (BEP20) Wallet Address</label>

                  <input value={settings.bep20Address ?? ""} onChange={(e) => setSettings((p) => ({ ...p, bep20Address: e.target.value }))}

                    placeholder="0x..."

                    className="neo-input"

                    style={{ width: "100%", padding: "14px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600, color: N.text, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", boxSizing: "border-box" }} />

                </div>

                <div>

                  <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: N.muted, marginBottom: 8 }}>💱 USDT Exchange Rate (in INR ₹)</label>

                  <input type="number" value={settings.priceUsdt ?? 90} onChange={(e) => setSettings((p) => ({ ...p, priceUsdt: parseFloat(e.target.value) || 90 }))}

                    placeholder="90"

                    className="neo-input"

                    style={{ width: "100%", padding: "14px 18px", borderRadius: 12, fontSize: 13, fontWeight: 600, color: N.text, background: N.bg, border: "none", boxShadow: N.inset, outline: "none", boxSizing: "border-box" }} />

                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 18, borderRadius: 12, background: N.bg, boxShadow: N.inset }}>

                  <input type="checkbox" id="maintenance" checked={settings.maintenanceMode}

                    onChange={(e) => setSettings((p) => ({ ...p, maintenanceMode: e.target.checked }))}

                    style={{ width: 18, height: 18, accentColor: N.accent, cursor: "pointer" }} />

                  <label htmlFor="maintenance" style={{ fontSize: 13, color: N.text, fontWeight: 700, cursor: "pointer" }}>🔧 Maintenance Mode (shows maintenance page to users)</label>

                </div>

              </div>

              <button onClick={saveSettings} className="neo-btn"

                style={{

                  alignSelf: "flex-start",

                  padding: "12px 28px",

                  borderRadius: 12,

                  fontSize: 13,

                  fontWeight: 850,

                  border: "none",

                  color: "#ffffff",

                  background: N.accentBg,

                  boxShadow: N.raisedSm,

                  cursor: "pointer"

                }}>

                Save Settings

              </button>

            </div>

          )}

          {/* ── USERS TAB ─── */}

          {tab === "users" && (

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              <div>

                <h2 style={{ color: N.text, fontSize: 15, fontWeight: 900, margin: "0 0 4px" }}>Platform Registered Users</h2>

                <p style={{ color: N.muted, fontSize: 12, margin: 0, fontWeight: 600 }}>Active registered operators and accounts: {users.length} (Showing: {displayedUsers.length})</p>

              </div>

              {/* Search & Filter Controls */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="🔍 Search user by name, email, or ID…"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  className="neo-input"
                  style={{
                    flex: 1,
                    minWidth: 260,
                    padding: "10px 14px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    color: N.text,
                    background: N.bg,
                    border: "none",
                    boxShadow: N.inset,
                    outline: "none"
                  }}
                />

                <select
                  value={userSort}
                  onChange={(e) => setUserSort(e.target.value)}
                  className="neo-input"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 700,
                    color: N.text,
                    background: N.bg,
                    border: "none",
                    boxShadow: N.raisedSm,
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value="newest">📅 Newest First</option>
                  <option value="oldest">📅 Oldest First</option>
                  <option value="balance_desc">💰 Highest Balance</option>
                  <option value="balance_asc">💸 Lowest Balance</option>
                  <option value="orders_desc">🚀 Most Campaigns</option>
                </select>

                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="neo-input"
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 700,
                    color: N.text,
                    background: N.bg,
                    border: "none",
                    boxShadow: N.raisedSm,
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value="all">👥 All Accounts ({users.length})</option>
                  <option value="wallet">💼 Wallet Mode Only</option>
                  <option value="lifetime">⚡ Lifetime VIPs</option>
                </select>
              </div>

              {displayedUsers.length === 0 ? (

                <div style={{ padding: "48px 0", textAlign: "center", color: N.muted, fontSize: 13, fontWeight: 700 }}>No matching users found</div>

              ) : (

                <div style={{ overflowX: "auto" }}>

                  <table style={{ width: "100%", borderCollapse: "collapse" }}>

                    <thead>

                      <tr style={{ borderBottom: `2px solid ${N.border}`, color: N.muted }}>

                        {["User / Email", "Joined", "Wallet", "Balance", "Deposited", "Spent", "Plan", "Panels", "Campaigns", "Actions"].map((h) => (

                          <th key={h} style={{ padding: "12px 8px", fontSize: 11, fontWeight: 800, textAlign: "left" }}>{h}</th>

                        ))}

                      </tr>

                    </thead>

                    <tbody>

                      {displayedUsers.map((u) => (

                        <tr key={u.id} className="hover-row" style={{ borderBottom: `1px solid ${N.border}`, transition: "background 0.2s" }}>

                          <td style={{ padding: "12px 8px", fontSize: 12, fontWeight: 700, color: N.text, minWidth: 180, wordBreak: "break-word" }}>
                            {u.name && <div style={{ fontSize: 13, fontWeight: 800, color: N.text }}>{u.name}</div>}
                            <div style={{ fontSize: u.name ? 11 : 12, color: u.name ? N.muted : N.text, fontWeight: 600 }}>{u.email}</div>
                          </td>

                          <td style={{ padding: "12px 8px", fontSize: 12, color: N.muted, fontWeight: 600 }}>{new Date(u.createdAt).toLocaleDateString()}</td>

                          {/* Wallet Mode Toggle */}
                          <td style={{ padding: "12px 8px" }}>
                            <button
                              onClick={() => userAction(u.id, "toggleWalletMode")}
                              className="neo-btn"
                              style={{
                                padding: "4px 8px",
                                borderRadius: 8,
                                border: "none",
                                background: u.walletMode ? "rgba(168,85,247,0.15)" : N.bg,
                                color: u.walletMode ? "#a855f7" : N.muted,
                                fontSize: 11,
                                fontWeight: 800,
                                boxShadow: N.raisedSm,
                                cursor: "pointer",
                                wordBreak: "break-word"
                              }}
                            >
                              {u.walletMode ? "✓ Wallet ON" : "Wallet OFF"}
                            </button>
                          </td>

                          {/* Wallet Balance Edit */}
                          <td style={{ padding: "12px 8px", wordBreak: "break-word" }}>
                            {u.walletMode ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 800, color: "#16a34a" }}>
                                  ₹ {(u.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                                <button
                                  onClick={() => {
                                    const newBal = prompt(`Enter new balance for ${u.email}:`, String(u.balance ?? 0));
                                    if (newBal !== null && !isNaN(Number(newBal))) {
                                      userAction(u.id, "updateBalance", { balance: Number(newBal) });
                                    }
                                  }}
                                  className="neo-btn"
                                  style={{
                                    border: "none",
                                    background: N.bg,
                                    padding: "3px 6px",
                                    borderRadius: 6,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: N.accent,
                                    boxShadow: N.raisedSm,
                                    cursor: "pointer"
                                  }}
                                >
                                  Edit
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: N.muted, fontWeight: 600 }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: "12px 8px", fontSize: 12, fontWeight: 700, color: "#16a34a", wordBreak: "break-word" }}>
                            ₹ {((u as any).totalDepositedInr || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}<br/>
                            {((u as any).totalDepositedUsdt > 0) && <span style={{ fontSize: 10, color: N.muted }}>$ {((u as any).totalDepositedUsdt).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>}
                          </td>
                          <td style={{ padding: "12px 8px", fontSize: 12, fontWeight: 700, color: N.accent, wordBreak: "break-word" }}>
                            ₹ {((u as any).totalSpent || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "12px 8px" }}>
                            <span style={{ fontSize: 10, fontWeight: 850, padding: "4px 8px", borderRadius: 6, background: PLAN_COLORS[u.plan] + "1A", color: PLAN_COLORS[u.plan] }}>{u.plan}</span>
                          </td>
                          <td style={{ padding: "12px 8px", fontSize: 12, fontWeight: 700, color: N.text, textAlign: "center" }}>{u._count?.panels ?? 0}</td>
                          <td style={{ padding: "12px 8px", fontSize: 12, fontWeight: 700, color: N.text, textAlign: "center" }}>{u._count?.orders ?? 0}</td>
                          <td style={{ padding: "12px 8px" }}>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minWidth: 220 }}>

                              {u.plan !== "LIFETIME" && (

                                <button onClick={() => userAction(u.id, "upgrade")} className="neo-btn"

                                  style={{ border: "none", background: N.bg, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#16a34a", boxShadow: N.raisedSm }}>

                                  Upgrade Lifetime

                                </button>

                              )}

                              {u.plan !== "SUSPENDED" ? (

                                <button onClick={() => userAction(u.id, "suspend")} className="neo-btn"

                                  style={{ border: "none", background: N.bg, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#dc2626", boxShadow: N.raisedSm }}>

                                  Suspend

                                </button>

                              ) : (

                                <button onClick={() => userAction(u.id, "unsuspend")} className="neo-btn"

                                  style={{ border: "none", background: N.bg, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: N.accent, boxShadow: N.raisedSm }}>

                                  Unsuspend

                                </button>

                              )}

                                                            <button onClick={() => openUserHistory(u)} className="neo-btn"
                                style={{ border: "none", background: N.bg, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#16a34a", boxShadow: N.raisedSm }}>
                                History
                              </button>
<button onClick={() => impersonateUser(u.id)} className="neo-btn"

                                style={{ border: "none", background: N.bg, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#2563eb", boxShadow: N.raisedSm }}>

                                Login As

                              </button>

                            </div>

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

          )}

          {/* ── PAYMENTS TAB ─── */}

          {tab === "payments" && (

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              <div>

                <h2 style={{ color: N.text, fontSize: 15, fontWeight: 900, margin: "0 0 4px" }}>Crypto Payments Log</h2>

                <p style={{ color: N.muted, fontSize: 12, margin: 0, fontWeight: 600 }}>Lifetime subscription deposits on USDT-TRC20 & BEP20 networks</p>

              </div>

              {payments.length === 0 ? (

                <div style={{ padding: "48px 0", textAlign: "center", color: N.muted, fontSize: 13, fontWeight: 700 }}>No payments found</div>

              ) : (

                <div style={{ overflowX: "auto", margin: "0 -32px" }}>

                  <table style={{ width: "100%", borderCollapse: "collapse" }}>

                    <thead>

                      <tr style={{ borderBottom: `2px solid ${N.border}`, color: N.muted }}>

                        {["User", "Network", "Transaction Hash / TXID", "Amount", "Status", "Date", "Actions"].map((h) => (

                          <th key={h} style={{ padding: "10px 12px", fontSize: 12, fontWeight: 800, textAlign: "left" }}>{h}</th>

                        ))}

                      </tr>

                    </thead>

                    <tbody>

                      {payments.map((p) => {

                        const statusColors: Record<string, string> = { CONFIRMED: "#16a34a", PENDING: "#d97706", FAILED: "#dc2626", VERIFYING: "#2563eb", REJECTED: "#dc2626" };

                        return (

                          <tr key={p.id} className="hover-row" style={{ borderBottom: `1px solid ${N.border}`, transition: "background 0.2s" }}>

                            <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: N.text }}>{p.user?.email}</td>

                            <td style={{ padding: "10px 12px" }}>

                              <span style={{

                                fontSize: 11,

                                fontWeight: 800,

                                padding: "4px 8px",

                                borderRadius: 6,

                                background: p.network === "TRC20" ? "rgba(37,99,235,0.08)" : "rgba(217,119,6,0.08)",

                                color: p.network === "TRC20" ? "#2563eb" : "#d97706"

                              }}>{p.network}</span>

                            </td>

                            <td style={{ padding: "10px 12px" }}>

                              <code style={{ fontSize: 12, fontWeight: 700, color: N.accent }}>{p.txHash ? `${p.txHash.slice(0, 20)}…` : "—"}</code>

                            </td>

                            <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 900, color: N.text }}>{p.amountUsdt ? `$${p.amountUsdt} USDT` : "—"}</td>

                            <td style={{ padding: "10px 12px" }}>

                              <strong style={{ fontSize: 12, color: statusColors[p.status] ?? N.muted }}>{p.status}</strong>

                            </td>

                            <td style={{ padding: "10px 12px", fontSize: 12, color: N.muted, fontWeight: 600 }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                            <td style={{ padding: "10px 12px" }}>
                              {(p.status === "PENDING" || p.status === "VERIFYING") ? (
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button onClick={() => {
                                    const usdt = p.amountUsdt ?? 10;
                                    const rate = settings.priceUsdt && settings.priceUsdt > 50 ? settings.priceUsdt : 90;
                                    const defaultInr = Math.round(usdt * rate);
                                    const input = prompt(`Enter INR amount to credit for $${usdt} USDT (Rate: ₹${rate}/USDT):`, String(defaultInr));
                                    if (input !== null) {
                                      const val = parseFloat(input);
                                      if (!isNaN(val) && val > 0) {
                                        handleCryptoAction(p.id, "approve", val);
                                      } else {
                                        alert("Invalid INR amount");
                                      }
                                    }
                                  }} className="neo-btn" style={{ padding: "6px 12px", borderRadius: 8, background: "#16a34a", color: "#fff", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 800 }}>✓ Approve</button>
                                  <button onClick={() => {
                                    const reason = prompt("Enter rejection reason:", "Invalid TXID / Payment not received");
                                    if (reason !== null) handleCryptoAction(p.id, "reject", undefined, reason);
                                  }} className="neo-btn" style={{ padding: "6px 12px", borderRadius: 8, background: "#dc2626", color: "#fff", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 800 }}>✗ Reject</button>
                                </div>
                              ) : (
                                <span style={{ fontSize: 11, color: N.muted, fontWeight: 700 }}>—</span>
                              )}
                            </td>

                          </tr>

                        );

                      })}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

          )}

          {/* ── UPI PAYMENTS TAB ─── */}

          {tab === "upi_payments" && (

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              <div>

                <h2 style={{ color: N.text, fontSize: 15, fontWeight: 900, margin: "0 0 4px" }}>UPI Deposit Requests</h2>

                <p style={{ color: N.muted, fontSize: 12, margin: 0, fontWeight: 600 }}>Verify manual UPI payment deposits via UTR numbers submitted by users</p>

              </div>

              {upiPayments.length === 0 ? (

                <div style={{ padding: "48px 0", textAlign: "center", color: N.muted, fontSize: 13, fontWeight: 700 }}>No UPI deposit requests found</div>

              ) : (

                <div style={{ overflowX: "auto", margin: "0 -32px" }}>

                  <table style={{ width: "100%", borderCollapse: "collapse" }}>

                    <thead>

                      <tr style={{ borderBottom: `2px solid ${N.border}`, color: N.muted }}>

                        {["User Email", "Amount (₹)", "UTR Number", "Status", "Date", "Actions"].map((h) => (

                          <th key={h} style={{ padding: "10px 12px", fontSize: 12, fontWeight: 800, textAlign: "left" }}>{h}</th>

                        ))}

                      </tr>

                    </thead>

                    <tbody>

                      {upiPayments.map((p) => {

                        const statusColors: Record<string, string> = { CONFIRMED: "#16a34a", PENDING: "#d97706", REJECTED: "#dc2626" };

                        return (

                          <tr key={p.id} className="hover-row" style={{ borderBottom: `1px solid ${N.border}`, transition: "background 0.2s" }}>

                            <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: N.text }}>{p.user?.email}</td>

                            <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 800, color: p.amount < (settings.minDeposit ?? 500) ? "#dc2626" : "#16a34a" }}>
                              ₹ {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              {p.amount < (settings.minDeposit ?? 500) && (
                                <span style={{ display: "block", fontSize: 9, color: "#dc2626", fontWeight: 900 }}>⚠️ BELOW MIN (NO REFUND)</span>
                              )}
                            </td>

                            <td style={{ padding: "10px 12px", fontSize: 12, fontWeight: 800, fontFamily: "monospace", color: N.accent }}>{p.utr}</td>

                            <td style={{ padding: "10px 12px" }}>

                              <span style={{

                                fontSize: 10,

                                fontWeight: 850,

                                padding: "4px 8px",

                                borderRadius: 6,

                                background: statusColors[p.status] + "1A",

                                color: statusColors[p.status]

                              }}>{p.status}</span>

                            </td>

                            <td style={{ padding: "10px 12px", fontSize: 12, color: N.muted, fontWeight: 600 }}>{new Date(p.createdAt).toLocaleString()}</td>

                            <td style={{ padding: "10px 12px" }}>

                              {p.status === "PENDING" ? (

                                <div style={{ display: "flex", gap: 8 }}>

                                  <button onClick={() => handleUpiAction(p.id, "approve")} className="neo-btn"

                                    style={{ border: "none", background: N.bg, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 850, color: "#16a34a", boxShadow: N.raisedSm, cursor: "pointer" }}>

                                    ✓ Approve

                                  </button>

                                  <button onClick={() => {

                                    const reason = prompt("Enter rejection reason:", "Invalid UTR number");

                                    if (reason !== null) handleUpiAction(p.id, "reject", reason);

                                  }} className="neo-btn"

                                    style={{ border: "none", background: N.bg, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 850, color: "#dc2626", boxShadow: N.raisedSm, cursor: "pointer" }}>

                                    ✗ Reject

                                  </button>

                                </div>

                              ) : (

                                <span style={{ fontSize: 11, color: N.muted, fontWeight: 700 }}>No actions</span>

                              )}

                            </td>

                          </tr>

                        );

                      })}

                    </tbody>

                  </table>

                </div>

              )}

            </div>

          )}

          {/* ── ADMIN SMM PANELS TAB ─── */}

          {tab === "admin_panels" && (

            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

              {/* Section 1: Admin panels CRUD */}

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                <div>

                  <h2 style={{ color: N.text, fontSize: 15, fontWeight: 900, margin: "0 0 4px" }}>🚀 SMM API Integrations (Admin-owned)</h2>

                  <p style={{ color: N.muted, fontSize: 12, margin: 0, fontWeight: 600 }}>These panels process campaigns automatically for wallet-mode users</p>

                </div>

                <div style={{ display: "flex", gap: 12, borderBottom: `1px solid ${N.border}`, paddingBottom: 16 }}>
                  <button onClick={() => setPanelSubTab("defaults")} style={{ background: panelSubTab === "defaults" ? N.accentBg : "transparent", color: panelSubTab === "defaults" ? "#fff" : N.muted, border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>⚙️ Default Configurations</button>
                  <button onClick={() => setPanelSubTab("accounts")} style={{ background: panelSubTab === "accounts" ? N.accentBg : "transparent", color: panelSubTab === "accounts" ? "#fff" : N.muted, border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>🔑 API Keys & Accounts</button>
                </div>

                {panelSubTab === "defaults" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, background: N.inset, padding: 18, borderRadius: 18 }}>
                      <div>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: N.accent }}>⚙️ Global SMM Provider Service Mapping & Pricing</p>
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: N.muted, fontWeight: 600 }}>Configure default service IDs & custom markup prices once — auto-applies across all connected API keys!</p>
                      </div>
                      {adminPanels.length > 0 && (
                        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: N.text }}>🌐 Provider API:</span>
                          <select
                            value={selectedPanelId || adminPanels[0]?.id || ""}
                            onChange={e => handleLoadServices(e.target.value)}
                            style={{ padding: "10px 16px", borderRadius: 12, fontSize: 12, background: N.bg, border: "none", color: N.text, fontWeight: 800, cursor: "pointer", outline: "none", boxShadow: N.raisedSm }}
                          >
                            {Array.from(new Set(adminPanels.map(p => p.apiUrl))).map(apiUrl => {
                              const panelsForUrl = adminPanels.filter(p => p.apiUrl === apiUrl);
                              const p = panelsForUrl[0];
                              return <option key={p.id} value={p.id}>{apiUrl} ({panelsForUrl.length} active keys connected)</option>;
                            })}
                          </select>
                          <button onClick={() => handleLoadServices(selectedPanelId || adminPanels[0]?.id || "")} style={{ padding: "10px 16px", borderRadius: 12, background: N.accentBg, color: "#fff", border: "none", fontWeight: 800, cursor: "pointer", boxShadow: N.raisedSm }}>
                            🔄 Reload API Services
                          </button>
                        </div>
                      )}
                    </div>

                    {adminPanels.length === 0 ? (
                      <div style={{ padding: "40px", textAlign: "center", border: `2px dashed ${N.border}`, borderRadius: 20, color: N.muted, fontSize: 13, fontWeight: 700 }}>
                        No SMM API panels added yet. Switch to "🔑 API Keys & Accounts" tab to add your first Yoyomedia API key!
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {selectedPanelId && (

                <div style={{ display: "flex", flexDirection: "column", gap: 20, borderTop: `1.5px solid ${N.border}`, paddingTop: 24 }}>

                  <div>

                    <h2 style={{ color: N.text, fontSize: 15, fontWeight: 900, margin: "0 0 4px" }}>

                      Configure Custom Pricing for: <strong style={{ color: N.accent }}>{adminPanels.find(p => p.id === selectedPanelId)?.name}</strong>

                    </h2>

                    <p style={{ color: N.muted, fontSize: 12, margin: 0, fontWeight: 600 }}>Map SMM Panel service IDs to user delivery types and define markup rates</p>

                  </div>

                  <div style={{ padding: 16, borderRadius: 16, background: "rgba(168, 85, 247, 0.06)", border: `1.5px solid rgba(168, 85, 247, 0.3)`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: N.accent }}>
                        ⚡ Provider Auto-Sync Active ({adminPanels.find(p => p.id === selectedPanelId)?.apiUrl})
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 11, color: N.muted, fontWeight: 600 }}>
                        Setting default service IDs and markup prices here automatically applies to all linked API keys for this SMM provider!
                      </p>
                    </div>
                    <button
                      onClick={handleSyncAllServices}
                      disabled={syncingAll}
                      style={{
                        padding: "10px 18px",
                        borderRadius: 12,
                        background: N.accent,
                        color: "#fff",
                        fontSize: 12,
                        fontWeight: 800,
                        border: "none",
                        cursor: syncingAll ? "not-allowed" : "pointer",
                        boxShadow: "0 4px 12px rgba(168, 85, 247, 0.3)"
                      }}
                    >
                      {syncingAll ? "Syncing..." : "🔄 Sync All API Keys Now"}
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>

                    {/* Left Panel: Pricing configuration form */}

                    <div style={{ borderRadius: 16, padding: 20, background: N.bg, boxShadow: N.inset, display: "flex", flexDirection: "column", gap: 14 }}>

                      <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: N.accent }}>⚙️ Set Service Price</p>

                      <div>

                        <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: N.muted, marginBottom: 6 }}>1. Select Platform</label>

                        <select value={pricingPlatform} onChange={e => setPricingPlatform(e.target.value)}

                          style={{ width:"100%", padding:"10px 14px", borderRadius:10, fontSize:12, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow: N.raisedSm, cursor: "pointer", fontWeight: 700 }}>

                          <option value="INSTAGRAM">Instagram</option>

                          <option value="TIKTOK">TikTok</option>

                          <option value="FACEBOOK">Facebook</option>

                        </select>

                      </div>

                      <div>

                        <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: N.muted, marginBottom: 6 }}>2. Select Action Type</label>

                        <select value={pricingType} onChange={e => setPricingType(e.target.value)}

                          style={{ width:"100%", padding:"10px 14px", borderRadius:10, fontSize:12, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow: N.raisedSm, cursor: "pointer", fontWeight: 700 }}>

                          <option value="views">Views</option>

                          <option value="reach_impressions_views">Instagram Reach, Impressions & Views [Special ⭐]</option>

                          <option value="likes">Likes</option>

                          <option value="saves">Saves</option>

                          <option value="shares">Shares</option>
                          <option value="reposts">Instagram Reposts ⭐</option>

                          <option value="comments">Comments</option>

                        </select>

                      </div>

                      <div>

                        <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: N.muted, marginBottom: 6 }}>3. Choose SMM Service ID &amp; Original Rate (from SMM API)</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10, marginTop: 4 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                              value={serviceSearch}
                              onChange={e => setServiceSearch(e.target.value)}
                              placeholder="🔍 Search services by ID, name, or category..."
                              style={{ flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 11, background: N.inset, border: "none", color: N.text, outline: "none", fontWeight: 600 }}
                            />
                            <button
                              type="button"
                              onClick={() => setServicePlatformFilter(!servicePlatformFilter)}
                              style={{
                                padding: "8px 14px",
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 800,
                                border: "none",
                                cursor: "pointer",
                                background: servicePlatformFilter ? N.accentBg : N.inset,
                                color: servicePlatformFilter ? "#fff" : N.text,
                                wordBreak: "break-word",
                                boxShadow: servicePlatformFilter ? N.raisedSm : "none"
                              }}
                            >
                              {servicePlatformFilter ? `🎯 Filtered (${pricingPlatform}) — Click for ALL Services` : "🌐 Showing ALL API Services (Unfiltered)"}
                            </button>
                          </div>
                        </div>

                        {isManualInput || (!fetchingServices && liveServices.length === 0) ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div style={{ display: "flex", gap: 10 }}>
                              <input value={pricingServiceId} onChange={e => {
                                const val = e.target.value;
                                setPricingServiceId(val);
                                const selected = liveServices.find(s => String(s.service) === val.trim());
                                if (selected) {
                                  setPricingOriginalRate(String(selected.rate || ""));
                                  setPricingName(selected.name ?? "");
                                  setPricingMin(String(selected.min ?? ""));
                                  setPricingMax(String(selected.max ?? ""));
                                  if (pricingMultiplier) {
                                    handleMultiplierChange(pricingMultiplier, String(selected.rate || ""));
                                  }
                                }
                              }} placeholder="Service ID (e.g. 1042)"
                                style={{ flex:1, padding:"10px 14px", borderRadius:10, fontSize:12, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow: N.raisedSm, fontWeight: 800 }} />

                              <input type="number" step="0.000001" value={pricingOriginalRate} onChange={e => setPricingOriginalRate(e.target.value)} placeholder="Cost Rate per 1k"
                                style={{ width: 130, padding:"10px 14px", borderRadius:10, fontSize:12, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow: N.raisedSm, fontWeight: 800 }} />
                            </div>
                            
                            <input value={pricingName} onChange={e => setPricingName(e.target.value)} placeholder="Service Name (Optional reference)"
                              style={{ width:"100%", padding:"10px 14px", borderRadius:10, fontSize:12, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow: N.raisedSm, fontWeight: 800 }} />
                            
                            {!fetchingServices && liveServices.length > 0 && (
                              <button type="button" onClick={() => setIsManualInput(false)}
                                style={{ alignSelf: "flex-start", background: "none", border: "none", color: N.accent, fontSize: 11, fontWeight: 800, cursor: "pointer", padding: "4px 8px" }}>
                                🌐 Switch back to SMM API Dropdown List
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                              {fetchingServices ? (
                                <span style={{ fontSize: 11, color: N.muted, fontWeight: 700, animation: "pulse 1.5s infinite" }}>
                                  ⏳ Loading {pricingPlatform} services from API...
                                </span>
                              ) : (
                                <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>
                                  ✅ loaded {liveServices.length} services from API
                                </span>
                              )}
                              <button type="button" onClick={() => setIsManualInput(true)}
                                style={{ padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 900, border: `1.5px dashed ${N.accent}`, background: "transparent", color: N.accent, cursor: "pointer" }}>
                                ⌨️ Type ID Manually
                              </button>
                            </div>

                            <select value={pricingServiceId} onChange={e => {
                              const val = e.target.value;
                              setPricingServiceId(val);
                              const selected = liveServices.find(s => String(s.service) === val);
                              if (selected) {
                                setPricingOriginalRate(selected.rate);
                                setPricingName(selected.name ?? "");
                                setPricingMin(selected.min ?? "");
                                setPricingMax(selected.max ?? "");
                                if (pricingMultiplier) {
                                  handleMultiplierChange(pricingMultiplier, selected.rate);
                                }
                              }
                            }}
                              style={{ width:"100%", padding:"10px 14px", borderRadius:10, fontSize:12, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow: N.raisedSm, cursor: "pointer", fontWeight: 800 }}>
                              <option value="">-- Select Service from API --</option>
                              {liveServices.filter(s => {
                                if (serviceSearch) {
                                  const q = serviceSearch.toLowerCase();
                                  const match = String(s.service).includes(q) || String(s.name || "").toLowerCase().includes(q) || String(s.category || "").toLowerCase().includes(q);
                                  if (!match) return false;
                                }
                                if (servicePlatformFilter && pricingPlatform) {
                                  const p = pricingPlatform.toLowerCase();
                                  const kwMap: Record<string, string[]> = {
                                    instagram: ["instagram", "ig", "insta", "reels"],
                                    tiktok: ["tiktok", "tt", "tok"],
                                    youtube: ["youtube", "yt", "shorts"],
                                    telegram: ["telegram", "tg"],
                                    facebook: ["facebook", "fb"],
                                    twitter: ["twitter", " x ", "retweet"],
                                  };
                                  const kws = kwMap[p] || [p];
                                  const platMatch = kws.some(kw => String(s.name || "").toLowerCase().includes(kw) || String(s.category || "").toLowerCase().includes(kw));
                                  const anyPlatExists = liveServices.some(x => kws.some(kw => String(x.name || "").toLowerCase().includes(kw) || String(x.category || "").toLowerCase().includes(kw)));
                                  if (!platMatch && anyPlatExists) {
                                    return false;
                                  }
                                }
                                return true;
                              }).map(s => (
                                <option key={s.service} value={s.service}>
                                  #{s.service} - {s.name?.slice(0, 50)} (Cost: ${s.rate}/1k | Min: {s.min})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                      </div>

                      {pricingOriginalRate && (

                        <div style={{ padding: 14, borderRadius: 12, background: "rgba(168, 85, 247, 0.04)", border: `1.5px solid ${N.border}`, display: "flex", flexDirection: "column", gap: 12 }}>

                          <p style={{ fontSize: 11, color: N.muted, margin: 0, fontWeight: 700 }}>

                            💵 Original Cost: <strong style={{ color: N.text }}>${pricingOriginalRate} per 1k</strong>

                            <span style={{ marginLeft: 8, color: "#16a34a" }}>

                              (~ ₹{(parseFloat(pricingOriginalRate) * 83).toFixed(2)} per 1k)

                            </span>

                          </p>

                          {pricingMin && (

                            <p style={{ fontSize: 10, color: N.muted, margin: 0, fontWeight: 700, marginTop: 4 }}>

                              📦 SMM Service Limits: Min Order: <strong style={{ color: N.text }}>{pricingMin}</strong> | Max Order: <strong style={{ color: N.text }}>{pricingMax}</strong>

                            </p>

                          )}

                          <div>

                            <label style={{ display: "block", fontSize: 10, fontWeight: 900, color: N.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>⚡ Apply Multiplier Markup</label>

                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>

                              {[2, 3, 5, 10].map(factor => (

                                <button key={factor} type="button" onClick={() => handleMultiplierChange(String(factor))}

                                  style={{

                                    padding: "6px 12px",

                                    borderRadius: 6,

                                    border: pricingMultiplier === String(factor) ? "1.5px solid #a855f7" : `1px solid ${N.border}`,

                                    background: pricingMultiplier === String(factor) ? "rgba(168, 85, 247, 0.15)" : N.bg,

                                    color: pricingMultiplier === String(factor) ? "#a855f7" : N.text,

                                    fontSize: 10,

                                    fontWeight: 900,

                                    cursor: "pointer",

                                    transition: "all 0.15s ease"

                                  }}>

                                  {factor}x Markup

                                </button>

                              ))}

                              <button type="button" onClick={() => { setPricingMultiplier(""); setPricingCustomRate(""); }}

                                style={{

                                  padding: "6px 12px",

                                  borderRadius: 6,

                                  border: `1px solid ${N.border}`,

                                  background: N.bg,

                                  color: N.muted,

                                  fontSize: 10,

                                  fontWeight: 900,

                                  cursor: "pointer"

                                }}>

                                Clear

                              </button>

                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

                              <span style={{ fontSize: 11, color: N.muted, fontWeight: 700 }}>Custom Factor:</span>

                              <input type="number" step="0.5" placeholder="e.g. 3.5" value={pricingMultiplier} onChange={e => handleMultiplierChange(e.target.value)}

                                style={{ width: 80, padding: "6px 10px", borderRadius: 8, fontSize: 11, background: N.bg, border: "none", color: N.text, outline: "none", boxShadow: N.raisedSm, fontWeight: 700 }} />

                              <span style={{ fontSize: 11, color: N.muted, fontWeight: 700 }}>x base cost</span>

                            </div>

                          </div>

                        </div>

                      )}

                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: N.muted, marginBottom: 6 }}>4. Minimum Order Limit (Supplier Min Qty)</label>
                        <input type="number" step="1" placeholder="e.g. 10 or 100" value={pricingMin} onChange={e => setPricingMin(e.target.value)}
                          style={{ width:"100%", padding:"10px 14px", borderRadius:10, fontSize:12, background:N.bg, border:"none", outline:"none", boxShadow: N.raisedSm, fontWeight: 800, color: N.text }} />
                        <p style={{ fontSize: 10, color: N.muted, margin: "4px 0 0", fontWeight: 600 }}>Orders below this quantity will be blocked or omitted to prevent API errors.</p>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: N.muted, marginBottom: 6 }}>5. Final Custom Rate Charged to Users (INR per 1,000)</label>

                        <input type="number" step="0.1" placeholder="e.g. 20.0" value={pricingCustomRate} onChange={e => {

                          setPricingCustomRate(e.target.value);

                          setPricingMultiplier("");

                        }}

                          style={{ width:"100%", padding:"10px 14px", borderRadius:10, fontSize:12, background:N.bg, border:"none", outline:"none", boxShadow: N.raisedSm, fontWeight: 800, color: "#16a34a" }} />

                      </div>

                      {/* 6. Fallback Services configuration */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: `1px solid ${N.border}`, paddingTop: 14, marginTop: 4 }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: N.muted, marginBottom: 2 }}>
                          🛡️ 6. Fallback SMM Backup Services ({pricingFallbacks.length})
                        </label>
                        <p style={{ fontSize: 10, color: N.muted, margin: "0 0 6px", fontWeight: 600 }}>
                          Configure backup SMM service IDs. If the primary service fails, the PACING engine will automatically fall back to these IDs.
                        </p>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, background: N.bg, padding: 12, borderRadius: 12, border: `1.5px dashed ${N.border}`, boxShadow: N.inset }}>
                          {pricingFallbacks.map((fb: any, idx: number) => (
                            <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <input
                                value={fb.serviceId}
                                onChange={e => {
                                  const val = e.target.value;
                                  const updated = [...pricingFallbacks];
                                  updated[idx].serviceId = val;
                                  // Auto-lookup in liveServices
                                  const liveMatch = liveServices.find(x => String(x.service) === val.trim());
                                  if (liveMatch) {
                                    updated[idx].originalRate = String(liveMatch.rate || "");
                                    updated[idx].customRate = String(parseFloat((parseFloat(liveMatch.rate) * 96 * 5).toFixed(6)));
                                    updated[idx].name = liveMatch.name || "";
                                  }
                                  setPricingFallbacks(updated);
                                }}
                                placeholder="Backup ID"
                                style={{ width: 85, padding: "8px 10px", borderRadius: 8, fontSize: 11, background: N.inset, border: "none", color: N.text, outline: "none", fontWeight: 700 }}
                              />
                              <input
                                type="number"
                                step="0.000001"
                                value={fb.originalRate}
                                onChange={e => {
                                  const updated = [...pricingFallbacks];
                                  updated[idx].originalRate = e.target.value;
                                  // Auto calculate custom rate = original rate * 96 * 5
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val)) {
                                    updated[idx].customRate = String(parseFloat((val * 96 * 5).toFixed(6)));
                                  }
                                  setPricingFallbacks(updated);
                                }}
                                placeholder="Cost rate"
                                style={{ width: 95, padding: "8px 10px", borderRadius: 8, fontSize: 11, background: N.inset, border: "none", color: N.text, outline: "none", fontWeight: 700 }}
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={fb.customRate}
                                onChange={e => {
                                  const updated = [...pricingFallbacks];
                                  updated[idx].customRate = e.target.value;
                                  setPricingFallbacks(updated);
                                }}
                                placeholder="Custom ₹"
                                style={{ width: 95, padding: "8px 10px", borderRadius: 8, fontSize: 11, background: N.inset, border: "none", color: "#16a34a", outline: "none", fontWeight: 700 }}
                              />
                              <input
                                value={fb.name}
                                onChange={e => {
                                  const updated = [...pricingFallbacks];
                                  updated[idx].name = e.target.value;
                                  setPricingFallbacks(updated);
                                }}
                                placeholder="Description (Optional)"
                                style={{ flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 11, background: N.inset, border: "none", color: N.text, outline: "none", fontWeight: 600 }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setPricingFallbacks(pricingFallbacks.filter((_: any, i: number) => i !== idx));
                                }}
                                style={{ background: "none", border: "none", color: "#dc2626", fontWeight: 900, cursor: "pointer", padding: "0 6px", fontSize: 13 }}
                              >
                                ✕
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => setPricingFallbacks([...pricingFallbacks, { serviceId: "", originalRate: "", customRate: "", name: "" }])}
                            style={{ alignSelf: "flex-start", border: `1.2px dashed ${N.accent}`, background: "rgba(168, 85, 247, 0.04)", color: N.accent, padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 800, cursor: "pointer", transition: "all 0.15s ease" }}
                          >
                            ➕ Add Fallback Backup Service
                          </button>
                        </div>
                      </div>

                      <button onClick={handleSaveServicePrice} disabled={savingService} className="neo-btn"
                        style={{ alignSelf: "flex-start", padding: "10px 24px", borderRadius: 10, fontSize: 12, fontWeight: 850, border: "none", color: "#ffffff", background: N.accentBg, boxShadow: N.raisedSm, cursor: "pointer", opacity: savingService ? 0.5 : 1, marginTop: 10 }}>
                        {savingService ? "Saving configuration…" : "Save Custom Pricing"}
                      </button>

                    </div>

                    {/* Right Panel: Currently saved pricing list */}

                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                      <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: N.muted }}>Currently Configured Markup Prices (Click any card to edit)</p>

                      {savedServices.length === 0 ? (

                        <div style={{ padding: "32px", textAlign: "center", border: `1.5px dashed ${N.border}`, borderRadius: 16, color: N.muted, fontSize: 12, fontWeight: 700 }}>

                          No custom pricing configured for this panel yet.<br/><span style={{ fontSize: 11 }}>Setup pricing to let wallet users order.</span>

                        </div>

                      ) : (

                        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 420, overflowY: "auto" }}>

                          {savedServices.map(s => (

                            <div key={s.id} onClick={() => {
                              setPricingPlatform(s.platform || "instagram");
                              setPricingType(s.type || "views");
                              setPricingServiceId(String(s.serviceId || ""));
                              setPricingOriginalRate(String(s.originalRate || ""));
                              setPricingCustomRate(String(s.customRate || ""));
                              setPricingName(s.name || "");
                              setPricingMin(String(s.minQuantity ?? 10));

                              let fallbacks: any[] = [];
                              if (s.fallbackServiceIds) {
                                try {
                                  const parsed = typeof s.fallbackServiceIds === "string" 
                                    ? JSON.parse(s.fallbackServiceIds) 
                                    : s.fallbackServiceIds;
                                  if (Array.isArray(parsed)) {
                                    fallbacks = parsed.map(item => {
                                      if (typeof item === "object" && item !== null) {
                                        const sId = String(item.serviceId || "");
                                        const liveMatch = liveServices.find(x => String(x.service) === sId);
                                        return {
                                          serviceId: sId,
                                          originalRate: item.originalRate ? String(item.originalRate) : (liveMatch ? String(liveMatch.rate || "") : ""),
                                          customRate: item.customRate ? String(item.customRate) : (liveMatch ? String(parseFloat((parseFloat(liveMatch.rate) * 96 * 5).toFixed(6))) : ""),
                                          name: item.name ? String(item.name) : (liveMatch ? (liveMatch.name || "") : "")
                                        };
                                      } else {
                                        const sId = String(item || "");
                                        const liveMatch = liveServices.find(x => String(x.service) === sId);
                                        return {
                                          serviceId: sId,
                                          originalRate: liveMatch ? String(liveMatch.rate || "") : "",
                                          customRate: liveMatch ? String(parseFloat((parseFloat(liveMatch.rate) * 96 * 5).toFixed(6))) : "",
                                          name: liveMatch ? (liveMatch.name || "") : ""
                                        };
                                      }
                                    });
                                  }
                                } catch (e) {
                                  console.error("Failed to parse fallbacks", e);
                                }
                              }
                              setPricingFallbacks(fallbacks);
                            }} style={{ padding: 12, borderRadius: 12, background: N.bg, boxShadow: N.raisedSm, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", border: pricingServiceId === String(s.serviceId) && pricingType === s.type ? `1.5px solid ${N.accent}` : "none", transition: "all 0.2s" }} title="Click to edit this service configuration">

                              <div>

                                <span style={{ fontSize: 10, fontWeight: 850, padding: "2px 6px", borderRadius: 4, background: "rgba(168,85,247,0.08)", color: "#a855f7", textTransform: "uppercase" }}>{s.platform}</span>

                                <span style={{ fontSize: 10, fontWeight: 850, padding: "2px 6px", borderRadius: 4, background: "rgba(217,70,239,0.08)", color: "#d946ef", textTransform: "uppercase", marginLeft: 6 }}>{s.type}</span>

                                <p style={{ fontSize: 11, color: N.muted, margin: "4px 0 0" }}>Service ID: #{s.serviceId} {s.name ? `(${s.name.slice(0, 25)}…)` : ""}</p>

                                <p style={{ fontSize: 10, color: N.muted, margin: "2px 0 0" }}>Base Cost: ${s.originalRate}/1k | Min Qty: <strong style={{ color: N.text }}>{s.minQuantity ?? 10}</strong></p>

                              </div>

                              <div style={{ textAlign: "right" }}>

                                <span style={{ fontSize: 14, fontWeight: 900, color: "#16a34a" }}>₹ {s.customRate}/1k</span>

                              </div>

                            </div>

                          ))}

                        </div>

                      )}

                    </div>

                  </div>

                </div>

              )}
                      </div>
                    )}
                  </div>
                )}

                {panelSubTab === "accounts" && (
                  <>
{/* Form to add admin panel */}

                <div style={{ borderRadius: 16, padding: 20, background: N.bg, boxShadow: N.inset, display: "flex", flexDirection: "column", gap: 14 }}>

                  <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: N.accent }}>➕ Add New SMM Panel API</p>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                    <div>

                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: N.muted, marginBottom: 6 }}>Panel Name</label>

                      <input value={newPanelName} onChange={e => setNewPanelName(e.target.value)} placeholder="e.g. BulkSMM"

                        style={{ width:"100%", padding:"10px 14px", borderRadius:10, fontSize:12, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow: N.raisedSm }} />

                    </div>

                    <div>

                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: N.muted, marginBottom: 6 }}>API URL</label>

                      <input value={newPanelApiUrl} onChange={e => setNewPanelApiUrl(e.target.value)} placeholder="e.g. https://bulksmm.com/api/v2"

                        style={{ width:"100%", padding:"10px 14px", borderRadius:10, fontSize:12, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow: N.raisedSm }} />

                    </div>

                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.4fr 0.4fr", gap: 16 }}>

                    <div>

                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: N.muted, marginBottom: 6 }}>API Key / Token</label>

                      <input type="password" value={newPanelApiKey} onChange={e => setNewPanelApiKey(e.target.value)} placeholder="Enter API Key"

                        style={{ width:"100%", padding:"10px 14px", borderRadius:10, fontSize:12, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow: N.raisedSm }} />

                    </div>

                    <div>

                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: N.muted, marginBottom: 6 }}>Priority (1-10)</label>

                      <input type="number" value={newPanelPriority} onChange={e => setNewPanelPriority(e.target.value)} placeholder="1"

                        style={{ width:"100%", padding:"10px 14px", borderRadius:10, fontSize:12, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow: N.raisedSm }} />

                    </div>

                    <div>

                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: N.muted, marginBottom: 6 }}>Load %</label>

                      <input type="number" value={newPanelLoadPercentage} onChange={e => setNewPanelLoadPercentage(e.target.value)} placeholder="100"

                        style={{ width:"100%", padding:"10px 14px", borderRadius:10, fontSize:12, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow: N.raisedSm }} />

                    </div>

                  </div>

                  <button onClick={handleAddPanel} className="neo-btn"

                    style={{ alignSelf: "flex-start", padding: "10px 24px", borderRadius: 10, fontSize: 12, fontWeight: 850, border: "none", color: "#ffffff", background: N.accentBg, boxShadow: N.raisedSm, cursor: "pointer" }}>

                    Connect SMM Panel

                  </button>

                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, marginTop: 10 }}>
                  <h3 style={{ color: N.text, fontSize: 16, fontWeight: 900, margin: 0 }}>Connected SMM Accounts</h3>
                  <button onClick={handleCheckAdminBalances} disabled={checkingAdminBalances} className="neo-btn"
                    style={{ border: "none", background: N.bg, padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 800, color: "#16a34a", boxShadow: N.raisedSm, cursor: "pointer", opacity: checkingAdminBalances ? 0.7 : 1 }}>
                    {checkingAdminBalances ? "⏳ Refreshing Balances..." : "⚡ Refresh Balances & Health"}
                  </button>
                </div>

                {/* SMM Panels List */}

                {adminPanels.length === 0 ? (

                  <div style={{ padding: "20px 0", textAlign: "center", color: N.muted, fontSize: 12, fontWeight: 700 }}>No admin SMM panels connected yet</div>

                ) : (

                  <div style={{ overflowX: "auto" }}>

                    <table style={{ width: "100%", borderCollapse: "collapse" }}>

                      <thead>

                        <tr style={{ borderBottom: `2px solid ${N.border}`, color: N.muted }}>

                          {["Name", "API URL", "Priority", "Load %", "Balance", "Status", "Actions"].map((h) => (

                            <th key={h} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 800, textAlign: "left" }}>{h}</th>

                          ))}

                        </tr>

                      </thead>

                      <tbody>

                        {adminPanels.map((p) => (

                          <tr key={p.id} className="hover-row" style={{ borderBottom: `1px solid ${N.border}` }}>

                            <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: N.text }}>{p.name}</td>

                            <td style={{ padding: "12px 16px", fontSize: 12, color: N.muted, fontFamily: "monospace" }}>{p.apiUrl}</td>

                            <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: N.text }}>{p.priority}</td>

                            <td style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: N.text }}>{p.loadPercentage}%</td>
                            <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 800, color: p.balance !== undefined ? "#16a34a" : N.muted }}>
                              {p.balance !== undefined ? `$${Number(p.balance).toFixed(2)} ${p.currency ?? "USD"}` : "---"}
                            </td>

                            <td style={{ padding: "12px 16px" }}>

                              <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: p.status === "ONLINE" ? "rgba(22,163,74,0.08)" : "rgba(113,128,150,0.08)", color: p.status === "ONLINE" ? "#16a34a" : N.muted }}>

                                {p.status}

                              </span>

                            </td>

                            <td style={{ padding: "12px 16px" }}>

                              <div style={{ display: "flex", gap: 10 }}>

                                <button onClick={() => handleVerifyConnection(p.id)} className="neo-btn" disabled={verifyingPanelId === p.id}
                                  style={{ border: "none", background: N.bg, padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 800, color: verifyingPanelId === p.id ? N.muted : "#16a34a", boxShadow: N.raisedSm, cursor: "pointer", opacity: verifyingPanelId === p.id ? 0.7 : 1 }}>
                                  {verifyingPanelId === p.id ? "⏳ Verifying..." : "⚡ Verify Connection"}
                                </button>

                                <button onClick={() => handleDeletePanel(p.id)} className="neo-btn"

                                  style={{ border: "none", background: N.bg, padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 800, color: "#dc2626", boxShadow: N.raisedSm, cursor: "pointer" }}>

                                  ✗ Delete

                                </button>

                              </div>

                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                )}

                  </>
                )}
              </div>

              {verificationResult && (
                <div style={{
                  marginTop: 16,
                  padding: 14,
                  borderRadius: 12,
                  background: verificationResult.success ? "rgba(22,163,74,0.06)" : "rgba(220,38,38,0.06)",
                  border: `1.5px solid ${verificationResult.success ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`,
                  color: verificationResult.success ? "#16a34a" : "#dc2626",
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16
                }}>
                  <span>
                    {verificationResult.success ? "✅" : "⚠️"} {verificationResult.message}
                  </span>
                  <button onClick={() => setVerificationResult(null)} style={{ background: "transparent", border: "none", color: "inherit", fontWeight: 800, cursor: "pointer", padding: "0 4px" }}>✕</button>
                </div>
              )}

              {/* Section 2: Services configurations */}

              

            </div>

          )}

          {/* ── CAMPAIGNS TAB ─── */}

          {tab === "campaigns" && (

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              <div>

                <h2 style={{ color: N.text, fontSize: 15, fontWeight: 900, margin: "0 0 4px" }}>Global SMM Campaigns Override</h2>

                <p style={{ color: N.muted, fontSize: 12, margin: 0, fontWeight: 600 }}>Monitor and force actions on active or queued pacing schedules</p>

              </div>

              {/* Filters */}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>

                <input type="text" placeholder="Search by user email, reel URL, or order ID…" value={orderQuery} onChange={(e) => setOrderQuery(e.target.value)}

                  className="neo-input"

                  style={{

                    flex: 1,

                    minWidth: 280,

                    padding: "12px 16px",

                    borderRadius: 12,

                    fontSize: 13,

                    fontWeight: 600,

                    color: N.text,

                    background: N.bg,

                    border: "none",

                    boxShadow: N.inset,

                    outline: "none"

                  }} />

                <select value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)}

                  style={{

                    padding: "12px 16px",

                    borderRadius: 12,

                    fontSize: 13,

                    fontWeight: 800,

                    background: N.bg,

                    color: N.text,

                    border: "none",

                    boxShadow: N.raisedSm,

                    cursor: "pointer",

                    outline: "none"

                  }}>

                  <option value="All">All Statuses</option>

                  <option value="DELIVERING">Delivering</option>

                  <option value="COMPLETED">Completed</option>

                  <option value="PAUSED">Paused</option>

                  <option value="CANCELLED">Cancelled</option>

                  <option value="FAILED">Failed</option>

                  <option value="QUEUED">Queued</option>

                </select>

              </div>

              {/* Table */}

              <div style={{ overflowX: "auto", margin: "0 -16px" }}>

                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 850 }}>

                  <thead>

                    <tr style={{ borderBottom: `2px solid ${N.border}`, color: N.muted }}>

                      {["User & Reel", "Speed & Curve", "Delivery Progress", "Engagement", "Status", "Actions"].map((h) => (

                        <th key={h} style={{ padding: "10px 8px", fontSize: 11, fontWeight: 800, textAlign: "left" }}>{h}</th>

                      ))}

                    </tr>

                  </thead>

                  <tbody>

                    {orders

                      .filter((o) => {

                        const matchesQuery =

                          o.user.email.toLowerCase().includes(orderQuery.toLowerCase()) ||

                          o.reel.url.toLowerCase().includes(orderQuery.toLowerCase()) ||

                          o.id.toLowerCase().includes(orderQuery.toLowerCase());

                        const matchesFilter = orderFilter === "All" || o.status === orderFilter;

                        return matchesQuery && matchesFilter;

                      })

                      .map((o) => {

                        const statusColors: Record<string, string> = { DELIVERING: "#d97706", COMPLETED: "#16a34a", PAUSED: "#718096", CANCELLED: "#dc2626", FAILED: "#dc2626", QUEUED: "#2563eb" };
                        const viewsDel = o.viewsDelivered || 0;
                        const viewsRem = o.viewsRemaining !== undefined && o.viewsRemaining !== null ? o.viewsRemaining : Math.max(0, o.viewsTarget - viewsDel);
                        const pct = o.status === "COMPLETED" ? 100 : (o.viewsTarget > 0 ? Math.min(100, Math.round((viewsDel / o.viewsTarget) * 100)) : 0);

                        return (

                          <tr key={o.id} className="hover-row" style={{ borderBottom: `1px solid ${N.border}`, transition: "background 0.2s" }}>

                            <td style={{ padding: "10px 8px", maxWidth: 180 }}>

                              <p style={{ fontSize: 12, fontWeight: 700, color: N.text, margin: 0, wordBreak: "break-all" }}>{o.user?.email}</p>

                              <p style={{ fontSize: 9, fontFamily: "monospace", color: N.muted, margin: "2px 0" }}>ID: {o.id}</p>
                               <a href={o.reel?.url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: N.accent, fontWeight: 700, textDecoration: "none", wordBreak: "break-all" }}>

                                {o.reel?.url?.length > 30 ? `${o.reel.url.slice(0, 30)}…` : o.reel?.url}

                              </a>

                            </td>

                            <td style={{ padding: "10px 8px" }}>

                              <span style={{

                                fontSize: 10,

                                fontWeight: 800,

                                padding: "3px 6px",

                                borderRadius: 4,

                                background: "rgba(217,119,6,0.08)",

                                color: N.accent

                              }}>{o.curveStyle}</span>

                              <p style={{ color: N.muted, fontSize: 10, margin: "2px 0 0", fontWeight: 600 }}>{o.durationHours}h schedule</p>

                            </td>

                            <td style={{ padding: "10px 8px" }}>
                              <p style={{ color: "#16a34a", margin: 0, fontWeight: 800, fontSize: 12 }}>
                                👁 {viewsDel.toLocaleString()} <span style={{ color: N.muted, fontSize: 10, fontWeight: 600 }}>/ {o.viewsTarget.toLocaleString()}</span>
                                <span style={{ marginLeft: 6, fontSize: 11, color: pct === 100 ? "#16a34a" : N.accent }}>({pct}%)</span>
                              </p>
                              <div style={{ width: 110, marginTop: 4 }}>
                                <div style={{ width: "100%", height: 6, background: "rgba(200, 208, 231, 0.4)", borderRadius: 999, overflow: "hidden" }}>
                                  <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#16a34a" : N.accent, borderRadius: 999, transition: "width 0.3s ease" }} />
                                </div>
                              </div>
                              <p style={{ color: o.status === "COMPLETED" ? N.muted : "#d97706", fontSize: 10, margin: "4px 0 0", fontWeight: 700 }}>
                                ⏳ {viewsRem.toLocaleString()} views left
                              </p>
                            </td>

                            <td style={{ padding: "10px 8px" }}>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px", maxWidth: 160, fontSize: 10, fontWeight: 700 }}>
                                {o.likesTarget > 0 && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 3, color: (o.likesDelivered || 0) >= o.likesTarget ? "#16a34a" : N.text }}>
                                    <span>👍</span> <span>{(o.likesDelivered || 0).toLocaleString()}/{o.likesTarget.toLocaleString()}</span>
                                  </div>
                                )}
                                {o.savesTarget > 0 && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 3, color: (o.savesDelivered || 0) >= o.savesTarget ? "#16a34a" : N.text }}>
                                    <span>🔖</span> <span>{(o.savesDelivered || 0).toLocaleString()}/{o.savesTarget.toLocaleString()}</span>
                                  </div>
                                )}
                                {o.sharesTarget > 0 && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 3, color: (o.sharesDelivered || 0) >= o.sharesTarget ? "#16a34a" : N.text }}>
                                    <span>📤</span> <span>{(o.sharesDelivered || 0).toLocaleString()}/{o.sharesTarget.toLocaleString()}</span>
                                  </div>
                                )}
                                {o.commentsTarget > 0 && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 3, color: (o.commentsDelivered || 0) >= o.commentsTarget ? "#16a34a" : N.text }}>
                                    <span>💬</span> <span>{(o.commentsDelivered || 0).toLocaleString()}/{o.commentsTarget.toLocaleString()}</span>
                                  </div>
                                )}
                                {o.repostsTarget > 0 && (
                                  <div style={{ display: "flex", alignItems: "center", gap: 3, color: (o.repostsDelivered || 0) >= o.repostsTarget ? "#16a34a" : N.text }}>
                                    <span>🔁</span> <span>{(o.repostsDelivered || 0).toLocaleString()}/{o.repostsTarget.toLocaleString()}</span>
                                  </div>
                                )}
                                {!(o.likesTarget > 0 || o.savesTarget > 0 || o.sharesTarget > 0 || o.commentsTarget > 0 || o.repostsTarget > 0) && (
                                  <span style={{ color: N.muted, fontStyle: "italic", fontSize: 9 }}>No extra engagement</span>
                                )}
                              </div>
                            </td>

                            <td style={{ padding: "10px 8px" }}>

                              <strong style={{ fontSize: 11, color: statusColors[o.status] ?? N.muted }}>{o.status}</strong>

                            </td>

                            <td style={{ padding: "10px 8px" }}>

                              <div style={{ display: "flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }}>

                                {o.status === "DELIVERING" && (

                                  <button onClick={() => handleCampaignAction(o.id, "pause")} className="neo-btn"

                                    style={{ border: "none", background: N.bg, padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: N.accent, boxShadow: N.raisedSm }}>

                                    Pause

                                  </button>

                                )}

                                {o.status === "PAUSED" && (

                                  <button onClick={() => handleCampaignAction(o.id, "resume")} className="neo-btn"

                                    style={{ border: "none", background: N.bg, padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#16a34a", boxShadow: N.raisedSm }}>

                                    Resume

                                  </button>

                                )}

                                {["DELIVERING", "PAUSED", "QUEUED"].includes(o.status) && (

                                  <button onClick={() => handleCampaignAction(o.id, "cancel")} className="neo-btn"

                                    style={{ border: "none", background: N.bg, padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#dc2626", boxShadow: N.raisedSm }}>

                                    Cancel

                                  </button>

                                )}

                                {["DELIVERING", "COMPLETED"].includes(o.status) && (

                                  <button onClick={() => handleCampaignAction(o.id, "refill")} className="neo-btn"

                                    style={{ border: "none", background: N.bg, padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#16a34a", boxShadow: N.raisedSm }}

                                    title="Query status & place refill if partial">

                                    Refill

                                  </button>

                                )}

                              </div>

                            </td>

                          </tr>

                        );

                      })}

                  </tbody>

                </table>

              </div>

            </div>

          )}

          {/* ── SYSTEM HEALTH TAB ─── */}

          
        {/* Failed Orders Tab */}
        {tab === "failed_orders" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: N.text, margin: 0 }}>Failed Campaigns</h2>
                <p style={{ fontSize: 13, color: N.muted, margin: "4px 0 0", fontWeight: 600 }}>Review orders that failed delivery</p>
              </div>
            </div>
            
            <div style={{ overflowX: "auto", margin: "0 -32px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${N.border}`, color: N.muted }}>
                    {["Order ID & Reel", "User", "Error Reason", "Status", "Actions"].map((h) => (
                      <th key={h} style={{ padding: "10px 12px", fontSize: 12, fontWeight: 800, textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.filter(o => o.status === "FAILED").map(o => (
                    <tr key={o.id} style={{ borderBottom: `1px solid ${N.border}` }}>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: N.text }}>{o.id}</div>
                        <a href={o.reel.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: N.accent, wordBreak: "break-all" }}>
                          {o.reel.url.substring(0, 30)}...
                        </a>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: N.text }}>{o.user.name || "Unknown"}</div>
                        <div style={{ fontSize: 11, color: N.muted }}>{o.user.email}</div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ padding: "8px 12px", background: "rgba(220,38,38,0.1)", color: "#dc2626", borderRadius: 8, fontSize: 12, fontWeight: 700, wordBreak: "break-word" }}>
                          {o.failReason || "No specific reason logged (check panel)"}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#dc2626", background: "rgba(220, 38, 38, 0.1)", padding: "4px 10px", borderRadius: 20 }}>FAILED</span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <button onClick={() => handleCampaignAction(o.id, "resume")} className="neo-btn" style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#16a34a", border: "none", cursor: "pointer", background: N.bg, boxShadow: N.raisedSm }}>
                          Resume
                        </button>
                      </td>
                    </tr>
                  ))}
                  {orders.filter(o => o.status === "FAILED").length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: 40, textAlign: "center", color: N.muted, fontSize: 14, fontWeight: 700 }}>
                        No failed orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "system" && (

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

              <div>

                <h2 style={{ color: N.text, fontSize: 15, fontWeight: 900, margin: "0 0 4px" }}>System Diagnostic Logs</h2>

                <p style={{ color: N.muted, fontSize: 12, margin: 0, fontWeight: 600 }}>Real-time execution tick states and user panel statuses</p>

              </div>

              {/* Status counts grid */}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20 }}>

                {[

                  ["Active Campaigns", orders.filter((o) => ["DELIVERING", "QUEUED"].includes(o.status)).length, N.accent],

                  ["Completed Campaigns", orders.filter((o) => o.status === "COMPLETED").length, "#16a34a"],

                  ["Scheduled Ticks", systemData.eventStats.find((s) => s.status === "SCHEDULED")?.count ?? 0, N.text],

                  ["Failed Ticks", systemData.eventStats.find((s) => s.status === "FAILED")?.count ?? 0, "#dc2626"],

                ].map(([label, val, color]) => (

                  <div key={label} style={{ padding: 18, borderRadius: 14, background: N.bg, boxShadow: N.raisedSm }}>

                    <p style={{ color: N.muted, fontSize: 11, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>

                    <p style={{ fontSize: 22, fontWeight: 900, color: color as string, margin: 0, marginTop: 4 }}>{val}</p>

                  </div>

                ))}

              </div>

              {/* Panels Diagnostics */}

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                <h3 style={{ color: N.text, fontSize: 14, fontWeight: 900, margin: 0 }}>Global User SMM Panels ({systemData.panels.length})</h3>

                {systemData.panels.length === 0 ? (

                  <div style={{ padding: 16, background: N.bg, borderRadius: 12, boxShadow: N.inset, fontSize: 12, color: N.muted, fontWeight: 600 }}>No panel APIs connected yet</div>

                ) : (

                  <div style={{ overflowX: "auto", margin: "0 -32px" }}>

                    <table style={{ width: "100%", borderCollapse: "collapse" }}>

                      <thead>

                        <tr style={{ borderBottom: `1px solid ${N.border}`, color: N.muted }}>

                          {["User", "Panel Name", "API URL", "Status", "Latency", "Success Rate"].map((h) => (

                            <th key={h} style={{ padding: "10px 24px", fontSize: 12, fontWeight: 800, textAlign: "left" }}>{h}</th>

                          ))}

                        </tr>

                      </thead>

                      <tbody>

                        {systemData.panels.map((p) => {

                          const statusColor = p.status === "ONLINE" ? "#16a34a" : p.status === "OFFLINE" ? "#dc2626" : p.status === "SLOW" ? "#d97706" : N.muted;

                          return (

                            <tr key={p.id} className="hover-row" style={{ borderBottom: `1px solid ${N.border}`, transition: "background 0.2s" }}>

                              <td style={{ padding: "10px 12px", fontSize: 13, color: N.muted, fontWeight: 600 }}>{p.user?.email}</td>

                              <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: N.text }}>{p.name}</td>

                              <td style={{ padding: "10px 12px", fontSize: 12, color: N.muted, fontFamily: "monospace" }}>{p.apiUrl}</td>

                              <td style={{ padding: "10px 12px" }}>

                                <strong style={{ fontSize: 12, color: statusColor }}>{p.status}</strong>

                              </td>

                              <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: N.text }}>{p.lastResponseMs ? `${p.lastResponseMs}ms` : "—"}</td>

                              <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: N.text }}>{p.successRate.toFixed(1)}%</td>

                            </tr>

                          );

                        })}

                      </tbody>

                    </table>

                  </div>

                )}

              </div>

              {/* Queue Events Ticks */}

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                <h3 style={{ color: N.text, fontSize: 14, fontWeight: 900, margin: 0 }}>Recent Webhook ticks log ({systemData.events.length})</h3>

                {systemData.events.length === 0 ? (

                  <div style={{ padding: 16, background: N.bg, borderRadius: 12, boxShadow: N.inset, fontSize: 12, color: N.muted, fontWeight: 600 }}>No queue events logged</div>

                ) : (

                  <div style={{ overflowX: "auto", margin: "0 -32px" }}>
                    {(() => {
                      const groupedOrders: Record<string, {
                        orderId: string;
                        email: string;
                        url: string;
                        events: any[];
                      }> = {};

                      systemData.events.forEach((e) => {
                        const orderId = e.orderId || e.order?.id || "unknown";
                        if (!groupedOrders[orderId]) {
                          groupedOrders[orderId] = {
                            orderId,
                            email: e.order?.user?.email || "Unknown User",
                            url: e.order?.reel?.url || "No URL",
                            events: []
                          };
                        }
                        groupedOrders[orderId].events.push(e);
                      });

                      const groupedList = Object.values(groupedOrders);

                      return (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ borderBottom: `1px solid ${N.border}`, color: N.muted }}>
                              {["Order ID", "Campaign User", "Reel / Video URL", "Total Ticks", "Last Run Status", "Actions"].map((h) => (
                                <th key={h} style={{ padding: "10px 24px", fontSize: 12, fontWeight: 800, textAlign: "left" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {groupedList.map((g) => {
                              const isExpanded = expandedOrders[g.orderId] || false;
                              const lastEvent = g.events[0];
                              const statusColors: Record<string, string> = { DONE: "#16a34a", FAILED: "#dc2626", SCHEDULED: "#718096", EXECUTING: "#d97706", RETRYING: "#4f46e5" };

                              return (
                                <React.Fragment key={g.orderId}>
                                  <tr className="hover-row" style={{ borderBottom: `1px solid ${N.border}`, transition: "background 0.2s" }}>
                                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 900, color: N.text }}>
                                      <span
                                        onClick={() => setExpandedOrders(prev => ({ ...prev, [g.orderId]: !isExpanded }))}
                                        style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, color: N.accent }}
                                      >
                                        {isExpanded ? "▼" : "▶"} {g.orderId}
                                      </span>
                                    </td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: N.text }}>{g.email}</td>
                                    <td style={{ padding: "10px 12px" }}>
                                      {g.url && g.url !== "No URL" ? (
                                        <a href={g.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: N.accent, fontWeight: 700, textDecoration: "none" }}>
                                          {g.url.length > 50 ? `${g.url.slice(0, 50)}…` : g.url}
                                        </a>
                                      ) : (
                                        <span style={{ fontSize: 12, color: N.muted }}>No URL</span>
                                      )}
                                    </td>
                                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: N.text }}>
                                      {g.events.length} ticks
                                    </td>
                                    <td style={{ padding: "10px 12px" }}>
                                      {lastEvent ? (
                                        <strong style={{ fontSize: 12, color: statusColors[lastEvent.status] ?? N.muted }}>
                                          {lastEvent.status}
                                        </strong>
                                      ) : "—"}
                                    </td>
                                    <td style={{ padding: "10px 12px" }}>
                                      <button
                                        onClick={() => setExpandedOrders(prev => ({ ...prev, [g.orderId]: !isExpanded }))}
                                        className="neo-btn"
                                        style={{ border: "none", background: N.bg, padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: N.text, boxShadow: N.raisedSm, cursor: "pointer" }}
                                      >
                                        {isExpanded ? "Hide Details" : "Show Details"}
                                      </button>
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr style={{ background: "rgba(8,1,15,0.4)" }}>
                                      <td colSpan={6} style={{ padding: "10px 12px" }}>
                                        <div style={{ border: `1.5px solid #1c0a35`, borderRadius: 16, padding: 20, background: "#0c0218", boxShadow: N.inset }}>
                                          <h4 style={{ margin: "0 0 12px 0", color: "#f3e8ff", fontSize: 13, fontWeight: 900 }}>
                                            📋 Webhook Delivery Ticks Log for Order ID: <span style={{ color: N.accent }}>{g.orderId}</span>
                                          </h4>
                                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                            <thead>
                                              <tr style={{ borderBottom: `1px solid #1c0a35`, color: "#a78bfa" }}>
                                                <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 800, textAlign: "left" }}>Tick Scheduled Time</th>
                                                <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 800, textAlign: "left" }}>Batch Views</th>
                                                <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 800, textAlign: "left" }}>SMM Provider</th>
                                                <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 800, textAlign: "left" }}>Status</th>
                                                <th style={{ padding: "8px 12px", fontSize: 11, fontWeight: 800, textAlign: "left" }}>Diagnostics / Failure Reason</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {g.events.map((evt) => {
                                                return (
                                                  <tr key={evt.id} style={{ borderBottom: `1px solid rgba(28,10,53,0.3)` }}>
                                                    <td style={{ padding: "8px 12px", fontSize: 12, color: "#f3e8ff" }}>
                                                      {new Date(evt.scheduledAt).toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 700, color: "#f3e8ff" }}>
                                                      {(evt.viewsBatch ?? 0).toLocaleString()} views
                                                    </td>
                                                    <td style={{ padding: "8px 12px", fontSize: 12, color: "#a78bfa" }}>
                                                      {evt.panel?.name || "Unknown"}
                                                    </td>
                                                    <td style={{ padding: "8px 12px", fontSize: 12 }}>
                                                      <strong style={{ color: statusColors[evt.status] ?? N.muted }}>
                                                        {evt.status}
                                                      </strong>
                                                    </td>
                                                    <td style={{ padding: "8px 12px", fontSize: 12, color: evt.status === "FAILED" ? "#dc2626" : "#f3e8ff", fontWeight: 600, maxWidth: 350, wordBreak: "break-word", whiteSpace: "normal" }}>
                                                      {evt.errorMessage || "—"}
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>

                )}

              </div>

            </div>

          )}

          {tab === "affiliates" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: N.text }}>🤝 Affiliate & Partner Tracking</h2>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: N.muted }}>Monitor VIP affiliate links, conversion clicks, and 20% deposit commissions.</p>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    type="text"
                    value={affiliateSearchEmail}
                    onChange={(e) => setAffiliateSearchEmail(e.target.value)}
                    placeholder="Partner Email or Code"
                    style={{ padding: "10px 16px", borderRadius: 12, background: N.bg, border: "none", boxShadow: N.inset, fontSize: 13, fontWeight: 700 }}
                  />
                  <button
                    onClick={() => fetchAffiliateStats(affiliateSearchEmail)}
                    style={{ padding: "10px 20px", borderRadius: 12, background: N.accent, color: "#fff", border: "none", fontWeight: 800, cursor: "pointer", boxShadow: N.raisedSm }}
                  >
                    {affiliateLoading ? "Loading..." : "🔍 Inspect Partner"}
                  </button>
                </div>
              </div>

              {/* Quick VIP Box for Bizano */}
              <div style={{ padding: "20px 24px", borderRadius: 20, background: "linear-gradient(135deg, #1e293b, #0f172a)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, boxShadow: N.raised }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#f59e0b", textTransform: "uppercase" }}>⭐ Special VIP Affiliate Account</div>
                  <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>bizanomarketing.carrd.co@gmail.com</div>
                  <div style={{ fontSize: 13, color: "#cbd5e1", marginTop: 2 }}>Assigned Referral Code: <b style={{ color: "#fff" }}>BIZANO20</b> · Commission: <b>20% on all deposits</b></div>
                </div>
                <button
                  onClick={() => {
                    setAffiliateSearchEmail("bizanomarketing.carrd.co@gmail.com");
                    fetchAffiliateStats("bizanomarketing.carrd.co@gmail.com");
                  }}
                  style={{ padding: "10px 12px", borderRadius: 14, background: "#d97706", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(217,119,6,0.3)" }}
                >
                  📊 Load Bizano Stats Now
                </button>
              </div>

              {affiliateData && affiliateData.affiliate && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                    <div style={{ padding: 20, borderRadius: 18, background: N.bg, boxShadow: N.raised }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: N.muted }}>Total Link Clicks</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: N.text, marginTop: 6 }}>{affiliateData.affiliate.clicks || 0}</div>
                    </div>
                    <div style={{ padding: 20, borderRadius: 18, background: N.bg, boxShadow: N.raised }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: N.muted }}>Total Signups / Referrals</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: N.text, marginTop: 6 }}>{affiliateData.referredUsers?.length || 0}</div>
                    </div>
                    <div style={{ padding: 20, borderRadius: 18, background: N.bg, boxShadow: N.raised }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: N.muted }}>Total Earned Commission</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: "#16a34a", marginTop: 6 }}>₹{Number(affiliateData.affiliate.earnings || 0).toFixed(2)}</div>
                    </div>
                    <div style={{ padding: 20, borderRadius: 18, background: N.bg, boxShadow: N.raised }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: N.muted }}>Current Wallet Balance</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: N.text, marginTop: 6 }}>₹{Number(affiliateData.affiliate.balance || 0).toFixed(2)}</div>
                    </div>
                  </div>

                  <div style={{ borderRadius: 20, background: N.bg, boxShadow: N.raised, padding: 20 }}>
                    <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 900, color: N.text }}>👥 Referred Accounts ({affiliateData.referredUsers?.length || 0})</h3>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${N.border}` }}>
                            <th style={{ padding: "10px 14px", color: N.muted }}>Name</th>
                            <th style={{ padding: "10px 14px", color: N.muted }}>Email</th>
                            <th style={{ padding: "10px 14px", color: N.muted }}>Wallet Balance</th>
                            <th style={{ padding: "10px 14px", color: N.muted }}>Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {affiliateData.referredUsers?.map((u: any, i: number) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${N.border}` }}>
                              <td style={{ padding: "12px 14px", fontWeight: 700 }}>{u.name}</td>
                              <td style={{ padding: "12px 14px" }}>{u.email}</td>
                              <td style={{ padding: "12px 14px", fontWeight: 800, color: "#16a34a" }}>₹{Number(u.balance || 0).toFixed(2)}</td>
                              <td style={{ padding: "12px 14px", color: N.muted }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{ borderRadius: 20, background: N.bg, boxShadow: N.raised, padding: 20 }}>
                    <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 900, color: N.text }}>💰 Commission Log</h3>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${N.border}` }}>
                            <th style={{ padding: "10px 14px", color: N.muted }}>Date</th>
                            <th style={{ padding: "10px 14px", color: N.muted }}>Referred User</th>
                            <th style={{ padding: "10px 14px", color: N.muted }}>Deposit Amount</th>
                            <th style={{ padding: "10px 14px", color: N.muted }}>Commission Paid</th>
                          </tr>
                        </thead>
                        <tbody>
                          {affiliateData.transactions?.map((tx: any, i: number) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${N.border}` }}>
                              <td style={{ padding: "12px 14px", color: N.muted }}>{new Date(tx.createdAt).toLocaleString()}</td>
                              <td style={{ padding: "12px 14px", fontWeight: 700 }}>{tx.referredUser?.email || "User"}</td>
                              <td style={{ padding: "12px 14px", fontWeight: 700 }}>₹{Number(tx.amountDeposit || 0).toFixed(2)}</td>
                              <td style={{ padding: "12px 14px", fontWeight: 900, color: "#16a34a" }}>+₹{Number(tx.commissionEarned || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "tickets" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {tickets.find(t => t.id === adminChatTicketId) ? (() => {
                const activeT = tickets.find(t => t.id === adminChatTicketId)!;
                return (
                  <div style={{ background: N.bg, borderRadius: 24, padding: 24, boxShadow: N.raised, display: "flex", flexDirection: "column", gap: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1.5px solid ${N.border}`, paddingBottom: 16, flexWrap: "wrap", gap: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button
                          onClick={() => setAdminChatTicketId(null)}
                          className="neo-btn"
                          style={{ padding: "8px 14px", borderRadius: 12, background: N.bg, boxShadow: N.raisedSm, border: "none", color: N.text, fontWeight: 800, fontSize: 12, cursor: "pointer" }}
                        >
                          ← Back to Inbox
                        </button>
                        <div>
                          <h2 style={{ fontSize: 16, fontWeight: 900, color: N.text, margin: 0 }}>{activeT.subject}</h2>
                          <span style={{ fontSize: 11, color: N.muted, fontWeight: 700 }}>User: <strong style={{ color: N.text }}>{activeT.user?.email || "Unknown"}</strong> (ID: #{activeT.id})</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 900,
                          color: activeT.status === "OPEN" ? "#d97706" : activeT.status === "RESOLVED" ? "#16a34a" : "#718096",
                          background: activeT.status === "OPEN" ? "rgba(217,119,6,0.1)" : activeT.status === "RESOLVED" ? "rgba(22,163,74,0.1)" : "rgba(113,128,150,0.1)",
                          padding: "6px 14px",
                          borderRadius: 20,
                          border: `1px solid ${activeT.status === "OPEN" ? "rgba(217,119,6,0.2)" : activeT.status === "RESOLVED" ? "rgba(22,163,74,0.2)" : "rgba(113,128,150,0.2)"}`,
                          textTransform: "uppercase",
                          marginRight: 8
                        }}>
                          ● {activeT.status}
                        </span>
                        {activeT.status !== "RESOLVED" && (
                          <button
                            onClick={async () => {
                              const res = await fetch("/api/admin/tickets", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json", "x-admin-secret": secret },
                                body: JSON.stringify({ id: activeT.id, status: "RESOLVED" }),
                              });
                              if (res.ok) {
                                setTickets(prev => prev.map(pt => pt.id === activeT.id ? { ...pt, status: "RESOLVED" } : pt));
                              }
                            }}
                            style={{ padding: "6px 12px", borderRadius: 10, fontSize: 11, fontWeight: 800, color: "#fff", background: "#16a34a", border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(22,163,74,0.25)" }}
                          >
                            ✓ Mark Resolved
                          </button>
                        )}
                        {activeT.status !== "CLOSED" && (
                          <button
                            onClick={async () => {
                              const res = await fetch("/api/admin/tickets", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json", "x-admin-secret": secret },
                                body: JSON.stringify({ id: activeT.id, status: "CLOSED" }),
                              });
                              if (res.ok) {
                                setTickets(prev => prev.filter(pt => pt.id !== activeT.id)); setAdminChatTicketId(null);
                              }
                            }}
                            style={{ padding: "6px 12px", borderRadius: 10, fontSize: 11, fontWeight: 800, color: "#fff", background: "#dc2626", border: "none", cursor: "pointer" }}
                          >
                            ✕ Close Ticket
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Chat Messages Area */}
                    <div style={{
                      minHeight: 320,
                      maxHeight: 480,
                      overflowY: "auto",
                      padding: "16px",
                      borderRadius: 16,
                      background: N.inset,
                      display: "flex",
                      flexDirection: "column",
                      gap: 16
                    }}>
                      {(!activeT.messages || activeT.messages.length === 0) ? (
                        <div style={{ alignSelf: "flex-start", maxWidth: "80%", display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: "#d97706", alignSelf: "flex-start" }}>👤 User ({activeT.user?.email || "User"})</span>
                          <div style={{ padding: "14px 18px", borderRadius: "18px 18px 18px 4px", background: "#fef3c7", color: "#92400e", fontSize: 13, fontWeight: 600, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                            {activeT.message}
                          </div>
                          <span style={{ fontSize: 9, color: N.muted, fontWeight: 600, alignSelf: "flex-start" }}>
                            {new Date(activeT.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        activeT.messages.map((m: any) => {
                          const isAdmin = m.sender === "ADMIN";
                          return (
                            <div key={m.id} style={{ alignSelf: isAdmin ? "flex-end" : "flex-start", maxWidth: "80%", display: "flex", flexDirection: "column", gap: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: isAdmin ? "#4f46e5" : "#d97706", alignSelf: isAdmin ? "flex-end" : "flex-start" }}>
                                {isAdmin ? "🛡️ You (Admin / Helpdesk)" : `👤 User (${activeT.user?.email || "User"})`}
                              </span>
                              <div style={{
                                padding: "14px 18px",
                                borderRadius: isAdmin ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                                background: isAdmin ? "#e0e7ff" : "#fef3c7",
                                color: isAdmin ? "#3730a3" : "#92400e",
                                fontSize: 13,
                                fontWeight: 600,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                                lineHeight: 1.5,
                                whiteSpace: "pre-wrap"
                              }}>
                                {m.message}
                              </div>
                              <span style={{ fontSize: 9, color: N.muted, fontWeight: 600, alignSelf: isAdmin ? "flex-end" : "flex-start" }}>
                                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Admin Reply Footer */}
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                      <textarea
                        value={adminReplyText}
                        onChange={e => setAdminReplyText(e.target.value)}
                        placeholder="Type an official admin response to the user..."
                        rows={2}
                        style={{ flex: 1, padding: "12px 16px", borderRadius: 14, fontSize: 13, background: N.bg, border: "none", color: N.text, outline: "none", boxShadow: N.inset, fontFamily: "inherit", resize: "none" }}
                      />
                      <button
                        onClick={async () => {
                          if (!adminReplyText.trim()) return;
                          setAdminReplying(true);
                          try {
                            const res = await fetch("/api/admin/tickets", {
                              method: "POST",
                              headers: { "Content-Type": "application/json", "x-admin-secret": secret },
                              body: JSON.stringify({ ticketId: activeT.id, message: adminReplyText, status: "ANSWERED" }),
                            });
                            const data = await res.json();
                            if (res.ok && data.ticket) {
                              setTickets(prev => prev.map(pt => pt.id === activeT.id ? data.ticket : pt));
                              setAdminReplyText("");
                            } else {
                              alert(data.error || "Failed to send reply");
                            }
                          } catch (e) {
                            alert(String(e));
                          } finally {
                            setAdminReplying(false);
                          }
                        }}
                        disabled={adminReplying || !adminReplyText.trim()}
                        className="neo-btn"
                        style={{
                          padding: "10px 12px",
                          borderRadius: 14,
                          background: !adminReplyText.trim() ? N.muted : "#4f46e5",
                          color: "#ffffff",
                          fontWeight: 800,
                          border: "none",
                          cursor: !adminReplyText.trim() ? "not-allowed" : "pointer",
                          boxShadow: !adminReplyText.trim() ? "none" : "0 4px 14px rgba(79, 70, 229, 0.3)",
                          fontSize: 13,
                          wordBreak: "break-word",
                          transition: "all 0.2s"
                        }}
                      >
                        {adminReplying ? "Sending..." : "🛡️ Send Admin Reply"}
                      </button>
                    </div>
                  </div>
                );
              })() : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <h2 style={{ color: N.text, fontSize: 15, fontWeight: 900, margin: "0 0 4px" }}>Support Tickets Inbox &amp; Live Chat</h2>
                    <p style={{ color: N.muted, fontSize: 12, margin: 0, fontWeight: 600 }}>Click any ticket to open live chat and reply to the user</p>
                  </div>

                  {tickets.length === 0 ? (
                    <div style={{ padding: 16, background: N.bg, borderRadius: 12, boxShadow: N.inset, fontSize: 12, color: N.muted, fontWeight: 600 }}>No support tickets submitted</div>
                  ) : (
                    <div style={{ overflowX: "auto", margin: "0" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${N.border}`, color: N.muted }}>
                            {["Ticket ID", "User Email", "Subject", "Message Preview", "Status", "Actions"].map((h) => (
                              <th key={h} style={{ padding: "12px 16px", fontSize: 12, fontWeight: 800, textAlign: "left" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tickets.map((t) => {
                            const badgeColor = t.status === "OPEN" ? "#d97706" : t.status === "RESOLVED" ? "#16a34a" : "#718096";
                            const msgCount = t.messages?.length || 1;
                            return (
                              <tr key={t.id} style={{ borderBottom: `1px solid ${N.border}`, transition: "background 0.2s" }}>
                                <td style={{ padding: "14px 16px", fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: N.text }}>{t.id}</td>
                                <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: N.text }}>{t.user?.email || "Unknown"}</td>
                                <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 800, color: N.text }}>{t.subject}</td>
                                <td style={{ padding: "14px 16px", fontSize: 12, color: N.muted, maxWidth: 200, wordBreak: "break-word", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1].message : t.message}
                                </td>
                                <td style={{ padding: "14px 16px" }}>
                                  <span style={{ fontSize: 10, fontWeight: 800, color: badgeColor, background: `${badgeColor}10`, padding: "4px 8px", borderRadius: 12, border: `1px solid ${badgeColor}20` }}>
                                    {t.status}
                                  </span>
                                </td>
                                <td style={{ padding: "14px 16px" }}>
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                      onClick={() => setAdminChatTicketId(t.id)}
                                      className="neo-btn"
                                      style={{ padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#ffffff", background: N.accent, border: "none", cursor: "pointer", boxShadow: N.raisedSm }}
                                    >
                                      💬 Open Chat ({msgCount})
                                    </button>
                                    {t.status === "OPEN" && (
                                      <button
                                        onClick={async () => {
                                          if (!confirm("Mark this ticket as resolved?")) return;
                                          const res = await fetch("/api/admin/tickets", {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json", "x-admin-secret": secret },
                                            body: JSON.stringify({ id: t.id, status: "RESOLVED" }),
                                          });
                                          if (res.ok) {
                                            setTickets(prev => prev.map(pt => pt.id === t.id ? { ...pt, status: "RESOLVED" } : pt));
                                          }
                                        }}
                                        className="neo-btn"
                                        style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#ffffff", background: "#16a34a", border: "none", cursor: "pointer" }}
                                      >
                                        Resolve
                                      </button>
                                    )}
                                    {t.status !== "CLOSED" && (
                                      <button
                                        onClick={async () => {
                                          if (!confirm("Close this ticket?")) return;
                                          const res = await fetch("/api/admin/tickets", {
                                            method: "PATCH",
                                            headers: { "Content-Type": "application/json", "x-admin-secret": secret },
                                            body: JSON.stringify({ id: t.id, status: "CLOSED" }),
                                          });
                                          if (res.ok) {
                                            setTickets(prev => prev.filter(pt => pt.id !== t.id));
                                          }
                                        }}
                                        className="neo-btn"
                                        style={{ padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#ffffff", background: "#dc2626", border: "none", cursor: "pointer" }}
                                      >
                                        Close
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "blogs" && (
            <BlogsTab />
          )}

          {/* ── AUTO SYNC TAB ─── */}
          {tab === "auto_sync" && (
            <AutoSyncTab />
          )}

      {/* USER HISTORY MODAL */}
      {historyUser && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: N.bg, borderRadius: 24, padding: 32, width: 700, maxWidth: "90%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: N.text, margin: 0 }}>User History</h3>
                <p style={{ fontSize: 13, color: N.muted, margin: 0 }}>{historyUser.email}</p>
              </div>
              <button onClick={() => setHistoryUser(null)} style={{ background: "none", border: "none", fontSize: 24, color: N.muted, cursor: "pointer" }}>&times;</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              <div style={{ background: N.bg, padding: 16, borderRadius: 12, boxShadow: N.inset }}>
                <p style={{ fontSize: 11, color: N.muted, fontWeight: 700, margin: 0 }}>Total Orders</p>
                <p style={{ fontSize: 18, color: N.text, fontWeight: 800, margin: 0 }}>{historyUser._count?.orders || 0}</p>
              </div>
              <div style={{ background: N.bg, padding: 16, borderRadius: 12, boxShadow: N.inset }}>
                <p style={{ fontSize: 11, color: N.muted, fontWeight: 700, margin: 0 }}>Total Deposited</p>
                <p style={{ fontSize: 18, color: "#16a34a", fontWeight: 800, margin: 0 }}>? {(historyUser.totalDepositedInr || 0).toLocaleString()} <span style={{fontSize: 12, color: N.muted}}>/ </span></p>
              </div>
              <div style={{ background: N.bg, padding: 16, borderRadius: 12, boxShadow: N.inset }}>
                <p style={{ fontSize: 11, color: N.muted, fontWeight: 700, margin: 0 }}>Total Spent</p>
                <p style={{ fontSize: 18, color: N.accent, fontWeight: 800, margin: 0 }}>? {(historyUser.totalSpent || 0).toLocaleString()}</p>
              </div>
            </div>

            <h4 style={{ fontSize: 14, fontWeight: 700, color: N.text, marginBottom: 12 }}>Deposit History</h4>
            {historyLoading ? (
              <p style={{ fontSize: 13, color: N.muted }}>Loading deposits...</p>
            ) : historyData.length === 0 ? (
              <p style={{ fontSize: 13, color: N.muted }}>No deposit records found.</p>
            ) : (
              <div style={{ background: N.bg, borderRadius: 12, boxShadow: N.inset, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${N.border}` }}>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: N.muted }}>Date</th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: N.muted }}>Type</th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: N.muted }}>Amount</th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: N.muted }}>TxID / UTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map(dep => (
                      <tr key={dep.id} style={{ borderBottom: `1px solid ${N.border}` }}>
                        <td style={{ padding: "12px", fontSize: 12, color: N.text, fontWeight: 600 }}>{new Date(dep.date).toLocaleString()}</td>
                        <td style={{ padding: "12px", fontSize: 12, color: N.text, fontWeight: 700 }}>
                          <span style={{ padding: "4px 8px", background: dep.type === "Crypto" ? "#f59e0b1A" : "#3b82f61A", color: dep.type === "Crypto" ? "#d97706" : "#2563eb", borderRadius: 6 }}>{dep.type}</span>
                        </td>
                        <td style={{ padding: "12px", fontSize: 13, color: "#16a34a", fontWeight: 800 }}>
                          {dep.currency === "INR" ? "₹" : "$"} {dep.amount}
                        </td>
                        <td style={{ padding: "12px", fontSize: 11, color: N.muted, fontFamily: "monospace" }}>{dep.txId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

        </div>

      </div>

    </div>

  );

}

