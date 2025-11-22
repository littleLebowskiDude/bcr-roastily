import { NextResponse } from "next/server";
import { listBlends, listCoffees, listVariantMappings } from "@/lib/store";
import { DEFAULT_BATCH_SETTINGS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    coffees: listCoffees(),
    blends: listBlends(),
    variantMappings: listVariantMappings(),
    settings: DEFAULT_BATCH_SETTINGS,
  });
}
