import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — YoyoSMM",
  description: "Read the Terms of Service for using YoyoSMM. Information about wallet balance usage, pacing delivery campaigns, and refund rules.",
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

export default function TermsPage() {
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
        <h1 className="text-5xl font-black mb-6 leading-tight" style={{ color: C.text, letterSpacing: "-1.5px" }}>Terms of Service</h1>
        <p className="text-xl font-medium mb-12" style={{ color: C.textMuted }}>Last updated: June 29, 2026</p>

        <div className="space-y-10">
          <section className="p-8 rounded-2xl" style={{ background: C.bg, boxShadow: C.raised }}>
            <h2 className="text-2xl font-black mb-4" style={{ color: C.text }}>1. Agreement to Terms</h2>
            <p className="leading-relaxed font-medium" style={{ color: C.textMuted }}>By accessing and using YoyoSMM, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
          </section>

          <section className="p-8 rounded-2xl" style={{ background: C.bg, boxShadow: C.raised }}>
            <h2 className="text-2xl font-black mb-4" style={{ color: C.text }}>2. Wallet &amp; Billing</h2>
            <p className="leading-relaxed font-medium mb-4" style={{ color: C.textMuted }}>YoyoSMM operates on a pre-funded wallet balance model. You must deposit funds into your account (minimum ₹500 via UPI) to place organic delivery pacing campaigns.</p>
            <p className="leading-relaxed font-medium" style={{ color: C.textMuted }}><strong>Refund Policy:</strong> All deposits made to your wallet balance are final. We do not support refunds once a balance is successfully credited or partially used for active campaigns.</p>
          </section>

          <section className="p-8 rounded-2xl" style={{ background: C.bg, boxShadow: C.raised }}>
            <h2 className="text-2xl font-black mb-4" style={{ color: C.text }}>3. Service Pacing &amp; Completion</h2>
            <p className="leading-relaxed font-medium mb-4" style={{ color: C.textMuted }}>Our proprietary pacing engine dispatches views, likes, saves, and shares according to your chosen logistic curve style. Pacing schedules are approximations and can be impacted by social platform traffic fluctuations.</p>
            <p className="leading-relaxed font-medium" style={{ color: C.textMuted }}>Engagement batches trigger automatically only once they meet our provider minimum threshold limits. Any remainder engagement is always flushed to completion during the final campaign hour.</p>
          </section>

          <section className="p-8 rounded-2xl" style={{ background: C.bg, boxShadow: C.raised }}>
            <h2 className="text-2xl font-black mb-4" style={{ color: C.text }}>4. Account Security</h2>
            <p className="leading-relaxed font-medium" style={{ color: C.textMuted }}>You are responsible for keeping your login credentials confidential and securing your account. YoyoSMM is not liable for unauthorized access or usage of your wallet balance.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
