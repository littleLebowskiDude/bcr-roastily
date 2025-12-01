import { eq, asc } from "drizzle-orm";
import { db } from "../db";
import { ensureSchema } from "../db/ensure-schema";
import { coffees, blends, blendComponents, variantMappings } from "../db/schema";
import type { Blend, BlendComponent, Coffee, VariantMapping } from "../types";
import { makeId, toIsoString } from "./utils";

const mapCoffeeRow = (row: typeof coffees.$inferSelect): Coffee => ({
    id: row.id,
    name: row.name,
    roastLossPercentage: Number(row.roastLossPercentage ?? 0),
    costPerKg: row.costPerKg ? Number(row.costPerKg) : undefined,
    active: Boolean(row.active),
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
});

export async function fetchCoffees(): Promise<Coffee[]> {
    await ensureSchema();
    const rows = await db
        .select()
        .from(coffees)
        .where(eq(coffees.active, true))
        .orderBy(asc(coffees.name));
    return rows.map(mapCoffeeRow);
}

const mapBlendRow = (row: typeof blends.$inferSelect): Blend => ({
    id: row.id,
    name: row.name,
    components: [],
    active: Boolean(row.active),
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
});

export async function fetchBlends(): Promise<Blend[]> {
    await ensureSchema();
    const [blendRows, componentRows] = await Promise.all([
        db.select().from(blends).where(eq(blends.active, true)).orderBy(asc(blends.name)),
        db.select().from(blendComponents).orderBy(asc(blendComponents.blendId)),
    ]);

    const resultBlends = blendRows.map(mapBlendRow);
    const blendMap = new Map<string, Blend>(resultBlends.map((blend) => [blend.id, blend]));

    componentRows.forEach((row) => {
        const blend = blendMap.get(row.blendId);
        if (!blend) return;
        const component: BlendComponent = {
            coffeeId: row.coffeeId,
            percentage: Number(row.percentage ?? 0),
        };
        blend.components.push(component);
    });

    return resultBlends;
}

export async function fetchVariantMappings(): Promise<VariantMapping[]> {
    await ensureSchema();
    const rows = await db.select().from(variantMappings);
    return rows.map((row) => ({
        variantId: row.variantId,
        coffeeId: row.coffeeId,
        isBlend: Boolean(row.isBlend),
        sizeG: Number(row.sizeG),
        grindType: row.grindType,
    }));
}

export async function fetchSettingsSnapshot() {
    const [coffeesData, blendsData, variantMappingsData] = await Promise.all([
        fetchCoffees(),
        fetchBlends(),
        fetchVariantMappings(),
    ]);
    return { coffees: coffeesData, blends: blendsData, variantMappings: variantMappingsData };
}

export async function createCoffee(input: {
    name: string;
    roastLossPercentage: number;
    costPerKg?: number;
}) {
    await ensureSchema();
    const id = makeId("coffee");
    const [row] = await db
        .insert(coffees)
        .values({
            id,
            name: input.name,
            roastLossPercentage: String(input.roastLossPercentage),
            costPerKg: input.costPerKg ? String(input.costPerKg) : null,
            active: true,
        })
        .returning();
    return mapCoffeeRow(row);
}

export async function updateCoffee(
    id: string,
    input: { name: string; roastLossPercentage: number; costPerKg?: number },
) {
    await ensureSchema();
    const [row] = await db
        .update(coffees)
        .set({
            name: input.name,
            roastLossPercentage: String(input.roastLossPercentage),
            costPerKg: input.costPerKg ? String(input.costPerKg) : null,
            updatedAt: new Date(),
        })
        .where(eq(coffees.id, id))
        .returning();
    return row ? mapCoffeeRow(row) : null;
}

export async function archiveCoffee(id: string) {
    await ensureSchema();
    await db
        .update(coffees)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(coffees.id, id));
}

export async function createBlend(input: { name: string; components: BlendComponent[] }) {
    await ensureSchema();
    const id = makeId("blend");

    await db.transaction(async (tx) => {
        await tx.insert(blends).values({
            id,
            name: input.name,
            active: true,
        });

        for (const component of input.components) {
            await tx.insert(blendComponents).values({
                id: makeId("component"),
                blendId: id,
                coffeeId: component.coffeeId,
                percentage: String(component.percentage),
            });
        }
    });

    return fetchBlends();
}

export async function updateBlend(
    id: string,
    input: { name: string; components: BlendComponent[] },
) {
    await ensureSchema();
    await db.transaction(async (tx) => {
        await tx
            .update(blends)
            .set({ name: input.name, active: true, updatedAt: new Date() })
            .where(eq(blends.id, id));

        await tx.delete(blendComponents).where(eq(blendComponents.blendId, id));

        for (const component of input.components) {
            await tx.insert(blendComponents).values({
                id: makeId("component"),
                blendId: id,
                coffeeId: component.coffeeId,
                percentage: String(component.percentage),
            });
        }
    });
    return fetchBlends();
}

export async function archiveBlend(id: string) {
    await ensureSchema();
    await db
        .update(blends)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(blends.id, id));
}

export async function upsertVariantMapping(mapping: VariantMapping) {
    await ensureSchema();
    await db
        .insert(variantMappings)
        .values({
            variantId: mapping.variantId,
            coffeeId: mapping.coffeeId,
            isBlend: mapping.isBlend,
            sizeG: mapping.sizeG,
            grindType: mapping.grindType,
        })
        .onConflictDoUpdate({
            target: variantMappings.variantId,
            set: {
                coffeeId: mapping.coffeeId,
                isBlend: mapping.isBlend,
                sizeG: mapping.sizeG,
                grindType: mapping.grindType,
                updatedAt: new Date(),
            },
        });
}

export async function deleteVariantMapping(variantId: string) {
    await ensureSchema();
    await db.delete(variantMappings).where(eq(variantMappings.variantId, variantId));
}
