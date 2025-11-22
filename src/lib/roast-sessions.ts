import { calculateRoastPlan } from "./roast-engine";
import { listBlends, listCoffees, getSession, latestSession, listSessions, createRoastSession } from "./store";
import type { RoastSession } from "./types";

export function getOrCreateLatestSession() {
  return latestSession() ?? createRoastSession();
}

export function getSessionWithComputation(id?: string): RoastSession | null {
  const target = id ? getSession(id) : getOrCreateLatestSession();
  if (!target) return null;
  const computation = calculateRoastPlan({
    coffees: listCoffees(),
    blends: listBlends(),
    orders: target.orders,
    onHand: target.onHand,
  });
  target.computation = computation;
  target.lastCalculatedAt = new Date().toISOString();
  target.onHand = computation.onHand;
  return target;
}

export function listSessionsWithTotals() {
  return listSessions().map((session) => {
    const computation = calculateRoastPlan({
      coffees: listCoffees(),
      blends: listBlends(),
      orders: session.orders,
      onHand: session.onHand,
    });
    return {
      id: session.id,
      sessionDate: session.sessionDate,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      totals: computation.totals,
      orderCount: session.orders.length,
    };
  });
}
