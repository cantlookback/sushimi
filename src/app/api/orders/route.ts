import { NextResponse } from "next/server";
import { createOrder, OrderValidationError } from "@/modules/orders/application/create-order";
import { createOrderSchema } from "@/modules/orders/domain/order";

export async function POST(request: Request) {
  const parsed = createOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте данные заказа.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  try {
    const order = await createOrder(parsed.data);
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderValidationError) return NextResponse.json({ error: error.message }, { status: 422 });
    console.error("Failed to create order", error);
    return NextResponse.json({ error: "Не удалось оформить заказ. Попробуйте ещё раз." }, { status: 500 });
  }
}
