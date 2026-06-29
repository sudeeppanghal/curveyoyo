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
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [network, setNetwork] = useState<Network>("TRC20");
  const [txHash, setTxHash] = useState("");
  const [upiAmount, setUpiAmount] = useState("");
  const [upiUtr, setUpiUtr] = useState("");
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

  const submitUpiPayment = async () => {
    const amt = parseFloat(upiAmount);
    if (isNaN(amt) || amt <= 0 || !upiUtr.trim()) return;
    setSubmitting(true); setSubmitResult(null);
    try {
      const res = await fetch("/api/billing/submit-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, utr: upiUtr.trim() })
      });
      const json = await res.json();
      setSubmitResult({ ok: json.ok, message: json.ok ? json.message : json.error ?? json.message });
      if (json.ok) { setUpiAmount(""); setUpiUtr(""); fetchData(); }
    } finally { setSubmitting(false); }
  };


  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:240 }}>
      <div style={{ width:36, height:36, borderRadius:"50%", border:"3px solid rgba(217,119,6,0.15)", borderTopColor:N.accent, animation:"spin 0.8s linear infinite" }}/>
    </div>
  );

  /* ── Wallet Mode UI ── */
  if (data?.walletMode) {
    const upiId = data.wallet.upiId;
    const upiQrCode = data.wallet.upiQrCode;
    const minDeposit = data.wallet.minDeposit;

    return (
      <div style={{ maxWidth:920, display:"flex", flexDirection:"column", gap:24 }}>
        <style>{`
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
          .neo-btn:hover{transform:translateY(-1px);box-shadow:8px 8px 22px #c8d0e7,-8px -8px 22px #ffffff !important}
          .neo-btn:active{transform:none;box-shadow:inset 3px 3px 8px #c8d0e7,inset -1px -1px 4px #ffffff !important}
          .neo-input:focus{box-shadow:inset 6px 6px 12px #c8d0e7,inset -6px -6px 12px #ffffff,0 0 0 2px rgba(217,119,6,0.25) !important;outline:none}
        `}</style>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:900, color:N.text, margin:"0 0 4px" }}>My Wallet</h1>
            <p style={{ fontSize:13, color:N.muted, margin:0, fontWeight:600 }}>Deposit funds via UPI to pay for campaigns instantly</p>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ padding:"8px 16px", borderRadius:16, background:N.bg, boxShadow:N.inset, display:"inline-flex", flexDirection:"column", alignItems:"flex-end" }}>
              <span style={{ fontSize:10, fontWeight:800, color:N.muted }}>WALLET BALANCE</span>
              <span style={{ fontSize:24, fontWeight:900, color:"#16a34a" }}>₹ {(data.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1.1fr 0.9fr", gap:24 }}>
          {/* Left Column: QR and Deposit Info */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ borderRadius:20, padding:24, background:N.bg, boxShadow:N.raised, display:"flex", flexDirection:"column", gap:16 }}>
              <h3 style={{ fontSize:14, fontWeight:850, color:N.text, margin:0 }}>1. Scan &amp; Pay via UPI</h3>
              
              {upiId ? (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:14, background:N.bg, boxShadow:N.inset }}>
                    <code style={{ flex:1, fontSize:12, color:N.accent, fontWeight:800, wordBreak:"break-all", fontFamily:"monospace" }}>{upiId}</code>
                    <CopyButton text={upiId}/>
                  </div>
                  
                  {upiQrCode ? (
                    <div style={{ display:"flex", justifyContent:"center", marginTop:10 }}>
                      <div style={{ padding:12, borderRadius:16, background:"#ffffff", boxShadow:N.raised }}>
                        <img src={upiQrCode} alt="UPI QR Code" style={{ maxWidth: 200, height: "auto", display: "block" }} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding:"24px", textAlign:"center", border:`1.5px dashed ${N.border}`, borderRadius:16 }}>
                      <p style={{ fontSize:12, color:N.muted, margin:0, fontWeight:600 }}>QR code not uploaded by admin.<br/>Please copy the UPI ID above to pay.</p>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding:"40px 0", textAlign:"center", border:`1.5px dashed ${N.border}`, borderRadius:16 }}>
                  <p style={{ fontSize:24, margin:0 }}>⚙️</p>
                  <p style={{ fontSize:13, color:N.muted, fontWeight:600, margin:"8px 0 0" }}>UPI deposits are temporarily unavailable.<br/><span style={{ fontSize:11 }}>Contact support for assistance.</span></p>
                </div>
              )}

              <div style={{ padding:"14px", borderRadius:12, background:N.bg, boxShadow:"inset 3px 3px 8px #c8d0e7,inset -2px -2px 5px #ffffff" }}>
                <p style={{ fontSize:11, color:N.accent, margin:"0 0 6px", fontWeight:700 }}>⚠️ Minimum deposit is <strong>₹{minDeposit}</strong>. Deposits below ₹{minDeposit} will not be approved.</p>
                <p style={{ fontSize:11, color:N.accent, margin:0, fontWeight:700 }}>⚠️ Ensure you copy the <strong>12-digit UTR number</strong> after payment to submit below.</p>
              </div>
            </div>
          </div>

          {/* Right Column: Submit UTR Form & History */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ borderRadius:20, padding:24, background:N.bg, boxShadow:N.raised, display:"flex", flexDirection:"column", gap:16 }}>
              <h3 style={{ fontSize:14, fontWeight:850, color:N.text, margin:0 }}>2. Submit Deposit Request</h3>
              
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:800, color:N.muted, marginBottom:6 }}>DEPOSIT AMOUNT (INR)</label>
                  <input type="number" placeholder={`Minimum ₹${minDeposit}`} value={upiAmount} onChange={e => setUpiAmount(e.target.value)}
                    style={{ width:"100%", padding:"12px 14px", borderRadius:12, fontSize:13, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow:N.inset }}
                    className="neo-input" />
                </div>

                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:800, color:N.muted, marginBottom:6 }}>UTR / TRANSACTION ID (12 DIGITS)</label>
                  <input type="text" placeholder="e.g. 320495810234" value={upiUtr} onChange={e => setUpiUtr(e.target.value)}
                    style={{ width:"100%", padding:"12px 14px", borderRadius:12, fontSize:13, background:N.bg, border:"none", color:N.text, outline:"none", boxShadow:N.inset, fontFamily:"monospace" }}
                    className="neo-input" />
                </div>

                <button onClick={submitUpiPayment} disabled={submitting || !upiAmount || !upiUtr.trim() || !upiId} className="neo-btn"
                  style={{ width:"100%", padding:"14px", borderRadius:12, fontSize:13, fontWeight:850, border:"none", color:"#ffffff", background:"linear-gradient(135deg,#d97706,#ea580c)", boxShadow:N.raisedSm, cursor:"pointer", opacity: (submitting || !upiAmount || !upiUtr.trim() || !upiId) ? 0.5 : 1 }}>
                  {submitting ? "Submitting Request…" : "Submit Deposit Request"}
                </button>
              </div>

              {submitResult && (
                <div style={{ padding:"12px 14px", borderRadius:12, fontSize:12, fontWeight:800, background:N.bg, boxShadow: submitResult.ok ? "inset 3px 3px 8px rgba(52,211,153,0.2),inset -2px -2px 5px #ffffff" : "inset 3px 3px 8px rgba(220,38,38,0.2),inset -2px -2px 5px #ffffff", color: submitResult.ok ? "#16a34a" : "#dc2626" }}>
                  {submitResult.message}
                </div>
              )}
            </div>

            {/* UPI Deposit Requests History */}
            {data.payments.length > 0 && (
              <div style={{ borderRadius:20, padding:24, background:N.bg, boxShadow:N.raised, display:"flex", flexDirection:"column", gap:14 }}>
                <h3 style={{ fontSize:14, fontWeight:850, color:N.text, margin:0 }}>My Deposit Requests</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {data.payments.map((p: any) => {
                    const statusStyles: Record<string, { color: string; bg: string; label: string }> = {
                      PENDING:   { color: "#d97706", bg: "rgba(217,119,6,0.08)",   label: "Pending Verification" },
                      CONFIRMED: { color: "#16a34a", bg: "rgba(22,163,74,0.08)",   label: "Approved & Credited" },
                      REJECTED:  { color: "#dc2626", bg: "rgba(220,38,38,0.08)",   label: "Rejected" },
                    };
                    const s = statusStyles[p.status] ?? statusStyles.PENDING;
                    return (
                      <div key={p.id} style={{ padding:"12px", borderRadius:12, background:N.bg, boxShadow:N.raisedSm, display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                        <div>
                          <p style={{ fontSize:13, fontWeight:900, color:N.text, margin:0 }}>₹ {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                          <p style={{ fontSize:10, fontFamily:"monospace", color:N.muted, margin:"2px 0 0" }}>UTR: {p.utr}</p>
                          <p style={{ fontSize:9, color:N.muted, margin:"2px 0 0", fontWeight:600 }}>{new Date(p.createdAt).toLocaleString()}</p>
                          {p.rejectedReason && p.status === "REJECTED" && (
                            <p style={{ fontSize:10, color:"#dc2626", margin:"4px 0 0", fontWeight:700 }}>Reason: {p.rejectedReason}</p>
                          )}
                        </div>
                        <span style={{ fontSize:10, fontWeight:900, padding:"4px 8px", borderRadius:6, color:s.color, background:s.bg }}>
                          {s.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Legacy Own API Mode UI ── */
  return (
    <div style={{ maxWidth:620, display:"flex", flexDirection:"column", gap:20 }}>
      <h1 style={{ fontSize:22, fontWeight:900, color:N.text, margin:0 }}>Billing</h1>
      <div style={{ borderRadius:24, padding:"48px 32px", background:N.bg, boxShadow:N.raised, textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔌</div>
        <h2 style={{ fontSize:22, fontWeight:900, color:N.text, margin:"0 0 10px" }}>Independent SMM Panel Mode</h2>
        <p style={{ fontSize:14, color:N.muted, margin:"0 0 24px", fontWeight:600 }}>
          You are operating in developer mode. Your campaigns route through SMM panels you connect, using your own API credentials.
        </p>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"10px 20px", borderRadius:20, fontSize:13, fontWeight:800, color:N.accent, background:N.bg, boxShadow:N.inset }}>
          💎 FREE UNLIMITED LIFETIME ACCESS
        </div>
      </div>
    </div>
  );
}

