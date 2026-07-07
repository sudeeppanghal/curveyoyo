/**
 * src/lib/mtp/client.ts
 * Helpers for the SMM provider API. All branded as YoyoSMM — provider name
 * is never exposed to users.
 * Standard SMM Panel API format: POST with form-encoded body.
 */

export const MTP_API_URL = "https://morethanpanel.com/api/v2";
export const USD_TO_INR = 96;
export const MTP_MULTIPLIER = 2.5;

/** Calculate custom INR price per 1000 units from USD rate */
export function calcCustomRate(usdRatePer1000: number): number {
  return parseFloat((usdRatePer1000 * USD_TO_INR * MTP_MULTIPLIER).toFixed(2));
}

export interface MtpRawService {
  service: string | number;
  name: string;
  category: string;
  type: string;
  rate: string | number;
  min: string | number;
  max: string | number;
}

export interface MtpOrderResult {
  order?: string | number;
  error?: string;
}

export interface MtpStatusResult {
  charge?: string;
  start_count?: string;
  status?: string;
  remains?: string;
  currency?: string;
  error?: string;
}

async function mtpPost(apiKey: string, params: Record<string, string>): Promise<unknown> {
  const body = new URLSearchParams({ key: apiKey, ...params });
  const res = await fetch(MTP_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Provider API returned HTTP ${res.status}`);
  return res.json();
}

export async function fetchMtpServices(apiKey: string): Promise<MtpRawService[]> {
  const data = await mtpPost(apiKey, { action: "services" });
  if (!Array.isArray(data)) throw new Error("Provider API did not return a list");
  return data as MtpRawService[];
}

export async function placeMtpOrder(
  apiKey: string,
  serviceId: string,
  link: string,
  quantity: number
): Promise<MtpOrderResult> {
  return mtpPost(apiKey, {
    action: "add",
    service: serviceId,
    link,
    quantity: String(quantity),
  }) as Promise<MtpOrderResult>;
}

export async function checkMtpOrderStatus(
  apiKey: string,
  orderId: string
): Promise<MtpStatusResult> {
  return mtpPost(apiKey, { action: "status", order: orderId }) as Promise<MtpStatusResult>;
}

export async function getMtpBalance(apiKey: string): Promise<number> {
  const data = (await mtpPost(apiKey, { action: "balance" })) as Record<string, string>;
  return parseFloat(data.balance ?? "0");
}
