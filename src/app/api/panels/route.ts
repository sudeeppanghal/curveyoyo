import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET all panels for current user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const panels = await prisma.panel.findMany({
    where: {
      OR: [
        { userId: dbUser.id },
        { userId: null, isActive: true }
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

// POST add a new panel (custom panels disabled)
export async function POST() {
  return NextResponse.json(
    { error: "Custom panel connections are disabled. All orders are automatically routed via platform providers." },
    { status: 403 }
  );
}
