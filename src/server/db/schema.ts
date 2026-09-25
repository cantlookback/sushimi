import { boolean, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["owner", "manager", "kitchen", "courier"]);
export const orderStatus = pgEnum("order_status", ["new", "confirmed", "cooking", "ready", "delivering", "completed", "cancelled"]);
export const fulfillmentType = pgEnum("fulfillment_type", ["delivery", "pickup"]);
export const ingredientUnit = pgEnum("ingredient_unit", ["g", "ml", "pcs"]);

const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(), name: varchar("name", { length: 100 }).notNull(), email: varchar("email", { length: 255 }).notNull(), passwordHash: text("password_hash").notNull(), role: userRole("role").notNull().default("manager"), active: boolean("active").notNull().default(true), ...auditColumns,
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(), name: varchar("name", { length: 100 }).notNull(), slug: varchar("slug", { length: 120 }).notNull(), sortOrder: integer("sort_order").notNull().default(0), active: boolean("active").notNull().default(true), ...auditColumns,
}, (table) => [uniqueIndex("categories_slug_unique").on(table.slug)]);

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(), categoryId: uuid("category_id").notNull().references(() => categories.id), name: varchar("name", { length: 160 }).notNull(), slug: varchar("slug", { length: 180 }).notNull(), description: text("description").notNull().default(""), price: integer("price").notNull(), weightGrams: integer("weight_grams"), caloriesKcal: integer("calories_kcal"), piecesCount: integer("pieces_count"), includedItems: jsonb("included_items").$type<string[]>().notNull().default([]), imageKey: text("image_url"), badges: jsonb("badges").$type<string[]>().notNull().default([]), available: boolean("available").notNull().default(true), sortOrder: integer("sort_order").notNull().default(0), ...auditColumns,
}, (table) => [uniqueIndex("products_slug_unique").on(table.slug)]);

export const ingredients = pgTable("ingredients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  unit: ingredientUnit("unit").notNull().default("g"),
  purchaseQuantity: integer("purchase_quantity").notNull(),
  purchasePrice: integer("purchase_price").notNull(),
  active: boolean("active").notNull().default(true),
  ...auditColumns,
}, (table) => [uniqueIndex("ingredients_name_unique").on(table.name)]);

export const productIngredients = pgTable("product_ingredients", {
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  ingredientId: uuid("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
}, (table) => [primaryKey({ columns: [table.productId, table.ingredientId] })]);

export const deliveryZones = pgTable("delivery_zones", {
  id: uuid("id").primaryKey().defaultRandom(), name: varchar("name", { length: 120 }).notNull(), deliveryPrice: integer("delivery_price").notNull().default(0), minimumOrder: integer("minimum_order").notNull().default(0), freeDeliveryFrom: integer("free_delivery_from"), active: boolean("active").notNull().default(true), ...auditColumns,
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(), number: integer("number").notNull().generatedAlwaysAsIdentity(), status: orderStatus("status").notNull().default("new"), fulfillment: fulfillmentType("fulfillment").notNull(), customerName: varchar("customer_name", { length: 100 }).notNull(), customerPhone: varchar("customer_phone", { length: 30 }).notNull(), address: text("address"), deliveryZoneId: uuid("delivery_zone_id").references(() => deliveryZones.id), comment: text("comment"), estimatedReadyAt: timestamp("estimated_ready_at", { withTimezone: true }).notNull().defaultNow(), subtotal: integer("subtotal").notNull(), deliveryPrice: integer("delivery_price").notNull().default(0), discount: integer("discount").notNull().default(0), total: integer("total").notNull(), ...auditColumns,
}, (table) => [uniqueIndex("orders_number_unique").on(table.number)]);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(), orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }), productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }), productName: varchar("product_name", { length: 160 }).notNull(), unitPrice: integer("unit_price").notNull(), quantity: integer("quantity").notNull(), total: integer("total").notNull(),
});

export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").primaryKey().defaultRandom(), orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }), status: orderStatus("status").notNull(), changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(), value: jsonb("value").notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
