import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

export async function PATCH(request: NextRequest) {
  if (request.headers.get("x-admin-secret") !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, status } = await request.json();
  if (!id || !status) {
    return NextResponse.json({ error: "id and status are required" }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.update({
    where: { id },
    data: { status }
  });

  return NextResponse.json({ ticket });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("x-admin-secret") !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { ticketId, message, status } = await request.json();
  if (!ticketId || !message) {
    return NextResponse.json({ error: "ticketId and message are required" }, { status: 400 });
  }

  const ticketMessage = await prisma.ticketMessage.create({
    data: {
      ticketId,
      sender: "ADMIN",
      message: message.trim()
    }
  });

  const updatedTicket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: status || "ANSWERED" },
    include: {
      user: { select: { email: true, name: true } },
      messages: { orderBy: { createdAt: "asc" } }
    }
  });

  return NextResponse.json({ ticket: updatedTicket, ticketMessage });
}
