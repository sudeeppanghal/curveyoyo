"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const N = {
  bg:       "#eef2f7",
  raised:   "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm: "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  inset:    "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
  accent:   "#d97706",
  text:     "#2d3748",
  muted:    "#718096",
  border:   "rgba(200, 208, 231, 0.4)",
};

function StatCard({ label, value, sub, icon }: { label:string; value:string|number; sub:string; icon:string }) {
  return (
    <div style={{ padding:"20px", borderRadius:20, background:N.bg, boxShadow:N.raised, display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:13, fontWeight:700, color:N.muted }}>{label}</span>
        <span style={{ fontSize:20 }}>{icon}</span>
      </div>
      <div style={{ fontSize:26, fontWeight:900, color:N.text, letterSpacing:"-0.5px" }}>{value}</div>
      <div style={{ fontSize:12, fontWeight:600, color:N.accent }}>{sub}</div>
    </div>
  );
}

export default function AffiliatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/affiliate/stats")
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:N.bg, padding:"40px 24px", display:"flex", justifyContent:"center", alignItems:"center", fontFamily:"Inter,sans-serif" }}>
        <div style={{ padding:"24px 40px", borderRadius:20, background:N.bg, boxShadow:N.raised, fontSize:16, fontWeight:800, color:N.accent }}>
          ⚡ Loading VIP Affiliate Portal...
        </div>
      </div>
    );
  }

  if (!data || !data.affiliate) {
    return (
      <div style={{ minHeight:"100vh", background:N.bg, padding:"40px 24px", display:"flex", flexDirection:"column", gap:20, justifyContent:"center", alignItems:"center", fontFamily:"Inter,sans-serif" }}>
        <div style={{ padding:"32px 40px", borderRadius:20, background:N.bg, boxShadow:N.raised, textAlign:"center", maxWidth:450 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
          <h2 style={{ margin:"0 0 10px", fontSize:20, color:N.text }}>Affiliate Portal Access</h2>
          <p style={{ fontSize:14, color:N.muted, marginBottom:20 }}>You do not currently have VIP affiliate partner access enabled on your account.</p>
          <Link href="/dashboard" style={{ display:"inline-block", padding:"12px 24px", borderRadius:12, background:N.accent, color:"#fff", fontWeight:800, textDecoration:"none", boxShadow:N.raisedSm }}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { affiliate, referredUsers, transactions } = data;
  const affiliateLink = typeof window !== "undefined" ? `${window.location.origin}/?ref=${affiliate.affiliateCode}` : `https://www.yoyosmm.online/?ref=${affiliate.affiliateCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(affiliateLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{ minHeight:"100vh", background:N.bg, padding:"32px 24px", fontFamily:"'Inter',sans-serif", color:N.text }}>
      <div style={{ maxWidth:1100, margin:"0 auto" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:32, flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <span style={{ fontSize:24 }}>🤝</span>
              <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:N.text, letterSpacing:"-0.5px" }}>VIP Affiliate Portal</h1>
              <span style={{ padding:"4px 12px", borderRadius:999, fontSize:11, fontWeight:800, background:"rgba(217,119,6,0.15)", color:N.accent }}>
                20% COMMISSION PARTNER
              </span>
            </div>
            <p style={{ margin:0, fontSize:14, color:N.muted, fontWeight:600 }}>
              Partner account: <span style={{ color:N.text, fontWeight:800 }}>{affiliate.email}</span> (Code: <span style={{ color:N.accent, fontWeight:900 }}>{affiliate.affiliateCode}</span>)
            </p>
          </div>
          <div style={{ display:"flex", gap:12 }}>
            <Link href="/dashboard" style={{ padding:"12px 20px", borderRadius:14, background:N.bg, boxShadow:N.raisedSm, color:N.text, fontWeight:800, fontSize:14, textDecoration:"none" }}>
              ← Dashboard
            </Link>
          </div>
        </div>

        {/* Affiliate Link Box */}
        <div style={{ padding:"24px", borderRadius:24, background:N.bg, boxShadow:N.raised, marginBottom:32 }}>
          <div style={{ fontSize:14, fontWeight:800, color:N.text, marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
            <span>🔗 Your Exclusive Referral Link</span>
            <span style={{ fontSize:12, fontWeight:600, color:N.muted }}>— Earn 20% cash commission on every deposit made by referred users!</span>
          </div>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <input
              type="text"
              readOnly
              value={affiliateLink}
              style={{ flex:1, minWidth:260, padding:"14px 18px", borderRadius:14, background:N.bg, border:"none", boxShadow:N.inset, fontSize:14, fontWeight:700, color:N.accent, outline:"none" }}
            />
            <button
              onClick={copyLink}
              style={{ padding:"14px 28px", borderRadius:14, background:copied ? "#16a34a" : N.accent, color:"#fff", border:"none", fontWeight:800, fontSize:14, cursor:"pointer", boxShadow:N.raisedSm, transition:"all 0.2s" }}
            >
              {copied ? "✅ Copied!" : "📋 Copy Affiliate Link"}
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:20, marginBottom:36 }}>
          <StatCard label="Total Clicks" value={affiliate.clicks || 0} sub="Visitors via your link" icon="🖱️" />
          <StatCard label="Referred Users" value={referredUsers?.length || 0} sub="Registered accounts" icon="👥" />
          <StatCard label="Total Commission" value={`₹${(affiliate.earnings || 0).toFixed(2)}`} sub="20% deposit earnings" icon="💰" />
          <StatCard label="Current Wallet Balance" value={`₹${(affiliate.balance || 0).toFixed(2)}`} sub="Available to spend / withdraw" icon="💳" />
        </div>

        {/* Referred Users Section */}
        <div style={{ marginBottom:36 }}>
          <h2 style={{ fontSize:20, fontWeight:900, color:N.text, marginBottom:16 }}>👥 Your Referred Users ({referredUsers?.length || 0})</h2>
          <div style={{ borderRadius:24, background:N.bg, boxShadow:N.raised, overflow:"hidden" }}>
            {!referredUsers || referredUsers.length === 0 ? (
              <div style={{ padding:"40px", textAlign:"center", color:N.muted, fontWeight:600, fontSize:14 }}>
                No users have signed up with your affiliate link yet. Share your link above to start earning!
              </div>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"left" }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${N.border}` }}>
                      <th style={{ padding:"16px 20px", fontSize:13, fontWeight:800, color:N.muted }}>User Name</th>
                      <th style={{ padding:"16px 20px", fontSize:13, fontWeight:800, color:N.muted }}>Email</th>
                      <th style={{ padding:"16px 20px", fontSize:13, fontWeight:800, color:N.muted }}>Current Balance</th>
                      <th style={{ padding:"16px 20px", fontSize:13, fontWeight:800, color:N.muted }}>Joined Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referredUsers.map((u: any, i: number) => (
                      <tr key={u.id || i} style={{ borderBottom: i < referredUsers.length - 1 ? `1px solid ${N.border}` : "none" }}>
                        <td style={{ padding:"16px 20px", fontSize:14, fontWeight:700 }}>{u.name || "User"}</td>
                        <td style={{ padding:"16px 20px", fontSize:14, fontWeight:600, color:N.muted }}>{u.email}</td>
                        <td style={{ padding:"16px 20px", fontSize:14, fontWeight:800, color:"#16a34a" }}>₹{Number(u.balance || 0).toFixed(2)}</td>
                        <td style={{ padding:"16px 20px", fontSize:13, fontWeight:600, color:N.muted }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Commission History */}
        <div>
          <h2 style={{ fontSize:20, fontWeight:900, color:N.text, marginBottom:16 }}>📈 Commission Transaction Log</h2>
          <div style={{ borderRadius:24, background:N.bg, boxShadow:N.raised, overflow:"hidden" }}>
            {!transactions || transactions.length === 0 ? (
              <div style={{ padding:"40px", textAlign:"center", color:N.muted, fontWeight:600, fontSize:14 }}>
                No commissions earned yet. When a referred user deposits balance via UPI or Crypto, your 20% commission will appear here instantly!
              </div>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"left" }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${N.border}` }}>
                      <th style={{ padding:"16px 20px", fontSize:13, fontWeight:800, color:N.muted }}>Date</th>
                      <th style={{ padding:"16px 20px", fontSize:13, fontWeight:800, color:N.muted }}>Type</th>
                      <th style={{ padding:"16px 20px", fontSize:13, fontWeight:800, color:N.muted }}>Referred User</th>
                      <th style={{ padding:"16px 20px", fontSize:13, fontWeight:800, color:N.muted }}>Deposit Amount</th>
                      <th style={{ padding:"16px 20px", fontSize:13, fontWeight:800, color:N.muted }}>Your Commission (20%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx: any, i: number) => (
                      <tr key={tx.id || i} style={{ borderBottom: i < transactions.length - 1 ? `1px solid ${N.border}` : "none" }}>
                        <td style={{ padding:"16px 20px", fontSize:13, fontWeight:600, color:N.muted }}>{new Date(tx.createdAt).toLocaleString()}</td>
                        <td style={{ padding:"16px 20px" }}>
                          <span style={{ padding:"4px 10px", borderRadius:999, fontSize:11, fontWeight:800, background:tx.type === "DEPOSIT" ? "rgba(22,163,74,0.15)" : "rgba(37,99,235,0.15)", color:tx.type === "DEPOSIT" ? "#16a34a" : "#2563eb" }}>
                            {tx.type}
                          </span>
                        </td>
                        <td style={{ padding:"16px 20px", fontSize:14, fontWeight:700 }}>{tx.referredUser?.email || "User"}</td>
                        <td style={{ padding:"16px 20px", fontSize:14, fontWeight:700 }}>₹{Number(tx.amountDeposit || 0).toFixed(2)}</td>
                        <td style={{ padding:"16px 20px", fontSize:15, fontWeight:900, color:"#16a34a" }}>+₹{Number(tx.commissionEarned || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
