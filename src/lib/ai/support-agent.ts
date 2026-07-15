import { GoogleGenAI, Type } from "@google/genai";
import type { FunctionDeclaration } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { sendTelegramAlert } from "@/lib/telegram";
import { isGhostEmail } from "@/lib/ghost";
import { triggerMidwayRefund } from "@/lib/delivery/refund";

// ─── Max auto-refund cap in wallet credits ───────────────────────────────────
const MAX_AUTO_REFUND = 500; // above this → escalate to human admin

// ─── Tool definitions for Gemini Function Calling ────────────────────────────
const tools: FunctionDeclaration[] = [
  {
    name: "issue_refund",
    description: "Issue a partial or full wallet refund to the user for an order that was cancelled, failed, or not delivered. Always check if already refunded before calling.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderId: { type: Type.STRING, description: "The order ID to refund" },
        reason: { type: Type.STRING, description: "Plain English reason for the refund (shown in audit log)" },
      },
      required: ["orderId", "reason"],
    },
  },
  {
    name: "restart_order",
    description: "Restart delivery for an order that is stuck, paused, or not delivering. Reactivates all failed scheduled delivery events.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderId: { type: Type.STRING, description: "The order ID to restart" },
        reason: { type: Type.STRING, description: "Plain English reason for the restart" },
      },
      required: ["orderId", "reason"],
    },
  },
  {
    name: "cancel_order",
    description: "Cancel an order and trigger a proportional wallet refund. Only use when order is in PENDING, QUEUED, or DELIVERING status.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        orderId: { type: Type.STRING, description: "The order ID to cancel" },
        reason: { type: Type.STRING, description: "Plain English reason for the cancellation" },
      },
      required: ["orderId", "reason"],
    },
  },
  {
    name: "escalate_to_admin",
    description: "Escalate this ticket to a human admin because the issue is too complex, ambiguous, or exceeds the auto-refund cap. Always include a clear reason.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        reason: { type: Type.STRING, description: "Why this ticket requires human admin attention" },
      },
      required: ["reason"],
    },
  },
  {
    name: "send_reply_only",
    description: "Send a text reply to the user without taking any system action. Use for general questions, status checks, or when no action is needed.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        reply: { type: Type.STRING, description: "The reply message to send to the user" },
      },
      required: ["reply"],
    },
  },
];

// ─── Tool Executors ───────────────────────────────────────────────────────────

async function execIssueRefund(orderId: string, reason: string, ticketId: string, userId: string): Promise<string> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });

  if (!order) return `Order ${orderId} not found.`;
  if (order.userId !== userId) return `Order ${orderId} does not belong to this user.`;

  // Check if already refunded
  const existingRefund = await prisma.auditLog.findFirst({
    where: {
      userId,
      action: "AI_AGENT_REFUND",
      metadata: { path: ["orderId"], equals: orderId },
    },
  });
  if (existingRefund) return `Order ${orderId} has already been auto-refunded by the agent.`;

  // Calculate refund amount from price charged minus what was delivered
  const delivered = order.viewsDelivered / Math.max(1, order.viewsTarget);
  const priceCharged = order.priceCharged ?? 0;
  const refundAmount = parseFloat((priceCharged * (1 - delivered)).toFixed(2));

  if (refundAmount <= 0) return `No refund owed for order ${orderId} — delivery was complete.`;

  // Safety cap — escalate large refunds
  if (refundAmount > MAX_AUTO_REFUND) {
    return `Refund amount ₹${refundAmount} exceeds auto-cap. Escalating to admin.`;
  }

  // Credit wallet
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: refundAmount } },
    }),
    prisma.auditLog.create({
      data: {
        userId,
        action: "AI_AGENT_REFUND",
        metadata: { orderId, refundAmount, reason, source: "AI_SUPPORT_AGENT" },
      },
    }),
    prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    }),
  ]);

  return `Refund of ₹${refundAmount} successfully credited to wallet for order ${orderId}.`;
}

async function execRestartOrder(orderId: string, reason: string, userId: string): Promise<string> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return `Order ${orderId} not found.`;
  if (order.userId !== userId) return `Order ${orderId} does not belong to this user.`;

  await prisma.deliveryEvent.updateMany({
    where: { orderId, status: { in: ["FAILED", "RETRYING"] } },
    data: { status: "SCHEDULED", errorMessage: null },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "DELIVERING" },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: "AI_AGENT_RESTART",
      metadata: { orderId, reason, source: "AI_SUPPORT_AGENT" },
    },
  });

  return `Order ${orderId} delivery restarted successfully.`;
}

async function execCancelOrder(orderId: string, reason: string, userId: string): Promise<string> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return `Order ${orderId} not found.`;
  if (order.userId !== userId) return `Order ${orderId} does not belong to this user.`;
  if (!["PENDING", "QUEUED", "DELIVERING", "PAUSED"].includes(order.status)) {
    return `Order ${orderId} is already ${order.status} and cannot be cancelled.`;
  }

  await prisma.deliveryEvent.updateMany({
    where: { orderId, status: "SCHEDULED" },
    data: { status: "FAILED", errorMessage: "Cancelled by AI Support Agent on user request" },
  });

  await triggerMidwayRefund(orderId, true);

  await prisma.auditLog.create({
    data: {
      userId,
      action: "AI_AGENT_CANCEL",
      metadata: { orderId, reason, source: "AI_SUPPORT_AGENT" },
    },
  });

  return `Order ${orderId} cancelled and refund initiated.`;
}

// ─── Reply builder ────────────────────────────────────────────────────────────

async function saveAgentReply(ticketId: string, reply: string) {
  await prisma.ticketMessage.create({
    data: { ticketId, sender: "ADMIN", message: reply },
  });
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: "ANSWERED" },
  });
}

