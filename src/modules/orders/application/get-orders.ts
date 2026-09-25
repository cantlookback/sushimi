import { asc, desc, inArray, notInArray } from "drizzle-orm";
import { getDatabase } from "@/server/db";
import { orderItems, orders } from "@/server/db/schema";
import type { OrderStatus } from "../domain/order";

export type OrderBoardItem = {
  id: string;
  number: number;
  status: Exclude<OrderStatus, "completed" | "cancelled">;
  fulfillment: "delivery" | "pickup";
  customerName: string;
  customerPhone: string;
  address: string | null;
  comment: string | null;
  total: number;
  createdAt: Date;
  estimatedReadyAt: Date;
  items: Array<{ name: string; quantity: number }>;
};

export async function getActiveOrders(): Promise<OrderBoardItem[]> {
  const db = getDatabase();
  const orderRows = await db.select().from(orders)
    .where(notInArray(orders.status, ["completed", "cancelled"]))
    .orderBy(asc(orders.estimatedReadyAt));
  if (!orderRows.length) return [];

  const itemRows = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderRows.map((order) => order.id)));
  return orderRows.map((order) => ({
    ...order,
    status: order.status as OrderBoardItem["status"],
    items: itemRows.filter((item) => item.orderId === order.id).map((item) => ({ name: item.productName, quantity: item.quantity })),
  }));
}

export async function getRecentCompletedOrders() {
  return getDatabase().select().from(orders)
    .where(inArray(orders.status, ["completed", "cancelled"]))
    .orderBy(desc(orders.updatedAt)).limit(20);
}
