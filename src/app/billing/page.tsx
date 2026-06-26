"use client";
import { useEffect, useState, useCallback } from "react";
import QRCode from "qrcode";

type Network = "TRC20" | "BEP20";
type PaymentStatus = "PENDING" | "VERIFYING" | "CONFIRMED" | "FAILED" | "REJECTED";

interface Payment { id: string; txHash: string; network: string; status: PaymentStatus; amountUsdt: number | null; createdAt: string; verifyError: string | null }
interface BillingData { plan: string; lifetimeUnlocked: boolean; payments: Payment[]; wallet: { trc20: string | null; bep20: string | null; priceUsdt: number } }

const FEATURES = [
  "Unlimited orders & campaigns",
  "Organic S-curve delivery engine",
  "Multi-panel failover",
  "Real-time delivery charts",
  "TRC20 + BEP20 verified payments",
  "Priority support",
  "Free updates forever",
  "No subscriptions, ever",
];

const PAYMENT_STATUS_STYLE: Record<string, { color: string; label: string; icon: string }> = {
  PENDING:   { color: "#F59E0B", label: "Pending — not yet confirmed", icon: "⏳" },
  VERIFYING: { color: "#818cf8", label: "Verifying on-chain…",        icon: "🔍" },
  CONFIRMED: { color: "#34d399", label: "Confirmed — Access Granted",  icon: "✅" },
  FAILED:    { color: "#f87171", label: "Failed — see error",          icon: "✗" },
  REJECTED:  { color: "#f87171", label: "Rejected by admin",           icon: "✗" },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={copied ? { background: "rgba(52,211,153,0.15)", color: "#34d399" } : { background: "rgba(255,255,255,0.08)", color: "#9ca3af" }}>
      {copied ? "✓ Copied!" : "Copy"}
    </button>
  );
}

