import { createProduct, productInputSchema } from "@/modules/catalog/application/manage-products";

export async function POST(request: Request) {
  const parsed = productInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Проверьте данные товара." }, { status: 400 });
  return Response.json({ product: await createProduct(parsed.data) }, { status: 201 });
}
