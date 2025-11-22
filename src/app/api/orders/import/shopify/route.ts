import { NextResponse } from "next/server";
import { fetchUnfulfilledOrders } from "@/lib/shopify";
import { mapShopifyOrdersToInternal } from "@/lib/order-mapper";
import { importOrders } from "@/lib/repository";
import { getSessionWithComputation } from "@/lib/roast-sessions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId") ?? undefined;

  const result = await fetchUnfulfilledOrders();
  if (result.error) {
    return NextResponse.json(
      { error: result.error, orders: [] },
      { status: result.status ?? 500 },
    );
  }

  const mappedOrders = await mapShopifyOrdersToInternal(result.orders);
  await importOrders(mappedOrders);
  const session = sessionId ? await getSessionWithComputation(sessionId) : undefined;
  return NextResponse.json(
    {
      source: "shopify",
      imported: mappedOrders.length,
      session,
    },
    { status: 201 },
  );
}

export { POST as GET };
