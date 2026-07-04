import { prisma } from "@/lib/prisma";
import { getPanelServices, PanelServiceItem } from "./panel-client";

// Mappings for keyword searching based on type/platform
const SEARCH_CONFIG: Record<string, Record<string, string[]>> = {
  INSTAGRAM: {
    views: ["instagram", "view"],
    likes: ["instagram", "like"],
    saves: ["instagram", "save"],
    shares: ["instagram", "share"],
    comments: ["instagram", "comment"],
  },
  TIKTOK: {
    views: ["tiktok", "view"],
    likes: ["tiktok", "like"],
    saves: ["tiktok", "save"],
    shares: ["tiktok", "share"],
    comments: ["tiktok", "comment"],
  },
  // Add other platforms as needed...
};

function getKeywords(platform: string, type: string): string[] {
  return SEARCH_CONFIG[platform.toUpperCase()]?.[type.toLowerCase()] || [platform.toLowerCase(), type.toLowerCase()];
}

export async function runAutoSync() {
  const activePanels = await prisma.panel.findMany({
    where: { isActive: true, status: { not: "OFFLINE" } },
    include: { adminServices: true },
  });

  const logs = [];

  for (const panel of activePanels) {
    const res = await getPanelServices(panel.apiUrl, panel.apiKeyEncrypted);
    if (!res.ok || !res.services) {
      console.error(`AutoSync: Failed to fetch live services for Panel ${panel.id}`);
      continue;
    }

    const liveServices = res.services;
    const liveServiceMap = new Map(liveServices.map(s => [String(s.service), s]));

    let mappingChanged = false;
    let serviceIdsObj: Record<string, Record<string, string>> = {};
    if (panel.serviceIds && typeof panel.serviceIds === "object") {
      serviceIdsObj = JSON.parse(JSON.stringify(panel.serviceIds)); // Deep clone
    }

    for (const configuredService of panel.adminServices) {
      const liveMatch = liveServiceMap.get(configuredService.serviceId);
      
      // If service is missing, or its name contains "disabled" or "stop", we failover.
      const isDead = !liveMatch || liveMatch.name.toLowerCase().includes("disabled") || liveMatch.name.toLowerCase().includes("stop");

      if (isDead) {
        console.log(`AutoSync: Panel ${panel.id} | Service ${configuredService.serviceId} is dead. Finding replacement for ${configuredService.platform} ${configuredService.type}...`);
        
        const keywords = getKeywords(configuredService.platform, configuredService.type);
        
        // Find matching services
        let candidates = liveServices.filter(s => {
          const lowerName = s.name.toLowerCase();
          if (lowerName.includes("disabled") || lowerName.includes("stop")) return false;
          return keywords.every(kw => lowerName.includes(kw));
        });

        if (candidates.length === 0) {
          console.warn(`AutoSync: No candidates found for ${configuredService.platform} ${configuredService.type} on panel ${panel.id}`);
          continue;
        }

        // Sort by cheapest
        candidates.sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));
        
        // Pick cheapest that is not the dead one
        const replacement = candidates.find(c => c.service !== configuredService.serviceId);
        
        if (replacement) {
          // 1. Update AdminService row
          await prisma.adminService.update({
            where: { id: configuredService.id },
            data: {
              serviceId: replacement.service,
              originalRate: parseFloat(replacement.rate),
              name: replacement.name,
              minQuantity: parseInt(replacement.min) || 10,
            }
          });

          // 2. Log it
          const log = await prisma.serviceChangeLog.create({
            data: {
              panelId: panel.id,
              platform: configuredService.platform,
              type: configuredService.type,
              oldServiceId: configuredService.serviceId,
              newServiceId: replacement.service,
              oldServiceName: configuredService.name,
              newServiceName: replacement.name,
              reason: `Service ID ${configuredService.serviceId} went offline. Auto-switched to cheapest matching alternative.`,
            }
          });
          logs.push(log);

          // 3. Update the JSON mapping tree
          const platformKey = configuredService.platform.toLowerCase();
          const typeKey = configuredService.type.toLowerCase();
          
          if (!serviceIdsObj[platformKey]) serviceIdsObj[platformKey] = {};
          serviceIdsObj[platformKey][typeKey] = replacement.service;
          
          mappingChanged = true;
        }
      }
    }

    if (mappingChanged) {
      // Find all panels that share the same API URL (to sync across multiple API keys)
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
