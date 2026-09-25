import { eq } from "drizzle-orm";
import { getDatabase } from "@/server/db";
import { products } from "@/server/db/schema";

export async function setProductAvailability(id: string, available: boolean) {
  const [product] = await getDatabase().update(products).set({ available, updatedAt: new Date() }).where(eq(products.id, id)).returning();
  return product;
}
