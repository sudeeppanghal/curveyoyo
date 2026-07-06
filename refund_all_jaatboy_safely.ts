import { PrismaClient } from "@prisma/client";
import { triggerMidwayRefund } from "./src/lib/delivery/refund";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "jaatboy0808@gmail.com" }
  });

  if (!user) {
    console.log("User not found.");
    return;
  }

  console.log(`=== Processing Safe Refunds for jaatboy0808@gmail.com ===`);
  console.log(`Current Balance: ₹${user.balance.toFixed(2)}`);

  // 1. Find all already-refunded order IDs from audit logs
  const auditLogs = await prisma.auditLog.findMany({
    where: { userId: user.id }
  });

  const refundedOrderIds = new Set<string>();
  for (const log of auditLogs) {
    const meta = log.metadata as any;
    if (meta && meta.orderId) {
      refundedOrderIds.add(String(meta.orderId));
    }
  }

  console.log(`Already refunded order IDs (from logs):`, Array.from(refundedOrderIds));

  // 2. Find all orders for the user
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" }
  });

  console.log(`Found ${orders.length} orders total.`);

  for (const o of orders) {
    if (refundedOrderIds.has(o.id)) {
      console.log(`- Order ${o.id}: Already refunded previously (skipped).`);
      continue;
    }

    const viewsTarget = o.viewsTarget ?? 0;
    const viewsDelivered = o.viewsDelivered ?? 0;
    const isFailedOrCancelled = o.status === "FAILED" || o.status === "CANCELLED";
    const undeliveredViews = viewsTarget - viewsDelivered;

    if ((isFailedOrCancelled || undeliveredViews > 0) && o.priceCharged > 0) {
      console.log(`👉 Order ${o.id} (${o.status}) needs refund. Triggering Midway Refund...`);
      // Temporarily ensure user has walletMode enabled so triggerMidwayRefund works
      await prisma.user.update({
        where: { id: user.id },
        data: { walletMode: true }
      });

      await triggerMidwayRefund(o.id);
    }
  }

  const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
  console.log(`\n=== Processing Complete ===`);
  console.log(`New Wallet Balance: ₹${updatedUser?.balance.toFixed(2)}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
