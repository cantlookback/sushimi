import { CreateBucketCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

let bucketReady: Promise<void> | undefined;

async function ensureBucket() {
  bucketReady ??= (async () => {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    }
  })();
  return bucketReady;
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  await ensureBucket();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
}

export async function getObject(key: string) {
  await ensureBucket();
  return client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}

export async function deleteObject(key: string) {
  await ensureBucket();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function mediaUrl(key: string | null) {
  return key ? `/api/media/${key.split("/").map(encodeURIComponent).join("/")}` : "";
}
