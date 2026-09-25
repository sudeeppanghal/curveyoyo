/**
 * Discord notification and interaction helper.
 */

export type DiscordAlertType = "orders" | "billing" | "tickets" | "system";

export async function sendDiscordAlert(
  type: DiscordAlertType,
  text: string,
  options?: { upiPaymentId?: string; cryptoPaymentId?: string }
): Promise<boolean> {
  try {
    const token = process.env.DISCORD_BOT_TOKEN;
    const channelId = getChannelId(type);

    // If we have a bot token and channel ID, and it is billing with interactive buttons:
    if (token && channelId && (options?.upiPaymentId || options?.cryptoPaymentId)) {
      const customIdApprove = options.upiPaymentId 
        ? `approve_upi_${options.upiPaymentId}`
        : `approve_crypto_${options.cryptoPaymentId}`;
      const customIdReject = options.upiPaymentId
        ? `reject_upi_${options.upiPaymentId}`
        : `reject_crypto_${options.cryptoPaymentId}`;

      // Convert Telegram bold *text* to Discord bold **text**
      let discordText = text
        .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "**$1**")
        .replace(/\\n/g, "\n");

      const body = {
        content: discordText,
        components: [
          {
            type: 1, // ACTION_ROW
            components: [
              {
                type: 2, // BUTTON
                style: 3, // SUCCESS (green)
                label: "✅ Approve",
                custom_id: customIdApprove
              },
              {
                type: 2, // BUTTON
                style: 4, // DANGER (red)
                label: "❌ Reject",
                custom_id: customIdReject
              }
            ]
          }
        ]
      };

      const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Discord Bot Message Failed] status: ${response.status}, response: ${errText}`);
        return false;
      }
      return true;
    }

    // Default to Webhook delivery
    let webhookUrl = "";
    switch (type) {
      case "orders":
        webhookUrl = process.env.DISCORD_WEBHOOK_ORDERS || "";
        break;
      case "billing":
        webhookUrl = process.env.DISCORD_WEBHOOK_BILLING || "";
        break;
      case "tickets":
        webhookUrl = process.env.DISCORD_WEBHOOK_TICKETS || "";
        break;
      case "system":
        webhookUrl = process.env.DISCORD_WEBHOOK_SYSTEM || "";
        break;
    }

    if (!webhookUrl) {
      console.warn(`[Discord] Missing webhook URL for type: ${type}`);
      return false;
    }

    // Convert Telegram bold *text* to Discord bold **text**
    let discordText = text
      .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, "**$1**")
      .replace(/\\n/g, "\n");

    const body = {
      content: discordText,
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Discord Webhook Failed] status: ${response.status}, response: ${errText}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[Discord Error]", err);
    return false;
  }
}

function getChannelId(type: DiscordAlertType): string {
  switch (type) {
    case "orders":
      return process.env.DISCORD_CHANNEL_ORDERS || "";
    case "billing":
      return process.env.DISCORD_CHANNEL_BILLING || "";
    case "tickets":
      return process.env.DISCORD_CHANNEL_TICKETS || "";
    case "system":
      return process.env.DISCORD_CHANNEL_SYSTEM || "";
    default:
      return "";
  }
}

import crypto from "crypto";

export async function verifyDiscordRequest(
  publicKey: string,
  signature: string,
  timestamp: string,
  rawBody: string
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new Uint8Array(Buffer.from(publicKey, "hex")),
      { name: "Ed25519", namedCurve: "Ed25519" },
      true,
      ["verify"]
    );
    const data = new TextEncoder().encode(timestamp + rawBody);
    const sigBytes = new Uint8Array(Buffer.from(signature, "hex"));
    return await crypto.subtle.verify(
      "Ed25519",
      key,
      sigBytes,
      data
    );
  } catch (err) {
    console.error("[Discord Signature Verification Error]", err);
    return false;
  }
}
