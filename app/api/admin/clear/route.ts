import { NextResponse } from "next/server";
import { clearAllData } from "@/lib/server/admin";
import { handleApiError } from "@/lib/utils/api-error";

export async function POST() {
  try {
    await clearAllData();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
