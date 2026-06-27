"use client";
import { useEffect, useState, useCallback } from "react";
import QRCode from "qrcode";

const N = {
  bg:       "#eef2f7",
  raised:   "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm: "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  inset:    "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
  accent:   "#d97706",
  accentBg: "linear-gradient(135deg, #d97706, #ea580c)",
  text:     "#2d3748",
  muted:    "#718096",
  border:   "rgba(200, 208, 231, 0.4)",
};

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
  PENDING:   { color:"#d97706", label:"Pending — not yet confirmed", icon:"⏳" },
  VERIFYING: { color:"#4f46e5", label:"Verifying on-chain…",        icon:"🔍" },
  CONFIRMED: { color:"#16a34a", label:"Confirmed — Access Granted",  icon:"✅" },
  FAILED:    { color:"#dc2626", label:"Failed — see error",          icon:"✗" },
  REJECTED:  { color:"#dc2626", label:"Rejected by admin",           icon:"✗" },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); };
  return (
    <button onClick={copy} style={{ padding:"7px 14px", borderRadius:10, fontSize:12, fontWeight:700, border:"none", cursor:"pointer", transition:"all 0.2s", background:N.bg, color: copied ? "#16a34a" : N.text, boxShadow: copied ? N.inset : N.raisedSm }} className="neo-btn">
      {copied ? "✓ Copied!" : "Copy"}
    </button>
  );
}

