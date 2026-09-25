import { ingredientInputSchema, removeIngredient, updateIngredient } from "@/modules/ingredients/application/manage-ingredients";

export async function PATCH(request: Request, context: RouteContext<"/api/admin/ingredients/[id]">) {
  const { id } = await context.params;
  const parsed = ingredientInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Проверьте данные ингредиента." }, { status: 400 });
  try {
    const ingredient = await updateIngredient(id, parsed.data);
    return ingredient ? Response.json({ ingredient }) : Response.json({ error: "Ингредиент не найден." }, { status: 404 });
  } catch {
    return Response.json({ error: "Ингредиент с таким названием уже существует." }, { status: 409 });
  }
}

export async function DELETE(_: Request, context: RouteContext<"/api/admin/ingredients/[id]">) {
  const { id } = await context.params;
  try {
    return (await removeIngredient(id)) ? new Response(null, { status: 204 }) : Response.json({ error: "Ингредиент не найден." }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось удалить ингредиент." }, { status: 409 });
  }
}
