import { NextResponse } from "next/server";
import { savePlatformSettings } from "@/modules/settings/application/save-platform-settings";
import { platformSettingsSchema } from "@/modules/settings/domain/platform-settings";

export async function PATCH(request: Request) {
  const parsed = platformSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Проверьте заполненные поля.", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  return NextResponse.json({ settings: await savePlatformSettings(parsed.data) });
}
