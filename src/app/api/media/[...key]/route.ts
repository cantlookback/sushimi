import { getObject } from "@/server/storage/object-storage";

export const runtime = "nodejs";

export async function GET(_: Request, context: RouteContext<"/api/media/[...key]">) {
  const { key } = await context.params;
  try {
    const object = await getObject(key.join("/"));
    if (!object.Body) return new Response(null, { status: 404 });
    const bytes = await object.Body.transformToByteArray();
    return new Response(new Uint8Array(bytes).buffer, {
      headers: {
        "Content-Type": object.ContentType ?? "application/octet-stream",
        "Cache-Control": object.CacheControl ?? "public, max-age=31536000, immutable",
        ...(object.ETag ? { ETag: object.ETag } : {}),
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
