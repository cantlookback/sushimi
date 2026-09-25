import { getPlatformSettings } from "@/modules/settings/application/get-platform-settings";
import { SettingsForm } from "@/modules/settings/ui/settings-form";

export const metadata = { title: "Настройки платформы" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  return <SettingsForm initialSettings={await getPlatformSettings()} />;
}
