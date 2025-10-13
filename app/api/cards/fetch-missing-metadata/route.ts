import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { prisma } from "@/lib/server/prisma";
import { fetchAndUpdateCardMetadata } from "@/lib/server/cards";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find all URL cards that are missing image, title, or description
    const cardsNeedingMetadata = await prisma.card.findMany({
      where: {
        userId: user.id,
        deleted: false,
        type: "url",
        OR: [
          { image: null },
          { image: "" },
          { title: null },
          { title: "" },
        ]
      },
      select: {
        id: true,
        url: true
      }
    });

    // Fetch metadata for each card (in background to avoid timeout)
    const fetchPromises = cardsNeedingMetadata.map(card =>
      fetchAndUpdateCardMetadata(card.id, card.url).catch(err => {
        console.error(`Failed to fetch metadata for card ${card.id}:`, err);
        return null;
      })
    );

    // Don't await all - let them run in background
    Promise.all(fetchPromises).catch(console.error);

    return NextResponse.json({
      success: true,
      count: cardsNeedingMetadata.length,
      message: `Fetching metadata for ${cardsNeedingMetadata.length} cards...`
    });
  } catch (error) {
    console.error("Failed to fetch missing metadata:", error);
    return NextResponse.json(
      { error: "Failed to fetch missing metadata" },
      { status: 500 }
    );
  }
}
