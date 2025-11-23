import crypto from "node:crypto";
import { query, withTransaction } from "./db/queries";
import { ensureSchema } from "./db/ensure-schema";
import type {
  Blend,
  BlendComponent,
  Coffee,
  OnHandStock,
  Order,
  RoastSession,
  VariantMapping,
} from "./types";

const nowIso = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const toIsoString = (value: any) =>
  value instanceof Date ? value.toISOString() : typeof value === "string" ? value : String(value);

const mapCoffeeRow = (row: any): Coffee => ({
  id: row.id,
  name: row.name,
  roastLossPercentage: Number(row.roast_loss_percentage ?? 0),
  costPerKg: row.cost_per_kg ? Number(row.cost_per_kg) : undefined,
  active: Boolean(row.active),
  createdAt: toIsoString(row.created_at),
  updatedAt: toIsoString(row.updated_at),
});

export async function fetchCoffees(): Promise<Coffee[]> {
  await ensureSchema();
  const res = await query(
    `select id, name, roast_loss_percentage, cost_per_kg, active, created_at, updated_at
     from coffees
     where active = true
     order by name asc`,
  );
  return res.rows.map(mapCoffeeRow);
}

const mapBlendRow = (row: any): Blend => ({
  id: row.id,
  name: row.name,
  components: [],
  active: Boolean(row.active),
  createdAt: toIsoString(row.created_at),
  updatedAt: toIsoString(row.updated_at),
});

export async function fetchBlends(): Promise<Blend[]> {
  await ensureSchema();
  const [blendRes, componentsRes] = await Promise.all([
    query(
      `select id, name, active, created_at, updated_at
       from blends
       where active = true
       order by name asc`,
    ),
    query(
      `select id, blend_id, coffee_id, percentage
       from blend_components
       order by blend_id asc`,
    ),
  ]);

  const blends = blendRes.rows.map(mapBlendRow);
  const blendMap = new Map<string, Blend>(blends.map((blend) => [blend.id, blend]));

  componentsRes.rows.forEach((row) => {
    const blend = blendMap.get(row.blend_id);
    if (!blend) return;
    const component: BlendComponent = {
      coffeeId: row.coffee_id,
      percentage: Number(row.percentage ?? 0),
    };
    blend.components.push(component);
  });

  return blends;
}

export async function fetchVariantMappings(): Promise<VariantMapping[]> {
  await ensureSchema();
  const res = await query(
    `select variant_id, coffee_id, is_blend, size_g, grind_type
     from variant_mappings`,
  );
  return res.rows.map((row) => ({
    variantId: row.variant_id,
    coffeeId: row.coffee_id,
    isBlend: Boolean(row.is_blend),
    sizeG: Number(row.size_g),
    grindType: row.grind_type,
  }));
}

type OrderRow = {
  id: string;
  roast_session_id: string | null;
  source: "shopify" | "xero" | "manual";
  source_order_id: string;
  customer_name: string;
  status: "imported" | "skipped" | "included";
  created_at: string;
  updated_at: string;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  variant_id: string;
  product_name: string;
  size_g: number;
  grind_type: string;
  quantity: number;
  mapped_coffee_id: string;
  mapped_is_blend: boolean;
};

type VariantMappingRow = {
  variant_id: string;
  coffee_id: string;
  is_blend: boolean;
  size_g: number;
  grind_type: string;
};

export async function fetchOrders(sessionId?: string): Promise<Order[]> {
  await ensureSchema();

  if (sessionId) {
    await query(`update orders set roast_session_id = $1 where roast_session_id is null`, [sessionId]);
  }

  const ordersRes = await query<OrderRow>(
    `select id, roast_session_id, source, source_order_id, customer_name, status, created_at, updated_at
     from orders
     ${sessionId ? "where roast_session_id = $1" : ""}
     order by created_at desc`,
    sessionId ? [sessionId] : [],
  );

  const orderIds = ordersRes.rows.map((row) => row.id);
  const itemsRes = orderIds.length
    ? await query<OrderItemRow>(
        `select id, order_id, variant_id, product_name, size_g, grind_type, quantity, mapped_coffee_id, mapped_is_blend
         from order_items
         where order_id = any($1::text[])`,
        [orderIds],
      )
    : { rows: [] as OrderItemRow[] };

  const mappingsRes = await query<VariantMappingRow>(
    `select variant_id, coffee_id, is_blend, size_g, grind_type
     from variant_mappings`,
  );

  const itemsByOrder = new Map<string, OrderItemRow[]>();
  itemsRes.rows.forEach((row) => {
    const list = itemsByOrder.get(row.order_id) ?? [];
    list.push(row);
    itemsByOrder.set(row.order_id, list);
  });

  const variantMap = new Map<string, VariantMappingRow>(
    mappingsRes.rows.map((row) => [row.variant_id, row]),
  );

  return ordersRes.rows.map((row) => ({
    id: row.id,
    roastSessionId: row.roast_session_id ?? undefined,
    source: row.source,
    sourceOrderId: row.source_order_id,
    customerName: row.customer_name,
    status: row.status,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    items: (itemsByOrder.get(row.id) ?? []).map((item) => {
      const mapping = variantMap.get(item.variant_id);
      return {
        id: item.id,
        variantId: item.variant_id,
        productName: item.product_name,
        sizeG: mapping?.size_g ?? Number(item.size_g),
        grindType: mapping?.grind_type ?? item.grind_type,
        quantity: Number(item.quantity),
        mappedCoffeeId: mapping?.coffee_id ?? item.mapped_coffee_id,
        mappedIsBlend: mapping?.is_blend ?? Boolean(item.mapped_is_blend),
      };
    }),
  }));
}

