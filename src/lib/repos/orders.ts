import { eq, inArray, notInArray, and, desc } from "drizzle-orm";
import { db } from "../db";
import { ensureSchema } from "../db/ensure-schema";
import { orders, orderItems, variantMappings } from "../db/schema";
import type { Order } from "../types";
import { toIsoString } from "./utils";

export async function fetchOrders(): Promise<Order[]> {
    await ensureSchema();
    const [orderRows, itemRows, mappingRows] = await Promise.all([
        db.select().from(orders).orderBy(desc(orders.createdAt)),
        db.select().from(orderItems),
        db.select().from(variantMappings),
    ]);

    const itemsByOrder = new Map<string, typeof orderItems.$inferSelect[]>();
    itemRows.forEach((row) => {
        const list = itemsByOrder.get(row.orderId) ?? [];
        list.push(row);
        itemsByOrder.set(row.orderId, list);
    });

    const variantMap = new Map<string, typeof variantMappings.$inferSelect>(
        mappingRows.map((row) => [row.variantId, row]),
    );

    return orderRows.map((row) => ({
        id: row.id,
        source: row.source as "shopify" | "xero" | "manual",
        sourceOrderId: row.sourceOrderId,
        customerName: row.customerName,
        status: row.status as "imported" | "skipped" | "included",
        createdAt: toIsoString(row.createdAt),
        updatedAt: toIsoString(row.updatedAt),
        items: (itemsByOrder.get(row.id) ?? []).map((item) => {
            const mapping = variantMap.get(item.variantId);
            return {
                id: item.id,
                variantId: item.variantId,
                productName: item.productName,
                sizeG: mapping?.sizeG ?? Number(item.sizeG),
                grindType: mapping?.grindType ?? item.grindType,
                quantity: Number(item.quantity),
                mappedCoffeeId: mapping?.coffeeId ?? item.mappedCoffeeId,
                mappedIsBlend: mapping?.isBlend ?? Boolean(item.mappedIsBlend),
            };
        }),
    }));
}

export async function importOrders(inputOrders: Order[]) {
    await ensureSchema();
    await db.transaction(async (tx) => {
        for (const order of inputOrders) {
            await tx
                .insert(orders)
                .values({
                    id: order.id,
                    source: order.source,
                    sourceOrderId: order.sourceOrderId,
                    customerName: order.customerName,
                    status: order.status,
                    createdAt: new Date(order.createdAt),
                    updatedAt: new Date(order.updatedAt),
                })
                .onConflictDoUpdate({
                    target: orders.id,
                    set: {
                        customerName: order.customerName,
                        updatedAt: new Date(order.updatedAt),
                    },
                });

            const seenItemIds: string[] = [];
            for (const item of order.items) {
                await tx
                    .insert(orderItems)
                    .values({
                        id: item.id,
                        orderId: order.id,
                        variantId: item.variantId,
                        productName: item.productName,
                        sizeG: item.sizeG,
                        grindType: item.grindType,
                        quantity: item.quantity,
                        mappedCoffeeId: item.mappedCoffeeId,
                        mappedIsBlend: item.mappedIsBlend,
                    })
                    .onConflictDoUpdate({
                        target: orderItems.id,
                        set: {
                            productName: item.productName,
                            sizeG: item.sizeG,
                            grindType: item.grindType,
                            quantity: item.quantity,
                            mappedCoffeeId: item.mappedCoffeeId,
                            mappedIsBlend: item.mappedIsBlend,
                        },
                    });
                seenItemIds.push(item.id);
            }

            if (seenItemIds.length === 0) {
                await tx.delete(orderItems).where(eq(orderItems.orderId, order.id));
            } else {
                await tx
                    .delete(orderItems)
                    .where(and(eq(orderItems.orderId, order.id), notInArray(orderItems.id, seenItemIds)));
            }
        }
    });
}

export async function syncShopifyOrders(inputOrders: Order[]) {
    await ensureSchema();
    await db.transaction(async (tx) => {
        // 1. Upsert incoming orders
        for (const order of inputOrders) {
            await tx
                .insert(orders)
                .values({
                    id: order.id,
                    source: order.source,
                    sourceOrderId: order.sourceOrderId,
                    customerName: order.customerName,
                    status: order.status,
                    createdAt: new Date(order.createdAt),
                    updatedAt: new Date(order.updatedAt),
                })
                .onConflictDoUpdate({
                    target: orders.id,
                    set: {
                        customerName: order.customerName,
                        updatedAt: new Date(order.updatedAt),
                    },
                });

            const seenItemIds: string[] = [];
            for (const item of order.items) {
                await tx
                    .insert(orderItems)
                    .values({
                        id: item.id,
                        orderId: order.id,
                        variantId: item.variantId,
                        productName: item.productName,
                        sizeG: item.sizeG,
                        grindType: item.grindType,
                        quantity: item.quantity,
                        mappedCoffeeId: item.mappedCoffeeId,
                        mappedIsBlend: item.mappedIsBlend,
                    })
                    .onConflictDoUpdate({
                        target: orderItems.id,
                        set: {
                            productName: item.productName,
                            sizeG: item.sizeG,
                            grindType: item.grindType,
                            quantity: item.quantity,
                            mappedCoffeeId: item.mappedCoffeeId,
                            mappedIsBlend: item.mappedIsBlend,
                        },
                    });
                seenItemIds.push(item.id);
            }

            if (seenItemIds.length === 0) {
                await tx.delete(orderItems).where(eq(orderItems.orderId, order.id));
            } else {
                await tx
                    .delete(orderItems)
                    .where(and(eq(orderItems.orderId, order.id), notInArray(orderItems.id, seenItemIds)));
            }
        }

        // 2. Delete orders that are not in the incoming list but are from shopify
        if (inputOrders.length === 0) {
            // If no orders returned, delete ALL shopify orders
            // Note: Cascade delete on DB side handles items, but Drizzle doesn't know about it unless we rely on DB constraints.
            // The schema definition has `onDelete: 'cascade'`, so deleting orders is enough.
            await tx.delete(orders).where(eq(orders.source, "shopify"));
        } else {
            const orderIds = inputOrders.map((o) => o.id);
            await tx
                .delete(orders)
                .where(and(eq(orders.source, "shopify"), notInArray(orders.id, orderIds)));
        }
    });
}

export async function updateOrderStatus(orderId: string, status: "included" | "skipped") {
    await ensureSchema();
    await db
        .update(orders)
        .set({ status, updatedAt: new Date() })
        .where(eq(orders.id, orderId));
}
