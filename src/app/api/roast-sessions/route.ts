import { NextResponse } from "next/server";
import { createRoastSession } from "@/lib/repository";
import { listSessionsWithTotals } from "@/lib/roast-sessions";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessions = listSessionsWithTotals();
  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const date = typeof body.sessionDate === "string" ? body.sessionDate : undefined;
  const session = createRoastSession(date);
  return NextResponse.json({ session }, { status: 201 });
}
