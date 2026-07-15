import { prisma } from "@/lib/prisma";
import { getPanelServices, PanelServiceItem } from "./panel-client";
import { sendTelegramAlert } from "@/lib/telegram";
import { isGhostEmail } from "@/lib/ghost";

// ─── Keyword mappings for auto-finding replacement services ───────────────
const SEARCH_CONFIG: Record<string, Record<string, string[]>> = {
  INSTAGRAM: {
    views:    ["instagram", "view"],
    likes:    ["instagram", "like"],
    saves:    ["instagram", "save"],
    shares:   ["instagram", "share"],
    comments: ["instagram", "comment"],
    reposts:  ["instagram", "repost"],
  },
  TIKTOK: {
    views:    ["tiktok", "view"],
    likes:    ["tiktok", "like"],
    saves:    ["tiktok", "save"],
    shares:   ["tiktok", "share"],
    comments: ["tiktok", "comment"],
    reposts:  ["tiktok", "repost"],
  },
  YOUTUBE: {
    views:       ["youtube", "view"],
    likes:       ["youtube", "like"],
    subscribers: ["youtube", "subscriber"],
    comments:    ["youtube", "comment"],
  },
};

// ─── Exchange Rate & Pricing Markup ──────────────────────────────────────
const USD_TO_INR = 96;
const PRICE_MULTIPLIER = 5; // customRate = originalRate (USD) × 96 (USD/INR) × 5 (markup)

// ─── Organic compatibility threshold ──────────────────────────────────────
// Services with minQuantity <= this value can receive organic jitter numbers
// like 443, 621 etc. without rejection. Services above this require rounding.
const ORGANIC_MIN_THRESHOLD = 50;

// ─── How many fallback service IDs to keep per type ───────────────────────
const MAX_FALLBACKS = 3;

function getKeywords(platform: string, type: string): string[] {
  return SEARCH_CONFIG[platform.toUpperCase()]?.[type.toLowerCase()] ||
    [platform.toLowerCase(), type.toLowerCase()];
}

/**
 * Score a candidate service for selection preference.
 * Higher score = better candidate.
 * Organic compatibility (min <= 50) is the #1 priority.
 */
function scoreCandidateService(svc: PanelServiceItem): number {
  const min = parseInt(svc.min) || 999;
  const rate = parseFloat(svc.rate) || 999;
  const name = svc.name.toLowerCase();

  let score = 0;

  // Organic-friendly: massive bonus
  if (min <= ORGANIC_MIN_THRESHOLD) score += 1000;
  else if (min <= 100) score += 100;

  // Non-drop / refill bonuses
  if (name.includes("non drop") || name.includes("nondrop")) score += 50;
  if (name.includes("refill") || name.includes("30 day")) score += 30;
  if (name.includes("365 day")) score += 40;

  // Disabled/dead penalty
  if (name.includes("disabled") || name.includes("stop")) score -= 10000;

  // Cheap = better (subtract rate as tiebreaker — max 50 to not override organic bonus)
  score -= Math.min(rate * 10, 50);

  return score;
}

import { NOT_GHOST_USER } from "@/lib/ghost";

