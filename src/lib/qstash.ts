import { Client } from "@upstash/qstash";

let _client: Client | null = null;

export function getQStashClient(): Client {
  if (!_client) {
    _client = new Client({ token: process.env.QSTASH_TOKEN! });
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
  panelId: string;
  viewsBatch: number;
  reelUrl: string;
}, delaySeconds: number): Promise<{ messageId: string }> {
  const client = getQStashClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const result = await client.publishJSON({
    url: `${appUrl}/api/delivery/tick`,
    body: payload,
    delay: delaySeconds,
    retries: 3,
  });

  return { messageId: result.messageId };
}
