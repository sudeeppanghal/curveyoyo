import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CurveStyle } from "@prisma/client";

import { CURVE_100_LIST } from "@/lib/delivery/curve-styles-100";

// GET all curve templates for logged-in user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const dbTemplates = await prisma.curveTemplate.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: "desc" },
  });

  const globalTemplates = CURVE_100_LIST.map(c => ({
    id: c.id,
    userId: "global",
    name: c.label,
    style: c.id,
    durationHours: c.warmup + c.peak + 10,
    warmupHours: c.warmup,
    peakHours: c.peak,
    decayHours: 10,
    likesRatioPct: 4.0,
    savesRatioPct: 2.0,
    sharesRatioPct: 0.5,
    commentsRatioPct: 0.2,
    repostsRatioPct: 0.1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const templates = [...dbTemplates, ...globalTemplates];

  return NextResponse.json({ templates });
}

// POST create a new curve template
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await request.json();
  const {
    name, style, durationHours, warmupHours, peakHours, decayHours,
    likesRatioPct, savesRatioPct, sharesRatioPct, commentsRatioPct, repostsRatioPct
  } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const template = await prisma.curveTemplate.create({
    data: {
      userId: dbUser.id,
      name,
      style: (style as CurveStyle) || "ORGANIC",
      durationHours: parseInt(durationHours) || 24,
      warmupHours: parseInt(warmupHours) || 4,
      peakHours: parseInt(peakHours) || 8,
      decayHours: parseInt(decayHours) || 12,
      likesRatioPct: parseFloat(likesRatioPct) || 0,
      savesRatioPct: parseFloat(savesRatioPct) || 0,
      sharesRatioPct: parseFloat(sharesRatioPct) || 0,
      commentsRatioPct: parseFloat(commentsRatioPct) || 0,
      repostsRatioPct: parseFloat(repostsRatioPct) || 0,
    },
  });

  return NextResponse.json({ template }, { status: 201 });
}
