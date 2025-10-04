import { prisma } from "@/lib/server/prisma";

export async function clearAllData(userId: string) {
  await prisma.$transaction([
    prisma.card.deleteMany({ where: { userId } }),
    prisma.collection.deleteMany({ where: { userId } })
  ]);
}
