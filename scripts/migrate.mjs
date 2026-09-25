import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const client = postgres(databaseUrl, { max: 1 });
try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  await client`
    insert into categories (id, name, slug, sort_order)
    values
      ('10000000-0000-4000-8000-000000000001', 'Сеты', 'sets', 10),
      ('10000000-0000-4000-8000-000000000002', 'Классические', 'classic', 20),
      ('10000000-0000-4000-8000-000000000003', 'Запечённые', 'baked', 30),
      ('10000000-0000-4000-8000-000000000004', 'Темпура', 'tempura', 40),
      ('10000000-0000-4000-8000-000000000005', 'Напитки', 'drinks', 50),
      ('10000000-0000-4000-8000-000000000006', 'Добавки', 'additions', 60),
      ('10000000-0000-4000-8000-000000000007', 'Соусы', 'sauces', 70)
    on conflict do nothing
  `;
  await client`
    insert into delivery_zones (id, name, delivery_price, minimum_order, free_delivery_from)
    select '20000000-0000-4000-8000-000000000001', 'Основная зона', 0, 0, null
    where not exists (select 1 from delivery_zones)
  `;
  const storeSettings = JSON.stringify({
    name: "Суши Чулым",
    phone: "+7 (000) 000-00-00",
    address: "",
    opensAt: "11:00",
    closesAt: "22:00",
  });
  const orderingSettings = JSON.stringify({
    acceptingOrders: true,
    deliveryPreparationMinutes: 60,
    pickupPreparationMinutes: 45,
  });

  await client`
    insert into settings (key, value)
    values
      ('store', ${storeSettings}::jsonb),
      ('ordering', ${orderingSettings}::jsonb)
    on conflict (key) do nothing
  `;
  console.log("Database migrations are up to date.");
} finally {
  await client.end();
}
