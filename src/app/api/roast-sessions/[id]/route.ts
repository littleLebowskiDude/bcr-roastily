import { NextResponse } from "next/server";
import { getSessionWithComputation, saveOnHand, toggleOrder } from "@/lib/roast-sessions";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSessionWithComputation(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ session });
}

export async function POST(request: Request, context: RouteContext) {
  const { id: sessionId } = await context.params;
  const body = await request.json().catch(() => ({}));

  if (body.orderId && body.status) {
    await toggleOrder(sessionId, body.orderId, body.status);
  }

  if (Array.isArray(body.onHand)) {
    await saveOnHand(sessionId, body.onHand);
  }

  const session = await getSessionWithComputation(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ session });
}
