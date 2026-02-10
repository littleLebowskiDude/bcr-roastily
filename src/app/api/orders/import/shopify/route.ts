import { NextResponse } from "next/server";
import { fetchUnfulfilledOrders } from "@/lib/shopify";
import { mapShopifyOrdersToInternal } from "@/lib/order-mapper";
import { importOrders, syncShopifyOrders } from "@/lib/repository";
import { getSessionWithComputation } from "@/lib/roast-sessions";

export const dynamic = "force-dynamic";

export async function POST(_request: Request) {
  const result = await fetchUnfulfilledOrders();
  if (result.error) {
    return NextResponse.json(
      { error: result.error, orders: [] },
      { status: result.status ?? 500 },
    );
  }

  const mappedOrders = await mapShopifyOrdersToInternal(result.orders);
  await syncShopifyOrders(mappedOrders);
  const session = await getSessionWithComputation();
  return NextResponse.json(
    {
      source: "shopify",
      imported: mappedOrders.length,
      session,
    },
    { status: 201 },
  );
}

// GET intentionally not exported -- this endpoint mutates data and must only be called via POST
