import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

/* ── mock data for empty state dashboard ── */
const MOCK_STATS = [
  { label:"Views Delivered", value:"0", sub:"This month", icon:"📊", color:"#F59E0B" },
  { label:"Active Orders", value:"0", sub:"Running now", icon:"⚡", color:"#34d399" },
  { label:"Panels Connected", value:"0", sub:"Go connect one →", icon:"🔌", color:"#818cf8" },
  { label:"Reels Added", value:"0", sub:"Add your first reel →", icon:"🎬", color:"#f472b6" },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = user.user_metadata?.name || user.email?.split("@")[0] || "Operator";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8 max-w-6xl">

      {/* ── Welcome banner ── */}
      <div className="rounded-2xl p-6 sm:p-8 relative overflow-hidden" style={{background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.2)"}}>
        <div className="absolute top-0 right-0 text-8xl opacity-10 select-none pointer-events-none">🚀</div>
        <div className="relative">
          <p className="text-sm text-amber-400 font-medium mb-1">⏳ 1-Day Free Trial Active</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">{greeting}, {name} 👋</h2>
          <p className="text-gray-400 text-sm mb-5">Your organic delivery engine is ready. Connect your first SMM panel to get started.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/panels" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#0B0B0F] hover:opacity-90 transition" style={{background:"#F59E0B"}}>
              🔌 Connect a Panel →
            </Link>
            <Link href="/reels/new" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/10 transition border" style={{borderColor:"rgba(255,255,255,0.1)"}}>
              🎬 Add First Reel
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_STATS.map(({label,value,sub,icon,color}) => (
          <div key={label} className="rounded-2xl border p-5 transition-all hover:border-white/10" style={{background:"rgba(255,255,255,0.03)",borderColor:"rgba(255,255,255,0.06)"}}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{icon}</span>
              <div className="w-2 h-2 rounded-full" style={{background:color}} />
            </div>
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-sm font-medium text-white mt-0.5">{label}</p>
            <p className="text-xs text-gray-500 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Main two-col layout ── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Recent orders (placeholder) */}
        <div className="lg:col-span-2 rounded-2xl border" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.06)"}}>
          <div className="flex items-center justify-between p-5 border-b" style={{borderColor:"rgba(255,255,255,0.06)"}}>
            <h3 className="font-semibold text-white">Recent Orders</h3>
            <Link href="/orders" className="text-xs text-amber-400 hover:underline">View all →</Link>
          </div>
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4" style={{background:"rgba(255,255,255,0.05)"}}>📋</div>
            <p className="text-white font-medium mb-1">No orders yet</p>
            <p className="text-gray-500 text-sm mb-5">Connect a panel and add a reel to place your first order.</p>
            <Link href="/reels/new" className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#0B0B0F] hover:opacity-90 transition" style={{background:"#F59E0B"}}>
              Create First Order →
            </Link>
          </div>
        </div>

        {/* Quick actions + panel status */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="rounded-2xl border p-5" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.06)"}}>
            <h3 className="font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[["🔌","Connect SMM Panel","/panels"],["🎬","Add Reel URL","/reels"],["📋","View All Orders","/orders"],["📈","Analytics","/analytics"]].map(([icon,label,href])=>(
                <Link key={href} href={href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                  <span>{icon}</span>{label}
                  <span className="ml-auto text-gray-600">→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Panel status */}
          <div className="rounded-2xl border p-5" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.06)"}}>
            <h3 className="font-semibold text-white mb-4">Panel Status</h3>
            <div className="flex flex-col items-center py-4 text-center">
              <div className="text-3xl mb-2">🔌</div>
              <p className="text-sm text-gray-500">No panels connected yet</p>
              <Link href="/panels" className="mt-3 text-xs text-amber-400 hover:underline">Add your first panel →</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Delivery curve chart (live placeholder) ── */}
      <div className="rounded-2xl border p-6" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.06)"}}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-white">Views Delivered — Last 7 Days</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Views
          </div>
        </div>
        <PlaceholderChart />
        <p className="text-center text-gray-600 text-xs mt-4">No delivery data yet — place your first order to see live curves</p>
      </div>
    </div>
  );
}

function PlaceholderChart() {
  const w = 600, h = 100, pad = 8;
  const pts = Array.from({length:30},(_,i) => ({
    x: pad + (i/29)*(w-2*pad),
    y: h - pad - 2,
  }));
  const d = pts.map((p,i)=>`${i===0?"M":"L"} ${p.x} ${p.y}`).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="opacity-20">
      <path d={d} fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="6 4" />
    </svg>
  );
}
