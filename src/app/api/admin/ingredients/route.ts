import { createIngredient, ingredientInputSchema } from "@/modules/ingredients/application/manage-ingredients";

export async function POST(request: Request) {
  const parsed = ingredientInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Проверьте данные ингредиента." }, { status: 400 });
  try {
    return Response.json({ ingredient: await createIngredient(parsed.data) }, { status: 201 });
  } catch {
    return Response.json({ error: "Ингредиент с таким названием уже существует." }, { status: 409 });
  }
}
