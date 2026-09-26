import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const [mode, directoryArgument] = process.argv.slice(2);
if (!directoryArgument || !["export", "import"].includes(mode)) {
  throw new Error("Usage: node scripts/transfer-media.mjs export|import DIRECTORY");
}

const directory = path.resolve(directoryArgument);
const bucket = process.env.S3_BUCKET ?? "sushimi-media";
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? "http://localhost:8333",
  region: process.env.S3_REGION ?? "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "sushimi",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "sushimi-local-secret",
  },
});

async function ensureBucket() {
  let lastError;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      return;
    } catch {
      try {
        await client.send(new CreateBucketCommand({ Bucket: bucket }));
        return;
      } catch (error) {
        lastError = error;
        if (attempt < 30) await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
  throw lastError;
}

async function listObjects() {
  const objects = [];
  let continuationToken;
  do {
    const page = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
    }));
    objects.push(...(page.Contents ?? []).filter((item) => item.Key));
    continuationToken = page.NextContinuationToken;
  } while (continuationToken);
  return objects;
}

async function exportObjects() {
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  const objects = await listObjects();
  for (const object of objects) {
    const key = object.Key;
    const target = path.resolve(directory, ...key.split("/"));
    if (!target.startsWith(`${directory}${path.sep}`)) throw new Error(`Unsafe object key: ${key}`);
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!response.Body) throw new Error(`Object has no body: ${key}`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, await response.Body.transformToByteArray());
  }
  console.log(`Exported ${objects.length} media objects.`);
}

async function filesRecursively(root) {
  const result = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...await filesRecursively(entryPath));
    else if (entry.isFile()) result.push(entryPath);
  }
  return result;
}

function contentTypeFor(file) {
  switch (path.extname(file).toLowerCase()) {
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".png": return "image/png";
    case ".webp": return "image/webp";
    case ".avif": return "image/avif";
    default: return "application/octet-stream";
  }
}

async function importObjects() {
  const existing = await listObjects();
  for (let index = 0; index < existing.length; index += 1000) {
    await client.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: existing.slice(index, index + 1000).map(({ Key }) => ({ Key })) },
    }));
  }

  const files = await filesRecursively(directory);
  for (const file of files) {
    const key = path.relative(directory, file).split(path.sep).join("/");
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: await readFile(file),
      ContentType: contentTypeFor(file),
      CacheControl: "public, max-age=31536000, immutable",
    }));
  }
  console.log(`Imported ${files.length} media objects.`);
}

await ensureBucket();
if (mode === "export") await exportObjects();
else await importObjects();
