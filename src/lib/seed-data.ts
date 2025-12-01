import { sql } from "drizzle-orm";
import { db } from "./db";
import { ensureSchema } from "./db/ensure-schema";
import {
    coffees,
    blends,
    blendComponents,
    variantMappings,
    orders,
    orderItems,
} from "./db/schema";
import type { BlendComponent, Order, VariantMapping } from "./types";
import { makeId, nowIso } from "./repos/utils";

export async function seedIfEmpty() {
    await ensureSchema();
    const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(coffees);

    if (Number(row?.count ?? 0) > 0) return;

    const brazil = { id: "coffee_brazil", name: "Brazil Serra Negra", roastLossPercentage: 18 };
    const colombia = { id: "coffee_colombia", name: "Colombia Huila", roastLossPercentage: 16 };
    const guatemala = {
        id: "coffee_guatemala",
        name: "Guatemala Huehue",
        roastLossPercentage: 17.5,
    };
    const honduras = {
        id: "coffee_honduras",
        name: "Honduras Comayagua",
        roastLossPercentage: 17,
    };

    await db.transaction(async (tx) => {
        for (const coffee of [brazil, colombia, guatemala, honduras]) {
            await tx.insert(coffees).values({
                id: coffee.id,
                name: coffee.name,
                roastLossPercentage: String(coffee.roastLossPercentage),
                active: true,
            });
        }

        await tx.insert(blends).values({
            id: "blend_smooth_criminal",
            name: "Smooth Criminal",
            active: true,
        });
        await tx.insert(blends).values({
            id: "blend_weekend",
            name: "Weekender",
            active: true,
        });

        const components: BlendComponent[] = [
            { coffeeId: brazil.id, percentage: 40 },
            { coffeeId: honduras.id, percentage: 30 },
            { coffeeId: colombia.id, percentage: 30 },
        ];
        for (const comp of components) {
            await tx.insert(blendComponents).values({
                id: makeId("component"),
                blendId: "blend_smooth_criminal",
                coffeeId: comp.coffeeId,
                percentage: String(comp.percentage),
            });
        }

        const weekendComponents: BlendComponent[] = [
            { coffeeId: brazil.id, percentage: 50 },
            { coffeeId: guatemala.id, percentage: 25 },
            { coffeeId: colombia.id, percentage: 25 },
        ];
        for (const comp of weekendComponents) {
            await tx.insert(blendComponents).values({
                id: makeId("component"),
                blendId: "blend_weekend",
                coffeeId: comp.coffeeId,
                percentage: String(comp.percentage),
            });
        }

        const mappings: VariantMapping[] = [
            {
                variantId: "var_sc_250_whole",
                coffeeId: "blend_smooth_criminal",
                isBlend: true,
                sizeG: 250,
                grindType: "Whole bean",
            },
            {
                variantId: "var_sc_250_espresso",
                coffeeId: "blend_smooth_criminal",
                isBlend: true,
                sizeG: 250,
                grindType: "Espresso",
            },
            {
                variantId: "var_sc_1kg_whole",
                coffeeId: "blend_smooth_criminal",
                isBlend: true,
                sizeG: 1000,
                grindType: "Whole bean",
            },
            {
                variantId: "var_colombia_250_whole",
                coffeeId: "coffee_colombia",
                isBlend: false,
                sizeG: 250,
                grindType: "Whole bean",
            },
            {
                variantId: "var_brazil_1kg_espresso",
                coffeeId: "coffee_brazil",
                isBlend: false,
                sizeG: 1000,
                grindType: "Espresso",
            },
            {
                variantId: "var_weekend_1kg_whole",
                coffeeId: "blend_weekend",
                isBlend: true,
                sizeG: 1000,
                grindType: "Whole bean",
            },
        ];

        for (const mapping of mappings) {
            await tx.insert(variantMappings).values({
                variantId: mapping.variantId,
                coffeeId: mapping.coffeeId,
                isBlend: mapping.isBlend,
                sizeG: mapping.sizeG,
                grindType: mapping.grindType,
            });
        }

        const orderList: Order[] = [
            {
                id: "order_1012",
                source: "shopify",
                sourceOrderId: "#1012",
                customerName: "John Smith",
                status: "included",
                createdAt: nowIso(),
                updatedAt: nowIso(),
                items: [
                    {
                        id: "item_1012_1",
                        variantId: "var_sc_250_whole",
                        productName: "Smooth Criminal Blend 250g",
                        sizeG: 250,
                        grindType: "Whole bean",
                        quantity: 12,
                        mappedCoffeeId: "blend_smooth_criminal",
                        mappedIsBlend: true,
                    },
                    {
                        id: "item_1012_2",
                        variantId: "var_colombia_250_whole",
                        productName: "Colombia Huila 250g",
                        sizeG: 250,
                        grindType: "Whole bean",
                        quantity: 6,
                        mappedCoffeeId: "coffee_colombia",
                        mappedIsBlend: false,
                    },
                ],
            },
            {
                id: "order_1013",
                source: "shopify",
                sourceOrderId: "#1013",
                customerName: "Sarah L",
                status: "included",
                createdAt: nowIso(),
                updatedAt: nowIso(),
                items: [
                    {
                        id: "item_1013_1",
                        variantId: "var_sc_250_espresso",
                        productName: "Smooth Criminal Blend 250g Espresso",
                        sizeG: 250,
                        grindType: "Espresso",
                        quantity: 18,
                        mappedCoffeeId: "blend_smooth_criminal",
                        mappedIsBlend: true,
                    },
                    {
                        id: "item_1013_2",
                        variantId: "var_brazil_1kg_espresso",
                        productName: "Brazil Serra Negra 1kg",
                        sizeG: 1000,
                        grindType: "Espresso",
                        quantity: 3,
                        mappedCoffeeId: "coffee_brazil",
                        mappedIsBlend: false,
                    },
                ],
            },
            {
                id: "order_1014",
                source: "shopify",
                sourceOrderId: "#1014",
                customerName: "Taylor Coffee",
                status: "included",
                createdAt: nowIso(),
                updatedAt: nowIso(),
                items: [
                    {
                        id: "item_1014_1",
                        variantId: "var_weekend_1kg_whole",
                        productName: "Weekender Blend 1kg",
                        sizeG: 1000,
                        grindType: "Whole bean",
                        quantity: 4,
                        mappedCoffeeId: "blend_weekend",
                        mappedIsBlend: true,
                    },
                    {
                        id: "item_1014_2",
                        variantId: "var_colombia_250_whole",
                        productName: "Colombia Huila 250g",
                        sizeG: 250,
                        grindType: "Whole bean",
                        quantity: 4,
                        mappedCoffeeId: "coffee_colombia",
                        mappedIsBlend: false,
                    },
                ],
            },
        ];

        for (const order of orderList) {
            await tx.insert(orders).values({
                id: order.id,
                source: order.source,
                sourceOrderId: order.sourceOrderId,
                customerName: order.customerName,
                status: order.status,
                createdAt: new Date(order.createdAt),
                updatedAt: new Date(order.updatedAt),
            });

            for (const item of order.items) {
                await tx.insert(orderItems).values({
                    id: item.id,
                    orderId: order.id,
                    variantId: item.variantId,
                    productName: item.productName,
                    sizeG: item.sizeG,
                    grindType: item.grindType,
                    quantity: item.quantity,
                    mappedCoffeeId: item.mappedCoffeeId,
                    mappedIsBlend: item.mappedIsBlend,
                });
            }
        }
    });
}
