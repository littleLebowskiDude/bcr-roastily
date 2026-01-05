import { NextResponse } from "next/server";
import { getSessionWithComputation } from "@/lib/roast-sessions";
import { buildRoastingPdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSessionWithComputation(id);
  if (!session || !session.computation) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const pdf = await buildRoastingPdf(session.id, session.computation);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=roasting-report-${session.id}.pdf`,
    },
  });
}