export async function runAutoSync() {
  // Query all active panels, even if they are currently marked OFFLINE
  const activePanels = await prisma.panel.findMany({
    where: {
      isActive: true,
      OR: [
        { userId: null },
        { user: NOT_GHOST_USER }
      ]
    },
    include: { adminServices: true, user: true },
  });

  const logs: any[] = [];
  const servicesCache = new Map<string, { ok: boolean; services?: PanelServiceItem[]; error?: string; responseMs: number }>();

  for (const panel of activePanels) {
    const cleanUrl = panel.apiUrl.trim().toLowerCase();
    
    let res: { ok: boolean; services?: PanelServiceItem[]; error?: string; responseMs: number };
    if (servicesCache.has(cleanUrl)) {
      const cached = servicesCache.get(cleanUrl)!;
      res = cached;
      console.log(`[AutoSync] Reusing cached services response for sibling panel: ${panel.name || panel.id} (${panel.apiUrl})`);
    } else {
      const startMs = Date.now();
      const fetchRes = await getPanelServices(panel.apiUrl, panel.apiKeyEncrypted);
      const responseMs = Date.now() - startMs;
      
      res = {
        ok: fetchRes.ok,
        services: fetchRes.services,
        error: fetchRes.error,
        responseMs,
      };
      
      if (fetchRes.ok) {
        servicesCache.set(cleanUrl, res);
      }
      
      // Delay 1.2 seconds to prevent rapid consecutive hits on SMM domain
      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    const responseMs = res.responseMs;

    if (!res.ok || !res.services) {
      const msg = `⚠️ *AutoSync Alert*\nFailed to fetch live services for Panel: ${panel.name || panel.id}\nError: ${res.error || "Unknown"}`;
      console.error(msg);
      await sendTelegramAlert(msg);
      continue;
    }

    // Auto-restore OFFLINE panels if the API responded successfully
    if (panel.status === "OFFLINE") {
      await prisma.panel.update({
        where: { id: panel.id },
        data: {
          status: responseMs > 5000 ? "SLOW" : "ONLINE",
          lastCheckedAt: new Date(),
          lastResponseMs: responseMs,
        }
      });
      await sendTelegramAlert(`🟢 *AutoSync Reconnected*\nPanel *${panel.name || panel.id}* is healthy again and has been automatically set to ONLINE.`);
    }

    const liveServices = res.services;
    const liveServiceMap = new Map(liveServices.map(s => [String(s.service), s]));

    let mappingChanged = false;
    const serviceIdsObj: Record<string, Record<string, string>> =
      panel.serviceIds && typeof panel.serviceIds === "object"
        ? JSON.parse(JSON.stringify(panel.serviceIds))
        : {};

    const priceChanges: string[] = [];

    for (const configuredService of panel.adminServices) {
      let liveMatch = liveServiceMap.get(configuredService.serviceId);
      let isDead = !liveMatch ||
        liveMatch.name.toLowerCase().includes("disabled") ||
        liveMatch.name.toLowerCase().includes("stop");

      // ── OFFLINE WARNING FOR DEAD PRIMARY SERVICE ───────────────────
      if (isDead) {
        console.warn(`[AutoSync Warning] Primary service ID ${configuredService.serviceId} for ${configuredService.platform} ${configuredService.type} on panel ${panel.name || panel.id} is offline.`);
        priceChanges.push(
          `⚠️ *Offline Warning*: ${configuredService.platform} ${configuredService.type} (ID ${configuredService.serviceId}) is currently offline or disabled on SMM panel.`
        );
      }

      // ── A. CHECK FOR PRICE CHANGES (auto-apply 5x) ───────────────────
      if (!isDead && liveMatch) {
        const liveRateUSD = parseFloat(liveMatch.rate) || 0;
        const liveRateINR = parseFloat((liveRateUSD * USD_TO_INR).toFixed(6));
        const savedRate = configuredService.originalRate || 0;
        const rateChangePct = savedRate > 0 ? Math.abs(liveRateINR - savedRate) / savedRate : 1;

        if (rateChangePct > 0.001) { // Rate changed by more than 0.1%
          const newCustomRate = parseFloat((liveRateINR * PRICE_MULTIPLIER).toFixed(6));
          await prisma.adminService.update({
            where: { id: configuredService.id },
            data: {
              originalRate: liveRateINR,
              customRate: newCustomRate,
            }
          });

          if (rateChangePct > 0.1) { // Alert only for >10% price change
            priceChanges.push(
              `${configuredService.platform} ${configuredService.type}: ₹${savedRate.toFixed(4)} → ₹${liveRateINR.toFixed(4)}/1k`
            );
          }
        }
      }

      // ── B. UPDATE CUSTOM RATES OF CONFIGURED FALLBACKS ─────────────────
      let fallbacksChanged = false;
      const currentFallbacks = configuredService.fallbackServiceIds && Array.isArray(configuredService.fallbackServiceIds)
        ? configuredService.fallbackServiceIds
        : [];
      
      const updatedFallbacks = currentFallbacks.map((fb: any) => {
        if (typeof fb === "object" && fb !== null && fb.serviceId) {
          const liveMatch = liveServiceMap.get(String(fb.serviceId));
          if (liveMatch) {
            const liveRateUSD = parseFloat(liveMatch.rate) || 0;
            const liveRateINR = parseFloat((liveRateUSD * USD_TO_INR).toFixed(6));
            const savedRate = fb.originalRate || 0;
            if (Math.abs(liveRateINR - savedRate) > 0.001) {
              fallbacksChanged = true;
              return {
                ...fb,
                originalRate: liveRateINR,
                customRate: parseFloat((liveRateINR * PRICE_MULTIPLIER).toFixed(6)),
                name: liveMatch.name,
              };
            }
          }
        }
        return fb;
      });

      if (fallbacksChanged) {
        await prisma.adminService.update({
          where: { id: configuredService.id },
          data: { fallbackServiceIds: updatedFallbacks }
        });
      }
    }

    // ── D. SEND PRICE CHANGE SUMMARY ─────────────────────────────────
    if (priceChanges.length > 0 && !(panel.user && isGhostEmail(panel.user.email))) {
      await sendTelegramAlert(
        `📢 *AutoSync Alert*\nPanel: ${panel.name || panel.id}\n\nThe following updates occurred:\n${priceChanges.map(c => `• ${c}`).join("\n")}`
      );
    }

    // ── E. PROPAGATE CHANGES TO ALL SIBLING PANELS ───────────────────
    if (mappingChanged) {
      const cleanUrl = panel.apiUrl.trim().replace(/\/$/, "");
      const siblings = await prisma.panel.findMany({ where: { apiUrl: { startsWith: cleanUrl } } });
      for (const sib of siblings) {
        await prisma.panel.update({
          where: { id: sib.id },
          data: { serviceIds: serviceIdsObj }
        });
      }
    }
    
    logs.push({ panel: panel.name || panel.id, success: true });
  }

  return logs;
}
