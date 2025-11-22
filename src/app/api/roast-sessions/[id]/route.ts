import { NextResponse } from "next/server";
import { getSessionWithComputation } from "@/lib/roast-sessions";
import { updateOnHand, updateOrderStatus } from "@/lib/store";

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
    updateOrderStatus(sessionId, body.orderId, body.status);
  }

  if (Array.isArray(body.onHand)) {
    updateOnHand(sessionId, body.onHand);
  }

  const session = getSessionWithComputation(sessionId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ session });
}
