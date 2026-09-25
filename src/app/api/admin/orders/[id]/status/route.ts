import { NextResponse } from "next/server";
import { z } from "zod";
import { updateOrderStatus, StatusTransitionError } from "@/modules/orders/application/update-order-status";
import { orderStatuses } from "@/modules/orders/domain/order";

const bodySchema = z.object({ status: z.enum(orderStatuses) });

export async function PATCH(request: Request, context: RouteContext<"/api/admin/orders/[id]/status">) {
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Некорректный заказ." }, { status: 400 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Некорректный статус." }, { status: 400 });

  try {
    return NextResponse.json({ order: await updateOrderStatus(id, parsed.data.status) });
  } catch (error) {
    if (error instanceof StatusTransitionError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Failed to update order status", error);
    return NextResponse.json({ error: "Не удалось изменить статус." }, { status: 500 });
  }
}
