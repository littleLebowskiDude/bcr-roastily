import { NextResponse } from "next/server";
import { deleteVariantMapping, fetchSettingsSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  await deleteVariantMapping(id);
  const settings = await fetchSettingsSnapshot();
  return NextResponse.json({ settings });
}
