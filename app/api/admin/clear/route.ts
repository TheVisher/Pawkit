import { NextResponse } from "next/server";
import { clearAllData } from "@/lib/server/admin";
import { handleApiError } from "@/lib/utils/api-error";
import { unauthorized, success } from "@/lib/utils/api-responses";
import { getCurrentUser } from "@/lib/auth/get-user";

// Only allow in development - this is a destructive operation
// In production, users should delete their account through settings
export async function POST() {
  let user;
  try {
    // Block in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: "This endpoint is only available in development", code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    await clearAllData(user.id);
    return success({ ok: true, message: 'All user data cleared successfully' });
  } catch (error) {
    return handleApiError(error, { route: '/api/admin/clear', userId: user?.id });
  }
}
