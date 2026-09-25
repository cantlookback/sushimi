import { NextResponse } from "next/server";
import { z } from "zod";
import { setProductAvailability } from "@/modules/catalog/application/set-product-availability";

const bodySchema = z.object({ available: z.boolean() });

export async function PATCH(request: Request, context: RouteContext<"/api/admin/products/[id]/availability">) {
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Некорректный товар." }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Некорректное значение." }, { status: 400 });

  const product = await setProductAvailability(id, parsed.data.available);
  if (!product) return NextResponse.json({ error: "Товар не найден." }, { status: 404 });
  return NextResponse.json({ product });
}
