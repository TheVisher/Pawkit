import { NextResponse } from "next/server";
import { clearAllData } from "@/lib/server/admin";

export async function POST() {
  try {
    await clearAllData();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