function QRDisplay({ address, network }: { address: string; network: Network }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(address, { width:180, margin:2, color:{ dark:"#000000", light:"#ffffff" } }).then(setSrc);
  }, [address]);
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
      {src ? (
        <div style={{ padding:10, borderRadius:14, background:"#ffffff", boxShadow:N.raised }}>
          <img src={src} alt={`${network} QR`} width={160} height={160} />
        </div>
      ) : (
        <div style={{ width:180, height:180, borderRadius:14, background:N.bg, boxShadow:N.inset, animation:"pulse 2s infinite" }}/>
      )}
      <p style={{ fontSize:11, color:N.muted, fontWeight:600 }}>Scan to get address</p>
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
    setSubmitting(true); setSubmitResult(null);
    try {
      const res = await fetch("/api/billing/submit-payment", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ txHash:txHash.trim(), network }) });
      const json = await res.json();
      setSubmitResult({ ok: json.ok, message: json.ok ? json.message : json.error ?? json.message });
      if (json.ok) { setTxHash(""); fetchData(); }
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:240 }}>
      <div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid rgba(217,119,6,0.15)", borderTopColor:N.accent, animation:"spin 0.8s linear infinite" }}/>
    </div>
  );

  /* ── Already lifetime ── */
  if (data?.lifetimeUnlocked) return (
    <div style={{ maxWidth:620, display:"flex", flexDirection:"column", gap:20 }}>
      <h1 style={{ fontSize:22, fontWeight:900, color:N.text, margin:0 }}>Billing</h1>
      <div style={{ borderRadius:24, padding:"48px 32px", background:N.bg, boxShadow:N.raised, textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🎉</div>
        <h2 style={{ fontSize:22, fontWeight:900, color:N.text, margin:"0 0 10px" }}>You have Lifetime Access!</h2>
        <p style={{ fontSize:14, color:N.muted, margin:"0 0 24px", fontWeight:600 }}>No renewals. No limits. All features unlocked forever.</p>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 20px", borderRadius:20, fontSize:13, fontWeight:800, color:"#16a34a", background:N.bg, boxShadow:N.inset }}>
          💎 LIFETIME MEMBER
        </div>
      </div>
      {data.payments.length > 0 && (
        <div style={{ borderRadius:20, padding:24, background:N.bg, boxShadow:N.raised }}>
          <h3 style={{ fontSize:14, fontWeight:800, color:N.text, margin:"0 0 16px" }}>Payment History</h3>
          {data.payments.map(p => {
            const s = PAYMENT_STATUS_STYLE[p.status] ?? PAYMENT_STATUS_STYLE.PENDING;
            return (
              <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:`1px solid ${N.border}` }}>
                <span>{s.icon}</span>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:11, fontFamily:"monospace", color:N.accent, margin:"0 0 2px" }}>{p.txHash.slice(0,24)}…</p>
                  <p style={{ fontSize:11, color:N.muted, margin:0, fontWeight:600 }}>{p.network} · {new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <span style={{ fontSize:12, fontWeight:800, color:s.color }}>{p.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  /* ── Not yet paid ── */
  const selectedAddress = network === "TRC20" ? data?.wallet.trc20 : data?.wallet.bep20;
  const price = data?.wallet.priceUsdt ?? 20;

  return (
    <div style={{ maxWidth:920, display:"flex", flexDirection:"column", gap:24 }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .neo-btn:hover{transform:translateY(-1px);box-shadow:8px 8px 22px #c8d0e7,-8px -8px 22px #ffffff !important}
        .neo-btn:active{transform:none;box-shadow:inset 3px 3px 8px #c8d0e7,inset -1px -1px 4px #ffffff !important}
        .neo-input:focus{box-shadow:inset 6px 6px 12px #c8d0e7,inset -6px -6px 12px #ffffff,0 0 0 2px rgba(217,119,6,0.25) !important;outline:none}
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:N.text, margin:"0 0 4px" }}>Upgrade to Lifetime</h1>
          <p style={{ fontSize:13, color:N.muted, margin:0, fontWeight:600 }}>One-time USDT payment — never pay again</p>
        </div>
        <div style={{ textAlign:"right" }}>
          <p style={{ fontSize:36, fontWeight:900, color:N.text, margin:"0 0 2px", letterSpacing:"-1px" }}>${price} <span style={{ fontSize:14, fontWeight:400, color:N.muted }}>USDT</span></p>
          <p style={{ fontSize:11, fontWeight:800, color:"#16a34a", margin:0 }}>One-time · No subscription</p>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {/* Left: Payment form */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Network selector */}
          <div style={{ borderRadius:20, padding:24, background:N.bg, boxShadow:N.raised }}>
            <h3 style={{ fontSize:13, fontWeight:800, color:N.text, margin:"0 0 16px" }}>1. Choose Network</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {(["TRC20","BEP20"] as Network[]).map(n => (
                <button key={n} onClick={() => setNetwork(n)}
                  style={{ padding:"14px 8px", borderRadius:14, fontSize:12, fontWeight:800, border:"none", cursor:"pointer", transition:"all 0.2s", fontFamily:"inherit", color: network === n ? N.accent : N.muted, background:N.bg, boxShadow: network === n ? N.raisedSm : N.inset }}>
                  <div style={{ fontSize:18, marginBottom:6 }}>{n === "TRC20" ? "🔷" : "🔶"}</div>
                  USDT {n}
                  <div style={{ fontSize:10, fontWeight:600, marginTop:3, opacity:0.7 }}>{n === "TRC20" ? "TRON network" : "BSC network"}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Wallet address */}
          <div style={{ borderRadius:20, padding:24, background:N.bg, boxShadow:N.raised }}>
            <h3 style={{ fontSize:13, fontWeight:800, color:N.text, margin:"0 0 16px" }}>2. Send ${price} USDT to This Address</h3>
            {selectedAddress ? (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:14, marginBottom:16, background:N.bg, boxShadow:N.inset }}>
                  <code style={{ flex:1, fontSize:11, color:N.accent, wordBreak:"break-all", fontFamily:"monospace" }}>{selectedAddress}</code>
                  <CopyButton text={selectedAddress}/>
                </div>
                <div style={{ display:"flex", justifyContent:"center" }}>
                  <QRDisplay address={selectedAddress} network={network}/>
                </div>
                <div style={{ marginTop:16, padding:"12px 14px", borderRadius:12, background:N.bg, boxShadow:"inset 3px 3px 8px #c8d0e7,inset -2px -2px 5px #ffffff" }}>
                  <p style={{ fontSize:11, color:N.accent, margin:"0 0 4px", fontWeight:700 }}>⚠️ Send exactly <strong>${price} USDT</strong> on the <strong>{network}</strong> network only.</p>
                  <p style={{ fontSize:11, color:N.accent, margin:0, fontWeight:700 }}>⚠️ Wrong network = lost funds. Double-check before sending.</p>
                </div>
              </>
            ) : (
              <div style={{ padding:"40px 0", textAlign:"center" }}>
                <p style={{ fontSize:24, marginBottom:8 }}>⚙️</p>
                <p style={{ fontSize:13, color:N.muted, fontWeight:600 }}>Wallet address not configured yet.<br/><span style={{ fontSize:11 }}>Contact support to get the wallet address.</span></p>
              </div>
            )}
          </div>
        </div>

        {/* Right: TXID + Features */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* TXID submission */}
          <div style={{ borderRadius:20, padding:24, background:N.bg, boxShadow:N.raised }}>
            <h3 style={{ fontSize:13, fontWeight:800, color:N.text, margin:"0 0 10px" }}>3. Submit Your Transaction ID</h3>
            <p style={{ fontSize:12, color:N.muted, margin:"0 0 16px", fontWeight:600 }}>After sending, paste your TXID below. We verify it on-chain automatically — usually within 30 seconds.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.08em" }}>TXID / Transaction Hash</label>
                <textarea
                  value={txHash} onChange={e => setTxHash(e.target.value)}
                  placeholder={network === "TRC20" ? "e.g. a1b2c3d4e5f6…" : "e.g. 0xa1b2c3d4…"}
                  rows={3}
                  style={{ width:"100%", padding:"12px 14px", borderRadius:12, fontSize:12, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow:N.inset, fontFamily:"monospace", resize:"none", transition:"box-shadow 0.2s" }}
                  className="neo-input"
                />
              </div>
              <button onClick={submitPayment} disabled={submitting || !txHash.trim() || !selectedAddress} className="neo-btn"
                style={{ width:"100%", padding:"14px", borderRadius:14, fontSize:14, fontWeight:800, border:"none", color:"#ffffff", background:"linear-gradient(135deg,#d97706,#ea580c)", boxShadow:N.raisedSm, transition:"all 0.2s", opacity: (submitting || !txHash.trim() || !selectedAddress) ? 0.5 : 1 }}>
                {submitting ? "Verifying on-chain…" : "🔍 Verify & Activate Lifetime"}
              </button>
            </div>
            {submitResult && (
              <div style={{ marginTop:14, padding:"12px 14px", borderRadius:12, fontSize:13, fontWeight:800, background:N.bg, boxShadow: submitResult.ok ? "inset 3px 3px 8px rgba(52,211,153,0.2),inset -2px -2px 5px #ffffff" : "inset 3px 3px 8px rgba(220,38,38,0.2),inset -2px -2px 5px #ffffff", color: submitResult.ok ? "#16a34a" : "#dc2626" }}>
                {submitResult.ok ? "✅ " : "✗ "}{submitResult.message}
              </div>
            )}
          </div>

          {/* Features */}
          <div style={{ borderRadius:20, padding:24, background:N.bg, boxShadow:N.raised }}>
            <h3 style={{ fontSize:13, fontWeight:800, color:N.accent, margin:"0 0 16px" }}>💎 What You Get</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {FEATURES.map(f => (
                <div key={f} style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:24, height:24, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, background:N.bg, boxShadow:N.inset, flexShrink:0, color:N.accent, fontWeight:900 }}>✓</div>
                  <span style={{ fontSize:13, color:N.text, fontWeight:600 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment history */}
          {data && data.payments.length > 0 && (
            <div style={{ borderRadius:20, padding:24, background:N.bg, boxShadow:N.raised }}>
              <h3 style={{ fontSize:13, fontWeight:800, color:N.text, margin:"0 0 14px" }}>My Submissions</h3>
              {data.payments.map(p => {
                const s = PAYMENT_STATUS_STYLE[p.status] ?? PAYMENT_STATUS_STYLE.PENDING;
                return (
                  <div key={p.id} style={{ padding:"10px 0", borderBottom:`1px solid ${N.border}`, display:"flex", alignItems:"flex-start", gap:10 }}>
                    <span>{s.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:11, fontFamily:"monospace", color:N.accent, margin:"0 0 2px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.txHash}</p>
                      <p style={{ fontSize:11, color:N.muted, margin:0, fontWeight:600 }}>{p.network} · {new Date(p.createdAt).toLocaleString()}</p>
                      {p.verifyError && <p style={{ fontSize:11, color:"#dc2626", margin:"3px 0 0", fontWeight:700 }}>{p.verifyError}</p>}
                    </div>
                    <span style={{ fontSize:11, fontWeight:800, flexShrink:0, color:s.color }}>{p.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Trust signals */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, textAlign:"center" }}>
        {[
          ["🔍", "On-chain verified", "TXID verified directly on TRON or BSC"],
          ["⚡", "Instant activation", "Lifetime access unlocks in under 60 seconds"],
          ["🔒", "No data needed", "No card info, no KYC — just your wallet"],
        ].map(([icon, title, desc]) => (
          <div key={String(title)} style={{ borderRadius:16, padding:"20px 14px", background:N.bg, boxShadow:N.raised }}>
            <div style={{ width:42, height:42, borderRadius:13, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, background:N.bg, boxShadow:N.raisedSm, margin:"0 auto 12px" }}>{icon}</div>
            <p style={{ fontSize:12, fontWeight:800, color:N.text, margin:"0 0 5px" }}>{title}</p>
            <p style={{ fontSize:11, color:N.muted, margin:0, fontWeight:600 }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
