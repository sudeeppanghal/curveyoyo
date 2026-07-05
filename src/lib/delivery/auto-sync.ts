import { prisma } from "@/lib/prisma";
import { getPanelServices, PanelServiceItem } from "./panel-client";
import { sendTelegramAlert } from "@/lib/telegram";

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

// ─── 5x pricing multiplier ────────────────────────────────────────────────
// This is the ONLY place the markup is defined.
// customRate = originalRate × PRICE_MULTIPLIER, always, forever.
const PRICE_MULTIPLIER = 5;

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

export async function runAutoSync() {
  const activePanels = await prisma.panel.findMany({
    where: { isActive: true, status: { not: "OFFLINE" } },
    include: { adminServices: true },
  });

  const logs: any[] = [];

  for (const panel of activePanels) {
    const res = await getPanelServices(panel.apiUrl, panel.apiKeyEncrypted);
    if (!res.ok || !res.services) {
      const msg = `⚠️ *AutoSync Alert*\nFailed to fetch live services for Panel: ${panel.name || panel.id}\nError: ${res.error || "Unknown"}`;
      console.error(msg);
      await sendTelegramAlert(msg);
      continue;
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
      const liveMatch = liveServiceMap.get(configuredService.serviceId);
      const isDead = !liveMatch ||
        liveMatch.name.toLowerCase().includes("disabled") ||
        liveMatch.name.toLowerCase().includes("stop");

      // ── A. CHECK FOR PRICE CHANGES (auto-apply 5x) ───────────────────
      if (!isDead && liveMatch) {
        const liveRate = parseFloat(liveMatch.rate) || 0;
        const savedRate = configuredService.originalRate || 0;
        const rateChangePct = savedRate > 0 ? Math.abs(liveRate - savedRate) / savedRate : 1;

        if (rateChangePct > 0.001) { // Rate changed by more than 0.1%
          const newCustomRate = parseFloat((liveRate * PRICE_MULTIPLIER).toFixed(6));
          await prisma.adminService.update({
            where: { id: configuredService.id },
            data: {
              originalRate: liveRate,
              customRate: newCustomRate,
            }
          });

          if (rateChangePct > 0.1) { // Alert only for >10% price change
            priceChanges.push(
              `${configuredService.platform} ${configuredService.type}: ₹${savedRate.toFixed(4)} → ₹${liveRate.toFixed(4)}/1k`
            );
          }
        }
      }

      // ── B. UPDATE FALLBACK LIST (always keep top 3 best alternatives) ──
      {
        const keywords = getKeywords(configuredService.platform, configuredService.type);
        const candidates = liveServices
          .filter(s => {
            const lowerName = s.name.toLowerCase();
            if (lowerName.includes("disabled") || lowerName.includes("stop")) return false;
            if (s.service === configuredService.serviceId) return false; // exclude primary
            return keywords.every(kw => lowerName.includes(kw));
          })
          .sort((a, b) => scoreCandidateService(b) - scoreCandidateService(a)) // best first
          .slice(0, MAX_FALLBACKS)
          .map(s => s.service);

        // Only update if fallback list changed
        const currentFallbacks = configuredService.fallbackServiceIds as string[] | null ?? [];
        const listsMatch = candidates.length === currentFallbacks.length &&
          candidates.every((id, i) => id === currentFallbacks[i]);

        if (!listsMatch) {
          await prisma.adminService.update({
            where: { id: configuredService.id },
            data: { fallbackServiceIds: candidates }
          });
        }
      }

      // ── C. REPLACE DEAD SERVICE (auto-swap to best live alternative) ──
      if (isDead) {
        console.log(`AutoSync: Panel ${panel.id} | Service ${configuredService.serviceId} is dead. Finding replacement for ${configuredService.platform} ${configuredService.type}...`);

        const keywords = getKeywords(configuredService.platform, configuredService.type);
        let candidates = liveServices
          .filter(s => {
            const lowerName = s.name.toLowerCase();
            if (lowerName.includes("disabled") || lowerName.includes("stop")) return false;
            return keywords.every(kw => lowerName.includes(kw));
          })
          .sort((a, b) => scoreCandidateService(b) - scoreCandidateService(a));

        if (candidates.length === 0) {
          const msg = `⚠️ *AutoSync Critical*\nPanel: ${panel.name || panel.id}\nService *${configuredService.platform} ${configuredService.type}* went offline.\n❌ No matching candidates found to replace it!`;
          console.warn(msg);
          await sendTelegramAlert(msg);
          continue;
        }

        // Best candidate = primary replacement
        const replacement = candidates[0];
        // Rest become new fallbacks
        const newFallbacks = candidates.slice(1, MAX_FALLBACKS + 1).map(s => s.service);

        const liveRate = parseFloat(replacement.rate) || 0;
        const newCustomRate = parseFloat((liveRate * PRICE_MULTIPLIER).toFixed(6));

        await prisma.adminService.update({
          where: { id: configuredService.id },
          data: {
            serviceId: replacement.service,
            originalRate: liveRate,
            customRate: newCustomRate,
            name: replacement.name,
            minQuantity: parseInt(replacement.min) || 10,
            fallbackServiceIds: newFallbacks,
          }
        });

        const log = await prisma.serviceChangeLog.create({
          data: {
            panelId: panel.id,
            platform: configuredService.platform,
            type: configuredService.type,
            oldServiceId: configuredService.serviceId,
            newServiceId: replacement.service,
            oldServiceName: configuredService.name,
            newServiceName: replacement.name,
            reason: `Service ID ${configuredService.serviceId} went offline. Auto-switched to best organic-compatible alternative (min=${replacement.min}).`,
          }
        });
        logs.push(log);

        const platformKey = configuredService.platform.toLowerCase();
        const typeKey = configuredService.type.toLowerCase();
        if (!serviceIdsObj[platformKey]) serviceIdsObj[platformKey] = {};
        serviceIdsObj[platformKey][typeKey] = replacement.service;
        mappingChanged = true;

        const organicNote = parseInt(replacement.min) <= ORGANIC_MIN_THRESHOLD
          ? "✅ Organic compatible (min≤50)"
          : "⚠️ Min>50 — will round quantities";

        await sendTelegramAlert(
          `🔄 *AutoSync Swap*\nPanel: ${panel.name || panel.id}\nPlatform: ${configuredService.platform} | Type: ${configuredService.type}\n\n*Old*: ${configuredService.serviceId} (Offline)\n*New*: ${replacement.service} (${replacement.name})\n*Rate*: ₹${liveRate}/1k → Customer: ₹${newCustomRate}/1k (5x)\n${organicNote}\n*Fallbacks set*: ${newFallbacks.join(", ") || "none"}`
        );
      }
    }

    // ── D. SEND PRICE CHANGE SUMMARY ─────────────────────────────────
    if (priceChanges.length > 0) {
      await sendTelegramAlert(
        `💰 *Price Update*\nPanel: ${panel.name || panel.id}\n\nThe following services had rate changes (auto-applied 5x):\n${priceChanges.map(c => `• ${c}`).join("\n")}`
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
  }

  return logs;
}
