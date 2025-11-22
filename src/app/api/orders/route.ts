import { NextResponse } from "next/server";
import { fetchUnfulfilledOrders } from "@/lib/shopify";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await fetchUnfulfilledOrders();

  if (result.error) {
    return NextResponse.json(
      { error: result.error, orders: [] },
      { status: result.status ?? 500 },
    );
  }

  return NextResponse.json({ orders: result.orders });
}
