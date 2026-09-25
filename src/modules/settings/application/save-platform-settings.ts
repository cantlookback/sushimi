import { eq } from "drizzle-orm";
import { getDatabase } from "@/server/db";
import { deliveryZones, settings } from "@/server/db/schema";
import type { PlatformSettings } from "../domain/platform-settings";

export async function savePlatformSettings(input: PlatformSettings) {
  const db = getDatabase();
  await db.transaction(async (transaction) => {
    await transaction.insert(settings).values({ key: "store", value: input.store, updatedAt: new Date() })
      .onConflictDoUpdate({ target: settings.key, set: { value: input.store, updatedAt: new Date() } });
    await transaction.insert(settings).values({ key: "ordering", value: input.ordering, updatedAt: new Date() })
      .onConflictDoUpdate({ target: settings.key, set: { value: input.ordering, updatedAt: new Date() } });
    await transaction.update(deliveryZones).set({
      name: input.delivery.name,
      deliveryPrice: input.delivery.deliveryPrice,
      minimumOrder: input.delivery.minimumOrder,
      freeDeliveryFrom: input.delivery.freeDeliveryFrom,
      updatedAt: new Date(),
    }).where(eq(deliveryZones.id, input.delivery.zoneId));
  });
  return input;
}
