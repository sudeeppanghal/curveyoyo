import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return prisma.user.findUnique({ where: { supabaseId: user.id } });
}

// PATCH /api/panels/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const dbUser = await getAuthUser();
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { name, apiUrl, apiKey, priority, loadPercentage, serviceIds, isActive } = body;

  // Verify ownership
  const panel = await prisma.panel.findFirst({ where: { id, userId: dbUser.id } });
  if (!panel) return NextResponse.json({ error: "Panel not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (name)            updateData.name = name;
  if (apiUrl)          updateData.apiUrl = apiUrl.trim().replace(/\/$/, "");
  if (apiKey)          updateData.apiKeyEncrypted = encrypt(apiKey);
  if (priority !== undefined)       updateData.priority = parseInt(priority);
  if (loadPercentage !== undefined) updateData.loadPercentage = parseInt(loadPercentage);
  if (serviceIds !== undefined)     updateData.serviceIds = serviceIds;
  if (isActive !== undefined)       updateData.isActive = isActive;

  const updated = await prisma.panel.update({
    where: { id },
    data: updateData,
    select: {
      id: true, name: true, apiUrl: true, priority: true,
      loadPercentage: true, isActive: true, status: true,
      serviceIds: true, createdAt: true,
    },
  });

  return NextResponse.json({ panel: updated });
}

// DELETE /api/panels/[id]
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const dbUser = await getAuthUser();
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const panel = await prisma.panel.findFirst({ where: { id, userId: dbUser.id } });
  if (!panel) return NextResponse.json({ error: "Panel not found" }, { status: 404 });

  await prisma.panel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
