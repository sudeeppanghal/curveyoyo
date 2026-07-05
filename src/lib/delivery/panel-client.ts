import { decrypt } from "@/lib/crypto";

export interface PanelOrderRequest {
  apiUrl: string;
  apiKeyEncrypted: string;
  serviceId: string; // Panel's service ID for the view type
  link: string;      // Reel URL
  quantity: number;
}

export interface PanelOrderResponse {
  ok: boolean;
  orderId?: string;
  error?: string;
  rawResponse?: unknown;
  usedServiceId?: string; // Which service ID actually worked
}

export interface PanelBalanceResponse {
  ok: boolean;
  balance?: number;
  currency?: string;
  error?: string;
}

// ─── Error classification ──────────────────────────────────────────────────
// Returns how we should respond to a panel error:
//   "retry_rounded"  → round qty to nearest minQty and retry same service
//   "next_service"   → this service is dead, try fallback service ID
//   "panel_down"     → entire panel is down, caller should switch panels
//   "user_error"     → bad link / invalid URL — don't retry
//   "fatal"          → unknown / give up

type ErrorClass =
  | "retry_rounded"
  | "next_service"
  | "panel_down"
  | "user_error"
  | "fatal";

function classifyError(errMsg: string): ErrorClass {
  const e = errMsg.toLowerCase();

  // Qty mismatch — panel requires exact multiples (e.g. TikTok views Min=100)
  if (
    e.includes("amount") || e.includes("quantity") ||
    e.includes("doesn't match") || e.includes("does not match") ||
    e.includes("invalid quantity") || e.includes("minimum")
  ) return "retry_rounded";

  // Dead service — service was removed / disabled on the panel
  if (
    e.includes("incorrect service") || e.includes("invalid service") ||
    e.includes("service not found") || e.includes("service id") ||
    e.includes("no such service") || e.includes("service disabled")
  ) return "next_service";

  // Panel is completely down — API key, balance, or connectivity issue
  if (
    e.includes("invalid api") || e.includes("invalid key") ||
    e.includes("api key") || e.includes("not enough") ||
    e.includes("insufficient") || e.includes("balance") ||
    e.includes("timeout") || e.includes("http 5") || e.includes("http 4")
  ) return "panel_down";

  // Bad user input — wrong URL format
  if (
    e.includes("invalid link") || e.includes("invalid url") ||
    e.includes("link not found") || e.includes("incorrect link") ||
    e.includes("url not found")
  ) return "user_error";

  return "fatal";
}

// ─── Core: place order on panel ───────────────────────────────────────────

async function _placeSingleOrder(
  apiUrl: string,
  apiKey: string,
  serviceId: string,
  link: string,
  quantity: number
): Promise<PanelOrderResponse> {
  const body = new URLSearchParams({
    key: apiKey,
    action: "add",
    service: serviceId,
    link,
    quantity: quantity.toString(),
  });

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

    const text = await res.text();
    let data: Record<string, unknown>;
    try { data = JSON.parse(text); } catch {
      return { ok: false, error: "Non-JSON response from panel" };
    }

    if (data.error) {
      return { ok: false, error: String(data.error), rawResponse: data };
    }

    const orderId = String(data.order ?? data.id ?? data.order_id ?? "");
    return { ok: true, orderId, rawResponse: data, usedServiceId: serviceId };

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort") || msg.includes("timeout")) {
      return { ok: false, error: "Panel timeout (>12s)" };
    }
    return { ok: false, error: msg };
  }
}

/**
 * Place a view order on a single SMM panel.
 * Standard SMM panel REST API (action=add).
 */
export async function placePanelOrder(req: PanelOrderRequest): Promise<PanelOrderResponse> {
  const apiKey = decrypt(req.apiKeyEncrypted);
  return _placeSingleOrder(req.apiUrl, apiKey, req.serviceId, req.link, req.quantity);
}

/**
 * placeOrderWithFallback — The heart of the hybrid system.
 *
 * Tries the primary service ID first. On failure, classifies the error and:
 *   - "retry_rounded"  → rounds qty to nearest minQty multiple, retries same service once
 *   - "next_service"   → cycles through fallbackServiceIds in order
 *   - "panel_down"     → returns immediately so caller can switch panels
 *   - "user_error"     → returns immediately so caller can surface error to user
 *   - "fatal"          → cycles through fallbacks as last resort
 *
 * This means a running order NEVER stops because a single service ID was changed
 * or disabled on the SMM panel.
 */
