import { NextRequest, NextResponse } from "next/server";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { prisma } from "@/lib/server/prisma";
import { getCurrentUser } from "@/lib/auth/get-user";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the card
    const card = await prisma.card.findFirst({
      where: { id, userId: user.id }
    });

    if (!card) {
      return NextResponse.json({ message: "Card not found" }, { status: 404 });
    }

    // Fetch the HTML content from the URL
    const response = await fetch(card.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: "Failed to fetch article content" },
        { status: 500 }
      );
    }

    const html = await response.text();

    // Parse with JSDOM
    const dom = new JSDOM(html, { url: card.url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return NextResponse.json(
        { message: "Could not extract article content from this page" },
        { status: 400 }
      );
    }

    // Update the card with the extracted content
    const updatedCard = await prisma.card.update({
      where: { id, userId: user.id },
      data: {
        articleContent: article.content,
        // Also update title if it wasn't set
        title: card.title || article.title || card.url
      }
    });

    return NextResponse.json({
      success: true,
      articleContent: article.content,
      title: article.title
    });
  } catch (error) {
    console.error("Error extracting article:", error);
    return NextResponse.json(
      { message: "Failed to extract article content" },
      { status: 500 }
    );
  }
}
