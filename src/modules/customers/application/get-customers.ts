import { desc, ne, sql } from "drizzle-orm";
import { getDatabase } from "@/server/db";
import { orders } from "@/server/db/schema";

export async function getCustomers() {
  return getDatabase().select({
    phone: orders.customerPhone,
    name: sql<string>`(array_agg(${orders.customerName} order by ${orders.createdAt} desc))[1]`,
    ordersCount: sql<number>`count(*)::int`,
    totalSpent: sql<number>`sum(${orders.total})::int`,
    averageCheck: sql<number>`avg(${orders.total})::int`,
    lastOrderAt: sql<Date>`max(${orders.createdAt})`,
  }).from(orders).where(ne(orders.status, "cancelled")).groupBy(orders.customerPhone).orderBy(desc(sql`sum(${orders.total})`));
}
