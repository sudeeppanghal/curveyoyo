const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check24hDeliveries() {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  console.log('=== 24-HOUR INSTAGRAM DELIVERY ANALYSIS ===');
  console.log(`Time window: ${twentyFourHoursAgo.toISOString()} to ${now.toISOString()}\n`);

  // 1. Fetch Instagram Orders created or updated in last 24 hours
  const orders = await prisma.order.findMany({
    where: {
      updatedAt: { gte: twentyFourHoursAgo },
      reel: {
        platform: 'INSTAGRAM'
      }
    },
    include: {
      reel: true,
      panel: true,
      deliveryEvents: {
        where: {
          createdAt: { gte: twentyFourHoursAgo }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  console.log(`Total Instagram orders active/updated in last 24 hours: ${orders.length}`);

  let totalViewsTarget = 0;
  let totalViewsRemaining = 0;
  let totalLikesTarget = 0;
  let totalSavesTarget = 0;
  let totalSharesTarget = 0;
  let totalCommentsTarget = 0;
  let totalRepostsTarget = 0;

  let totalEventsCount = 0;
  let totalEventViewsDelivered = 0;
  let totalEventLikesDelivered = 0;
  let totalEventSavesDelivered = 0;
  let totalEventSharesDelivered = 0;
  let totalEventCommentsDelivered = 0;

  for (const o of orders) {
    totalViewsTarget += o.viewsTarget || 0;
    totalViewsRemaining += o.viewsRemaining || 0;
    totalLikesTarget += o.likesTarget || 0;
    totalSavesTarget += o.savesTarget || 0;
    totalSharesTarget += o.sharesTarget || 0;
    totalCommentsTarget += o.commentsTarget || 0;
    totalRepostsTarget += o.repostsTarget || 0;

    for (const ev of o.deliveryEvents) {
      totalEventsCount++;
      totalEventViewsDelivered += ev.viewsDelivered || 0;
      totalEventLikesDelivered += ev.likesDelivered || 0;
      totalEventSavesDelivered += ev.savesDelivered || 0;
      totalEventSharesDelivered += ev.sharesDelivered || 0;
      totalEventCommentsDelivered += ev.commentsDelivered || 0;
    }
  }

  const estimatedViewsDelivered = totalViewsTarget - totalViewsRemaining;

  console.log('\n--- AGGREGATE INSTAGRAM ORDER STATS (LAST 24H) ---');
  console.log(`Total Target Views Requested: ${totalViewsTarget.toLocaleString()}`);
  console.log(`Total Remaining Views:        ${totalViewsRemaining.toLocaleString()}`);
  console.log(`Estimated Views Delivered:    ${estimatedViewsDelivered.toLocaleString()}`);
  console.log(`Target Likes Requested:        ${totalLikesTarget.toLocaleString()}`);
  console.log(`Target Saves Requested:        ${totalSavesTarget.toLocaleString()}`);
  console.log(`Target Shares Requested:       ${totalSharesTarget.toLocaleString()}`);
  console.log(`Target Comments Requested:     ${totalCommentsTarget.toLocaleString()}`);
  console.log(`Target Reposts Requested:      ${totalRepostsTarget.toLocaleString()}`);

  console.log('\n--- RECORDED DELIVERY EVENTS (LAST 24H) ---');
  console.log(`Total Delivery Event Ticks:   ${totalEventsCount}`);
  console.log(`Event Views Delivered:        ${totalEventViewsDelivered.toLocaleString()}`);
  console.log(`Event Likes Delivered:        ${totalEventLikesDelivered.toLocaleString()}`);
  console.log(`Event Saves Delivered:        ${totalEventSavesDelivered.toLocaleString()}`);
  console.log(`Event Shares Delivered:       ${totalEventSharesDelivered.toLocaleString()}`);
  console.log(`Event Comments Delivered:     ${totalEventCommentsDelivered.toLocaleString()}`);

  // 2. Check VideoOrder / DeliveryQueueItem if present
  try {
    const videoOrders = await prisma.videoOrder.findMany({
      where: { updatedAt: { gte: twentyFourHoursAgo } },
      orderBy: { updatedAt: 'desc' }
    });
    console.log(`\nVideoOrders in last 24h: ${videoOrders.length}`);
  } catch (e) {
    console.log('\nVideoOrder table check skipped or empty.');
  }

  // 3. Breakdown of Order Statuses
  const statusCounts = {};
  for (const o of orders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  }
  console.log('\n--- ORDER STATUS BREAKDOWN (LAST 24H) ---');
  console.table(statusCounts);

  // 4. Sample Recent Orders
  console.log('\n--- RECENT 5 INSTAGRAM ORDERS ---');
  orders.slice(0, 5).forEach((o, i) => {
    console.log(`${i+1}. Order ID: ${o.id} | Status: ${o.status}`);
    console.log(`   Reel URL: ${o.reel?.url}`);
    console.log(`   Panel: ${o.panel?.name || 'N/A'}`);
    console.log(`   Views Target: ${o.viewsTarget} | Remaining: ${o.viewsRemaining}`);
    console.log(`   Price Charged: ₹${o.priceCharged}`);
    console.log(`   Created: ${o.createdAt.toISOString()} | Updated: ${o.updatedAt.toISOString()}`);
  });

  await prisma.$disconnect();
}

check24hDeliveries().catch(console.error);
