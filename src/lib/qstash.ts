import { Client } from "@upstash/qstash";

let _client: Client | null = null;

export function getQStashClient(): Client {
  if (!_client) {
    _client = new Client({
      token: process.env.QSTASH_TOKEN!,
      baseUrl: process.env.QSTASH_URL || "https://qstash-us-east-1.upstash.io",
    });
  }
  return _client;
}

/**
 * Schedule a delivery tick to fire after `delaySeconds`.
 * The webhook at /api/delivery/tick receives the payload.
 */
export async function scheduleDeliveryTick(payload: {
  eventId: string;
  orderId: string;
  panelId: string | null;
  viewsBatch: number;
  reelUrl: string;
}, delaySeconds: number): Promise<{ messageId: string }> {
  const client = getQStashClient();
  const targetUrl = process.env.INTERNAL_WEBHOOK_URL || "https://yoyosmm.vercel.app/api/delivery/tick";

  const result = await client.publishJSON({
    url: targetUrl,
    body: payload,
    delay: delaySeconds,
    retries: 3,
  });

  return { messageId: result.messageId };
}
