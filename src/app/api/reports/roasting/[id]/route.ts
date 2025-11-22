import { NextResponse } from "next/server";
import { getSessionWithComputation } from "@/lib/roast-sessions";
import { buildRoastingPdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, context: RouteContext) {
  const session = getSessionWithComputation(context.params.id);
  if (!session || !session.computation) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const pdf = await buildRoastingPdf(session.id, session.computation);
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=roasting-report-${session.id}.pdf`,
    },
  });
}
