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
}

export interface PanelBalanceResponse {
  ok: boolean;
  balance?: number;
  currency?: string;
  error?: string;
}

/**
 * Place a view order on a single SMM panel.
 * Standard SMM panel REST API (action=add).
 */
export async function placePanelOrder(req: PanelOrderRequest): Promise<PanelOrderResponse> {
  const apiKey = decrypt(req.apiKeyEncrypted);
  const body = new URLSearchParams({
    key: apiKey,
    action: "add",
    service: req.serviceId,
    link: req.link,
    quantity: req.quantity.toString(),
  });

  try {
    const res = await fetch(req.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }

    const text = await res.text();
    let data: Record<string, unknown>;
    try { data = JSON.parse(text); } catch {
      return { ok: false, error: "Non-JSON response from panel" };
    }

    if (data.error) {
      return { ok: false, error: String(data.error), rawResponse: data };
    }

    const orderId = String(data.order ?? data.id ?? data.order_id ?? "");
    return { ok: true, orderId, rawResponse: data };

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort") || msg.includes("timeout")) {
      return { ok: false, error: "Panel timeout (>12s)" };
    }
    return { ok: false, error: msg };
  }
}

/**
 * Check the status of an existing panel order.
 * Standard SMM API: action=status&order=<orderId>
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