export async function importOrders(orders: Order[], sessionId: string) {
  if (!sessionId) {
    throw new Error("A session ID is required to import orders.");
  }
  await ensureSchema();
  await withTransaction(async ({ query }) => {
    for (const order of orders) {
      await query(
        `insert into orders (id, roast_session_id, source, source_order_id, customer_name, status, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (id) do update
         set customer_name = excluded.customer_name,
             roast_session_id = excluded.roast_session_id,
             updated_at = excluded.updated_at`,
        [
          order.id,
          order.roastSessionId ?? sessionId,
          order.source,
          order.sourceOrderId,
          order.customerName,
          order.status,
          order.createdAt,
          order.updatedAt,
        ],
      );

      const seenItemIds: string[] = [];
      for (const item of order.items) {
        await query(
          `insert into order_items (id, order_id, variant_id, product_name, size_g, grind_type, quantity, mapped_coffee_id, mapped_is_blend)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           on conflict (id) do update
           set product_name = excluded.product_name,
               size_g = excluded.size_g,
               grind_type = excluded.grind_type,
               quantity = excluded.quantity,
               mapped_coffee_id = excluded.mapped_coffee_id,
               mapped_is_blend = excluded.mapped_is_blend`,
          [
            item.id,
            order.id,
            item.variantId,
            item.productName,
            item.sizeG,
            item.grindType,
            item.quantity,
            item.mappedCoffeeId,
            item.mappedIsBlend,
          ],
        );
        seenItemIds.push(item.id);
      }

      if (seenItemIds.length === 0) {
        await query(`delete from order_items where order_id = $1`, [order.id]);
      } else {
        const placeholders = seenItemIds.map((_, index) => `$${index + 2}`).join(", ");
        await query(
          `delete from order_items where order_id = $1 and id not in (${placeholders})`,
          [order.id, ...seenItemIds],
        );
      }
    }
  });
}

export async function updateOrderStatus(orderId: string, status: "included" | "skipped") {
  await ensureSchema();
  await query(
    `update orders set status = $2, updated_at = now() where id = $1`,
    [orderId, status],
  );
}

export async function fetchLatestSession(): Promise<RoastSession | null> {
  await ensureSchema();
  const res = await query(
    `select id, session_date, created_at, updated_at
     from roast_sessions
     order by session_date desc
     limit 1`,
  );
  if (!res.rows.length) return null;
  const row = res.rows[0];
  return {
    id: row.id,
    sessionDate: toIsoString(row.session_date),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    orders: [],
    onHand: [],
  };
}

export async function createRoastSession(sessionDate?: string): Promise<RoastSession> {
  await ensureSchema();
  const id = makeId("session");
  const date = sessionDate ?? new Date().toISOString().slice(0, 10);
  const res = await query(
    `insert into roast_sessions (id, session_date, created_at, updated_at)
     values ($1, $2, $3, $3)
     returning id, session_date, created_at, updated_at`,
    [id, date, nowIso()],
  );
  const row = res.rows[0];
  return {
    id: row.id,
    sessionDate: toIsoString(row.session_date),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    orders: [],
    onHand: [],
  };
}

export async function listSessions(): Promise<RoastSession[]> {
  await ensureSchema();
  const res = await query(
    `select id, session_date, created_at, updated_at
     from roast_sessions
     order by session_date desc`,
  );
  return res.rows.map((row) => ({
    id: row.id,
    sessionDate: toIsoString(row.session_date),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    orders: [],
    onHand: [],
  }));
}

export async function fetchSessionById(id: string): Promise<RoastSession | null> {
  await ensureSchema();
  const res = await query(
    `select id, session_date, created_at, updated_at
     from roast_sessions
     where id = $1`,
    [id],
  );
  if (!res.rows.length) return null;
  const row = res.rows[0];
  return {
    id: row.id,
    sessionDate: toIsoString(row.session_date),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    orders: [],
    onHand: [],
  };
}

