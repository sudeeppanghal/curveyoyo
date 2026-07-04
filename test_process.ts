import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { processEvent } from './src/lib/delivery/process';

const prisma = new PrismaClient();

async function main() {
  console.log("Resetting event cmr3aj9fz001qjp04p5wqfeg0");
  await prisma.deliveryEvent.update({
    where: { id: "cmr3aj9fz001qjp04p5wqfeg0" },
    data: { status: "SCHEDULED", executedAt: null }
  });

  console.log("Processing event cmr3aj9fz001qjp04p5wqfeg0");
  try {
    const result = await processEvent("cmr3aj9fz001qjp04p5wqfeg0");
    console.log("Result:", result);
  } catch (e) {
    console.error("Error:", e);
  }
}

main().finally(() => prisma.$disconnect());
