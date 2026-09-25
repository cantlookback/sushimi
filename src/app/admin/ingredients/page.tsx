import { getIngredients } from "@/modules/ingredients/application/manage-ingredients";
import { IngredientsManager } from "@/modules/ingredients/ui/ingredients-manager";

export const metadata = { title: "Ингредиенты и закупки" };
export const dynamic = "force-dynamic";

export default async function IngredientsPage() {
  return <IngredientsManager initialIngredients={await getIngredients()}/>;
}
