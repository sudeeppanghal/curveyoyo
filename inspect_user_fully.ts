import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("=== Querying User: lordsniper716@gmail.com ===");

  const user = await prisma.user.findFirst({
    where: { email: "lordsniper716@gmail.com" }
  });

  if (!user) {
    console.log("User not found.");
    return;
  }

  console.log("User Columns:");
  for (const [key, val] of Object.entries(user)) {
    console.log(`  ${key}: ${val}`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
