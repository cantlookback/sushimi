import { eq } from "drizzle-orm";
import { getDatabase } from "@/server/db";
import { orders, orderStatusHistory } from "@/server/db/schema";
import type { OrderStatus } from "../domain/order";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["cooking", "cancelled"],
  cooking: ["ready", "cancelled"],
  ready: ["delivering", "completed", "cancelled"],
  delivering: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export class StatusTransitionError extends Error {}

export async function updateOrderStatus(id: string, nextStatus: OrderStatus) {
  const db = getDatabase();
  return db.transaction(async (transaction) => {
    const [current] = await transaction.select({ status: orders.status }).from(orders).where(eq(orders.id, id)).for("update");
    if (!current) throw new StatusTransitionError("Заказ не найден.");
    if (!transitions[current.status].includes(nextStatus)) throw new StatusTransitionError("Недопустимый переход статуса.");

    const [updated] = await transaction.update(orders).set({ status: nextStatus, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
    await transaction.insert(orderStatusHistory).values({ orderId: id, status: nextStatus });
    return updated;
  });
}
