import { NextResponse } from "next/server";
import { DEFAULT_BATCH_SETTINGS } from "@/lib/constants";
import { fetchBlends, fetchCoffees, fetchVariantMappings } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const [coffees, blends, variantMappings] = await Promise.all([
    fetchCoffees(),
    fetchBlends(),
    fetchVariantMappings(),
  ]);
  return NextResponse.json({
    coffees,
    blends,
    variantMappings,
    settings: DEFAULT_BATCH_SETTINGS,
  });
}