function QRDisplay({ address, network }: { address: string; network: Network }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(address, { width: 180, margin: 2, color: { dark: "#000", light: "#fff" } })
      .then(setSrc);
  }, [address]);
  return (
    <div className="flex flex-col items-center gap-3">
      {src ? (
        <div className="p-2 rounded-xl bg-white">
          <img src={src} alt={`${network} QR`} width={160} height={160} />
        </div>
      ) : (
        <div className="w-44 h-44 rounded-xl bg-white/5 animate-pulse" />
      )}
      <p className="text-xs text-gray-500 text-center">Scan to get address</p>
    </div>
  );
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [network, setNetwork] = useState<Network>("TRC20");
  const [txHash, setTxHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; message: string } | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/billing/status");
    if (res.ok) { const d = await res.json(); setData(d); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submitPayment = async () => {
    if (!txHash.trim()) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/billing/submit-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: txHash.trim(), network }),
      });
      const json = await res.json();
      setSubmitResult({ ok: json.ok, message: json.ok ? json.message : json.error ?? json.message });
      if (json.ok) { setTxHash(""); fetchData(); }
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
    </div>
  );

  // ── Already lifetime ─────────────────────────────────────
  if (data?.lifetimeUnlocked) return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Billing</h1>
      <div className="rounded-2xl border p-8 text-center" style={{ background: "rgba(52,211,153,0.05)", borderColor: "rgba(52,211,153,0.25)" }}>
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-white mb-2">You have Lifetime Access!</h2>
        <p className="text-gray-400 mb-6">No renewals. No limits. All features unlocked forever.</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold" style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}>
          💎 LIFETIME MEMBER
        </div>
      </div>
      {/* Payment history */}
      {data.payments.length > 0 && (
        <div className="rounded-2xl border p-6" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
          <h3 className="font-semibold text-white mb-4">Payment History</h3>
          {data.payments.map((p) => {
            const s = PAYMENT_STATUS_STYLE[p.status] ?? PAYMENT_STATUS_STYLE.PENDING;
            return (
              <div key={p.id} className="flex items-center gap-3 py-3 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <span>{s.icon}</span>
                <div className="flex-1">
                  <p className="text-xs font-mono text-amber-400">{p.txHash.slice(0, 24)}…</p>
                  <p className="text-xs text-gray-500">{p.network} · {new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="text-xs font-semibold" style={{ color: s.color }}>{p.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Not yet paid ─────────────────────────────────────────
  const selectedAddress = network === "TRC20" ? data?.wallet.trc20 : data?.wallet.bep20;
  const price = data?.wallet.priceUsdt ?? 20;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Upgrade to Lifetime</h1>
          <p className="text-gray-400 text-sm mt-1">One-time USDT payment — never pay again</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black text-white">${price} <span className="text-base font-normal text-gray-400">USDT</span></p>
          <p className="text-xs text-emerald-400 font-semibold">One-time · No subscription</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* ── Left: payment form ── */}
        <div className="space-y-4">
          {/* Network selector */}
          <div className="rounded-2xl border p-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
            <h3 className="font-semibold text-white mb-4">1. Choose Network</h3>
            <div className="grid grid-cols-2 gap-3">
              {(["TRC20", "BEP20"] as Network[]).map((n) => (
                <button key={n} onClick={() => setNetwork(n)}
                  className="py-3 rounded-xl text-sm font-semibold transition-all"
                  style={network === n ? { background: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.4)" } : { background: "rgba(255,255,255,0.04)", color: "#6b7280", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {n === "TRC20" ? "🔷" : "🔶"} USDT {n}
                  <p className="text-xs font-normal mt-0.5 opacity-70">{n === "TRC20" ? "TRON network" : "BSC network"}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Wallet address */}
          <div className="rounded-2xl border p-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
            <h3 className="font-semibold text-white mb-4">2. Send ${price} USDT to This Address</h3>
            {selectedAddress ? (
              <>
                <div className="flex items-center gap-2 p-3 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <code className="flex-1 text-xs text-amber-400 break-all font-mono">{selectedAddress}</code>
                  <CopyButton text={selectedAddress} />
                </div>
                <QRDisplay address={selectedAddress} network={network} />
                <div className="mt-4 p-3 rounded-xl text-xs text-yellow-300 space-y-1" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <p>⚠️ Send exactly <strong>${price} USDT</strong> on the <strong>{network}</strong> network only.</p>
                  <p>⚠️ Wrong network = lost funds. Double-check before sending.</p>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-gray-500 text-sm">
                <p className="text-2xl mb-2">⚙️</p>
                <p>Wallet address not configured yet.</p>
                <p className="text-xs mt-1">Contact support to get the wallet address.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: TXID submission ── */}
        <div className="space-y-4">
          <div className="rounded-2xl border p-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
            <h3 className="font-semibold text-white mb-4">3. Submit Your Transaction ID</h3>
            <p className="text-gray-400 text-sm mb-4">After sending, paste your TXID (transaction hash) below. We verify it on-chain automatically — usually within 30 seconds.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Your TXID / Transaction Hash</label>
                <textarea
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder={network === "TRC20" ? "e.g. a1b2c3d4e5f6…" : "e.g. 0xa1b2c3d4…"}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white font-mono placeholder-gray-600 outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
              <button onClick={submitPayment} disabled={submitting || !txHash.trim() || !selectedAddress}
                className="w-full py-4 rounded-xl font-bold text-[#0B0B0F] text-base hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
                style={{ background: "#F59E0B" }}>
                {submitting ? "Verifying on-chain…" : "🔍 Verify & Activate Lifetime"}
              </button>
            </div>

            {/* Result */}
            {submitResult && (
              <div className="mt-4 px-4 py-3 rounded-xl text-sm" style={submitResult.ok ? { background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#34d399" } : { background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.25)", color: "#f87171" }}>
                {submitResult.ok ? "✅ " : "✗ "}{submitResult.message}
              </div>
            )}
          </div>

          {/* Features */}
          <div className="rounded-2xl border p-5" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.07), rgba(249,115,22,0.05))", borderColor: "rgba(245,158,11,0.2)" }}>
            <h3 className="font-semibold text-white mb-4">💎 What You Get</h3>
            <ul className="space-y-2.5">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                  <span className="text-amber-400 shrink-0">✓</span>{f}
                </li>
              ))}
            </ul>
          </div>

          {/* Payment history */}
          {data && data.payments.length > 0 && (
            <div className="rounded-2xl border p-5" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)" }}>
              <h3 className="font-semibold text-white mb-3">My Submissions</h3>
              {data.payments.map((p) => {
                const s = PAYMENT_STATUS_STYLE[p.status] ?? PAYMENT_STATUS_STYLE.PENDING;
                return (
                  <div key={p.id} className="py-2.5 border-b last:border-0 flex items-center gap-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <span>{s.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-amber-400 truncate">{p.txHash}</p>
                      <p className="text-xs text-gray-600">{p.network} · {new Date(p.createdAt).toLocaleString()}</p>
                      {p.verifyError && <p className="text-xs text-red-400 mt-0.5">{p.verifyError}</p>}
                    </div>
                    <span className="text-xs font-semibold shrink-0" style={{ color: s.color }}>{p.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Trust signals */}
      <div className="grid sm:grid-cols-3 gap-4 text-center">
        {[
          ["🔍", "On-chain verified", "Your TXID is verified directly on TRON or BSC blockchain"],
          ["⚡", "Instant activation", "Lifetime access unlocks in under 60 seconds"],
          ["🔒", "No data needed", "No card info, no KYC — just your wallet"],
        ].map(([icon, title, desc]) => (
          <div key={String(title)} className="rounded-xl border p-4" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
            <div className="text-2xl mb-2">{icon}</div>
            <p className="font-semibold text-white text-sm mb-1">{title}</p>
            <p className="text-gray-500 text-xs">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
