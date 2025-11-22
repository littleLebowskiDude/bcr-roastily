import { NextResponse } from "next/server";
import { pingDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = await pingDatabase();
    return NextResponse.json({ status: "ok", now });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Database connection failed";
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
