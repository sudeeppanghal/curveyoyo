const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'manish7773501@gmail.com' }
  });

  if (!user) return;

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  for (const order of orders) {
      console.log(`Order ID: ${order.id}`);
      console.log(`Status: ${order.status}`);
      console.log(`Views: ${order.viewsDelivered} / ${order.viewsTarget}`);
      console.log(`Likes: ${order.likesDelivered} / ${order.likesTarget}`);
      console.log(`Saves: ${order.savesDelivered} / ${order.savesTarget}`);
      console.log(`Shares: ${order.sharesDelivered} / ${order.sharesTarget}`);
      console.log('---');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
