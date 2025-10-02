import { NextRequest, NextResponse } from "next/server";
import { exportData, importData } from "@/lib/server/import";

export async function GET() {
  try {
    const data = await exportData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await importData(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
