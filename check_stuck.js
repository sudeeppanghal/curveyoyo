require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const event = await prisma.deliveryEvent.findUnique({
    where: { id: "cmr3aj9fz001qjp04p5wqfeg0" },
    include: {
      order: {
        include: { user: true }
      }
    }
  });
  console.log(JSON.stringify(event, null, 2));
}

main().finally(() => prisma.$disconnect());
