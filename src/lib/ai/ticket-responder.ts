import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { sendTelegramAlert } from "@/lib/telegram";
import { isGhostEmail } from "@/lib/ghost";

export async function processTicketAutoReply(ticketId: string, userId: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("No GEMINI_API_KEY found. Skipping auto-reply.");
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    // 1. Fetch user context (last 5 orders)
    const recentOrders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // 2. Fetch ticket history for context
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!ticket) return;

    // SECURITY: Only include USER messages in ticket history.
    // Never feed previous ADMIN replies back to the AI — they may contain
    // internal language about service IDs, providers, or panel names.
    const ticketHistory = ticket.messages
      .filter((m) => m.sender === "USER")
      .map((m) => `Customer: ${m.message}`)
      .join("\n");

    const orderContext = recentOrders.map((o) => 
      `Order ID: ${o.id}\nStatus: ${o.status}\nViews: ${o.viewsDelivered}/${o.viewsTarget}\nLikes: ${o.likesDelivered}/${o.likesTarget}\nSaves: ${o.savesDelivered}/${o.savesTarget}\nShares: ${o.sharesDelivered}/${o.sharesTarget}`
    ).join("\n\n");

    const systemPrompt = `You are a helpful, professional customer support agent for YoYo SMM — an independent social media growth platform with a proprietary in-house delivery engine.

=== ABSOLUTE CONFIDENTIALITY RULES — NEVER BREAK THESE ===
1. NEVER use the words: "SMM panel", "provider", "third-party", "external service", "service ID", "API", "backend provider", "supplier", or "reseller". These do not exist in your vocabulary.
2. NEVER explain that orders failed due to a "service ID change", "provider issue", or "backend problem". Always attribute any past delivery issue to an "internal system calibration" or "our delivery algorithm self-correcting".
3. NEVER reveal that any external company, panel, or service handles delivery on our behalf. YoYo SMM handles everything in-house with its own proprietary organic pacing technology.
4. If asked directly "do you use a third-party panel?", answer: "No, YoYo SMM uses its own proprietary organic growth engine built entirely in-house."
5. NEVER mention "service IDs", "panel IDs", or any technical identifier that implies an external system.

=== RESPONSE RULES ===
6. If views are delivering but engagement (likes/saves/shares) is low: Explain that our system delivers engagement organically in smart batches to protect account safety. Batches only fire once at least 10 units are owed.
7. If an order failed or was cancelled early: Say "the campaign was stopped before it reached the engagement batch threshold" — nothing more.
8. If an order shows DELIVERING status: Reassure the customer delivery is actively in progress.
9. Keep the tone warm, empathetic, concise, and professional.
10. Reply only in the same language the customer is writing in.
11. Provide a direct reply based on the customer's messages and order history below. Do not include internal commentary or reasoning.

--- USER ORDER HISTORY ---
${orderContext || "No recent orders found."}

--- CUSTOMER MESSAGES (most recent last) ---
${ticketHistory || "No messages found."}`;

    // 3. Generate Reply
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt }]
        }
      ]
    });

    const replyText = response.text;
    if (!replyText) throw new Error("AI generated empty response");

    // 4. Save reply to DB and mark as ANSWERED
    await prisma.ticketMessage.create({
      data: {
        ticketId,
        sender: "ADMIN",
        message: replyText.trim(),
      },
    });

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "ANSWERED" },
    });

    const userObj = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const userEmail = userObj?.email ?? "";

    if (!isGhostEmail(userEmail)) {
      sendTelegramAlert(
        `🤖 *AI Auto-Reply Sent!*\n\n` +
        `📌 *Ticket:* ${ticket.subject}\n` +
        `💬 *AI Reply:* ${replyText.trim().slice(0, 300)}`
      ).catch(console.error);
    }

  } catch (error) {
    console.error("AI Ticket Auto-Reply Error:", error);
  }
}
