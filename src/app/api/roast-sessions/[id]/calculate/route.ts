import { NextResponse } from "next/server";
import { getSessionWithComputation } from "@/lib/roast-sessions";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function POST(_request: Request, context: RouteContext) {
  const session = await getSessionWithComputation(context.params.id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ session });
}
