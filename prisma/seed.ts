import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo user
  const hashedPassword = await bcrypt.hash("demo123456", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@autovision.pro" },
    update: {},
    create: {
      email: "demo@autovision.pro",
      name: "Demo User",
      password: hashedPassword,
      role: "user",
      settings: {
        create: {
          backgroundType: "studio",
          quality: "high",
          format: "jpg",
          autoOcr: true,
          autoProcess: true,
        },
      },
    },
  });

  console.log(`Created demo user: ${user.email}`);
  console.log("Seed completed!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
