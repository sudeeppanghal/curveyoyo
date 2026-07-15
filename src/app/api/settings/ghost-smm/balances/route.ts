import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isGhostEmail } from "@/lib/ghost";
import { decrypt } from "@/lib/crypto";
import axios from "axios";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser || !isGhostEmail(dbUser.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const panels = await prisma.panel.findMany({
    where: { isActive: true },
    orderBy: { priority: "asc" }
  });

  const statuses = await Promise.all(
    panels.map(async (panel) => {
      let status = "OFFLINE";
      let balance = "N/A";
      let errorMsg = "";

      if (panel.apiKeyEncrypted) {
        try {
          const apiKey = decrypt(panel.apiKeyEncrypted);
          const response = await axios.post(
            panel.apiUrl,
            new URLSearchParams({
              key: apiKey,
              action: "balance"
            }),
            {
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              timeout: 6000
            }
          );

          if (response.data && response.data.balance !== undefined) {
            status = "LIVE";
            balance = `${response.data.balance} ${response.data.currency || ""}`;
          } else if (response.data && response.data.error) {
            status = "INVALID_KEY";
            errorMsg = response.data.error;
          } else {
            status = "UNKNOWN";
            errorMsg = JSON.stringify(response.data);
          }
        } catch (e: any) {
          status = "OFFLINE";
          errorMsg = e.message;
        }
      } else {
        status = "NO_KEY";
      }

      return {
        id: panel.id,
        name: panel.name,
        apiUrl: panel.apiUrl,
        status,
        balance,
        errorMsg
      };
    })
  );

  return NextResponse.json({ panels: statuses });
}
