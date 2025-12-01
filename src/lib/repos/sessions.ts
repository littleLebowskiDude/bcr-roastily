import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { ensureSchema } from "../db/ensure-schema";
import { roastSessions, onHandStock, roastResults, orderItems, orders } from "../db/schema";
import type { OnHandStock, RoastSession } from "../types";
import { makeId, toIsoString } from "./utils";

export async function fetchLatestSession(): Promise<RoastSession | null> {
    await ensureSchema();
    const [row] = await db
        .select()
        .from(roastSessions)
        .orderBy(desc(roastSessions.sessionDate))
        .limit(1);

    if (!row) return null;

    return {
        id: row.id,
        sessionDate: toIsoString(row.sessionDate),
        createdAt: toIsoString(row.createdAt),
        updatedAt: toIsoString(row.updatedAt),
        orders: [],
        onHand: [],
    };
}

export async function createRoastSession(
    sessionDate?: string,
    sessionId?: string,
): Promise<RoastSession> {
    await ensureSchema();
    const id = sessionId ?? makeId("session");
    const date = sessionDate ?? new Date().toISOString().slice(0, 10);

    const [row] = await db
        .insert(roastSessions)
        .values({
            id,
            sessionDate: date,
        })
        .returning();

    return {
        id: row.id,
        sessionDate: toIsoString(row.sessionDate),
        createdAt: toIsoString(row.createdAt),
        updatedAt: toIsoString(row.updatedAt),
        orders: [],
        onHand: [],
    };
}

export async function listSessions(): Promise<RoastSession[]> {
    await ensureSchema();
    const rows = await db.select().from(roastSessions).orderBy(desc(roastSessions.sessionDate));

    return rows.map((row) => ({
        id: row.id,
        sessionDate: toIsoString(row.sessionDate),
        createdAt: toIsoString(row.createdAt),
        updatedAt: toIsoString(row.updatedAt),
        orders: [],
        onHand: [],
    }));
}

export async function fetchSessionById(id: string): Promise<RoastSession | null> {
    await ensureSchema();
    const [row] = await db.select().from(roastSessions).where(eq(roastSessions.id, id));

    if (!row) return null;

    return {
        id: row.id,
        sessionDate: toIsoString(row.sessionDate),
        createdAt: toIsoString(row.createdAt),
        updatedAt: toIsoString(row.updatedAt),
        orders: [],
        onHand: [],
    };
}

export async function fetchOnHand(sessionId: string): Promise<OnHandStock[]> {
    await ensureSchema();
    const rows = await db
        .select()
        .from(onHandStock)
        .where(eq(onHandStock.roastSessionId, sessionId));

    return rows.map((row) => ({
        bucketType: row.bucketType as "coffee" | "blend",
        bucketId: row.bucketId,
        onHandRoastedG: Number(row.onHandRoastedG ?? 0),
    }));
}

export async function upsertOnHand(sessionId: string, entries: OnHandStock[]) {
    await ensureSchema();
    await db.transaction(async (tx) => {
        for (const entry of entries) {
            await tx
                .insert(onHandStock)
                .values({
                    id: makeId("stock"),
                    roastSessionId: sessionId,
                    bucketType: entry.bucketType,
                    bucketId: entry.bucketId,
                    onHandRoastedG: String(entry.onHandRoastedG),
                })
                .onConflictDoUpdate({
                    target: [onHandStock.roastSessionId, onHandStock.bucketType, onHandStock.bucketId],
                    set: {
                        onHandRoastedG: String(entry.onHandRoastedG),
                        updatedAt: new Date(),
                    },
                });
        }
    });
}

export async function clearOperationalData() {
    await ensureSchema();
    await db.transaction(async (tx) => {
        await tx.delete(onHandStock);
        await tx.delete(roastResults);
        await tx.delete(orderItems);
        await tx.delete(orders);
        await tx.delete(roastSessions);
    });
}