// ─── Main Agent Entry Point ────────────────────────────────────────────────────

export async function runSupportAgent(ticketId: string, userId: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[SupportAgent] No GEMINI_API_KEY. Skipping agent.");
      return;
    }

    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser || isGhostEmail(dbUser.email)) return;

    // Fetch ticket (customer messages only — no admin messages)
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!ticket) return;

    const customerMessages = ticket.messages
      .filter((m) => m.sender === "USER")
      .map((m) => m.message)
      .join("\n");

    // Fetch user's recent orders for context
    const recentOrders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const orderContext = recentOrders.map((o) =>
      `Order ID: ${o.id} | Status: ${o.status} | Views: ${o.viewsDelivered}/${o.viewsTarget} | Price Charged: ₹${o.priceCharged}`
    ).join("\n");

    const systemPrompt = `You are an autonomous support agent for YoYo SMM — a social media growth platform with a proprietary in-house delivery engine.

=== YOUR MISSION ===
Read the customer's complaint and decide the BEST action to take.
You have tools to: issue_refund, restart_order, cancel_order, escalate_to_admin, or send_reply_only.

=== ABSOLUTE RULES ===
1. NEVER mention SMM panels, providers, third parties, service IDs, APIs, or backend systems.
2. Always check the order context before taking any action — use real order IDs from the list below.
3. Only refund/cancel/restart orders that BELONG to this user.
4. If the user did not provide an order ID, use the most relevant order from their history.
5. If the issue is ambiguous or could cause financial harm if wrong, use escalate_to_admin.
6. After taking an action, always call send_reply_only to inform the user in a warm, friendly tone. Respond in the same language the customer used.
7. NEVER reveal that you are an AI. Sign replies as "YoYo SMM Support Team".

=== USER'S RECENT ORDERS ===
${orderContext || "No orders found."}

=== TICKET SUBJECT ===
${ticket.subject}

=== CUSTOMER MESSAGES ===
${customerMessages}

Now decide what action to take.`;

    const ai = new GoogleGenAI({ apiKey });

    // ── First turn: let the AI decide what to do ──────────────────────────────
    let response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      config: { tools: [{ functionDeclarations: tools }] },
    });

    let actionTaken = "none";
    let actionResult = "";
    let finalReply = "";

    // ── Process function calls ─────────────────────────────────────────────────
    const firstCandidate = response.candidates?.[0];
    const functionCalls = firstCandidate?.content?.parts?.filter(p => p.functionCall) ?? [];

    for (const part of functionCalls) {
      const fc = part.functionCall!;
      const args = fc.args as Record<string, string>;

      console.log(`[SupportAgent] Calling tool: ${fc.name}`, args);

      if (fc.name === "issue_refund") {
        actionResult = await execIssueRefund(args.orderId, args.reason, ticketId, userId);
        actionTaken = "REFUND";

      } else if (fc.name === "restart_order") {
        actionResult = await execRestartOrder(args.orderId, args.reason, userId);
        actionTaken = "RESTART";

      } else if (fc.name === "cancel_order") {
        actionResult = await execCancelOrder(args.orderId, args.reason, userId);
        actionTaken = "CANCEL";

      } else if (fc.name === "escalate_to_admin") {
        actionTaken = "ESCALATE";
        actionResult = args.reason;
        await prisma.supportTicket.update({
          where: { id: ticketId },
          data: { status: "OPEN" },
        });
        await sendTelegramAlert(
          `🚨 *AI Agent Escalation!*\n\n` +
          `👤 *User:* \`${dbUser.email}\`\n` +
          `📌 *Ticket:* ${ticket.subject}\n` +
          `⚠️ *Reason:* ${args.reason}`
        ).catch(console.error);
        finalReply = "Our senior support team has been notified and will personally review your case shortly. Thank you for your patience.\n\n— YoYo SMM Support Team";
        await saveAgentReply(ticketId, finalReply);
        return;

      } else if (fc.name === "send_reply_only") {
        finalReply = args.reply;
      }
    }

    // ── Second turn: if an action was taken, ask AI to compose the reply ──────
    if (actionTaken !== "none" && actionTaken !== "ESCALATE" && !finalReply) {
      const followUp = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          ...(firstCandidate?.content ? [firstCandidate.content] : []),
          {
            role: "user",
            parts: [{
              text: `Action result: ${actionResult}\n\nNow call send_reply_only to write a warm, friendly confirmation message to the customer in their language. Do not mention any technical details about our system. Sign off as "YoYo SMM Support Team".`
            }]
          }
        ],
        config: { tools: [{ functionDeclarations: tools }] },
      });

      const replyParts = followUp.candidates?.[0]?.content?.parts?.filter(p => p.functionCall?.name === "send_reply_only") ?? [];
      if (replyParts.length > 0) {
        finalReply = (replyParts[0].functionCall!.args as any).reply;
      }
    }

    if (!finalReply) {
      finalReply = "Thank you for contacting us. We have reviewed your case and processed the appropriate action. Please check your wallet or order status for the update.\n\n— YoYo SMM Support Team";
    }

    await saveAgentReply(ticketId, finalReply);

    // Log the agent action to Telegram (non-ghost users only)
    if (actionTaken !== "none") {
      sendTelegramAlert(
        `🤖 *AI Agent Action: ${actionTaken}*\n\n` +
        `👤 *User:* \`${dbUser.email}\`\n` +
        `📌 *Ticket:* ${ticket.subject}\n` +
        `⚡ *Result:* ${actionResult.slice(0, 200)}`
      ).catch(console.error);
    }

  } catch (err: any) {
    console.error("[SupportAgent] Error:", err);
  }
}