export async function fetchOnHand(sessionId: string): Promise<OnHandStock[]> {
  await ensureSchema();
  const res = await query(
    `select bucket_type, bucket_id, on_hand_roasted_g
     from on_hand_stock
     where roast_session_id = $1`,
    [sessionId],
  );
  return res.rows.map((row) => ({
    bucketType: row.bucket_type,
    bucketId: row.bucket_id,
    onHandRoastedG: Number(row.on_hand_roasted_g ?? 0),
  }));
}

export async function upsertOnHand(sessionId: string, entries: OnHandStock[]) {
  await ensureSchema();
  await withTransaction(async ({ query }) => {
    for (const entry of entries) {
      await query(
        `insert into on_hand_stock (id, roast_session_id, bucket_type, bucket_id, on_hand_roasted_g, created_at, updated_at)
         values ($1,$2,$3,$4,$5, now(), now())
         on conflict (roast_session_id, bucket_type, bucket_id) do update
         set on_hand_roasted_g = excluded.on_hand_roasted_g,
             updated_at = now()`,
        [makeId("stock"), sessionId, entry.bucketType, entry.bucketId, entry.onHandRoastedG],
      );
    }
  });
}

export async function seedIfEmpty() {
  await ensureSchema();
  const { rows } = await query<{ count: string }>(`select count(*)::int as count from coffees`);
  if (Number(rows[0]?.count ?? 0) > 0) return;

  const sessionId = makeId("session");
  const sessionDate = new Date().toISOString().slice(0, 10);
  const brazil = { id: "coffee_brazil", name: "Brazil Serra Negra", roast_loss_percentage: 18 };
  const colombia = { id: "coffee_colombia", name: "Colombia Huila", roast_loss_percentage: 16 };
  const guatemala = { id: "coffee_guatemala", name: "Guatemala Huehue", roast_loss_percentage: 17.5 };
  const honduras = { id: "coffee_honduras", name: "Honduras Comayagua", roast_loss_percentage: 17 };

  await withTransaction(async ({ query }) => {
    await query(
      `insert into roast_sessions (id, session_date, created_at, updated_at)
       values ($1,$2,$3,$3)`,
      [sessionId, sessionDate, nowIso()],
    );

    for (const coffee of [brazil, colombia, guatemala, honduras]) {
      await query(
        `insert into coffees (id, name, roast_loss_percentage, active)
         values ($1,$2,$3,true)`,
        [coffee.id, coffee.name, coffee.roast_loss_percentage],
      );
    }

    await query(
      `insert into blends (id, name, active) values ($1,$2,true)`,
      ["blend_smooth_criminal", "Smooth Criminal"],
    );
    await query(
      `insert into blends (id, name, active) values ($1,$2,true)`,
      ["blend_weekend", "Weekender"],
    );

    const components: BlendComponent[] = [
      { coffeeId: brazil.id, percentage: 40 },
      { coffeeId: honduras.id, percentage: 30 },
      { coffeeId: colombia.id, percentage: 30 },
    ];
    for (let index = 0; index < components.length; index += 1) {
      const comp = components[index];
      await query(
        `insert into blend_components (id, blend_id, coffee_id, percentage)
         values ($1,$2,$3,$4)`,
        [makeId("component"), "blend_smooth_criminal", comp.coffeeId, comp.percentage],
      );
    }

    const weekendComponents: BlendComponent[] = [
      { coffeeId: brazil.id, percentage: 50 },
      { coffeeId: guatemala.id, percentage: 25 },
      { coffeeId: colombia.id, percentage: 25 },
    ];
    for (const comp of weekendComponents) {
      await query(
        `insert into blend_components (id, blend_id, coffee_id, percentage)
         values ($1,$2,$3,$4)`,
        [makeId("component"), "blend_weekend", comp.coffeeId, comp.percentage],
      );
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
      await query(
        `insert into variant_mappings (variant_id, coffee_id, is_blend, size_g, grind_type)
         values ($1,$2,$3,$4,$5)`,
        [mapping.variantId, mapping.coffeeId, mapping.isBlend, mapping.sizeG, mapping.grindType],
      );
    }

    const orders: Order[] = [
      {
        id: "order_1012",
        roastSessionId: sessionId,
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
        roastSessionId: sessionId,
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
        roastSessionId: sessionId,
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

    for (const order of orders) {
      await query(
        `insert into orders (id, roast_session_id, source, source_order_id, customer_name, status, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          order.id,
          order.roastSessionId,
          order.source,
          order.sourceOrderId,
          order.customerName,
          order.status,
          order.createdAt,
          order.updatedAt,
        ],
      );
      for (const item of order.items) {
        await query(
          `insert into order_items (id, order_id, variant_id, product_name, size_g, grind_type, quantity, mapped_coffee_id, mapped_is_blend)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            item.id,
            order.id,
            item.variantId,
            item.productName,
            item.sizeG,
            item.grindType,
            item.quantity,
            item.mappedCoffeeId,
            item.mappedIsBlend,
          ],
        );
      }
    }
  });
}

