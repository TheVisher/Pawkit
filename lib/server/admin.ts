import { prisma } from "@/lib/server/prisma";

export async function clearAllData() {
  await prisma.$transaction([
    prisma.card.deleteMany(),
    prisma.collection.deleteMany()
  ]);
}
