import { NextResponse } from "next/server";
import { fetchOrders, fetchCoffees, fetchBlends, fetchVariantMappings } from "@/lib/repository";
import { collectUnmappedOrderItems } from "@/lib/unmapped";
import { getRoastPlan } from "@/lib/roast-sessions";

export const revalidate = 0;

export async function GET() {
    try {
        const [orders, coffees, blends, mappings, session] = await Promise.all([
            fetchOrders(),
            fetchCoffees(),
            fetchBlends(),
            fetchVariantMappings(),
            getRoastPlan(),
        ]);

        const unmappedItems = collectUnmappedOrderItems(orders).map((item) => ({
            orderId: item.orderName,
            orderInternalId: item.orderId,
            variantId: item.variantId,
            productName: item.productName,
            quantity: item.quantity,
            mappedCoffeeId: item.mappedCoffeeId,
        }));

        const includedOrders = orders.filter((o) => o.status === "included");
        const skippedOrders = orders.filter((o) => o.status === "skipped");

        return NextResponse.json({
            summary: {
                totalOrders: orders.length,
                includedOrders: includedOrders.length,
                skippedOrders: skippedOrders.length,
                coffees: coffees.length,
                blends: blends.length,
                variantMappings: mappings.length,
                unmappedItems: unmappedItems.length,
                roastResults: session?.computation?.results?.length ?? 0,
                totalDrops: session?.computation?.totals?.drops ?? 0,
            },
            unmappedItems,
            orders: orders.map((o) => ({
                id: o.sourceOrderId,
                status: o.status,
                customer: o.customerName,
                itemCount: o.items.length,
                items: o.items.map((item) => ({
                    variantId: item.variantId,
                    productName: item.productName,
                    quantity: item.quantity,
                    sizeG: item.sizeG,
                    mappedCoffeeId: item.mappedCoffeeId,
                    mappedIsBlend: item.mappedIsBlend,
                })),
            })),
            coffees: coffees.map((c) => ({ id: c.id, name: c.name })),
            blends: blends.map((b) => ({ id: b.id, name: b.name })),
            variantMappings: mappings.map((m) => ({
                variantId: m.variantId,
                coffeeId: m.coffeeId,
                isBlend: m.isBlend,
            })),
            roastResults: session?.computation?.results ?? [],
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Unknown error",
                stack: error instanceof Error ? error.stack : undefined,
            },
            { status: 500 }
        );
    }
}
