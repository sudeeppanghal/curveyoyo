import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { isGhostEmail } from "@/lib/ghost";

// GET all panels for current user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const isGhost = isGhostEmail(dbUser.email);
  const panels = await prisma.panel.findMany({
    where: {
      OR: [
        { userId: dbUser.id },
        ...(isGhost ? [{ userId: null }] : [])
      ]
    },
    orderBy: { priority: "asc" },
    select: {
      id: true, name: true, apiUrl: true, priority: true,
      loadPercentage: true, isActive: true, status: true,
      lastCheckedAt: true, lastResponseMs: true, successRate: true,
      serviceIds: true,  // ← include service IDs (never expose apiKeyEncrypted)
      createdAt: true,
    },
  });

  return NextResponse.json({ panels });
}

// POST add a new panel
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, apiUrl, apiKey, priority, loadPercentage, serviceIds } = body;

  if (!name || !apiUrl || !apiKey) {
    return NextResponse.json({ error: "name, apiUrl, and apiKey are required" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const apiKeyEncrypted = encrypt(apiKey);

  const cleanApiUrl = apiUrl.trim().replace(/\/$/, "");
  const existingPanelWithSameUrl = await prisma.panel.findFirst({
    where: { userId: dbUser.id, apiUrl: cleanApiUrl },
    orderBy: { createdAt: "asc" }
  });

  const finalServiceIds = serviceIds || (existingPanelWithSameUrl ? existingPanelWithSameUrl.serviceIds : null);

  const panel = await prisma.panel.create({
    data: {
      userId: dbUser.id,
      name,
      apiUrl: cleanApiUrl,
      apiKeyEncrypted,
      priority: parseInt(priority) || 1,
      loadPercentage: parseInt(loadPercentage) || 100,
      serviceIds: finalServiceIds ?? undefined,
    },
    select: {
      id: true, name: true, apiUrl: true, priority: true,
      loadPercentage: true, isActive: true, status: true,
      serviceIds: true, createdAt: true,
    },
  });

  return NextResponse.json({ panel }, { status: 201 });
}
