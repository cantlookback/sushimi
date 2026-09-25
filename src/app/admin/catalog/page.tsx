import { getAdminCatalog } from "@/modules/catalog/application/get-admin-catalog";
import { CatalogManager } from "@/modules/catalog/ui/catalog-manager";
import { mediaUrl } from "@/server/storage/object-storage";

export const metadata = { title: "Управление меню" };
export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const { categories, products, ingredients, recipes } = await getAdminCatalog();
  return <CatalogManager categories={categories.map(({ id, name }) => ({ id, name }))} initialProducts={products.map((product) => ({ ...product, imageUrl: mediaUrl(product.imageKey) }))} ingredients={ingredients.map(({ id, name, unit, purchaseQuantity, purchasePrice, active }) => ({ id, name, unit, purchaseQuantity, purchasePrice, active }))} initialRecipes={recipes} />;
}
