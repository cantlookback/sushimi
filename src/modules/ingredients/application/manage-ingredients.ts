import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/server/db";
import { ingredients, productIngredients } from "@/server/db/schema";

export const ingredientInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  unit: z.enum(["g", "ml", "pcs"]),
  purchaseQuantity: z.number().int().positive(),
  purchasePrice: z.number().int().nonnegative(),
  active: z.boolean().default(true),
});

export async function getIngredients() {
  return getDatabase().select({
    id: ingredients.id, name: ingredients.name, unit: ingredients.unit,
    purchaseQuantity: ingredients.purchaseQuantity, purchasePrice: ingredients.purchasePrice,
    active: ingredients.active, usageCount: sql<number>`count(${productIngredients.productId})::int`,
  }).from(ingredients).leftJoin(productIngredients, eq(ingredients.id, productIngredients.ingredientId))
    .groupBy(ingredients.id).orderBy(asc(ingredients.name));
}

export async function createIngredient(input: z.infer<typeof ingredientInputSchema>) {
  const [ingredient] = await getDatabase().insert(ingredients).values(ingredientInputSchema.parse(input)).returning();
  return { ...ingredient, usageCount: 0 };
}

export async function updateIngredient(id: string, input: z.infer<typeof ingredientInputSchema>) {
  const [ingredient] = await getDatabase().update(ingredients).set({ ...ingredientInputSchema.parse(input), updatedAt: new Date() }).where(eq(ingredients.id, id)).returning();
  if (!ingredient) return null;
  const [usage] = await getDatabase().select({ count: sql<number>`count(*)::int` }).from(productIngredients).where(eq(productIngredients.ingredientId, id));
  return { ...ingredient, usageCount: usage.count };
}

export async function removeIngredient(id: string) {
  const [usage] = await getDatabase().select({ count: sql<number>`count(*)::int` }).from(productIngredients).where(eq(productIngredients.ingredientId, id));
  if (usage.count > 0) throw new Error("Ингредиент используется в рецептурах. Сначала удалите его из блюд.");
  const [ingredient] = await getDatabase().delete(ingredients).where(eq(ingredients.id, id)).returning();
  return ingredient;
}