export async function placeOrderWithFallback(opts: {
  apiUrl: string;
  apiKeyEncrypted: string;
  primaryServiceId: string;
  fallbackServiceIds: string[];
  link: string;
  quantity: number;
  minQuantity?: number;       // panel's minimum batch for this service
}): Promise<PanelOrderResponse & { errorClass?: ErrorClass }> {
  const apiKey = decrypt(opts.apiKeyEncrypted);
  const minQty = opts.minQuantity ?? 10;

  const allServiceIds = [opts.primaryServiceId, ...opts.fallbackServiceIds.filter(
    id => id && id !== opts.primaryServiceId
  )];

  let lastError = "";
  let lastClass: ErrorClass = "fatal";

  for (let i = 0; i < allServiceIds.length; i++) {
    const svcId = allServiceIds[i];
    let qty = opts.quantity;

    // ── Attempt 1: exact quantity ───────────────────────────────
    const r1 = await _placeSingleOrder(opts.apiUrl, apiKey, svcId, opts.link, qty);
    if (r1.ok) return { ...r1, usedServiceId: svcId };

    const errClass = classifyError(r1.error ?? "");
    lastError = r1.error ?? "Unknown error";
    lastClass = errClass;

    // If panel is down or user error, don't waste time on other services
    if (errClass === "panel_down" || errClass === "user_error") {
      return { ok: false, error: lastError, errorClass: errClass };
    }

    // ── Attempt 2 (same service): rounded quantity ──────────────
    if (errClass === "retry_rounded") {
      // Round up to nearest multiple of minQty (e.g. 443 → 500 if minQty=100)
      const rounded = Math.ceil(qty / minQty) * minQty;
      if (rounded !== qty) {
        const r2 = await _placeSingleOrder(opts.apiUrl, apiKey, svcId, opts.link, rounded);
        if (r2.ok) return { ...r2, usedServiceId: svcId };
        // If still fails after rounding, move to next service
        lastError = r2.error ?? lastError;
        lastClass = classifyError(r2.error ?? "");
      }
    }

    // If this was a next_service or fatal class, or rounding also failed,
    // loop continues to try next fallback service ID
  }

  return { ok: false, error: lastError, errorClass: lastClass };
}

// ─── Other panel utilities (unchanged) ────────────────────────────────────

/**
 * Check the status of an existing panel order.
 */
export async function checkPanelOrderStatus(
  apiUrl: string,
  apiKeyEncrypted: string,
  panelOrderId: string
): Promise<{ status: string; remains?: number; error?: string }> {
  const apiKey = decrypt(apiKeyEncrypted);
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ key: apiKey, action: "status", order: panelOrderId }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    const data = JSON.parse(text) as Record<string, unknown>;
    return {
      status: String(data.status ?? "Unknown"),
      remains: data.remains ? parseInt(String(data.remains)) : undefined,
    };
  } catch (err) {
    return { status: "error", error: String(err) };
  }
}

/**
 * Fetch panel balance.
 */
export async function getPanelBalance(
  apiUrl: string,
  apiKeyEncrypted: string
): Promise<PanelBalanceResponse> {
  const apiKey = decrypt(apiKeyEncrypted);
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ key: apiKey, action: "balance" }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    const data = JSON.parse(text) as Record<string, unknown>;
    return {
      ok: !data.error,
      balance: parseFloat(String(data.balance ?? data.funds ?? 0)),
      currency: String(data.currency ?? "USD"),
    };
  } catch {
    return { ok: false };
  }
}

export interface PanelServiceItem {
  service: string;
  name: string;
  type: string;
  category: string;
  rate: string; // Rate per 1000
  min: string;
  max: string;
}

/**
 * Fetch list of services from SMM panel.
 */
export async function getPanelServices(
  apiUrl: string,
  apiKeyEncrypted: string
): Promise<{ ok: boolean; services?: PanelServiceItem[]; error?: string }> {
  const apiKey = decrypt(apiKeyEncrypted);
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ key: apiKey, action: "services" }).toString(),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const text = await res.text();
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      return { ok: true, services: data as PanelServiceItem[] };
    }
    if (data && typeof data === "object" && data.error) {
      return { ok: false, error: String(data.error) };
    }
    return { ok: false, error: "Invalid response format" };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
