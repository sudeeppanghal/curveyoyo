const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'rawatjy2@gmail.com' }
  });
  console.log('USER_IN_DB:', user);
  
  const allUsers = await prisma.user.findMany();
  console.log('Total Users:', allUsers.length);
  
  const tickets = await prisma.ticket.findMany({
    where: { userEmail: 'rawatjy2@gmail.com' }
  });
  console.log('TICKETS_FOR_USER:', tickets.length);
}

main().finally(() => prisma.$disconnect());
