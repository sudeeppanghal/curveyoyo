require('dotenv').config();
// Register module aliases to resolve "@/..."
const moduleAlias = require('module-alias');
moduleAlias.addAliases({
  '@': __dirname + '/src'
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { processEvent } = require('./src/lib/delivery/process');

async function main() {
  console.log("Processing event cmr3aj9fz001qjp04p5wqfeg0");
  try {
    const result = await processEvent("cmr3aj9fz001qjp04p5wqfeg0");
    console.log("Result:", result);
  } catch (e) {
    console.error("Error:", e);
  }
}

main().finally(() => prisma.$disconnect());
