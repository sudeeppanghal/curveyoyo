import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isRedirectError } from "next/dist/client/components/redirect-error";

// Must be dynamic — uses cookies() for Supabase auth session
export const dynamic = "force-dynamic";

const C = {
  border: "rgba(255,255,255,0.07)",
  card: "rgba(255,255,255,0.025)",
  amber: "#F59E0B",
  text: "#ffffff",
  muted: "#94a3b8",
  faint: "#475569",
};

const STATS = [
  { label:"Views Delivered", value:"0", sub:"This month",      icon:"📊", color:"#F59E0B" },
  { label:"Active Orders",   value:"0", sub:"Running now",     icon:"⚡", color:"#34d399" },
  { label:"Panels Connected",value:"0", sub:"Go connect one →",icon:"🔌", color:"#818cf8" },
  { label:"Reels Added",     value:"0", sub:"Add your first →",icon:"🎬", color:"#f472b6" },
];

const QUICK = [
  ["🔌","Connect SMM Panel", "/panels"],
  ["🎬","Add Reel URL",       "/reels"],
  ["📋","View All Orders",    "/orders"],
  ["📈","Analytics",          "/analytics"],
];

export default async function DashboardPage() {
  let userName = "Operator";
  let userEmail = "";

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) redirect("/login");
    userName = data.user.user_metadata?.name || data.user.email?.split("@")[0] || "Operator";
    userEmail = data.user.email || "";
  } catch (err) {
    // Re-throw Next.js redirect errors — they must not be swallowed
    if (isRedirectError(err)) throw err;
    // Any other error (e.g. missing env var) → send to login
    console.error("[Dashboard] Auth error:", err);
    redirect("/login");
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = userName;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24, maxWidth:1200 }}>

      {/* ── Welcome banner ── */}
      <div style={{ borderRadius:20, padding:"28px 32px", position:"relative", overflow:"hidden", background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.18)" }}>
        <div style={{ position:"absolute", top:-10, right:16, fontSize:100, opacity:0.08, lineHeight:1, pointerEvents:"none", userSelect:"none" }}>🚀</div>
        <div style={{ position:"relative" }}>
          <p style={{ fontSize:12, fontWeight:700, color:C.amber, marginBottom:6, margin:"0 0 6px" }}>⏳ 1-Day Free Trial Active</p>
          <h2 style={{ fontSize:28, fontWeight:800, color:C.text, margin:"0 0 8px", letterSpacing:"-0.5px" }}>
            {greeting}, {name} 👋
          </h2>
          <p style={{ fontSize:14, color:C.muted, margin:"0 0 20px" }}>
            Your organic delivery engine is ready. Connect your first SMM panel to get started.
          </p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
            <Link href="/panels" style={{ padding:"10px 20px", borderRadius:10, fontSize:13, fontWeight:700, textDecoration:"none", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#08080c" }}>
              🔌 Connect a Panel →
            </Link>
            <Link href="/reels/new" style={{ padding:"10px 20px", borderRadius:10, fontSize:13, fontWeight:600, textDecoration:"none", color:C.muted, border:`1px solid ${C.border}`, background:"rgba(255,255,255,0.03)" }}>
              🎬 Add First Reel
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
        {STATS.map(({ label, value, sub, icon, color }) => (
          <div key={label} style={{ padding:"20px 20px", borderRadius:16, border:`1px solid ${C.border}`, background:C.card }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <span style={{ fontSize:22 }}>{icon}</span>
              <div style={{ width:8, height:8, borderRadius:"50%", background:color }} />
            </div>
            <p style={{ fontSize:32, fontWeight:800, color:C.text, margin:"0 0 4px", letterSpacing:"-1px" }}>{value}</p>
            <p style={{ fontSize:13, fontWeight:600, color:C.text, margin:"0 0 4px" }}>{label}</p>
            <p style={{ fontSize:12, color:C.faint, margin:0 }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Two-col: orders + actions ── */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20 }}>

        {/* Recent orders */}
        <div style={{ borderRadius:20, border:`1px solid ${C.border}`, background:C.card, overflow:"hidden" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:`1px solid ${C.border}` }}>
            <h3 style={{ fontWeight:700, fontSize:15, color:C.text, margin:0 }}>Recent Orders</h3>
            <Link href="/orders" style={{ fontSize:12, color:C.amber, textDecoration:"none" }}>View all →</Link>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"56px 24px", textAlign:"center" }}>
            <div style={{ width:52, height:52, borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, marginBottom:14, background:"rgba(255,255,255,0.04)" }}>📋</div>
            <p style={{ fontWeight:600, fontSize:15, color:C.text, margin:"0 0 6px" }}>No orders yet</p>
            <p style={{ fontSize:13, color:C.muted, margin:"0 0 20px" }}>Connect a panel and add a reel to place your first order.</p>
            <Link href="/reels/new" style={{ padding:"10px 20px", borderRadius:10, fontSize:13, fontWeight:700, textDecoration:"none", background:"linear-gradient(135deg,#F59E0B,#F97316)", color:"#08080c" }}>
              Create First Order →
            </Link>
          </div>
        </div>

        {/* Right col */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Quick actions */}
          <div style={{ borderRadius:20, border:`1px solid ${C.border}`, background:C.card, padding:"16px 16px" }}>
            <h3 style={{ fontWeight:700, fontSize:14, color:C.text, margin:"0 0 14px" }}>Quick Actions</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              {QUICK.map(([icon, label, href]) => (
                <Link key={href} href={href} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, fontSize:13, textDecoration:"none", color:C.muted, transition:"all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = C.text; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = C.muted; }}>
                  <span style={{ fontSize:16 }}>{icon}</span>
                  <span>{label}</span>
                  <span style={{ marginLeft:"auto", color:C.faint }}>→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Panel status */}
          <div style={{ borderRadius:20, border:`1px solid ${C.border}`, background:C.card, padding:"16px 16px" }}>
            <h3 style={{ fontWeight:700, fontSize:14, color:C.text, margin:"0 0 14px" }}>Panel Status</h3>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"16px 0", textAlign:"center" }}>
              <div style={{ fontSize:28, marginBottom:8 }}>🔌</div>
              <p style={{ fontSize:12, color:C.faint, margin:"0 0 8px" }}>No panels connected yet</p>
              <Link href="/panels" style={{ fontSize:12, color:C.amber, textDecoration:"none" }}>Add your first panel →</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart area ── */}
      <div style={{ borderRadius:20, border:`1px solid ${C.border}`, background:C.card, padding:"20px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <h3 style={{ fontWeight:700, fontSize:15, color:C.text, margin:0 }}>Views Delivered — Last 7 Days</h3>
          <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.faint }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:C.amber, display:"inline-block" }} />
            Views
          </div>
        </div>
        <PlaceholderChart />
        <p style={{ textAlign:"center", fontSize:12, color:C.faint, marginTop:12, margin:"12px 0 0" }}>
          No delivery data yet — place your first order to see live curves
        </p>
      </div>

    </div>
  );
}

function PlaceholderChart() {
  const W = 600, H = 120, pad = 10;
  const pts = Array.from({ length: 28 }, (_, i) => ({
    x: pad + (i / 27) * (W - 2 * pad),
    y: H - pad - 3,
  }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ opacity:0.18 }}>
      <path d={d} fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="6 4" />
    </svg>
  );
}
