import { NextResponse } from "next/server";
import { fetchUnfulfilledOrders } from "@/lib/shopify";
import { mapShopifyOrdersToInternal } from "@/lib/order-mapper";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await fetchUnfulfilledOrders();
  if (result.error) {
    return NextResponse.json(
      { error: result.error, orders: [] },
      { status: result.status ?? 500 },
    );
  }

  const mappedOrders = mapShopifyOrdersToInternal(result.orders);
  return NextResponse.json({
    source: "shopify",
    imported: mappedOrders.length,
    orders: mappedOrders,
  });
}
