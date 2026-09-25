import { asc, inArray } from "drizzle-orm";
import { getDatabase } from "@/server/db";
import { deliveryZones, settings } from "@/server/db/schema";
import { platformSettingsSchema, type PlatformSettings } from "../domain/platform-settings";

type StoreValue = PlatformSettings["store"];
type OrderingValue = Partial<PlatformSettings["ordering"]> & { preparationMinutes?: number };

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const db = getDatabase();
  const [rows, [zone]] = await Promise.all([
    db.select().from(settings).where(inArray(settings.key, ["store", "ordering"])),
    db.select().from(deliveryZones).orderBy(asc(deliveryZones.createdAt)).limit(1),
  ]);
  if (!zone) throw new Error("Delivery zone is not configured");

  const store = rows.find((row) => row.key === "store")?.value as Partial<StoreValue> | undefined;
  const ordering = rows.find((row) => row.key === "ordering")?.value as OrderingValue | undefined;
  return platformSettingsSchema.parse({
    store: {
      name: store?.name ?? "Суши Чулым",
      phone: store?.phone ?? "+7 (000) 000-00-00",
      address: store?.address ?? "",
      opensAt: store?.opensAt ?? "11:00",
      closesAt: store?.closesAt ?? "22:00",
    },
    ordering: {
      acceptingOrders: ordering?.acceptingOrders ?? true,
      deliveryPreparationMinutes: ordering?.deliveryPreparationMinutes ?? ordering?.preparationMinutes ?? 60,
      pickupPreparationMinutes: ordering?.pickupPreparationMinutes ?? ordering?.preparationMinutes ?? 45,
    },
    delivery: {
      zoneId: zone.id,
      name: zone.name,
      deliveryPrice: zone.deliveryPrice,
      minimumOrder: zone.minimumOrder,
      freeDeliveryFrom: zone.freeDeliveryFrom,
    },
  });
}
