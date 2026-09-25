import { asc } from "drizzle-orm";
import { getDatabase } from "@/server/db";
import { categories, ingredients, productIngredients, products } from "@/server/db/schema";

export async function getAdminCatalog() {
  const db = getDatabase();
  const [categoryRows, productRows, ingredientRows, recipeRows] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db.select().from(products).orderBy(asc(products.sortOrder)),
    db.select().from(ingredients).orderBy(asc(ingredients.name)),
    db.select().from(productIngredients),
  ]);
  return { categories: categoryRows, products: productRows, ingredients: ingredientRows, recipes: recipeRows };
}
