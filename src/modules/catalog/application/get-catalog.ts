import type { Catalog } from "../domain/product";
import { asc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db";
import { categories, products } from "@/server/db/schema";
import { mediaUrl } from "@/server/storage/object-storage";

export async function getCatalog(): Promise<Catalog> {
  const db = getDatabase();
  const [categoryRows, productRows] = await Promise.all([
    db.select().from(categories).where(eq(categories.active, true)).orderBy(asc(categories.sortOrder)),
    db.select().from(products).where(eq(products.available, true)).orderBy(asc(products.sortOrder)),
  ]);

  return {
    categories: categoryRows.map(({ id, name, slug }) => ({ id, name, slug })),
    products: productRows.map((product) => ({
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      description: product.description,
      price: product.price,
      weightGrams: product.weightGrams ?? 0,
      imageUrl: mediaUrl(product.imageKey),
      badges: product.badges,
      available: product.available,
    })),
  };
}
