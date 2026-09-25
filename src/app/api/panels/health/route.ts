import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getPanelBalance } from "@/lib/delivery/panel-client";
import { cachePanelStatus } from "@/lib/redis";

/**
 * POST /api/panels/health
 * Pings all of the user's panels and updates their status.
 * Called on-demand from the Panels page.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { panels: { where: { isActive: true } } },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const results = await Promise.all(
    dbUser.panels.map(async (panel) => {
      const start = Date.now();
      const balanceResult = await getPanelBalance(panel.apiUrl, panel.apiKeyEncrypted);
      const responseMs = Date.now() - start;

      const status = !balanceResult.ok
        ? "OFFLINE"
        : responseMs > 5000
        ? "SLOW"
        : "ONLINE";

      await Promise.all([
        prisma.panel.update({
          where: { id: panel.id },
          data: { status, lastCheckedAt: new Date(), lastResponseMs: responseMs },
        }),
        cachePanelStatus(panel.id, status as "ONLINE" | "OFFLINE" | "SLOW"),
      ]);

      return {
        id: panel.id,
        name: panel.name,
        status,
        responseMs,
        balance: balanceResult.balance,
        currency: balanceResult.currency,
      };
    })
  );

  return NextResponse.json({ panels: results });
}
