"use client";
import { useState, useEffect } from "react";
import { N } from "@/lib/theme";

interface AnnouncementsTabProps {
  secret: string;
}

export function AnnouncementsTab({ secret }: AnnouncementsTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [form, setForm] = useState({
    imageUrl: "",
    title: "",
    description: "",
    targetLink: "",
    offerEnabled: false,
    minDeposit: 2000,
    bonusPercent: 100,
    endsAt: "",
  });

  useEffect(() => {
    fetchAnnouncement();
  }, []);

  const fetchAnnouncement = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        headers: { "x-admin-secret": secret || localStorage.getItem("yoyo_admin_secret") || "" }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.announcement) {
          const a = data.announcement;
          // Format date for datetime-local input (YYYY-MM-DDThh:mm)
          let endsAtFormatted = "";
          if (a.endsAt) {
            const date = new Date(a.endsAt);
            // offset timezone to match local timezone input
            const tzOffset = date.getTimezoneOffset() * 60000;
            const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
            endsAtFormatted = localISOTime;
          }
          setForm({
            imageUrl: a.imageUrl || "",
            title: a.title || "",
            description: a.description || "",
            targetLink: a.targetLink || "",
            offerEnabled: !!a.offerEnabled,
            minDeposit: a.minDeposit !== undefined ? Number(a.minDeposit) : 2000,
            bonusPercent: a.bonusPercent !== undefined ? Number(a.bonusPercent) : 100,
            endsAt: endsAtFormatted,
          });
        }
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": secret || localStorage.getItem("yoyo_admin_secret") || ""
        },
        body: JSON.stringify({
          ...form,
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null
        })
      });
      if (res.ok) {
        setMessage({ type: "success", text: "✓ Announcement & Promotion settings saved successfully!" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to save settings." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred." });
    } finally {
      setSaving(false);
    }
  };

  const setDemoBanner = () => {
    setForm(prev => ({
      ...prev,
      imageUrl: "/promo_deposit_banner.png",
      title: "100% DEPOSIT BONUS!",
      description: "Deposit ₹2,000 or more & get 100% bonus balance instantly! Offer is valid for 1 week.",
      targetLink: "/dashboard/billing",
      offerEnabled: true,
      minDeposit: 2000,
      bonusPercent: 100,
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }));
  };

  if (loading) {
    return <p style={{ color: N.muted, fontWeight: 700, fontSize: 14 }}>Loading announcements configuration...</p>;
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: N.text, margin: 0 }}>📢 Dashboard Announcement System</h2>
          <p style={{ fontSize: 13, color: N.muted, margin: "4px 0 0", fontWeight: 600 }}>
            Configure the promotion banner, texts, links, and the 100% deposit bonus offer countdown
          </p>
        </div>
        <button
          onClick={setDemoBanner}
          style={{
            padding: "8px 16px",
            borderRadius: 12,
            background: "rgba(168, 85, 247, 0.1)",
            color: "#a855f7",
            border: "1.5px solid rgba(168, 85, 247, 0.2)",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: N.raisedSm
          }}
        >
          ✨ Load Default Promo Banner
        </button>
      </div>

      {message.text && (
        <div style={{
          padding: "12px 18px",
          borderRadius: 12,
          background: message.type === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
          color: message.type === "success" ? "#16a34a" : "#ef4444",
          border: `1.5px solid ${message.type === "success" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
          fontSize: 13,
          fontWeight: 700,
          marginBottom: 20
        }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* LEFT: Banner details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20, borderRadius: 16, background: N.bg, boxShadow: N.inset }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: N.text, margin: "0 0 8px" }}>Banner Assets & Texts</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: N.muted }}>BANNER IMAGE URL</label>
              <input
                type="text"
                value={form.imageUrl}
                onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="/promo_deposit_banner.png"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 12, background: N.bg, border: "none", color: N.text, outline: "none", boxShadow: N.raisedSm, boxSizing: "border-box", fontWeight: 700 }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: N.muted }}>OFFER TITLE</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="100% DEPOSIT BONUS!"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 12, background: N.bg, border: "none", color: N.text, outline: "none", boxShadow: N.raisedSm, boxSizing: "border-box", fontWeight: 700 }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: N.muted }}>DESCRIPTION TEXT</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Deposit ₹2,000 or more & get 100% bonus balance instantly!"
                rows={3}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 12, background: N.bg, border: "none", color: N.text, outline: "none", boxShadow: N.raisedSm, boxSizing: "border-box", fontWeight: 700, fontFamily: "inherit" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: N.muted }}>ACTION LINK (REDIRECT URL)</label>
              <input
                type="text"
                value={form.targetLink}
                onChange={e => setForm({ ...form, targetLink: e.target.value })}
                placeholder="/dashboard/billing"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 12, background: N.bg, border: "none", color: N.text, outline: "none", boxShadow: N.raisedSm, boxSizing: "border-box", fontWeight: 700 }}
              />
            </div>
          </div>

          {/* RIGHT: Promotion Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 20, borderRadius: 16, background: N.bg, boxShadow: N.inset }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: N.text, margin: "0 0 8px" }}>Bonus & Offer Configuration</h3>

            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 10, background: N.bg, boxShadow: N.raisedSm }}>
              <input
                type="checkbox"
                id="offerEnabled"
                checked={form.offerEnabled}
                onChange={e => setForm({ ...form, offerEnabled: e.target.checked })}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <label htmlFor="offerEnabled" style={{ fontSize: 12, fontWeight: 800, color: N.text, cursor: "pointer" }}>
                Enable Deposit Bonus Promotion
              </label>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: N.muted }}>MINIMUM DEPOSIT LIMIT (INR)</label>
              <input
                type="number"
                value={form.minDeposit}
                onChange={e => setForm({ ...form, minDeposit: Number(e.target.value) })}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 12, background: N.bg, border: "none", color: N.text, outline: "none", boxShadow: N.raisedSm, boxSizing: "border-box", fontWeight: 700 }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: N.muted }}>BONUS PERCENTAGE (%)</label>
              <input
                type="number"
                value={form.bonusPercent}
                onChange={e => setForm({ ...form, bonusPercent: Number(e.target.value) })}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 12, background: N.bg, border: "none", color: N.text, outline: "none", boxShadow: N.raisedSm, boxSizing: "border-box", fontWeight: 700 }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: N.muted }}>OFFER COUNTDOWN EXPIRY (LOCAL TIME)</label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={e => setForm({ ...form, endsAt: e.target.value })}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 12, background: N.bg, border: "none", color: N.text, outline: "none", boxShadow: N.raisedSm, boxSizing: "border-box", fontWeight: 700 }}
              />
            </div>
          </div>
        </div>

        {/* Live Preview section */}
        {form.imageUrl && (
          <div style={{ padding: 20, borderRadius: 16, background: N.bg, boxShadow: N.raisedSm, display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: N.muted }}>BANNER IMAGE PREVIEW</span>
            <div style={{ borderRadius: 12, overflow: "hidden", border: `1.5px solid ${N.border}`, background: "#0c0d12", display: "flex", justifyContent: "center" }}>
              <img src={form.imageUrl} alt="Banner Preview" style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain" }} />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            alignSelf: "flex-end",
            padding: "12px 28px",
            borderRadius: 12,
            background: saving ? N.muted : "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 14,
            border: "none",
            cursor: saving ? "default" : "pointer",
            boxShadow: saving ? "none" : N.raisedSm,
            transition: "all 0.2s ease"
          }}
        >
          {saving ? "Saving settings..." : "💾 Save Changes"}
        </button>
      </form>
    </div>
  );
}
