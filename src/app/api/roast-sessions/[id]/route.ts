import { NextResponse } from "next/server";
import { getSessionWithComputation, saveOnHand, toggleOrder } from "@/lib/roast-sessions";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, context: RouteContext) {
  const session = getSessionWithComputation(context.params.id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ session });
}

export async function POST(request: Request, context: RouteContext) {
  const body = await request.json().catch(() => ({}));
  const sessionId = context.params.id;

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
