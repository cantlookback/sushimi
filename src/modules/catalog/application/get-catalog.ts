import type { Catalog } from "../domain/product";
import { asc, eq } from "drizzle-orm";
import { getDatabase } from "@/server/db";
import { categories, ingredients, productIngredients, products } from "@/server/db/schema";
import { mediaUrl } from "@/server/storage/object-storage";

export async function getCatalog(): Promise<Catalog> {
  const db = getDatabase();
  const [categoryRows, productRows, compositionRows] = await Promise.all([
    db.select().from(categories).where(eq(categories.active, true)).orderBy(asc(categories.sortOrder)),
    db.select().from(products).where(eq(products.available, true)).orderBy(asc(products.sortOrder)),
    db.select({ productId: productIngredients.productId, name: ingredients.name })
      .from(productIngredients)
      .innerJoin(ingredients, eq(productIngredients.ingredientId, ingredients.id)),
  ]);

  const compositions = compositionRows.reduce<Record<string, string[]>>((grouped, row) => {
    (grouped[row.productId] ??= []).push(row.name);
    return grouped;
  }, {});

  return {
    categories: categoryRows.map(({ id, name, slug }) => ({ id, name, slug })),
    products: productRows.map((product) => ({
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      description: product.description,
      price: product.price,
      weightGrams: product.weightGrams ?? 0,
      caloriesKcal: product.caloriesKcal,
      piecesCount: product.piecesCount,
      composition: compositions[product.id] ?? [],
      includedItems: product.includedItems,
      imageUrl: mediaUrl(product.imageKey),
      badges: product.badges,
      available: product.available,
    })),
  };
}
