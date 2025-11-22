import { NextResponse } from "next/server";
import { fetchUnfulfilledOrders } from "@/lib/shopify";
import { mapShopifyOrdersToInternal } from "@/lib/order-mapper";
import { importOrders } from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await fetchUnfulfilledOrders();
  if (result.error) {
    return NextResponse.json(
      { error: result.error, orders: [] },
      { status: result.status ?? 500 },
    );
  }

  const mappedOrders = await mapShopifyOrdersToInternal(result.orders);
  await importOrders(mappedOrders);
  return NextResponse.json(
    {
      source: "shopify",
      imported: mappedOrders.length,
    },
    { status: 201 },
  );
}
