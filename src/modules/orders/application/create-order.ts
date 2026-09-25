import { eq, inArray } from "drizzle-orm";
import { getDatabase } from "@/server/db";
import { deliveryZones, orderItems, orders, orderStatusHistory, products } from "@/server/db/schema";
import { getPlatformSettings } from "@/modules/settings/application/get-platform-settings";
import type { CreateOrder, CreatedOrder } from "../domain/order";

export class OrderValidationError extends Error {}

export async function createOrder(input: CreateOrder): Promise<CreatedOrder> {
  const platformSettings = await getPlatformSettings();
  if (!platformSettings.ordering.acceptingOrders) throw new OrderValidationError("Приём заказов временно приостановлен.");
  const db = getDatabase();
  const quantities = new Map(input.items.map((item) => [item.productId, item.quantity]));
  const productIds = [...quantities.keys()];
  const productRows = await db.select().from(products).where(inArray(products.id, productIds));

  if (productRows.length !== productIds.length || productRows.some((product) => !product.available)) {
    throw new OrderValidationError("Некоторые товары недоступны. Обновите корзину.");
  }

  const subtotal = productRows.reduce((sum, product) => sum + product.price * (quantities.get(product.id) ?? 0), 0);
  let deliveryPrice = 0;
  let deliveryZoneId: string | null = null;

  if (input.fulfillment === "delivery") {
    const [zone] = await db.select().from(deliveryZones).where(eq(deliveryZones.active, true)).limit(1);
    if (!zone) throw new OrderValidationError("Доставка сейчас недоступна.");
    if (subtotal < zone.minimumOrder) {
      throw new OrderValidationError(`Минимальная сумма заказа — ${zone.minimumOrder / 100} ₽.`);
    }
    deliveryZoneId = zone.id;
    deliveryPrice = zone.freeDeliveryFrom !== null && subtotal >= zone.freeDeliveryFrom ? 0 : zone.deliveryPrice;
  }

  return db.transaction(async (transaction) => {
    const [order] = await transaction.insert(orders).values({
      status: "new",
      fulfillment: input.fulfillment,
      customerName: input.customerName,
      customerPhone: input.phone,
      address: input.fulfillment === "delivery" ? input.address : null,
      deliveryZoneId,
      comment: input.comment,
      estimatedReadyAt: new Date(Date.now() + (input.fulfillment === "delivery" ? platformSettings.ordering.deliveryPreparationMinutes : platformSettings.ordering.pickupPreparationMinutes) * 60 * 1000),
      subtotal,
      deliveryPrice,
      discount: 0,
      total: subtotal + deliveryPrice,
    }).returning({ id: orders.id, number: orders.number, total: orders.total });

    await transaction.insert(orderItems).values(productRows.map((product) => {
      const quantity = quantities.get(product.id) ?? 0;
      return { orderId: order.id, productId: product.id, productName: product.name, unitPrice: product.price, quantity, total: product.price * quantity };
    }));
    await transaction.insert(orderStatusHistory).values({ orderId: order.id, status: "new" });
    return order;
  });
}
