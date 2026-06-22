import { runSync } from "../src/lib/sync";
import { prisma } from "../src/lib/db";

async function main() {
  console.log("Seeding database via provider sync...");
  const result = await runSync();
  console.table(result);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
