import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/mtp/check-mode — Public (authenticated users). Returns whether MTP mode is active. */
export async function GET() {
  try {
    const settings = await prisma.adminSettings.findUnique({
      where: { id: "global" },
      select: { mtpMode: true },
    });
    return NextResponse.json({ mtpMode: settings?.mtpMode ?? false });
  } catch {
    return NextResponse.json({ mtpMode: false });
  }
}
