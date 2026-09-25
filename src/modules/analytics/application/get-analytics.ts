import { desc, ne, sql } from "drizzle-orm";
import { getDatabase } from "@/server/db";
import { orderItems, orders } from "@/server/db/schema";

export async function getAnalytics() {
  const db = getDatabase();
  const [[summary], topProducts, fulfillment, daily] = await Promise.all([
    db.select({
      ordersCount: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)::int`,
      averageCheck: sql<number>`coalesce(avg(${orders.total}), 0)::int`,
      repeatCustomers: sql<number>`(select count(*)::int from (select customer_phone from orders where status <> 'cancelled' group by customer_phone having count(*) > 1) repeated)`,
    }).from(orders).where(ne(orders.status, "cancelled")),
    db.select({
      name: orderItems.productName,
      quantity: sql<number>`sum(${orderItems.quantity})::int`,
      revenue: sql<number>`sum(${orderItems.total})::int`,
    }).from(orderItems).innerJoin(orders, sql`${orderItems.orderId} = ${orders.id}`).where(ne(orders.status, "cancelled")).groupBy(orderItems.productName).orderBy(desc(sql`sum(${orderItems.quantity})`)).limit(8),
    db.select({ type: orders.fulfillment, count: sql<number>`count(*)::int` }).from(orders).where(ne(orders.status, "cancelled")).groupBy(orders.fulfillment),
    db.select({
      day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'DD.MM')`,
      revenue: sql<number>`sum(${orders.total})::int`,
      count: sql<number>`count(*)::int`,
    }).from(orders).where(ne(orders.status, "cancelled")).groupBy(sql`date_trunc('day', ${orders.createdAt})`).orderBy(sql`date_trunc('day', ${orders.createdAt})`).limit(14),
  ]);
  return { summary, topProducts, fulfillment, daily };
}
