import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/server/db";
import { products } from "@/server/db/schema";
import { deleteObject, mediaUrl, putObject } from "@/server/storage/object-storage";

export const productInputSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).default(""),
  price: z.number().int().nonnegative(),
  weightGrams: z.number().int().positive().nullable(),
  caloriesKcal: z.number().int().nonnegative().nullable(),
  piecesCount: z.number().int().positive().nullable(),
  includedItems: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
  badges: z.array(z.string().trim().min(1).max(30)).max(5).default([]),
  available: z.boolean().default(true),
});

function slugify(value: string) {
  const transliterated = value.toLowerCase().trim()
    .replace(/[а-яё]/g, (letter) => ({ а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" }[letter] ?? letter))
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return transliterated || "product";
}

async function uniqueSlug(name: string, excludedId?: string) {
  const db = getDatabase();
  const base = slugify(name);
  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = suffix ? `${base}-${suffix + 1}` : base;
    const where = excludedId ? and(eq(products.slug, candidate), ne(products.id, excludedId)) : eq(products.slug, candidate);
    if (!(await db.select({ id: products.id }).from(products).where(where).limit(1))[0]) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createProduct(input: z.infer<typeof productInputSchema>) {
  const values = productInputSchema.parse(input);
  const [product] = await getDatabase().insert(products).values({ ...values, slug: await uniqueSlug(values.name) }).returning();
  return { ...product, imageUrl: mediaUrl(product.imageKey) };
}

export async function updateProduct(id: string, input: z.infer<typeof productInputSchema>) {
  const values = productInputSchema.parse(input);
  const [product] = await getDatabase().update(products).set({ ...values, slug: await uniqueSlug(values.name, id), updatedAt: new Date() }).where(eq(products.id, id)).returning();
  return product ? { ...product, imageUrl: mediaUrl(product.imageKey) } : null;
}

export async function removeProduct(id: string) {
  const [product] = await getDatabase().delete(products).where(eq(products.id, id)).returning();
  if (product?.imageKey) await deleteObject(product.imageKey).catch(() => undefined);
  return product;
}

const allowedImages: Record<string, { extension: string; signature: (bytes: Uint8Array) => boolean }> = {
  "image/jpeg": { extension: "jpg", signature: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { extension: "png", signature: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  "image/webp": { extension: "webp", signature: (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP" },
  "image/avif": { extension: "avif", signature: (b) => String.fromCharCode(...b.slice(4, 12)).includes("ftypavif") },
};

export async function replaceProductImage(id: string, file: File) {
  if (file.size === 0 || file.size > 8 * 1024 * 1024) throw new Error("Размер изображения должен быть не больше 8 МБ.");
  const format = allowedImages[file.type];
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!format || !format.signature(bytes)) throw new Error("Поддерживаются JPG, PNG, WebP и AVIF.");
  const db = getDatabase();
  const [current] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!current) return null;
  const key = `products/${id}/${crypto.randomUUID()}.${format.extension}`;
  await putObject(key, bytes, file.type);
  const [product] = await db.update(products).set({ imageKey: key, updatedAt: new Date() }).where(eq(products.id, id)).returning();
  if (current.imageKey) await deleteObject(current.imageKey).catch(() => undefined);
  return { ...product, imageUrl: mediaUrl(product.imageKey) };
}

export async function removeProductImage(id: string) {
  const db = getDatabase();
  const [current] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!current) return null;
  const [product] = await db.update(products).set({ imageKey: null, updatedAt: new Date() }).where(eq(products.id, id)).returning();
  if (current.imageKey) await deleteObject(current.imageKey).catch(() => undefined);
  return { ...product, imageUrl: "" };
}
