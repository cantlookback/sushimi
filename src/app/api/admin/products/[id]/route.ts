import { removeProduct, productInputSchema, updateProduct } from "@/modules/catalog/application/manage-products";

export async function PATCH(request: Request, context: RouteContext<"/api/admin/products/[id]">) {
  const { id } = await context.params;
  const parsed = productInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Проверьте данные товара." }, { status: 400 });
  const product = await updateProduct(id, parsed.data);
  return product ? Response.json({ product }) : Response.json({ error: "Товар не найден." }, { status: 404 });
}

export async function DELETE(_: Request, context: RouteContext<"/api/admin/products/[id]">) {
  const { id } = await context.params;
  return (await removeProduct(id)) ? new Response(null, { status: 204 }) : Response.json({ error: "Товар не найден." }, { status: 404 });
}
