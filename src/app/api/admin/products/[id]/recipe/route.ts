import { recipeInputSchema, saveProductRecipe } from "@/modules/catalog/application/save-product-recipe";

export async function PUT(request: Request, context: RouteContext<"/api/admin/products/[id]/recipe">) {
  const { id } = await context.params;
  const parsed = recipeInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Проверьте состав блюда." }, { status: 400 });
  try {
    return Response.json({ recipe: await saveProductRecipe(id, parsed.data) });
  } catch {
    return Response.json({ error: "Не удалось сохранить рецептуру." }, { status: 400 });
  }
}
