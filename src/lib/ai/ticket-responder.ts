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

    const ticketHistory = ticket.messages
      .map((m) => `${m.sender === "USER" ? "Customer" : "Support"}: ${m.message}`)
      .join("\n");

    const orderContext = recentOrders.map((o) => 
      `Order ID: ${o.id}\nStatus: ${o.status}\nViews: ${o.viewsDelivered}/${o.viewsTarget}\nLikes: ${o.likesDelivered}/${o.likesTarget}\nSaves: ${o.savesDelivered}/${o.savesTarget}\nShares: ${o.sharesDelivered}/${o.sharesTarget}`
    ).join("\n\n");

    const systemPrompt = `You are a helpful, professional customer support agent for YoYo SMM, an independent social media growth platform.
CRITICAL RULES:
1. NEVER mention or reveal that we use external "SMM Panels" or third-party providers. We use our own "proprietary organic growth algorithms".
2. If a customer complains that engagement (likes/saves/shares) hasn't delivered but views are increasing: Explain that our system delivers engagement organically in batches of 10 or more to keep their account safe. The system calculates how many saves/likes are owed based on view progress, and only fires a batch once at least 10 are owed.
3. If their order was cancelled or failed early, explain that because it was stopped early, it might not have reached the threshold to trigger the engagement batch.
4. Keep the tone empathetic, concise, and professional.
5. Provide a direct reply to the customer's latest message based on their order history provided below. Do not include internal commentary.

--- USER ORDER HISTORY (Context for you to check) ---
${orderContext || "No recent orders found."}

--- TICKET HISTORY ---
${ticketHistory}`;

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
