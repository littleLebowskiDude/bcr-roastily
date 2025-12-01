import { calculateRoastPlan } from "./roast-engine";
import {
  createRoastSession,
  fetchBlends,
  fetchCoffees,
  fetchOnHand,
  fetchOrders,
  fetchSessionById,
  importOrders,
  syncShopifyOrders,
  listSessions,
  updateOrderStatus,
  upsertOnHand,
} from "./repository";
import { mapShopifyOrdersToInternal } from "./order-mapper";
import { fetchUnfulfilledOrders } from "./shopify";
import type { RoastSession } from "./types";

const ACTIVE_SESSION_ID = "session_current";

async function getOrCreateActiveSession() {
  const existing = await fetchSessionById(ACTIVE_SESSION_ID);
  if (existing) return existing;
  return createRoastSession(new Date().toISOString().slice(0, 10), ACTIVE_SESSION_ID);
}

export async function syncOrdersFromShopify() {
  const result = await fetchUnfulfilledOrders();
  if (result.error) return { imported: 0, error: result.error };

  const mappedOrders = await mapShopifyOrdersToInternal(result.orders);
  await syncShopifyOrders(mappedOrders);
  return { imported: mappedOrders.length };
}

export async function getRoastPlan() {
  // Removed automatic sync to improve performance
  // await syncOrdersFromShopify();
  return getSessionWithComputation();
}

export async function getSessionWithComputation(id?: string): Promise<RoastSession | null> {
  const baseSession = id ? await fetchSessionById(id) : await getOrCreateActiveSession();
  if (!baseSession) return null;

  const today = new Date().toISOString().slice(0, 10);
  const normalizedSession = { ...baseSession, sessionDate: today };

  const [coffees, blends, onHand, orders] = await Promise.all([
    fetchCoffees(),
    fetchBlends(),
    fetchOnHand(baseSession.id),
    fetchOrders(),
  ]);

  const computation = calculateRoastPlan({
    coffees,
    blends,
    orders,
    onHand,
  });

  return {
    ...normalizedSession,
    onHand: computation.onHand,
    orders,
    computation,
    lastCalculatedAt: new Date().toISOString(),
  };
}

export async function listSessionsWithTotals() {
  const sessions = await listSessions();
  const [coffees, blends, orders] = await Promise.all([
    fetchCoffees(),
    fetchBlends(),
    fetchOrders(),
  ]);

  return Promise.all(
    sessions.map(async (session) => {
      const onHand = await fetchOnHand(session.id);
      const computation = calculateRoastPlan({ coffees, blends, orders, onHand });
      return {
        id: session.id,
        sessionDate: session.sessionDate,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        totals: computation.totals,
        orderCount: orders.length,
      };
    }),
  );
}

export async function toggleOrder(sessionId: string, orderId: string, status: "included" | "skipped") {
  await updateOrderStatus(orderId, status);
  return getSessionWithComputation(sessionId);
}

export async function saveOnHand(sessionId: string, entries: RoastSession["onHand"]) {
  await upsertOnHand(sessionId, entries);
  return getSessionWithComputation(sessionId);
}
