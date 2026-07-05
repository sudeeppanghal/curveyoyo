const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FALLBACK_MAP = {
  INSTAGRAM: {
    views:    { fallbacks: ['13636', '12876', '13576'] },
    likes:    { fallbacks: ['13973', '13562', '13455'] },
    saves:    { fallbacks: ['13347', '11276', '9110'] },
    shares:   { fallbacks: ['4304', '9155', '12000'] },
    comments: { fallbacks: ['13687', '13688', '13208'] },
    reposts:  { fallbacks: ['4304', '9155'] },
  },
  TIKTOK: {
    views:    { fallbacks: ['13840', '5215', '13841'] },
    likes:    { fallbacks: ['14002', '13117', '13118'] },
    saves:    { fallbacks: ['13113', '13114', '13115'] },
    shares:   { fallbacks: ['9109', '5158', '13116'] },
    comments: { fallbacks: ['12406', '7487', '13209'] },
    reposts:  { fallbacks: ['9109', '5158'] },
  },
  YOUTUBE: {
    views:       { fallbacks: ['10051', '10052'] },
    likes:       { fallbacks: ['11930', '11931'] },
    subscribers: { fallbacks: ['13460', '13461'] },
    comments:    { fallbacks: ['13501', '13502'] },
  }
};

async function main() {
  const svcs = await prisma.adminService.findMany();
  console.log('Found', svcs.length, 'services');
  let updated = 0;
  for (const svc of svcs) {
    const cfg = FALLBACK_MAP[svc.platform] && FALLBACK_MAP[svc.platform][svc.type];
    const fallbacks = cfg ? cfg.fallbacks.filter(function(id) { return id !== svc.serviceId; }) : [];
    const newCustomRate = parseFloat((svc.originalRate * 5).toFixed(6));
    await prisma.adminService.update({
      where: { id: svc.id },
      data: { customRate: newCustomRate, fallbackServiceIds: fallbacks }
    });
    console.log('[' + svc.platform + '.' + svc.type + '] serviceId=' + svc.serviceId + ' originalRate=' + svc.originalRate + ' customRate=' + newCustomRate + ' fallbacks=[' + fallbacks.join(',') + ']');
    updated++;
  }
  console.log('\nDone. Updated', updated, 'services.');
  await prisma.$disconnect();
}

main().catch(function(e) { console.error(e); process.exit(1); });
