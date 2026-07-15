import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isGhostEmail } from "@/lib/ghost";

export const dynamic = "force-dynamic";

// GET current preference and available SMM options for ghost user only
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser || !isGhostEmail(dbUser.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all active panels in the database (allow ghost user to select any panel)
  const panels = await prisma.panel.findMany({
    where: {
      isActive: true
    },
    orderBy: { priority: "asc" },
    select: {
      id: true,
      name: true,
      apiUrl: true
    }
  });

  return NextResponse.json({
    ghostSmmPreference: dbUser.ghostSmmPreference,
    ghostCustomServices: dbUser.ghostCustomServices,
    panels
  });
}

// POST update preference for ghost user
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser || !isGhostEmail(dbUser.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ghostSmmPreference, ghostCustomServices } = await request.json();

  // Update preference in DB
  const updatedUser = await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      ghostSmmPreference: ghostSmmPreference !== undefined ? (ghostSmmPreference || null) : undefined,
      ghostCustomServices: ghostCustomServices !== undefined ? (ghostCustomServices || null) : undefined
    }
  });

  return NextResponse.json({
    ok: true,
    ghostSmmPreference: updatedUser.ghostSmmPreference,
    ghostCustomServices: updatedUser.ghostCustomServices
  });
}
