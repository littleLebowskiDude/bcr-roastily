import { NextResponse } from "next/server";
import { DEFAULT_BATCH_SETTINGS } from "@/lib/constants";
import { fetchSettingsSnapshot } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const { coffees, blends, variantMappings } = await fetchSettingsSnapshot();
  return NextResponse.json({
    coffees,
    blends,
    variantMappings,
    settings: DEFAULT_BATCH_SETTINGS,
  });
}
