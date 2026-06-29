import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — YoyoSMM",
  description: "Read the Privacy Policy for using YoyoSMM. Details on how we secure your account details and campaign link inputs.",
};

const C = {
  bg:       "#eef2f7",
  text:     "#2d3748",
  textMuted:"#718096",
  amber:    "#d97706",
  raised:   "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm: "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  inset:    "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
  grad:     "linear-gradient(135deg, #d97706 0%, #ea580c 100%)",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen text-slate-800" style={{ background: C.bg, fontFamily: "sans-serif" }}>
      <style>{`
        .neo-btn:hover{transform:translateY(-1px);box-shadow:8px 8px 22px #c8d0e7,-8px -8px 22px #ffffff !important}
        .neo-btn:active{transform:none;box-shadow:inset 3px 3px 8px #c8d0e7,inset -1px -1px 4px #ffffff !important}
      `}</style>

      {/* Nav */}
      <nav className="border-b" style={{ background: "rgba(238,242,247,0.95)", borderColor: "rgba(200, 208, 231, 0.4)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white" style={{ background: C.grad, boxShadow: C.raisedSm }}>Y</div>
            <span className="font-extrabold text-slate-800">YoyoSMM</span>
          </Link>
          <Link href="/signup" className="px-5 py-2.5 rounded-full font-bold text-sm text-white no-underline neo-btn" style={{ background: C.grad, boxShadow: C.raisedSm }}>Get started →</Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-5xl font-black mb-6 leading-tight" style={{ color: C.text, letterSpacing: "-1.5px" }}>Privacy Policy</h1>
        <p className="text-xl font-medium mb-12" style={{ color: C.textMuted }}>Last updated: June 29, 2026</p>

        <div className="space-y-10">
          <section className="p-8 rounded-2xl" style={{ background: C.bg, boxShadow: C.raised }}>
            <h2 className="text-2xl font-black mb-4" style={{ color: C.text }}>1. Information We Collect</h2>
            <p className="leading-relaxed font-medium mb-4" style={{ color: C.textMuted }}>We collect only the essential details needed to operate your pacing campaigns and secure your wallet account:</p>
            <ul className="space-y-2 font-medium" style={{ paddingLeft: 0, listStyle: "none", color: C.textMuted }}>
              <li><strong style={{ color: C.text }}>• Account Data:</strong> Email, username, and password hashes for authentication.</li>
              <li><strong style={{ color: C.text }}>• Campaign Inputs:</strong> Instagram/TikTok video or reel URLs provided to track view delivery.</li>
              <li><strong style={{ color: C.text }}>• Billing Logs:</strong> UPI deposit reference numbers and transaction ledger logs.</li>
            </ul>
          </section>

          <section className="p-8 rounded-2xl" style={{ background: C.bg, boxShadow: C.raised }}>
            <h2 className="text-2xl font-black mb-4" style={{ color: C.text }}>2. How We Use Information</h2>
            <p className="leading-relaxed font-medium" style={{ color: C.textMuted }}>Your campaign URLs are used solely to forward views and engagement pacing tasks to SMM provider networks. We do not sell, rent, or profile your personal data or campaign targets.</p>
          </section>

          <section className="p-8 rounded-2xl" style={{ background: C.bg, boxShadow: C.raised }}>
            <h2 className="text-2xl font-black mb-4" style={{ color: C.text }}>3. Data Security</h2>
            <p className="leading-relaxed font-medium" style={{ color: C.textMuted }}>All database inputs (including passwords and transactions) are stored securely in PostgreSQL using cryptographic hashing. Communication with delivery routers runs via encrypted TLS protocols.</p>
          </section>

          <section className="p-8 rounded-2xl" style={{ background: C.bg, boxShadow: C.raised }}>
            <h2 className="text-2xl font-black mb-4" style={{ color: C.text }}>4. Policy Updates</h2>
            <p className="leading-relaxed font-medium" style={{ color: C.textMuted }}>We may update our Privacy Policy periodically. Continued use of the platform constitutes agreement to the current policies.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
