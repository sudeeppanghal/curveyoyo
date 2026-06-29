import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

const ADMIN_SECRET = process.env.ADMIN_SECRET!;

function verifyAdmin(request: NextRequest) {
  return request.headers.get("x-admin-secret") === ADMIN_SECRET;
}

// GET all admin panels (userId = null)
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const panels = await prisma.panel.findMany({
    where: { userId: null },
    orderBy: { priority: "asc" },
  });

  return NextResponse.json({ panels });
}

// POST add a new admin panel
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, apiUrl, apiKey, priority, loadPercentage } = body;

  if (!name || !apiUrl || !apiKey) {
    return NextResponse.json({ error: "name, apiUrl, and apiKey are required" }, { status: 400 });
  }

  const apiKeyEncrypted = encrypt(apiKey);

  const panel = await prisma.panel.create({
    data: {
      userId: null, // Admin panel
      name,
      apiUrl: apiUrl.trim().replace(/\/$/, ""),
      apiKeyEncrypted,
      priority: parseInt(priority) || 1,
      loadPercentage: parseInt(loadPercentage) || 100,
    },
  });

  return NextResponse.json({ panel }, { status: 201 });
}

// DELETE an admin panel
export async function DELETE(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.panel.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}
