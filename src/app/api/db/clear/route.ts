import { NextResponse } from "next/server";
import { clearOperationalData } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearOperationalData();
  return NextResponse.json({
    status: "ok",
    cleared: ["orders", "order_items", "roast_sessions", "on_hand_stock", "roast_results"],
    preserved: ["coffees", "blends", "blend_components", "variant_mappings"],
  });
}

export { POST as DELETE };
