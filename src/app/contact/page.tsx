import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us — YoyoSMM",
  description: "Get in touch with the YoyoSMM support team. We are here to help you scale your organic pacing campaigns.",
};

const C = {
  bg:       "#eef2f7",
  text:     "#2d3748",
  textMuted:"#718096",
  amber:    "#d97706",
  amberLight: "rgba(217, 119, 6, 0.08)",
  raised:   "9px 9px 16px #c8d0e7, -9px -9px 16px #ffffff",
  raisedSm: "5px 5px 10px #c8d0e7, -5px -5px 10px #ffffff",
  inset:    "inset 6px 6px 10px #c8d0e7, inset -6px -6px 10px #ffffff",
  grad:     "linear-gradient(135deg, #d97706 0%, #ea580c 100%)",
};

export default function ContactPage() {
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
        <h1 className="text-5xl font-black mb-6 leading-tight" style={{ color: C.text, letterSpacing: "-1.5px" }}>Contact Us</h1>
        <p className="text-xl font-medium mb-12" style={{ color: C.textMuted }}>Have questions or need assistance? Reach out to our support team.</p>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Card 1: Support channels */}
          <div className="p-8 rounded-2xl" style={{ background: C.bg, boxShadow: C.raised }}>
            <h2 className="text-2xl font-black mb-6" style={{ color: C.text }}>Support Channel</h2>
            
            <div className="mb-6">
              <p style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>📧 Support Email</p>
              <a href="mailto:support@yoyosmm.online" className="text-lg font-bold no-underline hover:underline" style={{ color: C.amber }}>support@yoyosmm.online</a>
            </div>

            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>⚡ Average Response Time</p>
              <p className="text-lg font-bold" style={{ color: C.text, margin: 0 }}>Under 2 hours (24/7 Support)</p>
            </div>
          </div>

          {/* Card 2: Interactive Contact Form */}
          <div className="p-8 rounded-2xl" style={{ background: C.bg, boxShadow: C.raised }}>
            <h2 className="text-2xl font-black mb-6" style={{ color: C.text }}>Send a Message</h2>
            <form style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Your Name</label>
                <input type="text" placeholder="John Doe" required style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: C.bg, boxShadow: C.inset, fontSize: 14, color: C.text, outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Your Email</label>
                <input type="email" placeholder="john@example.com" required style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: C.bg, boxShadow: C.inset, fontSize: 14, color: C.text, outline: "none" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Message</label>
                <textarea rows={4} placeholder="How can we help you?" required style={{ width: "100%", padding: 12, borderRadius: 10, border: "none", background: C.bg, boxShadow: C.inset, fontSize: 14, color: C.text, outline: "none", resize: "none" }} />
              </div>
              <button type="submit" className="neo-btn" style={{ padding: 14, border: "none", borderRadius: 12, background: C.grad, color: "#ffffff", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: C.raisedSm, transition: "all 0.2s", marginTop: 8 }}>Send Message →</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
