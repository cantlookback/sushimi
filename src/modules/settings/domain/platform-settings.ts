import { z } from "zod";

export const platformSettingsSchema = z.object({
  store: z.object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(5).max(30),
    address: z.string().trim().max(250),
    opensAt: z.string().regex(/^\d{2}:\d{2}$/),
    closesAt: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  ordering: z.object({
    acceptingOrders: z.boolean(),
    deliveryPreparationMinutes: z.number().int().min(10).max(240),
    pickupPreparationMinutes: z.number().int().min(10).max(240),
  }),
  delivery: z.object({
    zoneId: z.string().uuid(),
    name: z.string().trim().min(2).max(120),
    deliveryPrice: z.number().int().min(0).max(1000000),
    minimumOrder: z.number().int().min(0).max(10000000),
    freeDeliveryFrom: z.number().int().min(0).max(10000000).nullable(),
  }),
});

export type PlatformSettings = z.infer<typeof platformSettingsSchema>;
