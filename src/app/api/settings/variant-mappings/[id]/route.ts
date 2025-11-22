import { NextResponse } from "next/server";
import { deleteVariantMapping, fetchSettingsSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function DELETE(_request: Request, context: RouteContext) {
  await deleteVariantMapping(context.params.id);
  const settings = await fetchSettingsSnapshot();
  return NextResponse.json({ settings });
}
