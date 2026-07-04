const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find all orders that are currently DELIVERING
  const orders = await prisma.order.findMany({
    where: { status: 'DELIVERING' },
    include: {
      deliveryEvents: {
        where: { status: 'SCHEDULED' },
        orderBy: { scheduledAt: 'asc' }
      }
    }
  });

  const now = new Date();
  
  for (const order of orders) {
    if (order.deliveryEvents.length === 0) continue;
    
    // Calculate how far in the future the NEXT batch is scheduled
    const nextEvent = order.deliveryEvents[0];
    const diffMs = nextEvent.scheduledAt.getTime() - now.getTime();
    
    // If it's more than 30 minutes in the future, it might be suffering from the gap bug
    // (Since we know the bug pushes the second event out by the accumulated merge delay)
    if (diffMs > 30 * 60 * 1000) {
      console.log(`Fixing order ${order.id}: Next event is ${Math.round(diffMs/60000)} mins in the future.`);
      
      // Get the original delay from the gap bug (difference between actual scheduled time and what it should be)
      // Since we don't know the exact shift, we'll just pull all remaining events closer to NOW
      // We want the next event to happen soon, e.g. in 5 minutes
      const desiredNextTime = new Date(now.getTime() + 5 * 60 * 1000);
      const shiftMs = nextEvent.scheduledAt.getTime() - desiredNextTime.getTime();
      
      if (shiftMs > 0) {
        for (const event of order.deliveryEvents) {
          const newTime = new Date(event.scheduledAt.getTime() - shiftMs);
          await prisma.deliveryEvent.update({
            where: { id: event.id },
            data: { scheduledAt: newTime }
          });
        }
        console.log(`  Shifted ${order.deliveryEvents.length} events back by ${Math.round(shiftMs/60000)} mins.`);
      }
    }
  }
}

main()
  .then(() => console.log('Done fixing gaps.'))
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
