import { calculateRoastPlan } from "./roast-engine";
import {
  createRoastSession,
  fetchBlends,
  fetchCoffees,
  fetchLatestSession,
  fetchOnHand,
  fetchOrders,
  fetchSessionById,
  listSessions,
  updateOrderStatus,
  upsertOnHand,
} from "./repository";
import type { RoastSession } from "./types";

export async function getOrCreateLatestSession() {
  const existing = await fetchLatestSession();
  if (existing) return existing;
  return createRoastSession();
}

export async function getSessionWithComputation(id?: string): Promise<RoastSession | null> {
  const baseSession = id ? await fetchSessionById(id) : await getOrCreateLatestSession();
  if (!baseSession) return null;

  const [coffees, blends, onHand, orders] = await Promise.all([
    fetchCoffees(),
    fetchBlends(),
    fetchOnHand(baseSession.id),
    fetchOrders(baseSession.id),
  ]);

  const computation = calculateRoastPlan({
    coffees,
    blends,
    orders,
    onHand,
  });

  return {
    ...baseSession,
    onHand: computation.onHand,
    orders,
    computation,
    lastCalculatedAt: new Date().toISOString(),
  };
}

export async function listSessionsWithTotals() {
  const sessions = await listSessions();
  const [coffees, blends] = await Promise.all([fetchCoffees(), fetchBlends()]);

  return Promise.all(
    sessions.map(async (session) => {
      const onHand = await fetchOnHand(session.id);
      const orders = await fetchOrders(session.id);
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
