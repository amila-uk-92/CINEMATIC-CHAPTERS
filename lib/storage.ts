import { promises as fs } from "node:fs";
import path from "node:path";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { db, SQL, lock } from "./db";
export const driver = process.env.STORAGE_DRIVER || "local";
const root = path.resolve(
  /* turbopackIgnore: true */ process.env.LOCAL_STORAGE_PATH || ".data/objects",
);
function safe(key: string) {
  if (!/^(public|client)\/[a-zA-Z0-9/_-]+\.(jpg|png|webp|zip)$/.test(key))
    throw new Error("Unsafe object key");
  return path.join(/* turbopackIgnore: true */ root, key);
}
const configured = Boolean(
  process.env.S3_BUCKET &&
  process.env.S3_ACCESS_KEY_ID &&
  process.env.S3_SECRET_ACCESS_KEY,
);
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT || undefined,
  region: process.env.S3_REGION || "eu-west-2",
  forcePathStyle: true,
  credentials: configured
    ? {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      }
    : undefined,
});
export async function putObject(key: string, data: Buffer, type: string) {
  safe(key);
  if (driver === "s3") {
    if (!configured) throw new Error("S3 not configured");
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: data,
        ContentType: type,
      }),
    );
  } else {
    const f = safe(key);
    await fs.mkdir(path.dirname(f), { recursive: true });
    const temp = f + ".tmp";
    await fs.writeFile(temp, data, { mode: 0o600 });
    await fs.rename(temp, f);
  }
}
export async function readObject(key: string) {
  safe(key);
  if (driver === "s3") {
    if (!configured) throw new Error("S3 not configured");
    const r = await s3.send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    );
    return Buffer.from(await r.Body!.transformToByteArray());
  }
  return fs.readFile(/* turbopackIgnore: true */ safe(key));
}
export async function deleteObject(key: string) {
  safe(key);
  if (driver === "s3") {
    if (!configured) throw new Error("S3 not configured");
    await s3.send(
      new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    );
  } else await fs.rm(safe(key), { force: true });
}
export async function storageHealth() {
  try {
    if (driver === "s3") {
      if (!configured) return "Not configured";
      await s3.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET }));
      return "Connected";
    }
    await fs.mkdir(root, { recursive: true });
    await fs.access(root, fs.constants.W_OK);
    return "Local private storage";
  } catch {
    return "Connection failed";
  }
}
export async function storageUsage(c: SQL = db) {
  const r = (
    await c.query(
      `SELECT (SELECT allowance FROM storage WHERE id=1) AS allowance, COALESCE(sum(bytes+preview_bytes+reserved_bytes),0)+(SELECT COALESCE(sum(zip_bytes+processing_bytes),0) FROM galleries WHERE state<>'deleted') AS used, COALESCE(sum(CASE WHEN scope='public' THEN bytes+preview_bytes+reserved_bytes ELSE 0 END),0) AS public FROM assets WHERE status<>'deleted'`,
    )
  ).rows[0];
  const allowance = Number(r.allowance),
    used = Number(r.used);
  return {
    allowance,
    used,
    remaining: Math.max(0, allowance - used),
    percentage: Math.round((used / allowance) * 100),
    public: Number(r.public),
    client: used - Number(r.public),
    warning: used >= allowance * 0.8,
    additionalAlbums: Math.max(
      0,
      Math.floor((allowance - used) / (500 * 1024 * 1024)),
    ),
  };
}
export async function checkCapacity(c: SQL, additional: number) {
  await lock(c, 102);
  const usage = await storageUsage(c);
  if (additional > usage.remaining)
    throw new Error("Storage allowance would be exceeded");
}

export async function objectStream(key: string): Promise<Readable> {
  safe(key);
  if (driver === "s3") {
    if (!configured) throw new Error("S3 not configured");
    const r = await s3.send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    );
    return r.Body as Readable;
  }
  return createReadStream(/* turbopackIgnore: true */ safe(key));
}
export async function putFile(key: string, filename: string, type: string) {
  safe(key);
  const size = (await fs.stat(filename)).size;
  if (driver === "s3") {
    if (!configured) throw new Error("S3 not configured");
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: createReadStream(filename),
        ContentLength: size,
        ContentType: type,
      }),
    );
  } else {
    const target = safe(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(filename, target + ".tmp");
    await fs.rename(target + ".tmp", target);
  }
}
