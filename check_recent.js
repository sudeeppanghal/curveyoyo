const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const order = await prisma.order.findUnique({ where: { id: 'cmr5tgkpy0001kz04u5xa0wyi' }});
  console.log(JSON.stringify(order, null, 2));
}
main().finally(() => prisma.$disconnect());
