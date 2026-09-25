import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/server/db";
import { productIngredients } from "@/server/db/schema";

export const recipeInputSchema = z.array(z.object({
  ingredientId: z.string().uuid(),
  quantity: z.number().int().positive().max(1_000_000),
})).max(100).refine((rows) => new Set(rows.map((row) => row.ingredientId)).size === rows.length, "Ингредиенты не должны повторяться");

export async function saveProductRecipe(productId: string, input: z.infer<typeof recipeInputSchema>) {
  const recipe = recipeInputSchema.parse(input);
  await getDatabase().transaction(async (transaction) => {
    await transaction.delete(productIngredients).where(eq(productIngredients.productId, productId));
    if (recipe.length) await transaction.insert(productIngredients).values(recipe.map((row) => ({ productId, ...row })));
  });
  return recipe;
}
