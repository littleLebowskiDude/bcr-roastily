import { NextResponse } from "next/server";
import { getSessionWithComputation } from "@/lib/roast-sessions";
import { buildRoastingPdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    let session;
    try {
      session = await getSessionWithComputation(id);
    } catch (sessionError) {
      return NextResponse.json({
        error: "Failed to get session",
        details: sessionError instanceof Error ? sessionError.message : String(sessionError),
        stack: sessionError instanceof Error ? sessionError.stack : undefined,
      }, { status: 500 });
    }

    if (!session || !session.computation) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    let pdf;
    try {
      pdf = await buildRoastingPdf(session.id, session.computation);
    } catch (pdfError) {
      return NextResponse.json({
        error: "Failed to build PDF",
        details: pdfError instanceof Error ? pdfError.message : String(pdfError),
        stack: pdfError instanceof Error ? pdfError.stack : undefined,
      }, { status: 500 });
    }

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=roasting-report-${session.id}.pdf`,
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: "Unexpected error",
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
