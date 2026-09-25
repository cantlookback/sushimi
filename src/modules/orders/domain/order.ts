import { z } from "zod";

export const orderStatuses = ["new", "confirmed", "cooking", "ready", "delivering", "completed", "cancelled"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(10).max(20),
  fulfillment: z.enum(["delivery", "pickup"]),
  address: z.string().trim().max(300).optional(),
  comment: z.string().trim().max(500).optional(),
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(50) })).min(1),
}).superRefine((order, context) => {
  if (order.fulfillment === "delivery" && !order.address) {
    context.addIssue({ code: "custom", path: ["address"], message: "Укажите адрес доставки" });
  }
});

export type CreateOrder = z.infer<typeof createOrderSchema>;

export type CreatedOrder = {
  id: string;
  number: number;
  total: number;
};
