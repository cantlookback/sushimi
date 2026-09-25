import { loadEnvFile } from "node:process";
import { getDatabase } from "./index";
import { categories, deliveryZones, orderItems, orders, orderStatusHistory, products, settings } from "./schema";

loadEnvFile(".env.local");

const ids = {
  categories: {
    sets: "10000000-0000-4000-8000-000000000001",
    classic: "10000000-0000-4000-8000-000000000002",
    baked: "10000000-0000-4000-8000-000000000003",
    tempura: "10000000-0000-4000-8000-000000000004",
    drinks: "10000000-0000-4000-8000-000000000005",
    additions: "10000000-0000-4000-8000-000000000006",
    sauces: "10000000-0000-4000-8000-000000000007",
  },
  zone: "20000000-0000-4000-8000-000000000001",
};

const productRows = [
  ["Большая компания", "big-company", ids.categories.sets, "Филадельфия, Калифорния, темпура и запечённые роллы — 64 шт.", 249900, 1640, ["Хит"]],
  ["Тёплый вечер", "warm-evening", ids.categories.sets, "Три запечённых ролла и хрустящая темпура — 32 шт.", 139000, 920, ["Выгодно"]],
  ["Для двоих", "for-two", ids.categories.sets, "Филадельфия лайт, Калифорния и маки с огурцом — 24 шт.", 109000, 680, []],
  ["Филадельфия", "philadelphia", ids.categories.classic, "Лосось, сливочный сыр, огурец, рис и нори.", 59000, 260, ["Хит"]],
  ["Калифорния", "california", ids.categories.classic, "Снежный краб, огурец, авокадо и икра масаго.", 45000, 245, []],
  ["Канада", "canada", ids.categories.classic, "Угорь, лосось, сливочный сыр, огурец и унаги.", 69000, 270, []],
  ["Запечённый лосось", "baked-salmon", ids.categories.baked, "Лосось, сливочный сыр и фирменная сырная шапочка.", 52000, 285, ["Новинка"]],
  ["Запечённая креветка", "baked-shrimp", ids.categories.baked, "Креветка, огурец, сыр и соус унаги.", 54000, 275, []],
  ["Темпура с лососем", "salmon-tempura", ids.categories.tempura, "Лосось, сыр, огурец и хрустящая панировка.", 51000, 290, []],
  ["Темпура с курицей", "chicken-tempura", ids.categories.tempura, "Курица, сыр, томат и соус спайси.", 43000, 300, ["Сытный"]],
  ["Морс клюквенный", "cranberry-drink", ids.categories.drinks, "Домашний морс из клюквы.", 14000, 500, []],
  ["Добрый Cola", "cola", ids.categories.drinks, "Газированный напиток.", 13000, 500, []],
  ["Имбирь", "ginger", ids.categories.additions, "Дополнительная порция маринованного имбиря.", 5000, 30, []],
  ["Васаби", "wasabi", ids.categories.additions, "Дополнительная порция васаби.", 3000, 15, []],
  ["Дополнительные палочки", "extra-chopsticks", ids.categories.additions, "Один дополнительный комплект палочек.", 0, null, []],
  ["Соевый соус", "soy-sauce", ids.categories.sauces, "Дополнительная порция соевого соуса.", 5000, 40, []],
  ["Соус спайси", "spicy-sauce", ids.categories.sauces, "Острый сливочный соус.", 7000, 40, []],
  ["Соус унаги", "unagi-sauce", ids.categories.sauces, "Сладко-солёный соус для роллов.", 7000, 40, []],
] as const;

const db = getDatabase();

async function seed() {
  await db.transaction(async (transaction) => {
  await transaction.insert(categories).values([
    { id: ids.categories.sets, name: "Сеты", slug: "sets", sortOrder: 10 },
    { id: ids.categories.classic, name: "Классические", slug: "classic", sortOrder: 20 },
    { id: ids.categories.baked, name: "Запечённые", slug: "baked", sortOrder: 30 },
    { id: ids.categories.tempura, name: "Темпура", slug: "tempura", sortOrder: 40 },
    { id: ids.categories.drinks, name: "Напитки", slug: "drinks", sortOrder: 50 },
    { id: ids.categories.additions, name: "Добавки", slug: "additions", sortOrder: 60 },
    { id: ids.categories.sauces, name: "Соусы", slug: "sauces", sortOrder: 70 },
  ]).onConflictDoNothing();

  await transaction.insert(products).values(productRows.map(([name, slug, categoryId, description, price, weightGrams, badges], index) => ({
    id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    name, slug, categoryId, description, price, weightGrams, badges: [...badges], sortOrder: (index + 1) * 10,
  }))).onConflictDoNothing();

  await transaction.insert(deliveryZones).values({
    id: ids.zone, name: "Чулым", deliveryPrice: 15000, minimumOrder: 80000, freeDeliveryFrom: 150000,
  }).onConflictDoNothing();

  await transaction.insert(settings).values([
    { key: "store", value: { name: "Суши Чулым", phone: "+7 (000) 000-00-00", address: "", opensAt: "11:00", closesAt: "22:00" } },
    { key: "ordering", value: { acceptingOrders: true, deliveryPreparationMinutes: 60, pickupPreparationMinutes: 45 } },
  ]).onConflictDoNothing();

  const sampleOrders = [
    { id: "40000000-0000-4000-8000-000000000001", status: "new" as const, customerName: "Анна", customerPhone: "+7 913 000-11-22", address: "ул. Кирова, 18", subtotal: 163000, deliveryPrice: 0, total: 163000 },
    { id: "40000000-0000-4000-8000-000000000002", status: "cooking" as const, customerName: "Игорь", customerPhone: "+7 913 000-22-33", address: "ул. Ленина, 42", subtotal: 109000, deliveryPrice: 15000, total: 124000 },
    { id: "40000000-0000-4000-8000-000000000003", status: "delivering" as const, customerName: "Мария", customerPhone: "+7 913 000-33-44", address: "пер. Садовый, 7", subtotal: 249900, deliveryPrice: 0, total: 249900 },
  ];

  for (const sample of sampleOrders) {
    const inserted = await transaction.insert(orders).values({ ...sample, fulfillment: "delivery", deliveryZoneId: ids.zone, discount: 0, estimatedReadyAt: new Date(Date.now() + 45 * 60 * 1000) }).onConflictDoNothing().returning({ id: orders.id });
    if (!inserted.length) continue;
    await transaction.insert(orderItems).values({ id: sample.id.replace("40000000", "50000000"), orderId: sample.id, productId: "30000000-0000-4000-8000-000000000001", productName: "Большая компания", unitPrice: sample.subtotal, quantity: 1, total: sample.subtotal });
    await transaction.insert(orderStatusHistory).values({ orderId: sample.id, status: sample.status });
  }
  });

  console.log(`Seed complete: ${productRows.length} products, 1 delivery zone, 3 sample orders.`);
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
