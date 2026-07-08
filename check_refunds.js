const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const orders = await p.order.findMany({
    where: {
      status: { in: ['FAILED', 'CANCELLED'] },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    },
    include: {
      user: { select: { email: true, walletMode: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\n=== AUDIT OF FAILED/CANCELLED ORDERS IN LAST 24h ===\n`);
  for (const o of orders) {
    const refundLog = await p.auditLog.findFirst({
      where: {
        action: "ORDER_MIDWAY_REFUND",
        metadata: { path: ["orderId"], equals: o.id }
      }
    });

    console.log(`Order ID: ${o.id}`);
    console.log(`  User:       ${o.user.email}`);
    console.log(`  WalletMode: ${o.user.walletMode}`);
    console.log(`  Status:     ${o.status}`);
    console.log(`  FailReason: ${o.failReason || 'none'}`);
    console.log(`  Refunded:   ${refundLog ? `YES (₹${refundLog.metadata.refundAmount})` : 'NO'}`);
    console.log('');
  }
}

main().catch(console.error).finally(() => p.$disconnect());
