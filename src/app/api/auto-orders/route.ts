import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const autoOrders = await prisma.autoSubscription.findMany({
    where: { userId: dbUser.id },
    include: { template: true },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ autoOrders });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const { platform, username, templateId, viewsTarget } = await request.json();

    if (!platform || !username || !templateId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Verify template belongs to user
    const template = await prisma.curveTemplate.findUnique({
      where: { id: templateId, userId: dbUser.id }
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const autoSub = await prisma.autoSubscription.create({
      data: {
        userId: dbUser.id,
        platform,
        username: username.trim(),
        templateId,
        viewsTarget: viewsTarget || 1000
      },
      include: { template: true }
    });

    return NextResponse.json({ autoSubscription: autoSub }, { status: 201 });
  } catch (error) {
    console.error("Error creating auto subscription:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
