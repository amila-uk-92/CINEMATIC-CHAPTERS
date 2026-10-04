import { db, transaction } from "./db";
import { expirePending } from "./booking";
import { deliverOne } from "./email";
import {
  processGallery,
  cleanupGallery,
  cleanupAsset,
  removeGallery,
  cleanupOldObject,
} from "./gallery";
import { relayTelegram } from "./chat";
export async function tick() {
  await db.query(
    "INSERT INTO worker_health(key,value) VALUES('heartbeat',now()) ON CONFLICT(key) DO UPDATE SET value=now()",
  );
  await expirePending();
  // Recover crashed worker leases; jobs are repeatable and cleanup is idempotent.
  await db.query(
    "UPDATE jobs SET state='queued' WHERE state='running' AND locked_at<now()-interval '30 minutes'",
  );
  const expired = (
    await db.query(
      "SELECT id FROM galleries WHERE expires_at<=now() AND NOT revoked AND state NOT IN ('pending-cleanup','deleted')",
    )
  ).rows;
  for (const g of expired) await removeGallery(g.id, "expiry-worker");
  const job = await transaction(
    async (c) =>
      (
        await c.query(
          "UPDATE jobs SET state='running',locked_at=now(),attempts=attempts+1 WHERE id=(SELECT id FROM jobs WHERE state IN ('queued','failed') AND attempts<5 AND available_at<=now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *",
        )
      ).rows[0],
  );
  if (job) {
    try {
      if (job.kind === "gallery") await processGallery(job.payload.id);
      else if (job.kind === "cleanup") await cleanupGallery(job.payload.id);
      else if (job.kind === "asset-cleanup") await cleanupAsset(job.payload.id);
      else if (job.kind === "object-cleanup")
        await cleanupOldObject(job.payload.key, job.payload.bytes, job.id);
      else if (job.kind === "telegram") await relayTelegram(job.payload.id);
      await db.query("UPDATE jobs SET state='done',error=NULL WHERE id=$1", [
        job.id,
      ]);
    } catch {
      await db.query(
        "UPDATE jobs SET state='failed',error='Processing failed; retry available',available_at=strftime('%Y-%m-%dT%H:%M:%fZ','now','+' || $2 || ' seconds') WHERE id=$1",
        [job.id, Math.min(3600, 30 * 2 ** job.attempts)],
      );
      if (job.kind === "gallery")
        await db.query(
          "UPDATE galleries SET state='failed',error='Photo/ZIP processing failed; retry from admin' WHERE id=$1 AND NOT revoked",
          [job.payload.id],
        );
      if (job.kind === "telegram")
        await db.query("UPDATE chat_messages SET state='failed' WHERE id=$1", [
          job.payload.id,
        ]);
    }
  }
  await deliverOne();
  return Boolean(job);
}
