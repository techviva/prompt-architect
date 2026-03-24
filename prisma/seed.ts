import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create some default tags
  const tags = [
    { name: "important", color: "#ef4444" },
    { name: "follow-up", color: "#f59e0b" },
    { name: "completed", color: "#22c55e" },
    { name: "coding", color: "#6366f1" },
    { name: "research", color: "#3b82f6" },
    { name: "writing", color: "#ec4899" },
  ];

  for (const tag of tags) {
    await prisma.historyTag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    });
  }

  // Create default user settings
  const settings = [
    { key: "default_platform", value: "auto" },
    { key: "theme", value: "light" },
  ];

  for (const setting of settings) {
    await prisma.userSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: { key: setting.key, value: setting.value },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
