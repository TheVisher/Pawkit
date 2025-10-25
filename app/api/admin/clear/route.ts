import { NextResponse } from "next/server";
import { clearAllData } from "@/lib/server/admin";
import { handleApiError } from "@/lib/utils/api-error";
import { getCurrentUser } from "@/lib/auth/get-user";

// Only allow in development - this is a destructive operation
// In production, users should delete their account through settings
export async function POST() {
  try {
    // Block in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: "This endpoint is only available in development" },
        { status: 403 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await clearAllData(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
