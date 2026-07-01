import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

export default async function ReelsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24, maxWidth:1000 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:N.text, margin:"0 0 4px", letterSpacing:"-0.5px" }}>Reels</h1>
          <p style={{ fontSize:13, color:N.muted, margin:0, fontWeight:600 }}>Manage your campaigns across Instagram, TikTok, YouTube, Telegram, Facebook, and Twitter.</p>
        </div>
        <Link href="/reels/new" className="neo-btn" style={{
          padding:"10px 22px", borderRadius:12, fontSize:13, fontWeight:800, textDecoration:"none", color:"#ffffff",
          background: N.accentBg,
          boxShadow: N.raisedSm,
        }}>
          + Add Reel
        </Link>
      </div>

      {/* Empty State */}
      <div style={{
        borderRadius:20, padding:"64px 24px", background:N.bg, boxShadow:N.raised,
        display:"flex", flexDirection:"column", alignItems:"center", textAlign:"center", gap:12
      }}>
        <div style={{ fontSize:48, marginBottom:8 }}>🎬</div>
        <h3 style={{ fontSize:18, fontWeight:800, color:N.text, margin:0 }}>No reels added yet</h3>
        <p style={{ fontSize:13, color:N.muted, maxWidth:420, margin:"0 0 12px", lineHeight:1.7, fontWeight:600 }}>
          Paste an Instagram, TikTok, YouTube, Telegram, Facebook, or Twitter link to get started. We detect the platform automatically.
        </p>
        <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:10, marginBottom:16 }}>
          {[["📷","Instagram"],["🎵","TikTok"],["▶️","YouTube"],["✈️","Telegram"],["📘","Facebook"],["🐦","Twitter"]].map(([icon,name])=>(
            <span key={name} style={{
              padding:"6px 14px", borderRadius:20, fontSize:11, fontWeight:800, color:"#16a34a",
              background: N.bg,
              boxShadow: N.inset,
            }}>{icon} {name}</span>
          ))}
        </div>
        <Link href="/reels/new" className="neo-btn" style={{
          padding:"12px 28px", borderRadius:12, fontSize:13, fontWeight:800, textDecoration:"none", color:"#ffffff",
          background: N.accentBg,
          boxShadow: N.raisedSm,
        }}>
          Add Your First Reel →
        </Link>
      </div>
    </div>
  );
}
