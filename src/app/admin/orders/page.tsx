import { getActiveOrders } from "@/modules/orders/application/get-orders";
import { OrdersBoard } from "@/modules/orders/ui/orders-board";

export const metadata = { title: "Текущие заказы" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await getActiveOrders();
  const serialized = orders.map((order) => ({ ...order, createdAt: order.createdAt.toISOString(), estimatedReadyAt: order.estimatedReadyAt.toISOString() }));
  return <OrdersBoard key={serialized.map((order) => `${order.id}:${order.status}`).join("|")} initialOrders={serialized} />;
}
