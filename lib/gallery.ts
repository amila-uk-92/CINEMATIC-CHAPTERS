import { randomUUID, randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import sharp from "sharp";
import { ZipArchive } from "archiver";
import { z } from "zod";
import { promises as fs, createWriteStream } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { db, transaction, lock, audit, SQL } from "./db";
import {
  putObject,
  readObject,
  deleteObject,
  checkCapacity,
  objectStream,
  putFile,
} from "./storage";
import { hash } from "./http";
import { enqueueEmail } from "./email";
import { assetIds, contentSchema } from "./content";
export async function queue(
  c: SQL,
  kind: string,
  payload: Record<string, unknown>,
) {
  await c.query("INSERT INTO jobs(id,kind,payload) VALUES($1,$2,$3)", [
    randomUUID(),
    kind,
    JSON.stringify(payload),
  ]);
}
const customerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().transform((v) => v.toLowerCase()),
});
export async function createCustomer(raw: unknown, actor: string) {
  const v = customerSchema.parse(raw);
  return transaction(async (c) => {
    const id = randomUUID(),
      user = randomUUID();
    await c.query(
      'INSERT INTO "user"(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
      [user, v.name, v.email],
    );
    await c.query(
      'INSERT INTO account(id,"accountId","providerId","userId",password) VALUES($1,$2,\'credential\',$2,$3)',
      [randomUUID(), user, await hashPassword(randomBytes(32).toString("hex"))],
    );
    await c.query(
      "INSERT INTO customers(id,user_id,name,email) VALUES($1,$2,$3,$4)",
      [id, user, v.name, v.email],
    );
    await audit(c, actor, "customer.create", id);
    return { id, ...v };
  });
}
export async function setupAccess(id: string, actor: string) {
  return transaction(async (c) => {
    const customer = (
      await c.query(
        "SELECT * FROM customers WHERE id=$1 AND deleted_at IS NULL FOR UPDATE",
        [id],
      )
    ).rows[0];
    if (!customer) throw new Error("Customer not found");
    const token = randomBytes(32).toString("base64url");
    await c.query("DELETE FROM setup_tokens WHERE customer_id=$1", [id]);
    await c.query('DELETE FROM "session" WHERE "userId"=$1', [
      customer.user_id,
    ]);
    await c.query(
      'UPDATE account SET password=$2 WHERE "userId"=$1 AND "providerId"=\'credential\'',
      [customer.user_id, await hashPassword(randomBytes(32).toString("hex"))],
    );
    await c.query("UPDATE customers SET revoked=false WHERE id=$1", [id]);
    await c.query(
      "INSERT INTO setup_tokens(hash,customer_id,expires_at) VALUES($1,$2,now()+interval '24 hours')",
      [hash(token), id],
    );
    const link = process.env.BETTER_AUTH_URL + "/client?setup=" + token;
    await enqueueEmail(
      c,
      "access:" + id + ":" + randomUUID(),
      customer.email,
      "access-setup",
      { name: customer.name, link },
    );
    await audit(c, actor, "customer.access-reset", id);
    return { queued: true };
  });
}
export async function consumeSetup(raw: unknown) {
  const v = z
    .object({
      token: z.string().min(30).max(100),
      password: z.string().min(12).max(128),
    })
    .parse(raw);
  const password = await hashPassword(v.password);
  await transaction(async (c) => {
    const row = (
      await c.query(
        "SELECT * FROM setup_tokens WHERE hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE",
        [hash(v.token)],
      )
    ).rows[0];
    if (!row) throw new Error("This access link is invalid or expired");
    const customer = (
      await c.query(
        "SELECT * FROM customers WHERE id=$1 AND NOT revoked AND deleted_at IS NULL",
        [row.customer_id],
      )
    ).rows[0];
    if (!customer) throw new Error("Access was revoked");
    await c.query(
      'UPDATE account SET password=$2,"updatedAt"=now() WHERE "userId"=$1 AND "providerId"=\'credential\'',
      [customer.user_id, password],
    );
    await c.query("UPDATE setup_tokens SET used_at=now() WHERE hash=$1", [
      hash(v.token),
    ]);
    await c.query('DELETE FROM "session" WHERE "userId"=$1', [
      customer.user_id,
    ]);
  });
  return { ok: true };
}
export async function createGallery(raw: unknown, actor: string) {
  const v = z
    .object({
      customerId: z.string().uuid(),
      title: z.string().trim().min(1).max(120),
      sessionDate: z.iso.date(),
      expiresAt: z.iso.datetime({ offset: true }),
    })
    .parse(raw);
  if (Date.parse(v.expiresAt) <= Date.now())
    throw new Error("Expiry must be in the future");
  return transaction(async (c) => {
    if (
      !(
        await c.query(
          "SELECT 1 FROM customers WHERE id=$1 AND deleted_at IS NULL AND NOT revoked",
          [v.customerId],
        )
      ).rowCount
    )
      throw new Error("Customer is not active");
    const id = randomUUID();
    await c.query(
      "INSERT INTO galleries(id,customer_id,title,session_date,expires_at) VALUES($1,$2,$3,$4,$5)",
      [id, v.customerId, v.title, v.sessionDate, v.expiresAt],
    );
    await audit(c, actor, "gallery.create", id);
    return { id };
  });
}
export async function uploadImage(
  file: File,
  scope: "public" | "client",
  galleryId: string | null,
  alt: string,
  actor: string,
) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 25 * 1024 * 1024 ||
    !file.size
  )
    throw new Error("Use JPEG, PNG or WebP up to 25 MB");
  if (scope === "public" && !alt.trim())
    throw new Error("Descriptive alternative text is required");
  const input = Buffer.from(await file.arrayBuffer());
  const image = sharp(input, { limitInputPixels: 60000000, failOn: "error" });
  const meta = await image.metadata();
  if (
    !["jpeg", "png", "webp"].includes(meta.format || "") ||
    (meta.pages || 1) > 1 ||
    file.type !==
      (
        { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as Record<
          string,
          string
        >
      )[meta.format || ""]
  )
    throw new Error("Unsupported or animated image");
  // Fully decode to validate the file. Preserve original bytes; previews omit EXIF/GPS.
  await image.clone().raw().toBuffer();
  const original = input;
  const extension = meta.format === "jpeg" ? "jpg" : meta.format;
  const id = randomUUID(),
    key = `${scope}/${id}.${extension}`,
    previewKey = `${scope}/${id}_preview.webp`;
  const reserve = original.length * 2 + 2 * 1024 * 1024;
  await transaction(async (c) => {
    await checkCapacity(c, original.length + reserve);
    if (scope === "client") {
      await lock(c, 105);
      const g = (
        await c.query("SELECT * FROM galleries WHERE id=$1 FOR UPDATE", [
          galleryId,
        ])
      ).rows[0];
      if (!g || g.revoked || ["deleted", "pending-cleanup"].includes(g.state))
        throw new Error("Gallery cannot accept uploads");
      await c.query(
        "UPDATE galleries SET state='processing',version=version+1 WHERE id=$1",
        [galleryId],
      );
    }
    await c.query(
      "INSERT INTO assets(id,gallery_id,scope,key,preview_key,filename,mime,bytes,reserved_bytes,width,height,alt) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
      [
        id,
        galleryId,
        scope,
        key,
        previewKey,
        file.name.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 100),
        file.type,
        original.length,
        reserve,
        meta.width,
        meta.height,
        alt.slice(0, 1000),
      ],
    );
  });
  try {
    await putObject(key, original, file.type);
    if (scope === "public") {
      const preview = await sharp(original)
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      await putObject(previewKey, preview, "image/webp");
      await db.query(
        "UPDATE assets SET status='ready',preview_bytes=$2,reserved_bytes=0 WHERE id=$1",
        [id, preview.length],
      );
    } else
      await transaction(async (c) => {
        await queue(c, "gallery", { id: galleryId });
      });
    await audit(db, actor, "asset.upload", id);
    return { id };
  } catch {
    await transaction(async (c) => {
      await c.query("UPDATE assets SET status='pending-cleanup' WHERE id=$1", [
        id,
      ]);
      await queue(c, "asset-cleanup", { id });
    });
    throw new Error("Upload failed; cleanup has been queued");
  }
}
export async function authorisedGallery(id: string, customerId: string) {
  const g = (
    await db.query(
      "SELECT g.* FROM galleries g JOIN customers c ON c.id=g.customer_id WHERE g.id=$1 AND g.customer_id=$2 AND NOT g.revoked AND NOT c.revoked AND c.deleted_at IS NULL AND g.expires_at>now() AND g.state NOT IN ('deleted','pending-cleanup')",
      [id, customerId],
    )
  ).rows[0];
  if (!g) throw new Error("Gallery expired or access revoked");
  return g;
}
export async function removeGallery(id: string, actor: string) {
  await transaction(async (c) => {
    await lock(c, 105);
    const g = (
      await c.query("SELECT * FROM galleries WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (!g) throw new Error("Gallery not found");
    await c.query(
      "UPDATE galleries SET revoked=true,state='pending-cleanup',version=version+1 WHERE id=$1",
      [id],
    );
    await c.query(
      "UPDATE assets SET status='pending-cleanup' WHERE gallery_id=$1 AND status<>'deleted'",
      [id],
    );
    await queue(c, "cleanup", { id });
    await audit(c, actor, "gallery.delete-request", id);
  });
  return { ok: true };
}
export async function removeCustomer(id: string, actor: string) {
  await transaction(async (c) => {
    await lock(c, 105);
    const customer = (
      await c.query("SELECT * FROM customers WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (!customer) throw new Error("Customer not found");
    await c.query(
      "UPDATE customers SET revoked=true,deleted_at=now() WHERE id=$1",
      [id],
    );
    await c.query("DELETE FROM setup_tokens WHERE customer_id=$1", [id]);
    await c.query('DELETE FROM "user" WHERE id=$1', [customer.user_id]);
    const galleries = (
      await c.query(
        "UPDATE galleries SET revoked=true,state='pending-cleanup',version=version+1 WHERE customer_id=$1 AND state<>'deleted' RETURNING id",
        [id],
      )
    ).rows;
    for (const g of galleries) await queue(c, "cleanup", { id: g.id });
    await audit(c, actor, "customer.delete-request", id);
  });
  return { ok: true };
}
export async function deletePublicAsset(id: string, actor: string) {
  await transaction(async (c) => {
    await lock(c, 101);
    const versions = (await c.query("SELECT content FROM website_versions"))
      .rows;
    const used = versions.some((v) =>
      assetIds(contentSchema.parse(v.content)).includes(id),
    );
    if (used)
      throw new Error(
        "Asset is used in draft or published content. Remove its placements and publish first",
      );
    const a = (
      await c.query(
        "SELECT * FROM assets WHERE id=$1 AND scope='public' FOR UPDATE",
        [id],
      )
    ).rows[0];
    if (!a) throw new Error("Asset not found");
    await c.query("UPDATE assets SET status='pending-cleanup' WHERE id=$1", [
      id,
    ]);
    await queue(c, "asset-cleanup", { id });
    await audit(c, actor, "asset.delete-request", id);
  });
  return { ok: true };
}
async function prepareZip(assets: any[], filename: string) {
  const archive = new ZipArchive({ zlib: { level: 1 } });
  const output = createWriteStream(filename, { mode: 0o600 });
  const completed = pipeline(archive, output);
  void completed.catch(() => {});
  try {
    for (const [index, a] of assets.entries()) {
      const stream = await objectStream(a.key);
      stream.on("error", (e) => archive.destroy(e));
      archive.append(stream, {
        name: `${String(index + 1).padStart(4, "0")}-${a.filename.replace(/\.[^.]+$/, "")}.${a.key.split(".").pop()}`,
      });
    }
    await Promise.all([completed, archive.finalize()]);
  } catch (e) {
    archive.destroy();
    await completed.catch(() => {});
    throw e;
  }
}
export async function processGallery(id: string) {
  // Commit temporary-space reservations before any file work, so worker crashes retain accounting.
  await transaction(async (c) => {
    await lock(c, 102);
    await lock(c, 105);
    const g = (
      await c.query("SELECT * FROM galleries WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (!g || g.revoked || ["deleted", "pending-cleanup"].includes(g.state))
      return;
    const totals = (
      await c.query(
        "SELECT COALESCE(sum(bytes),0) AS total,COALESCE(sum(reserved_bytes),0) AS reserved FROM assets WHERE gallery_id=$1 AND status NOT IN ('deleted','pending-cleanup')",
        [id],
      )
    ).rows[0];
    const old = (
      await c.query(
        "SELECT COALESCE(sum((payload->>'bytes')::bigint),0) AS bytes FROM jobs WHERE kind='object-cleanup' AND payload->>'key' LIKE $1 AND COALESCE((payload->>'accounted')::boolean,false)=false",
        ["client/" + id + "_v%.zip"],
      )
    ).rows[0];
    const required =
      Math.max(
        0,
        Number(totals.total) * 2 + 2097152 - Number(totals.reserved),
      ) + Number(old.bytes);
    await checkCapacity(c, Math.max(0, required - Number(g.processing_bytes)));
    await c.query("UPDATE galleries SET processing_bytes=$2 WHERE id=$1", [
      id,
      required,
    ]);
  });
  await transaction(async (c) => {
    await lock(c, 102);
    await lock(c, 105);
    const g = (
      await c.query("SELECT * FROM galleries WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (!g || g.revoked || ["deleted", "pending-cleanup"].includes(g.state))
      return;
    const assets = (
      await c.query(
        "SELECT * FROM assets WHERE gallery_id=$1 AND status NOT IN ('deleted','pending-cleanup') ORDER BY created_at,id",
        [id],
      )
    ).rows;
    if (!assets.length) return;
    const reserved = assets.reduce((n, a) => n + Number(a.reserved_bytes), 0),
      total = assets.reduce((n, a) => n + Number(a.bytes), 0);
    const old = (
      await c.query(
        "SELECT COALESCE(sum((payload->>'bytes')::bigint),0) AS bytes FROM jobs WHERE kind='object-cleanup' AND payload->>'key' LIKE $1 AND COALESCE((payload->>'accounted')::boolean,false)=false",
        ["client/" + id + "_v%.zip"],
      )
    ).rows[0];
    const oldBytes = Number(old.bytes);
    const temporary = Math.max(0, total * 2 + 2097152 - reserved) + oldBytes;
    await checkCapacity(c, Math.max(0, temporary - Number(g.processing_bytes)));
    await c.query("UPDATE galleries SET processing_bytes=$2 WHERE id=$1", [
      id,
      temporary,
    ]);
    for (const a of assets) {
      if (a.status !== "ready") {
        const data = await readObject(a.key);
        const preview = await sharp(data)
          .rotate()
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        await putObject(a.preview_key, preview, "image/webp");
        await c.query(
          "UPDATE assets SET status='ready',preview_bytes=$2 WHERE id=$1",
          [a.id, preview.length],
        );
      }
    }
    const tempRoot = path.resolve(
      process.env.LOCAL_STORAGE_PATH || ".data/objects",
      "..",
      "zip-tmp",
    );
    await fs.mkdir(tempRoot, { recursive: true });
    const temp = path.join(tempRoot, `${id}_v${g.version}.zip`);
    const zipKey = `client/${id}_v${g.version}.zip`;
    try {
      await prepareZip(assets, temp);
      const zipBytes = (await fs.stat(temp)).size;
      await putFile(zipKey, temp, "application/zip");
      if (g.zip_key && g.zip_key !== zipKey)
        await queue(c, "object-cleanup", {
          key: g.zip_key,
          bytes: Number(g.zip_bytes),
        });
      await c.query(
        "UPDATE galleries SET state='ready',zip_key=$2,zip_bytes=$3,processing_bytes=$4,error=NULL WHERE id=$1",
        [
          id,
          zipKey,
          zipBytes,
          oldBytes +
            (g.zip_key && g.zip_key !== zipKey ? Number(g.zip_bytes) : 0),
        ],
      );
      await c.query("UPDATE assets SET reserved_bytes=0 WHERE gallery_id=$1", [
        id,
      ]);
      const customer = (
        await c.query("SELECT * FROM customers WHERE id=$1", [g.customer_id])
      ).rows[0];
      await enqueueEmail(
        c,
        `gallery:${id}:v${g.version}`,
        customer.email,
        "gallery-ready",
        { name: customer.name, link: process.env.BETTER_AUTH_URL + "/client" },
      );
    } finally {
      await fs.rm(temp, { force: true });
    }
  });
}
export async function cleanupOldObject(
  key: string,
  bytes: number,
  jobId: string,
) {
  await deleteObject(key);
  const id = key.match(/^client\/([a-f0-9-]{36})_v\d+\.zip$/)?.[1];
  if (id)
    await transaction(async (c) => {
      const job = (
        await c.query("SELECT payload FROM jobs WHERE id=$1 FOR UPDATE", [
          jobId,
        ])
      ).rows[0];
      if (job?.payload.accounted) return;
      await c.query(
        "UPDATE galleries SET processing_bytes=GREATEST(0,processing_bytes-$2) WHERE id=$1",
        [id, bytes],
      );
      await c.query(
        "UPDATE jobs SET payload=json_patch(payload, '{\"accounted\":true}') WHERE id=$1",
        [jobId],
      );
    });
}
export async function cleanupGallery(id: string) {
  await transaction(async (c) => {
    await lock(c, 105);
    const g = (
      await c.query("SELECT * FROM galleries WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (!g || g.state === "deleted") return;
    if (!g.revoked) throw new Error("Refusing to clean active gallery");
    const assets = (
      await c.query(
        "SELECT * FROM assets WHERE gallery_id=$1 AND status<>'deleted'",
        [id],
      )
    ).rows;
    for (const a of assets) {
      await deleteObject(a.key);
      if (a.preview_key) await deleteObject(a.preview_key);
      await c.query(
        "UPDATE assets SET status='deleted',bytes=0,preview_bytes=0,reserved_bytes=0 WHERE id=$1",
        [a.id],
      );
    }
    if (g.zip_key) await deleteObject(g.zip_key);
    // A crash may have written the next ZIP before the final DB update; its deterministic key is known.
    await deleteObject(`client/${id}_v${g.version}.zip`);
    const historical = (
      await c.query(
        "SELECT id,payload FROM jobs WHERE kind='object-cleanup' AND payload->>'key' LIKE $1",
        ["client/" + id + "_v%.zip"],
      )
    ).rows;
    for (const job of historical) {
      await deleteObject(job.payload.key);
      await c.query(
        "UPDATE jobs SET payload=json_patch(payload, '{\"accounted\":true}') WHERE id=$1",
        [job.id],
      );
    }
    const tempRoot = path.resolve(
      process.env.LOCAL_STORAGE_PATH || ".data/objects",
      "..",
      "zip-tmp",
    );
    await fs.rm(path.join(tempRoot, `${id}_v${g.version}.zip`), {
      force: true,
    });
    await c.query(
      "UPDATE galleries SET state='deleted',zip_bytes=0,processing_bytes=0,zip_key=NULL,error=NULL WHERE id=$1",
      [id],
    );
  });
}
export async function cleanupAsset(id: string) {
  const a = (
    await db.query(
      "SELECT * FROM assets WHERE id=$1 AND status='pending-cleanup'",
      [id],
    )
  ).rows[0];
  if (!a) return;
  await deleteObject(a.key);
  if (a.preview_key) await deleteObject(a.preview_key);
  await db.query(
    "UPDATE assets SET status='deleted',bytes=0,preview_bytes=0,reserved_bytes=0 WHERE id=$1",
    [id],
  );
}
