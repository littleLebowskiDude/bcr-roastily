import { NextResponse } from "next/server";
import { fetchSettingsSnapshot, upsertVariantMapping } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const variantId =
    typeof body.variantId === "string" && body.variantId.trim().length > 0
      ? body.variantId.trim()
      : null;
  const coffeeId =
    typeof body.coffeeId === "string" && body.coffeeId.trim().length > 0
      ? body.coffeeId.trim()
      : null;
  const isBlend = Boolean(body.isBlend);
  const sizeG =
    typeof body.sizeG === "number" ? body.sizeG : Number(body.sizeG ?? Number.NaN);
  const grindType =
    typeof body.grindType === "string" && body.grindType.trim().length > 0
      ? body.grindType.trim()
      : "Whole bean";

  if (!variantId || !coffeeId || Number.isNaN(sizeG)) {
    return NextResponse.json(
      { error: "variantId, coffeeId, and sizeG are required" },
      { status: 400 },
    );
  }

  await upsertVariantMapping({
    variantId,
    coffeeId,
    isBlend,
    sizeG,
    grindType,
  });

  const settings = await fetchSettingsSnapshot();
  return NextResponse.json({ settings }, { status: 201 });
}