export async function fetchSettingsSnapshot() {
  const [coffees, blends, variantMappings] = await Promise.all([
    fetchCoffees(),
    fetchBlends(),
    fetchVariantMappings(),
  ]);
  return { coffees, blends, variantMappings };
}

export async function createCoffee(input: {
  name: string;
  roastLossPercentage: number;
  costPerKg?: number;
}) {
  await ensureSchema();
  const id = makeId("coffee");
  const res = await query(
    `insert into coffees (id, name, roast_loss_percentage, cost_per_kg, active, created_at, updated_at)
     values ($1,$2,$3,$4,true,now(),now())
     returning id, name, roast_loss_percentage, cost_per_kg, active, created_at, updated_at`,
    [id, input.name, input.roastLossPercentage, input.costPerKg ?? null],
  );
  return mapCoffeeRow(res.rows[0]);
}

export async function updateCoffee(
  id: string,
  input: { name: string; roastLossPercentage: number; costPerKg?: number },
) {
  await ensureSchema();
  const res = await query(
    `update coffees
     set name = $2,
         roast_loss_percentage = $3,
         cost_per_kg = $4,
         updated_at = now()
     where id = $1
     returning id, name, roast_loss_percentage, cost_per_kg, active, created_at, updated_at`,
    [id, input.name, input.roastLossPercentage, input.costPerKg ?? null],
  );
  return res.rows[0] ? mapCoffeeRow(res.rows[0]) : null;
}

export async function archiveCoffee(id: string) {
  await ensureSchema();
  await query(`update coffees set active = false, updated_at = now() where id = $1`, [id]);
}

export async function createBlend(input: { name: string; components: BlendComponent[] }) {
  await ensureSchema();
  const id = makeId("blend");
  await withTransaction(async ({ query }) => {
    await query(
      `insert into blends (id, name, active, created_at, updated_at)
       values ($1,$2,true,now(),now())`,
      [id, input.name],
    );
    for (const component of input.components) {
      await query(
        `insert into blend_components (id, blend_id, coffee_id, percentage, created_at, updated_at)
         values ($1,$2,$3,$4,now(),now())`,
        [makeId("component"), id, component.coffeeId, component.percentage],
      );
    }
  });
  return fetchBlends();
}

export async function updateBlend(
  id: string,
  input: { name: string; components: BlendComponent[] },
) {
  await ensureSchema();
  await withTransaction(async ({ query }) => {
    await query(
      `update blends set name = $2, active = true, updated_at = now() where id = $1`,
      [id, input.name],
    );
    await query(`delete from blend_components where blend_id = $1`, [id]);
    for (const component of input.components) {
      await query(
        `insert into blend_components (id, blend_id, coffee_id, percentage, created_at, updated_at)
         values ($1,$2,$3,$4,now(),now())`,
        [makeId("component"), id, component.coffeeId, component.percentage],
      );
    }
  });
  return fetchBlends();
}

export async function archiveBlend(id: string) {
  await ensureSchema();
  await query(`update blends set active = false, updated_at = now() where id = $1`, [id]);
}

export async function upsertVariantMapping(mapping: VariantMapping) {
  await ensureSchema();
  await query(
    `insert into variant_mappings (variant_id, coffee_id, is_blend, size_g, grind_type, created_at, updated_at)
     values ($1,$2,$3,$4,$5,now(),now())
     on conflict (variant_id) do update
     set coffee_id = excluded.coffee_id,
         is_blend = excluded.is_blend,
         size_g = excluded.size_g,
         grind_type = excluded.grind_type,
         updated_at = now()`,
    [mapping.variantId, mapping.coffeeId, mapping.isBlend, mapping.sizeG, mapping.grindType],
  );
}

export async function deleteVariantMapping(variantId: string) {
  await ensureSchema();
  await query(`delete from variant_mappings where variant_id = $1`, [variantId]);
}

export async function clearOperationalData() {
  await ensureSchema();
  await withTransaction(async ({ query }) => {
    await query(`delete from on_hand_stock`);
    await query(`delete from roast_results`);
    await query(`delete from order_items`);
    await query(`delete from orders`);
    await query(`delete from roast_sessions`);
  });
}
