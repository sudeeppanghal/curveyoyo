const fs = require('fs');
let data = fs.readFileSync('src/app/admin/page.tsx', 'utf-8');

// 1. Remove `whiteSpace: "nowrap"` from all table cells to prevent horizontal scrolling
data = data.replace(/whiteSpace:\s*["']nowrap["']/g, 'wordBreak: "break-word"');

// 1b. Fix tables minWidth that force horizontal scrolling
data = data.replace(/minWidth:\s*900/g, 'width: "100%"');
data = data.replace(/minWidth:\s*1000/g, 'width: "100%"');
data = data.replace(/minWidth:\s*800/g, 'width: "100%"');

// 2. Add "failed_orders" to AdminTab type
data = data.replace(
  /type AdminTab = "settings" \| "users" \| "payments" \| "upi_payments" \| "admin_panels" \| "campaigns" \| "system" \| "tickets" \| "affiliates" \| "blogs" \| "auto_sync";/,
  'type AdminTab = "settings" | "users" | "payments" | "upi_payments" | "admin_panels" | "campaigns" | "failed_orders" | "system" | "tickets" | "affiliates" | "blogs" | "auto_sync";'
);

// 3. Add "failed_orders" to the tabs array
data = data.replace(
  /\(\["settings", "users", "payments", "upi_payments", "admin_panels", "campaigns", "system", "tickets", "affiliates", "blogs", "auto_sync"\] as AdminTab\[\]\)/,
  '(["settings", "users", "payments", "upi_payments", "admin_panels", "campaigns", "failed_orders", "system", "tickets", "affiliates", "blogs", "auto_sync"] as AdminTab[])'
);

// 4. Add icon mapping
data = data.replace(
  /campaigns:\s*"📦 ",/,
  'campaigns: "📦 ",\n              failed_orders: "🚨 ",'
);

// 5. Add the failed_orders tab UI content.
const failedOrdersCode = `
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
                  <tr style={{ borderBottom: \`2px solid \${N.border}\`, color: N.muted }}>
                    {["Order ID & Reel", "User", "Error Reason", "Status", "Actions"].map((h) => (
                      <th key={h} style={{ padding: "12px 24px", fontSize: 12, fontWeight: 800, textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.filter(o => o.status === "FAILED").map(o => (
                    <tr key={o.id} style={{ borderBottom: \`1px solid \${N.border}\` }}>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: N.text }}>{o.id}</div>
                        <a href={o.reel.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: N.accent, wordBreak: "break-all" }}>
                          {o.reel.url.substring(0, 30)}...
                        </a>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: N.text }}>{o.user.name || "Unknown"}</div>
                        <div style={{ fontSize: 11, color: N.muted }}>{o.user.email}</div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <div style={{ padding: "8px 12px", background: "rgba(220,38,38,0.1)", color: "#dc2626", borderRadius: 8, fontSize: 12, fontWeight: 700, wordBreak: "break-word" }}>
                          {o.failReason || "No specific reason logged (check panel)"}
                        </div>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#dc2626", background: "rgba(220, 38, 38, 0.1)", padding: "4px 10px", borderRadius: 20 }}>FAILED</span>
                      </td>
                      <td style={{ padding: "16px 24px" }}>
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
`;

data = data.replace('{tab === "system" && (', failedOrdersCode + '\n        {tab === "system" && (');

fs.writeFileSync('src/app/admin/page.tsx', data);
console.log('Fixed admin panel styles and added Failed Orders tab!');
