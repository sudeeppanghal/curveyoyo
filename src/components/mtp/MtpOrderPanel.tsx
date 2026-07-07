/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useCallback } from "react";
import { N } from "@/lib/theme";

interface MtpService {
  id: string;
  serviceId: string;
  name: string;
  category: string;
  type: string;
  customRate: number;
  minOrder: number;
  maxOrder: number;
}

interface MtpOrderPanelProps {
  userBalance: number;
}

export function MtpOrderPanel({ userBalance }: MtpOrderPanelProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [services, setServices] = useState<MtpService[]>([]);
  const [allServices, setAllServices] = useState<MtpService[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedService, setSelectedService] = useState<MtpService | null>(null);
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Load services (public — uses a dedicated user-facing route)
  const loadServices = useCallback(async () => {
    try {
      // Fetch first 200 services — for user panel we paginate aggressively
      const res = await fetch("/api/mtp/services/public");
      if (!res.ok) return;
      const data = await res.json();
      const svcs: MtpService[] = data.services ?? [];
      setAllServices(svcs);
      const cats = Array.from(new Set(svcs.map((s) => s.category))).sort();
      setCategories(cats);
      if (cats.length) {
        setSelectedCategory(cats[0]);
        setServices(svcs.filter((s) => s.category === cats[0]));
        const first = svcs.find((s) => s.category === cats[0]);
        if (first) {
          setSelectedService(first);
          setQuantity(first.minOrder);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadServices(); }, [loadServices]);

  // Load user's MTP orders
  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/mtp/order");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders ?? []);
      }
    } catch { /* ignore */ }
    setOrdersLoading(false);
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  function onCategoryChange(cat: string) {
    setSelectedCategory(cat);
    const filtered = allServices.filter((s) => s.category === cat);
    setServices(filtered);
    const first = filtered[0] ?? null;
    setSelectedService(first);
    if (first) setQuantity(first.minOrder);
    setResult(null);
  }

  function onServiceChange(serviceId: string) {
    const svc = allServices.find((s) => s.serviceId === serviceId) ?? null;
    setSelectedService(svc);
    if (svc) setQuantity(svc.minOrder);
    setResult(null);
  }

  const cost = selectedService && quantity > 0
    ? parseFloat(((quantity / 1000) * selectedService.customRate).toFixed(2))
    : 0;

  const canOrder = selectedService && link.trim() && quantity >= (selectedService?.minOrder ?? 1)
    && quantity <= (selectedService?.maxOrder ?? 999999999) && userBalance >= cost && !placing;

  async function placeOrder() {
    if (!canOrder || !selectedService) return;
    setPlacing(true);
    setResult(null);
    try {
      const res = await fetch("/api/mtp/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: selectedService.serviceId, link: link.trim(), quantity }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult({ ok: true, message: `✅ Order placed! ID: ${data.orderId} · Cost: ₹${data.cost} · New balance: ₹${(data.newBalance ?? 0).toFixed(2)}` });
        setLink("");
        setQuantity(selectedService.minOrder);
        loadOrders();
      } else {
        setResult({ ok: false, message: data.error ?? "Failed to place order." });
      }
    } catch {
      setResult({ ok: false, message: "Network error. Please try again." });
    }
    setPlacing(false);
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: N.muted }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
        <p style={{ fontSize: 14, fontWeight: 600 }}>Loading services…</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`
        .mtp-select:focus { outline: none; box-shadow: inset 5px 5px 10px #c8d0e7, inset -3px -3px 8px #fff, 0 0 0 2px rgba(217,119,6,0.3); }
        .mtp-input:focus { outline: none; box-shadow: inset 5px 5px 10px #c8d0e7, inset -3px -3px 8px #fff, 0 0 0 2px rgba(217,119,6,0.3); }
        .mtp-btn-place:disabled { opacity: 0.5; cursor: not-allowed; }
        .mtp-btn-place:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(217,119,6,0.45) !important; }
        .mtp-btn-place { transition: all 0.2s; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Order Form */}
      <div style={{ background: N.bg, borderRadius: 24, padding: 28, boxShadow: N.raised }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: N.accentBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: "0 4px 12px rgba(217,119,6,0.3)" }}>
            ⚡
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: N.text, margin: 0 }}>Place New Order</h2>
            <p style={{ fontSize: 12, color: N.muted, margin: 0 }}>Choose a service and enter the target link</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {/* Category */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: N.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Platform / Category
            </label>
            <select
              className="mtp-select"
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12,
                border: `1px solid ${N.border}`, background: N.bg,
                boxShadow: N.inset, fontSize: 13, color: N.text,
                cursor: "pointer",
              }}
            >
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Service */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: N.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Service
            </label>
            <select
              className="mtp-select"
              value={selectedService?.serviceId ?? ""}
              onChange={(e) => onServiceChange(e.target.value)}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12,
                border: `1px solid ${N.border}`, background: N.bg,
                boxShadow: N.inset, fontSize: 13, color: N.text,
                cursor: "pointer",
              }}
            >
              {services.map((s) => (
                <option key={s.serviceId} value={s.serviceId}>
                  {s.name} — ₹{s.customRate.toFixed(2)}/1K
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Service info */}
        {selectedService && (
          <div style={{ background: N.bg, boxShadow: N.inset, borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 800, color: N.muted, textTransform: "uppercase" }}>Min Order</span>
              <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 800, color: N.text }}>{selectedService.minOrder.toLocaleString()}</p>
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 800, color: N.muted, textTransform: "uppercase" }}>Max Order</span>
              <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 800, color: N.text }}>{selectedService.maxOrder.toLocaleString()}</p>
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 800, color: N.muted, textTransform: "uppercase" }}>Price</span>
              <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 800, color: "#d97706" }}>₹{selectedService.customRate.toFixed(2)} per 1,000</p>
            </div>
            <div>
              <span style={{ fontSize: 10, fontWeight: 800, color: N.muted, textTransform: "uppercase" }}>Type</span>
              <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: N.text }}>{selectedService.type}</p>
            </div>
          </div>
        )}

        {/* Link */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: N.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Target URL / Link
          </label>
          <input
            className="mtp-input"
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://www.instagram.com/p/..."
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 12,
              border: `1px solid ${N.border}`, background: N.bg,
              boxShadow: N.inset, fontSize: 13, color: N.text,
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Quantity + Cost */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: N.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Quantity
            </label>
            <input
              className="mtp-input"
              type="number"
              value={quantity}
              min={selectedService?.minOrder ?? 1}
              max={selectedService?.maxOrder ?? 999999}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 12,
                border: `1px solid ${N.border}`, background: N.bg,
                boxShadow: N.inset, fontSize: 13, color: N.text,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: N.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Total Cost
            </label>
            <div style={{
              padding: "12px 16px", borderRadius: 12, background: N.bg,
              boxShadow: N.inset, display: "flex", alignItems: "center",
            }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: cost > userBalance ? "#dc2626" : "#16a34a" }}>
                ₹{cost.toFixed(2)}
              </span>
              {cost > userBalance && (
                <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, marginLeft: 8 }}>
                  Insufficient balance
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Balance */}
        <div style={{ marginBottom: 20, fontSize: 12, color: N.muted, fontWeight: 600 }}>
          Wallet balance: <strong style={{ color: N.text }}>₹{userBalance.toFixed(2)}</strong>
        </div>

        {/* Result message */}
        {result && (
          <div style={{
            padding: "12px 16px", borderRadius: 12, marginBottom: 16, fontSize: 13, fontWeight: 700,
            background: result.ok ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)",
            color: result.ok ? "#16a34a" : "#dc2626",
            boxShadow: N.insetSm,
          }}>
            {result.message}
          </div>
        )}

        {/* Place Order Button */}
        <button
          className="mtp-btn-place"
          onClick={placeOrder}
          disabled={!canOrder}
          style={{
            width: "100%", padding: "16px", borderRadius: 14, border: "none",
            background: N.accentBg, color: "#fff", fontSize: 15, fontWeight: 900,
            cursor: canOrder ? "pointer" : "not-allowed",
            boxShadow: "0 8px 24px rgba(217,119,6,0.35)",
            letterSpacing: "0.04em",
          }}
        >
          {placing ? "⏳ Placing order…" : "⚡ Place Order"}
        </button>
      </div>

      {/* Orders History */}
      <div style={{ background: N.bg, borderRadius: 24, padding: 28, boxShadow: N.raised }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: N.text, margin: 0 }}>📦 My Orders</h3>
          <button
            onClick={loadOrders}
            style={{ background: "none", border: "none", color: N.muted, cursor: "pointer", fontSize: 13, fontWeight: 700 }}
          >
            ↺ Refresh
          </button>
        </div>

        {ordersLoading && <p style={{ textAlign: "center", color: N.muted, fontSize: 13 }}>Loading…</p>}

        {!ordersLoading && orders.length === 0 && (
          <p style={{ textAlign: "center", color: N.muted, fontSize: 13, padding: "20px 0" }}>
            No orders yet. Place your first order above!
          </p>
        )}

        {orders.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${N.border}` }}>
                  {["Service", "Category", "Qty", "Cost", "Status", "Date"].map((h) => (
                    <th key={h} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 800, color: N.muted, textAlign: "left", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => {
                  const statusColor = o.status === "COMPLETED" ? "#16a34a" : o.status === "FAILED" ? "#dc2626" : o.status === "PROCESSING" ? "#d97706" : N.muted;
                  return (
                    <tr key={o.id} style={{ borderBottom: `1px solid ${N.border}` }}>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: N.text, fontWeight: 600, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {o.serviceName}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 11, color: N.muted }}>{o.category}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: N.text, fontWeight: 700 }}>{o.quantity.toLocaleString()}</td>
                      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 800, color: "#d97706" }}>₹{o.costInr.toFixed(2)}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: statusColor, background: `${statusColor}18`, padding: "3px 8px", borderRadius: 6 }}>
                          {o.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 11, color: N.muted }}>
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
