import { removeProductImage, replaceProductImage } from "@/modules/catalog/application/manage-products";

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext<"/api/admin/products/[id]/image">) {
  const { id } = await context.params;
  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return Response.json({ error: "Выберите изображение." }, { status: 400 });
  try {
    const product = await replaceProductImage(id, file);
    return product ? Response.json({ product }) : Response.json({ error: "Товар не найден." }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось загрузить изображение." }, { status: 400 });
  }
}

export async function DELETE(_: Request, context: RouteContext<"/api/admin/products/[id]/image">) {
  const { id } = await context.params;
  const product = await removeProductImage(id);
  return product ? Response.json({ product }) : Response.json({ error: "Товар не найден." }, { status: 404 });
}
