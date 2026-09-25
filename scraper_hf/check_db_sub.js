const { PrismaClient } = require('@prisma/client');
const dbLocal = "postgresql://postgres:f47ee48e1101f1ce55985563f842872c@localhost:54322/postgres";
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbLocal
    }
  }
});

async function run() {
  try {
    const sub = await prisma.autoSubscription.findFirst({
      where: { username: { contains: 'pixelbyarpita', mode: 'insensitive' } },
      include: { user: true }
    });

    if (!sub) {
      console.log("No subscription found for pixelbyarpita!");
      return;
    }

    console.log("Subscription details:");
    console.log(`- Username: ${sub.username}`);
    console.log(`- Status: ${sub.status}`);
    console.log(`- Last Post ID: ${sub.lastPostId}`);
    console.log(`- User Email: ${sub.user.email}`);

    // Let's also check active orders for this user or reel
    const orders = await prisma.order.findMany({
      where: { userId: sub.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log("\nLast 5 orders placed for this user:");
    orders.forEach(o => {
      console.log(`- Order ID: ${o.id}, Status: ${o.status}, Views: ${o.viewsTarget}, Created: ${o.createdAt}`);
    });

  } catch (err) {
    console.error("Error checking db:", err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
