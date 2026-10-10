import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { Readable } from "node:stream";
import { DateTime } from "luxon";
import { db, transaction, audit } from "@/lib/db";
import { requireAdmin, requireClient } from "@/lib/auth";
import { getContent, saveDraft, publish, assetIds } from "@/lib/content";
import {
  availability,
  requestBooking,
  updateBooking,
  updateSettings,
} from "@/lib/booking";
import {
  storageUsage,
  storageHealth,
  readObject,
  objectStream,
} from "@/lib/storage";
import { emailHealth } from "@/lib/email";
import {
  createCustomer,
  setupAccess,
  consumeSetup,
  createGallery,
  uploadImage,
  authorisedGallery,
  removeGallery,
  removeCustomer,
  deletePublicAsset,
  queue,
} from "@/lib/gallery";
import {
  chatHealth,
  getConversation,
  sendVisitor,
  receiveTelegram,
} from "@/lib/chat";
import { sameOrigin, rateLimit, ipKey } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const uuid = z.string().uuid();
type Ctx = { params: Promise<{ path: string[] }> };
async function route(req: NextRequest, ctx: Ctx) {
  const p = (await ctx.params).path;
  const method = req.method;
  const json = (value: unknown, status = 200) =>
    NextResponse.json(value, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  if (method === "POST" && p.join("/") !== "telegram/webhook") sameOrigin(req);
  if (p[0] === "telegram" && p[1] === "webhook" && method === "POST")
    return json(await receiveTelegram(req, await req.json()));
  if (p[0] === "content" && method === "GET") return json(await getContent());
  if (p[0] === "availability" && method === "GET") {
    await rateLimit("availability:" + ipKey(req), 100, 60);
    const packageId = uuid.parse(req.nextUrl.searchParams.get("package"));
    const date = z.iso.date().parse(req.nextUrl.searchParams.get("date"));
    if (req.nextUrl.searchParams.get("month") === "1") {
      const first = DateTime.fromISO(date, { zone: "Europe/London" }).startOf(
        "month",
      );
      const days = [];
      for (let n = 0; n < first.daysInMonth!; n++) {
        const d = first.plus({ days: n }).toISODate()!;
        const a = await availability(d, packageId);
        days.push({ date: d, status: a.status });
      }
      return json({ days });
    }
    return json(await availability(date, packageId));
  }
  if (p[0] === "booking" && method === "POST") {
    await rateLimit("booking:global", 100, 3600);
    await rateLimit("booking:" + ipKey(req), 10, 3600);
    return json(await requestBooking(await req.json()), 201);
  }
  if (p[0] === "setup" && method === "POST") {
    await rateLimit("setup:" + ipKey(req), 8, 300);
    return json(await consumeSetup(await req.json()));
  }
  if (p[0] === "chat") {
    if (method === "GET") {
      const { conversation } = await getConversation(req);
      const messages = conversation
        ? (
            await db.query(
              "SELECT id,sender,body,state,created_at FROM chat_messages WHERE conversation_id=$1 ORDER BY created_at LIMIT 200",
              [conversation.id],
            )
          ).rows
        : [];
      return json({ status: chatHealth(), messages });
    }
    await rateLimit("chat:global", 120, 60);
    await rateLimit("chat:" + ipKey(req), 15, 60);
    const r = await sendVisitor(req, await req.json());
    const response = json({ id: r.id, state: "queued" });
    if (r.header) response.headers.set("Set-Cookie", r.header);
    return response;
  }
  if (p[0] === "media" && method === "GET") {
    const id = uuid.parse(p[1]);
    const a = (
      await db.query(
        "SELECT * FROM assets WHERE id=$1 AND scope='public' AND status='ready'",
        [id],
      )
    ).rows[0];
    if (!a) throw new Error("Not found");
    const preview = req.nextUrl.searchParams.get("draft") === "1";
    if (preview) await requireAdmin(req.headers);
    const content = await getContent(preview ? "draft" : "published");
    if (!assetIds(content).includes(id)) await requireAdmin(req.headers);
    const width = Math.max(
      120,
      Math.min(5120, Number(req.nextUrl.searchParams.get("w") || 2400)),
    );
    const sourceKey = a.key || a.preview_key;
    const sourceBuffer = await readObject(sourceKey).catch(() =>
      readObject(a.preview_key),
    );
    const data = await sharp(sourceBuffer)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 95, smartSubsample: true, effort: 5 })
      .toBuffer();
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": preview ? "private,no-store" : "public,max-age=3600",
        Vary: "Cookie",
      },
    });
  }
  if (p[0] === "client") {
    const customer = await requireClient(req.headers);
    if (p.length === 1 && method === "GET") {
      const galleries = (
        await db.query(
          "SELECT g.*, (SELECT count(*) FROM assets a WHERE a.gallery_id=g.id AND a.status='ready') AS count FROM galleries g WHERE customer_id=$1 AND NOT revoked AND state NOT IN ('deleted','pending-cleanup') ORDER BY created_at DESC",
          [customer.id],
        )
      ).rows;
      return json({
        customer: { name: customer.name },
        galleries: galleries.map((g) => ({
          ...g,
          zip_key: undefined,
          expired: new Date(g.expires_at).getTime() <= Date.now(),
        })),
      });
    }
    const id = uuid.parse(p[1]);
    const g = await authorisedGallery(id, customer.id);
    if (p[2] === "photos") {
      return json(
        (
          await db.query(
            "SELECT id,width,height,alt FROM assets WHERE gallery_id=$1 AND status='ready' ORDER BY created_at,id",
            [id],
          )
        ).rows,
      );
    }
    if (p[2] === "preview") {
      const a = (
        await db.query(
          "SELECT preview_key FROM assets WHERE id=$1 AND gallery_id=$2 AND status='ready'",
          [uuid.parse(p[3]), id],
        )
      ).rows[0];
      if (!a) throw new Error("Forbidden");
      return new Response(new Uint8Array(await readObject(a.preview_key)), {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "private,no-store",
        },
      });
    }
    if (p[2] === "download") {
      if (g.state !== "ready" || !g.zip_key)
        throw new Error("Your download is still processing");
      return new Response(
        Readable.toWeb(await objectStream(g.zip_key)) as ReadableStream,
        {
          headers: {
            "Content-Length": String(g.zip_bytes),
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename="${g.title.replace(/[^a-zA-Z0-9 -]/g, "").slice(0, 60) || "photos"}.zip"`,
            "Cache-Control": "private,no-store",
          },
        },
      );
    }
  }
  if (p[0] === "admin") {
    const admin = await requireAdmin(req.headers),
      area = p[1];
    if (method === "GET") {
      if (area === "content") return json(await getContent("draft"));
      if (area === "bookings")
        return json(
          (
            await db.query(
              "SELECT * FROM bookings ORDER BY starts_at DESC LIMIT 500",
            )
          ).rows,
        );
      if (area === "settings")
        return json(
          (await db.query("SELECT settings FROM resource WHERE id=1")).rows[0]
            .settings,
        );
      if (area === "media") {
        const versions = (
          await db.query("SELECT state,content FROM website_versions")
        ).rows;
        return json(
          (
            await db.query(
              "SELECT * FROM assets WHERE scope='public' AND status<>'deleted' ORDER BY created_at DESC",
            )
          ).rows.map((a) => ({
            ...a,
            uses: versions
              .filter((v) => assetIds(v.content).includes(a.id))
              .map((v) => v.state),
          })),
        );
      }
      if (area === "galleries")
        return json(
          (
            await db.query(
              "SELECT g.*,c.name AS customer_name,(SELECT count(*) FROM assets a WHERE a.gallery_id=g.id AND a.status<>'deleted') AS count,(SELECT COALESCE(sum(bytes+preview_bytes+reserved_bytes),0) FROM assets a WHERE a.gallery_id=g.id AND a.status<>'deleted')+g.zip_bytes+g.processing_bytes AS storage_bytes FROM galleries g JOIN customers c ON c.id=g.customer_id ORDER BY g.created_at DESC",
            )
          ).rows,
        );
      if (area === "customers")
        return json(
          (
            await db.query(
              "SELECT id,name,email,revoked,deleted_at FROM customers ORDER BY created_at DESC",
            )
          ).rows,
        );
      if (area === "inbox")
        return json(
          (
            await db.query(
              "SELECT * FROM outbox ORDER BY created_at DESC LIMIT 100",
            )
          ).rows,
        );
      if (area === "jobs")
        return json(
          (
            await db.query(
              "SELECT * FROM jobs ORDER BY created_at DESC LIMIT 100",
            )
          ).rows,
        );
      if (area === "audit")
        return json(
          (
            await db.query(
              "SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 100",
            )
          ).rows,
        );
      if (area === "health")
        return json({
          storage: await storageHealth(),
          email: emailHealth(),
          telegram: chatHealth(),
          usage: await storageUsage(),
          database: "Connected",
          worker:
            (
              await db.query(
                "SELECT value FROM worker_health WHERE key='heartbeat'",
              )
            ).rows[0]?.value || null,
        });
    }
    if (method === "POST") {
      if (area === "upload") {
        if (Number(req.headers.get("content-length") || 0) > 26 * 1024 * 1024)
          throw new Error("Upload request exceeds 26 MB");
        const form = await req.formData(),
          file = form.get("file");
        if (!(file instanceof File)) throw new Error("Choose an image");
        const scope = z.enum(["public", "client"]).parse(form.get("scope"));
        return json(
          await uploadImage(
            file,
            scope,
            scope === "client" ? uuid.parse(form.get("galleryId")) : null,
            String(form.get("alt") || ""),
            admin.id,
          ),
          201,
        );
      }
      const raw = await req.json();
      if (area === "content") return json(await saveDraft(raw, admin.id));
      if (area === "publish") return json(await publish(admin.id));
      if (area === "settings") return json(await updateSettings(raw, admin.id));
      if (area === "booking") {
        const b = z
          .object({
            id: uuid,
            action: z.enum(["approve", "decline", "cancel", "reschedule"]),
            start: z.iso.datetime({ offset: true }).optional(),
          })
          .parse(raw);
        return json(await updateBooking(b.id, b.action, b.start, admin.id));
      }
      if (area === "customer") {
        if (raw.action === "create")
          return json(await createCustomer(raw, admin.id), 201);
        const id = uuid.parse(raw.id);
        if (raw.action === "setup")
          return json(await setupAccess(id, admin.id));
        if (raw.action === "delete") {
          if (raw.confirm !== "DELETE")
            throw new Error("Type DELETE to confirm");
          return json(await removeCustomer(id, admin.id));
        }
        if (raw.action === "revoke") {
          await transaction(async (c) => {
            await c.query("UPDATE customers SET revoked=true WHERE id=$1", [
              id,
            ]);
            await c.query(
              'DELETE FROM "session" WHERE "userId"=(SELECT user_id FROM customers WHERE id=$1)',
              [id],
            );
            await c.query("DELETE FROM setup_tokens WHERE customer_id=$1", [
              id,
            ]);
            await audit(c, admin.id, "customer.revoke", id);
          });
          return json({ ok: true });
        }
      }
      if (area === "gallery") {
        if (raw.action === "create")
          return json(await createGallery(raw, admin.id), 201);
        const id = uuid.parse(raw.id);
        if (raw.action === "delete") {
          if (raw.confirm !== "DELETE")
            throw new Error("Type DELETE to confirm");
          return json(await removeGallery(id, admin.id));
        }
        if (raw.action === "revoke") {
          await db.query("UPDATE galleries SET revoked=true WHERE id=$1", [id]);
          await audit(db, admin.id, "gallery.revoke", id);
          return json({ ok: true });
        }
        if (raw.action === "expiry") {
          const expires = z.iso.datetime({ offset: true }).parse(raw.expiresAt);
          await db.query(
            "UPDATE galleries SET expires_at=$2 WHERE id=$1 AND NOT revoked",
            [id, expires],
          );
          await audit(db, admin.id, "gallery.expiry", id);
          return json({ ok: true });
        }
        if (raw.action === "retry") {
          await transaction(async (c) => {
            const g = (
              await c.query("SELECT * FROM galleries WHERE id=$1 FOR UPDATE", [
                id,
              ])
            ).rows[0];
            if (!g || g.state === "deleted")
              throw new Error("Gallery not found");
            await c.query(
              "UPDATE jobs SET attempts=0,state='queued',available_at=now() WHERE payload->>'id'=$1 AND state='failed'",
              [id],
            );
            await queue(c, g.revoked ? "cleanup" : "gallery", { id });
          });
          return json({ ok: true });
        }
      }
      if (area === "media-delete") {
        if (raw.confirm !== "DELETE") throw new Error("Type DELETE to confirm");
        return json(await deletePublicAsset(uuid.parse(raw.id), admin.id));
      }
      if (area === "notification-retry") {
        await db.query(
          "UPDATE outbox SET state='queued',attempts=0,available_at=now() WHERE id=$1 AND state='failed'",
          [uuid.parse(raw.id)],
        );
        return json({ ok: true });
      }
    }
  }
  return json({ error: "Not found" }, 404);
}
async function handle(req: NextRequest, ctx: Ctx) {
  try {
    return await route(req, ctx);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Request failed";
    if (message === "Forbidden")
      return NextResponse.json(
        {
          error:
            "Please sign in with the correct account, or access has expired.",
        },
        { status: 403 },
      );
    if (message === "Not found")
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (e instanceof z.ZodError)
      return NextResponse.json(
        {
          error: e.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
        { status: 400 },
      );
    const code = (e as { code?: string }).code;
    if (code === "23P01")
      return NextResponse.json(
        {
          error:
            "This would overlap another reservation, including its buffers.",
        },
        { status: 409 },
      );
    if (code === "23505")
      return NextResponse.json(
        { error: "This record already exists." },
        { status: 409 },
      );
    if (
      code ||
      /ENOENT|database|relation|column|connect|password|syntax|permission/i.test(
        message,
      )
    )
      return NextResponse.json(
        {
          error:
            "Service unavailable. Check database, storage and worker health.",
        },
        { status: 503 },
      );
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
export const GET = handle;
export const POST = handle;
