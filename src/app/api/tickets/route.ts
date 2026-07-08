import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramAlert } from "@/lib/telegram";
import { notGhostWhere, isGhostEmail } from "@/lib/ghost";
import { processTicketAutoReply } from "@/lib/ai/ticket-responder";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

export async function GET(request: NextRequest) {
  const isAdminHeader = request.headers.get("x-admin-secret") === ADMIN_SECRET;
  
  if (isAdminHeader) {
    const tickets = await prisma.supportTicket.findMany({
      where: { status: { not: "CLOSED" }, ...notGhostWhere() },
      include: {
        user: { select: { email: true, name: true } },
        messages: { orderBy: { createdAt: "asc" } }
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ tickets });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: dbUser.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ tickets });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { subject, message } = await request.json();
  if (!subject || !message) {
    return NextResponse.json({ error: "subject and message are required" }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: dbUser.id,
      subject: subject.trim(),
      message: message.trim(),
      status: "OPEN",
      messages: {
        create: {
          sender: "USER",
          message: message.trim()
        }
      }
    },
    include: {
      messages: true
    }
  });

  if (!isGhostEmail(dbUser.email)) {
    sendTelegramAlert(
      `🎫 *New Support Ticket Opened!*\n\n` +
      `👤 *User:* \`${dbUser.email}\`\n` +
      `📌 *Subject:* ${subject.trim()}\n` +
      `💬 *Message:* ${message.trim().slice(0, 300)}`
    ).catch(console.error);
  }

  // Trigger AI Auto-Responder in the background
  processTicketAutoReply(ticket.id, dbUser.id).catch(console.error);

  return NextResponse.json({ ticket }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { ticketId, message } = await request.json();
  if (!ticketId || !message) {
    return NextResponse.json({ error: "ticketId and message are required" }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, userId: dbUser.id }
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  const ticketMessage = await prisma.ticketMessage.create({
    data: {
      ticketId,
      sender: "USER",
      message: message.trim()
    }
  });

  if (!isGhostEmail(dbUser.email)) {
    sendTelegramAlert(
      `📩 *New Ticket Reply from User!*\n\n` +
      `👤 *User:* \`${dbUser.email}\`\n` +
      `📌 *Ticket Subject:* ${ticket.subject}\n` +
      `💬 *Reply:* ${message.trim().slice(0, 300)}`
    ).catch(console.error);
  }

  if (ticket.status !== "OPEN") {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "OPEN" }
    });
  }

  // Trigger AI Auto-Responder in the background
  processTicketAutoReply(ticketId, dbUser.id).catch(console.error);

  return NextResponse.json({ ticketMessage });
}
