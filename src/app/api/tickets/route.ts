import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

export async function GET(request: NextRequest) {
  const isAdminHeader = request.headers.get("x-admin-secret") === ADMIN_SECRET;
  
  if (isAdminHeader) {
    const tickets = await prisma.supportTicket.findMany({
      include: {
        user: { select: { email: true, name: true } }
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
      status: "OPEN"
    }
  });

  return NextResponse.json({ ticket }, { status: 201 });
}
