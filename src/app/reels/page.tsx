import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ReelsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reels</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your Instagram, TikTok, and YouTube reels.</p>
        </div>
        <Link href="/reels/new" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#0B0B0F] hover:opacity-90 transition" style={{background:"#F59E0B"}}>
          + Add Reel
        </Link>
      </div>

      <div className="rounded-2xl border py-16 flex flex-col items-center text-center" style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.06)"}}>
        <div className="text-5xl mb-4">🎬</div>
        <h3 className="text-white font-semibold text-lg mb-2">No reels added yet</h3>
        <p className="text-gray-500 text-sm max-w-sm mb-6">Paste an Instagram Reel, TikTok, or YouTube Shorts URL to get started. We detect the platform automatically.</p>
        <div className="flex flex-wrap justify-center gap-2 mb-6 text-xs">
          {[["📷","Instagram"],["🎵","TikTok"],["▶️","YouTube"]].map(([icon,name])=>(
            <span key={name} className="px-3 py-1.5 rounded-full font-medium" style={{background:"rgba(52,211,153,0.12)",color:"#34d399",border:"1px solid rgba(52,211,153,0.25)"}}>{icon} {name}</span>
          ))}
        </div>
        <Link href="/reels/new" className="px-6 py-3 rounded-xl text-sm font-semibold text-[#0B0B0F] hover:opacity-90 transition" style={{background:"#F59E0B"}}>
          Add Your First Reel →
        </Link>
      </div>
    </div>
  );
}
