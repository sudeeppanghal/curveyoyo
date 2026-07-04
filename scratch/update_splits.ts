import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateSplits() {
  console.log("Updating all existing profit splits to 40/40...");

  const splits = await prisma.profitSplit.findMany();
  let updated = 0;

  for (const split of splits) {
    const ankitShare = parseFloat((split.amountInr * 0.4).toFixed(2));
    const ramShare = parseFloat((split.amountInr * 0.4).toFixed(2));

    await prisma.profitSplit.update({
      where: { id: split.id },
      data: {
        ankitShare,
        ramShare,
      }
    });
    updated++;
  }

  console.log(`Updated ${updated} records back to 40/40.`);
}

updateSplits()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
