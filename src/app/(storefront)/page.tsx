import { getCatalog } from "@/modules/catalog/application/get-catalog";
import { CatalogExperience } from "@/modules/catalog/ui/catalog-experience";
import { getPlatformSettings } from "@/modules/settings/application/get-platform-settings";

export const dynamic = "force-dynamic";

export default async function StorefrontPage() {
  const [catalog, settings] = await Promise.all([getCatalog(), getPlatformSettings()]);
  return <CatalogExperience catalog={catalog} settings={settings} />;
}
