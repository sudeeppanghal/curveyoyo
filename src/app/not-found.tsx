import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B0B0F" }}>
      <div className="text-center">
        <p className="text-8xl font-black mb-4" style={{ background: "linear-gradient(135deg, #F59E0B, #F97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          404
        </p>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-gray-500 mb-8">This page doesn&apos;t exist or you don&apos;t have access.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard" className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#0B0B0F] hover:opacity-90 transition" style={{ background: "#F59E0B" }}>
            Dashboard
          </Link>
          <Link href="/" className="px-5 py-2.5 rounded-xl text-sm text-gray-400 border hover:bg-white/5 transition" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
