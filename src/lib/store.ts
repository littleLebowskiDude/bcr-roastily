import { sampleBlends, sampleCoffees, sampleOrders, sampleVariantMappings, initialOnHand } from "./sample-data";
import type {
  Blend,
  Coffee,
  OnHandStock,
  Order,
  RoastSession,
  VariantMapping,
} from "./types";

type DataStore = {
  coffees: Coffee[];
  blends: Blend[];
  variantMappings: VariantMapping[];
  orders: Order[];
  sessions: RoastSession[];
};

const store: DataStore = {
  coffees: [...sampleCoffees],
  blends: [...sampleBlends],
  variantMappings: [...sampleVariantMappings],
  orders: [...sampleOrders],
  sessions: [],
};

const dateString = (value?: Date) => (value ?? new Date()).toISOString().slice(0, 10);

const cloneOrders = (orders: Order[]) =>
  orders.map((order) => ({
    ...order,
    items: order.items.map((item) => ({ ...item })),
  }));

const ensureSession = () => {
  if (store.sessions.length === 0) {
    createRoastSession(dateString());
  }
};

export function listCoffees() {
  return store.coffees;
}

export function listBlends() {
  return store.blends;
}

export function listVariantMappings() {
  return store.variantMappings;
}

export function listOrders() {
  return store.orders;
}

export function listSessions() {
  ensureSession();
  return store.sessions;
}

export function getSession(id: string) {
  ensureSession();
  return store.sessions.find((session) => session.id === id);
}

export function latestSession() {
  ensureSession();
  return store.sessions.at(-1) ?? null;
}

export function createRoastSession(sessionDate?: string) {
  const now = new Date().toISOString();
  const session: RoastSession = {
    id: `session_${store.sessions.length + 1}`,
    sessionDate: sessionDate ?? dateString(),
    createdAt: now,
    updatedAt: now,
    orders: cloneOrders(store.orders),
    onHand: initialOnHand.map((entry) => ({ ...entry })),
  };

  store.sessions.push(session);
  return session;
}

export function updateOrderStatus(sessionId: string, orderId: string, status: "included" | "skipped") {
  const session = getSession(sessionId);
  if (!session) return null;
  const order = session.orders.find((item) => item.id === orderId);
  if (!order) return session;
  order.status = status === "skipped" ? "skipped" : "included";
  order.updatedAt = new Date().toISOString();
  session.updatedAt = order.updatedAt;
  return session;
}

export function updateOnHand(sessionId: string, entries: OnHandStock[]) {
  const session = getSession(sessionId);
  if (!session) return null;
  const map = new Map<string, OnHandStock>();
  session.onHand.forEach((item) => map.set(`${item.bucketType}:${item.bucketId}`, item));

  entries.forEach((entry) => {
    const key = `${entry.bucketType}:${entry.bucketId}`;
    map.set(key, { ...entry });
  });

  session.onHand = Array.from(map.values());
  session.updatedAt = new Date().toISOString();
  return session;
}

export function upsertOnHand(sessionId: string, entry: OnHandStock) {
  return updateOnHand(sessionId, [entry]);
}
