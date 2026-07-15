import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// DELETE a curve template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;

  // Verify ownership
  const template = await prisma.curveTemplate.findUnique({ where: { id } });
  if (!template || template.userId !== dbUser.id) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await prisma.curveTemplate.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

// PATCH update a curve template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { id } = await params;

  // Verify ownership
  const template = await prisma.curveTemplate.findUnique({ where: { id } });
  if (!template || template.userId !== dbUser.id) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const body = await request.json();
  const {
    name, style, durationHours, warmupHours, peakHours, decayHours,
    likesRatioPct, savesRatioPct, sharesRatioPct, commentsRatioPct
  } = body;

  const updated = await prisma.curveTemplate.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(style !== undefined && { style }),
      ...(durationHours !== undefined && { durationHours: parseInt(durationHours) }),
      ...(warmupHours !== undefined && { warmupHours: parseInt(warmupHours) }),
      ...(peakHours !== undefined && { peakHours: parseInt(peakHours) }),
      ...(decayHours !== undefined && { decayHours: parseInt(decayHours) }),
      ...(likesRatioPct !== undefined && { likesRatioPct: parseFloat(likesRatioPct) }),
      ...(savesRatioPct !== undefined && { savesRatioPct: parseFloat(savesRatioPct) }),
      ...(sharesRatioPct !== undefined && { sharesRatioPct: parseFloat(sharesRatioPct) }),
      ...(commentsRatioPct !== undefined && { commentsRatioPct: parseFloat(commentsRatioPct) }),
    },
  });

  return NextResponse.json({ template: updated });
}
