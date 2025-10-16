import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/server/prisma";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all view settings for the user
    const settings = await prisma.userViewSettings.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        view: 'asc',
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[API] Error fetching view settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch view settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { view, settings } = body;

    if (!view || !settings) {
      return NextResponse.json(
        { error: "Missing required fields: view, settings" },
        { status: 400 }
      );
    }

    // Validate view type
    const validViews = ["library", "notes", "den", "timeline", "pawkits", "home", "favorites", "trash"];
    if (!validViews.includes(view)) {
      return NextResponse.json(
        { error: "Invalid view type" },
        { status: 400 }
      );
    }

    // Upsert view settings
    const viewSettings = await prisma.userViewSettings.upsert({
      where: {
        userId_view: {
          userId: user.id,
          view: view,
        },
      },
      update: {
        layout: settings.layout,
        cardSize: settings.cardSize,
        showTitles: settings.showTitles,
        showUrls: settings.showUrls,
        showTags: settings.showTags,
        cardPadding: settings.cardPadding,
        sortBy: settings.sortBy,
        sortOrder: settings.sortOrder,
        viewSpecific: settings.viewSpecific,
      },
      create: {
        userId: user.id,
        view: view,
        layout: settings.layout,
        cardSize: settings.cardSize,
        showTitles: settings.showTitles,
        showUrls: settings.showUrls,
        showTags: settings.showTags,
        cardPadding: settings.cardPadding,
        sortBy: settings.sortBy,
        sortOrder: settings.sortOrder,
        viewSpecific: settings.viewSpecific,
      },
    });

    return NextResponse.json({ success: true, settings: viewSettings });
  } catch (error) {
    console.error("[API] Error updating view settings:", error);
    return NextResponse.json(
      { error: "Failed to update view settings" },
      { status: 500 }
    );
  }
}

