import { NextResponse } from "next/server";
import { getSessionWithComputation } from "@/lib/roast-sessions";
import { buildBaggingPdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSessionWithComputation(context.params.id);
  if (!session || !session.computation) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const pdf = await buildBaggingPdf(session.id, session.computation.bagging);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=bagging-report-${session.id}.pdf`,
    },
  });
}
