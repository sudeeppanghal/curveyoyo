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
    const { 
      platform, username, templateIds, viewsMin, viewsMax,
      likesMin, likesMax, commentsMin, commentsMax,
      sharesMin, sharesMax, savesMin, savesMax,
      repostsMin, repostsMax
    } = await request.json();

    if (!platform || !username || !templateIds || !Array.isArray(templateIds) || templateIds.length === 0) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Verify templates belong to user
    const templates = await prisma.curveTemplate.findMany({
      where: { id: { in: templateIds }, userId: dbUser.id }
    });

    if (templates.length !== templateIds.length) {
      return NextResponse.json({ error: "One or more templates not found" }, { status: 404 });
    }

    const autoSub = await prisma.autoSubscription.create({
      data: {
        userId: dbUser.id,
        platform,
        username: username.trim(),
        templateIds,
        templateId: templateIds[0], // fallback for legacy safety
        viewsMin: Number(viewsMin) || 1000,
        viewsMax: Number(viewsMax) || 5000,
        likesMin: Number(likesMin) || 0,
        likesMax: Number(likesMax) || 0,
        commentsMin: Number(commentsMin) || 0,
        commentsMax: Number(commentsMax) || 0,
        sharesMin: Number(sharesMin) || 0,
        sharesMax: Number(sharesMax) || 0,
        savesMin: Number(savesMin) || 0,
        savesMax: Number(savesMax) || 0,
        repostsMin: Number(repostsMin) || 0,
        repostsMax: Number(repostsMax) || 0,
      }
    });

    return NextResponse.json({ autoSubscription: autoSub }, { status: 201 });
  } catch (error) {
    console.error("Error creating auto subscription:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
