import {
    pgTable,
    text,
    boolean,
    numeric,
    integer,
    timestamp,
    date,
    unique,
} from "drizzle-orm/pg-core";

export const coffees = pgTable("coffees", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    roastLossPercentage: numeric("roast_loss_percentage").notNull().default("0"),
    costPerKg: numeric("cost_per_kg"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blends = pgTable("blends", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const blendComponents = pgTable("blend_components", {
    id: text("id").primaryKey(),
    blendId: text("blend_id")
        .notNull()
        .references(() => blends.id, { onDelete: "cascade" }),
    coffeeId: text("coffee_id")
        .notNull()
        .references(() => coffees.id, { onDelete: "cascade" }),
    percentage: numeric("percentage").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const variantMappings = pgTable("variant_mappings", {
    variantId: text("variant_id").primaryKey(),
    coffeeId: text("coffee_id").notNull(),
    isBlend: boolean("is_blend").notNull().default(false),
    sizeG: integer("size_g").notNull(),
    grindType: text("grind_type").notNull().default("Whole bean"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    sourceOrderId: text("source_order_id").notNull(),
    customerName: text("customer_name").notNull(),
    status: text("status").notNull().default("included"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
    id: text("id").primaryKey(),
    orderId: text("order_id")
        .notNull()
        .references(() => orders.id, { onDelete: "cascade" }),
    variantId: text("variant_id").notNull(),
    productName: text("product_name").notNull(),
    sizeG: integer("size_g").notNull(),
    grindType: text("grind_type").notNull(),
    quantity: integer("quantity").notNull(),
    mappedCoffeeId: text("mapped_coffee_id").notNull(),
    mappedIsBlend: boolean("mapped_is_blend").notNull().default(false),
});

export const roastSessions = pgTable("roast_sessions", {
    id: text("id").primaryKey(),
    sessionDate: date("session_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const onHandStock = pgTable(
    "on_hand_stock",
    {
        id: text("id").primaryKey(),
        roastSessionId: text("roast_session_id")
            .notNull()
            .references(() => roastSessions.id, { onDelete: "cascade" }),
        bucketType: text("bucket_type").notNull(), // check constraint not directly supported in simple definition, handled in app logic or raw sql
        bucketId: text("bucket_id").notNull(),
        onHandRoastedG: numeric("on_hand_roasted_g").notNull().default("0"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => ({
        unq: unique().on(t.roastSessionId, t.bucketType, t.bucketId),
    }),
);

export const roastResults = pgTable("roast_results", {
    id: text("id").primaryKey(),
    roastSessionId: text("roast_session_id")
        .notNull()
        .references(() => roastSessions.id, { onDelete: "cascade" }),
    coffeeId: text("coffee_id").notNull(),
    requiredRoastedG: numeric("required_roasted_g").notNull(),
    requiredGreenG: numeric("required_green_g").notNull(),
    dropsRequired: integer("drops_required").notNull(),
    totalGreen: numeric("total_green").notNull(),
    totalRoastedOutput: numeric("total_roasted_output").notNull(),
    surplusRoastedG: numeric("surplus_roasted_g").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
