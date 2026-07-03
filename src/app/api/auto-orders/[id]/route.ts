import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

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

  try {
    await prisma.autoSubscription.delete({
      where: { id, userId: dbUser.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting auto sub:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

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

  try {
    const { status } = await request.json();
    const updated = await prisma.autoSubscription.update({
      where: { id, userId: dbUser.id },
      data: { status }
    });
    return NextResponse.json({ autoSubscription: updated });
  } catch (error) {
    console.error("Error updating auto sub:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
