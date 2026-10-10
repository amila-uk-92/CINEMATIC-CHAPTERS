import { test, before, after } from "node:test";
import { money } from "../components/api";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { DateTime } from "luxon";
import sharp from "sharp";
import { db } from "../lib/db";
import {
  demoContent,
  getContent,
  saveDraft,
  publish,
  contentSchema,
} from "../lib/content";
import {
  settingsSchema,
  generateSlots,
  requestBooking,
  availability,
  updateBooking,
  updateSettings,
} from "../lib/booking";
import {
  createCustomer,
  setupAccess,
  consumeSetup,
  createGallery,
  uploadImage,
  authorisedGallery,
  processGallery,
  removeGallery,
  cleanupGallery,
  deletePublicAsset,
  removeCustomer,
  cleanupAsset,
  cleanupOldObject,
} from "../lib/gallery";
import {
  storageUsage,
  readObject,
  deleteObject,
  putObject,
} from "../lib/storage";
import { deliverOne, emailTemplate, emailHealth } from "../lib/email";
import { chatHealth, receiveTelegram, getConversation } from "../lib/chat";
import { hash } from "../lib/http";
import { auth, requireClient, requireAdmin } from "../lib/auth";
import { NextRequest } from "next/server";
import { GET, POST } from "../app/api/[...path]/route";
if (process.env.TEST_ISOLATED !== "true")
  throw new Error("Use npm test: creates a disposable PostgreSQL database");
const actor = "test-admin";
const settings = settingsSchema.parse({
  weekly: {
    1: ["09:00", "19:00"],
    2: ["09:00", "19:00"],
    3: ["09:00", "19:00"],
    4: ["09:00", "19:00"],
    5: ["09:00", "19:00"],
    6: ["09:00", "19:00"],
    7: ["09:00", "19:00"],
  },
  overrides: {},
  blocks: [],
  buffer: 30,
  noticeHours: 0,
  horizonDays: 180,
  pendingHours: 48,
});
const future = (days: number, hour = 10) =>
  DateTime.now()
    .setZone("Europe/London")
    .plus({ days })
    .startOf("day")
    .set({ hour })
    .toUTC()
    .toISO()!;
const request = (days: number, hour = 10) => ({
  packageId: demoContent.packages[0].id,
  start: future(days, hour),
  name: "Fictional Test Client",
  email: "test@example.invalid",
  phone: "07000000000",
  message: "Automated test only",
  idempotencyKey: randomUUID(),
});
const jsonRequest = (path: string, body?: unknown, cookie?: string) =>
  new NextRequest("http://127.0.0.1:3000/api/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      origin: "http://127.0.0.1:3000",
      ...(cookie ? { cookie } : {}),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
const context = (path: string) => ({
  params: Promise.resolve({ path: path.split("/") }),
});
let publicId: string,
  client: any,
  other: any,
  galleryId: string,
  clientCookie: string,
  otherCookie: string;
before(async () => {
  for (const state of ["draft", "published"])
    await db.query(
      "INSERT INTO website_versions(state,content) VALUES($1,$2)",
      [state, JSON.stringify(demoContent)],
    );
  for (const p of demoContent.packages)
    await db.query("INSERT INTO packages(id,data) VALUES($1,$2)", [
      p.id,
      JSON.stringify(p),
    ]);
  await db.query("INSERT INTO resource(id,settings) VALUES(1,$1)", [
    JSON.stringify(settings),
  ]);
  await db.query("INSERT INTO storage(id,allowance) VALUES(1,1073741824)");
});
after(async () => {
  await db.end();
});
test("draft stays private until publishing; package snapshots survive archive and removal", async () => {
  const c = await getContent();
  await saveDraft({ ...c, brand: "Fictional Test Brand" }, actor);
  assert.equal((await getContent()).brand, "Cinematic Chapters");
  await publish(actor);
  assert.equal((await getContent()).brand, "Fictional Test Brand");
  const b = await requestBooking(request(4));
  const saved = await getContent("draft");
  saved.packages[0].name = "Changed name";
  saved.packages[0].archived = true;
  await saveDraft(saved, actor);
  await publish(actor);
  assert.equal(
    (await db.query("SELECT snapshot FROM bookings WHERE id=$1", [b.id]))
      .rows[0].snapshot.name,
    "Little Chapters",
  );
  await assert.rejects(requestBooking(request(5)));
  saved.packages = demoContent.packages.map((p) => ({ ...p }));
  await saveDraft(saved, actor);
  await publish(actor);
});
test("hiding packages blocks new requests and public content remains honest", async () => {
  const c = await getContent("draft");
  await saveDraft({ ...c, packagesVisible: false }, actor);
  assert.equal((await getContent()).packagesVisible, true);
  await publish(actor);
  assert.equal((await getContent()).packagesVisible, false);
  await assert.rejects(requestBooking(request(6)), /hidden/);
  await saveDraft({ ...c, packagesVisible: true }, actor);
  await publish(actor);
});
test("concurrent overlapping requests admit one reservation and retries are idempotent", async () => {
  const a = request(7),
    b = { ...a, idempotencyKey: randomUUID() };
  const results = await Promise.allSettled([
    requestBooking(a),
    requestBooking(b),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const first = results[0].status === "fulfilled" ? a : b;
  const again = await requestBooking(first);
  const twice = await requestBooking(first);
  assert.equal(again.id, twice.id);
  assert.equal(
    (
      await db.query("SELECT count(*) FROM bookings WHERE idempotency_key=$1", [
        first.idempotencyKey,
      ])
    ).rows[0].count,
    "1",
  );
  await assert.rejects(
    requestBooking({ ...first, name: "Different person" }),
    /Retry key/,
  );
});
test("database exclusion protects against overlap even when bypassing application lock", async () => {
  const b = (
    await db.query("SELECT * FROM bookings WHERE state='pending' LIMIT 1")
  ).rows[0];
  await assert.rejects(
    db.query(
      `INSERT INTO bookings(id,package_id,snapshot,name,email,phone,message,starts_at,ends_at,reserved,state,expires_at,idempotency_key,request_hash) VALUES($1,$2,$3,'Test','test@example.invalid','00000','',$4,$5,$6,'pending',now()+interval '1 day',$7,'test')`,
      [
        randomUUID(),
        b.package_id,
        b.snapshot,
        b.starts_at,
        b.ends_at,
        b.reserved,
        randomUUID(),
      ],
    ),
    (e) => (e as { code: string }).code === "23P01",
  );
});
test("expired pending holds release slots; approval of an expired request fails", async () => {
  const req = request(8),
    b = await requestBooking(req);
  await db.query(
    "UPDATE bookings SET expires_at=now()-interval '1 second' WHERE id=$1",
    [b.id],
  );
  const a = await availability(
    DateTime.fromISO(req.start).setZone("Europe/London").toISODate()!,
    req.packageId,
  );
  assert(a.slots.some((s) => s.start === req.start));
  await assert.rejects(
    updateBooking(b.id, "approve", undefined, actor),
    /pending/,
  );
  assert.equal(
    (await db.query("SELECT state FROM bookings WHERE id=$1", [b.id])).rows[0]
      .state,
    "expired",
  );
});
test("rescheduling and changing availability respect conflicts and travel buffers", async () => {
  const a = await requestBooking(request(9, 10)),
    b = await requestBooking(request(9, 14));
  await updateBooking(a.id, "approve", undefined, actor);
  await assert.rejects(
    updateBooking(b.id, "reschedule", future(9, 11), actor),
    /conflicts/,
  );
  await updateBooking(b.id, "reschedule", future(9, 15), actor);
  const date = DateTime.fromISO(future(9))
    .setZone("Europe/London")
    .toISODate()!;
  await assert.rejects(
    updateSettings({ ...settings, overrides: { [date]: null } }, actor),
    /conflict/,
  );
  await updateBooking(a.id, "cancel", undefined, actor);
});
test("London spring and autumn clocks preserve real durations and unique instants", () => {
  const cfg = {
    ...settings,
    weekly: { 7: ["00:00", "05:00"] } as any,
    buffer: 0,
    noticeHours: 0,
    horizonDays: 730,
  };
  const spring = generateSlots(
    "2027-03-28",
    30,
    cfg,
    [],
    DateTime.fromISO("2027-01-01"),
  );
  assert(!spring.some((s) => s.label.startsWith("01:")));
  assert(spring.some((s) => s.label === "02:00 BST"));
  const autumn = generateSlots(
    "2027-10-31",
    30,
    cfg,
    [],
    DateTime.fromISO("2027-01-01"),
  );
  assert.equal(autumn.filter((s) => s.label.startsWith("01:00")).length, 2);
  assert.equal(new Set(autumn.map((s) => s.start)).size, autumn.length);
  for (const s of autumn)
    assert.equal(Date.parse(s.end) - Date.parse(s.start), 1800000);
});
test("image replacement remains draft until ready; assets in use cannot be deleted", async () => {
  const buffer = await sharp({
    create: { width: 60, height: 40, channels: 3, background: "#806849" },
  })
    .jpeg()
    .toBuffer();
  const file = new File([new Uint8Array(buffer)], "test.jpg", {
    type: "image/jpeg",
  });
  const uploaded = await uploadImage(
    file,
    "public",
    null,
    "Fictional photograph",
    actor,
  );
  publicId = uploaded.id;
  const c = await getContent("draft");
  c.hero = [
    { id: publicId, alt: "Fictional photograph", desktop: 30, mobile: 60 },
  ];
  await saveDraft(c, actor);
  assert.equal((await getContent()).hero.length, 0);
  await publish(actor);
  assert.equal((await getContent()).hero[0].id, publicId);
  await assert.rejects(deletePublicAsset(publicId, actor), /used/);
  await saveDraft(
    {
      ...c,
      hero: [{ id: randomUUID(), alt: "Not ready", desktop: 50, mobile: 50 }],
    },
    actor,
  );
  await assert.rejects(publish(actor), /not ready/);
  assert.equal((await getContent()).hero[0].id, publicId);
  await saveDraft(c, actor);
});
async function passwordAndCookie(id: string, email: string) {
  await setupAccess(id, actor);
  const row = (
    await db.query(
      "SELECT payload FROM outbox WHERE recipient=$1 AND kind='access-setup' ORDER BY created_at DESC LIMIT 1",
      [email],
    )
  ).rows[0];
  const token = new URL(row.payload.link).searchParams.get("setup")!;
  await consumeSetup({ token, password: "Fictional-test-password-2026" });
  await assert.rejects(
    consumeSetup({ token, password: "Fictional-test-password-2026" }),
    /invalid or expired/,
  );
  const response = await auth.api.signInEmail({
    body: { email, password: "Fictional-test-password-2026" },
    asResponse: true,
  });
  assert.equal(response.status, 200);
  const cookies = response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  assert(response.headers.getSetCookie().some((c) => /HttpOnly/i.test(c)));
  return cookies;
}
test("client setup is single-use; client accounts never obtain admin rights", async () => {
  client = await createCustomer(
    { name: "Fictional One", email: "one@example.invalid" },
    actor,
  );
  other = await createCustomer(
    { name: "Fictional Two", email: "two@example.invalid" },
    actor,
  );
  clientCookie = await passwordAndCookie(client.id, client.email);
  otherCookie = await passwordAndCookie(other.id, other.email);
  const h = new Headers({ cookie: clientCookie });
  assert.equal((await requireClient(h)).id, client.id);
  await assert.rejects(requireAdmin(h), /Forbidden/);
});
test("private previews and ZIPs are authorised by owner and preserve original files", async () => {
  galleryId = (
    await createGallery(
      {
        customerId: client.id,
        title: "Fictional Gallery",
        sessionDate: "2026-10-01",
        expiresAt: future(30),
      },
      actor,
    )
  ).id;
  const data = await sharp({
    create: { width: 120, height: 80, channels: 3, background: "#c8ad7f" },
  })
    .png()
    .toBuffer();
  const uploaded = await uploadImage(
    new File([new Uint8Array(data)], "../../unsafe.png", { type: "image/png" }),
    "client",
    galleryId,
    "Test private photograph",
    actor,
  );
  await processGallery(galleryId);
  const a = (await db.query("SELECT * FROM assets WHERE id=$1", [uploaded.id]))
    .rows[0];
  assert.deepEqual(await readObject(a.key), data);
  assert(!a.filename.includes("/"));
  const g = await authorisedGallery(galleryId, client.id);
  assert.equal(g.state, "ready");
  const zip = await readObject(g.zip_key);
  assert.equal(zip.subarray(0, 2).toString(), "PK");
  await assert.rejects(authorisedGallery(galleryId, other.id));
  const own = await GET(
    jsonRequest(
      `client/${galleryId}/preview/${uploaded.id}`,
      undefined,
      clientCookie,
    ),
    context(`client/${galleryId}/preview/${uploaded.id}`),
  );
  assert.equal(own.status, 200);
  const denied = await GET(
    jsonRequest(
      `client/${galleryId}/preview/${uploaded.id}`,
      undefined,
      otherCookie,
    ),
    context(`client/${galleryId}/preview/${uploaded.id}`),
  );
  assert.equal(denied.status, 400);
  const otherZip = await GET(
    jsonRequest(`client/${galleryId}/download`, undefined, otherCookie),
    context(`client/${galleryId}/download`),
  );
  assert.notEqual(otherZip.status, 200);
});
test("ZIP failure is retryable; storage is reclaimed only after cleanup", async () => {
  const a = (
    await db.query("SELECT * FROM assets WHERE gallery_id=$1 LIMIT 1", [
      galleryId,
    ])
  ).rows[0];
  const original = await readObject(a.key);
  await deleteObject(a.key);
  const chargedBeforeFailure = await storageUsage();
  await assert.rejects(processGallery(galleryId));
  assert(
    (await storageUsage()).used > chargedBeforeFailure.used,
    "failed processing retains committed temporary-space reservation",
  );
  await putObject(a.key, original, a.mime);
  await processGallery(galleryId);
  const before = await storageUsage();
  await removeGallery(galleryId, actor);
  await assert.rejects(authorisedGallery(galleryId, client.id));
  assert.equal((await storageUsage()).used, before.used);
  await cleanupGallery(galleryId);
  await cleanupGallery(galleryId);
  assert((await storageUsage()).used < before.used);
  assert.equal(
    (await db.query("SELECT state FROM galleries WHERE id=$1", [galleryId]))
      .rows[0].state,
    "deleted",
  );
});
test("superseded ZIP cleanup retains accounting and retries never decrement twice", async () => {
  const id = (
    await createGallery(
      {
        customerId: client.id,
        title: "ZIP revision fixture",
        sessionDate: "2026-10-01",
        expiresAt: future(30),
      },
      actor,
    )
  ).id;
  const image = await sharp({
    create: { width: 30, height: 20, channels: 3, background: "#806849" },
  })
    .png()
    .toBuffer();
  for (let n = 0; n < 2; n++) {
    await uploadImage(
      new File([new Uint8Array(image)], `revision-${n}.png`, {
        type: "image/png",
      }),
      "client",
      id,
      "Fixture",
      actor,
    );
    await processGallery(id);
  }
  const job = (
    await db.query(
      "SELECT * FROM jobs WHERE kind='object-cleanup' AND payload->>'key' LIKE $1 ORDER BY created_at LIMIT 1",
      ["client/" + id + "_v%.zip"],
    )
  ).rows[0];
  assert(job);
  const before = await storageUsage();
  await cleanupOldObject(job.payload.key, job.payload.bytes, job.id);
  const once = await storageUsage();
  assert.equal(before.used - once.used, job.payload.bytes);
  await cleanupOldObject(job.payload.key, job.payload.bytes, job.id);
  assert.equal((await storageUsage()).used, once.used);
  await removeGallery(id, actor);
  await cleanupGallery(id);
});
test("expired/revoked client access fails and deleting customer removes identity sessions", async () => {
  const id = (
    await createGallery(
      {
        customerId: client.id,
        title: "Expired fixture",
        sessionDate: "2026-10-01",
        expiresAt: future(30),
      },
      actor,
    )
  ).id;
  await db.query(
    "UPDATE galleries SET expires_at=now()-interval '1 second' WHERE id=$1",
    [id],
  );
  await assert.rejects(authorisedGallery(id, client.id));
  await removeCustomer(client.id, actor);
  await assert.rejects(requireClient(new Headers({ cookie: clientCookie })));
  assert.equal(
    (
      await db.query('SELECT 1 FROM "session" WHERE "userId"=$1', [
        (
          await db.query("SELECT user_id FROM customers WHERE id=$1", [
            client.id,
          ])
        ).rows[0].user_id,
      ])
    ).rowCount,
    0,
  );
});
test("email outage does not lose a booking; retry uses one durable outbox entry", async () => {
  const b = await requestBooking(request(11));
  const entry = (
    await db.query("SELECT * FROM outbox WHERE dedupe=$1", [
      "booking:" + b.id + ":pending",
    ])
  ).rows[0];
  await db.query("UPDATE outbox SET state='preview' WHERE id<>$1", [entry.id]);
  await db.query("UPDATE outbox SET available_at=$2 WHERE id=$1", [entry.id, "2000-01-01T00:00:00.000Z"]);
  process.env.EMAIL_DRIVER = "smtp";
  process.env.SMTP_HOST = "127.0.0.1";
  process.env.SMTP_PORT = "1";
  await deliverOne();
  assert.equal(
    (await db.query("SELECT state FROM outbox WHERE id=$1", [entry.id])).rows[0]
      .state,
    "failed",
  );
  assert.equal(
    (await db.query("SELECT state FROM bookings WHERE id=$1", [b.id])).rows[0]
      .state,
    "pending",
  );
  process.env.EMAIL_DRIVER = "preview";
  await db.query("UPDATE outbox SET available_at=now() WHERE id=$1", [
    entry.id,
  ]);
  await deliverOne();
  assert.equal(
    (await db.query("SELECT state FROM outbox WHERE id=$1", [entry.id])).rows[0]
      .state,
    "preview",
  );
  assert.equal(
    (
      await db.query("SELECT count(*) FROM outbox WHERE dedupe=$1", [
        entry.dedupe,
      ])
    ).rows[0].count,
    "1",
  );
  const template = emailTemplate("booking-pending", {
    name: "<script>alert(1)</script>",
  });
  assert(template.html.includes("&lt;script&gt;"));
  assert(template.plain.includes("not a confirmed booking"));
});
test("Telegram verifies webhook and authorised chat/user, deduplicates updates, routes only matched reply", async () => {
  process.env.TELEGRAM_BOT_TOKEN = "fictional-offline-test-token";
  process.env.TELEGRAM_CHAT_ID = "-10001";
  process.env.TELEGRAM_USER_IDS = "123";
  process.env.TELEGRAM_WEBHOOK_SECRET = "fictional-test-secret";
  const conv1 = randomUUID(),
    conv2 = randomUUID();
  for (const id of [conv1, conv2])
    await db.query(
      "INSERT INTO conversations(id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 day')",
      [id, hash(id)],
    );
  await db.query(
    "INSERT INTO chat_messages(id,conversation_id,sender,body,state,telegram_message_id) VALUES($1,$2,'visitor','Fixture','sent',99)",
    [randomUUID(), conv1],
  );
  const req = new Request("http://local", {
    headers: { "x-telegram-bot-api-secret-token": "fictional-test-secret" },
  });
  const update = {
    update_id: 1,
    message: {
      chat: { id: -10001 },
      from: { id: 123 },
      text: "Hello from the studio",
      reply_to_message: { message_id: 99 },
    },
  };
  await assert.rejects(
    receiveTelegram(new Request("http://local"), update),
    /Forbidden/,
  );
  await assert.rejects(
    receiveTelegram(req, {
      ...update,
      message: { ...update.message, from: { id: 456 } },
    }),
    /Forbidden/,
  );
  await receiveTelegram(req, update);
  await receiveTelegram(req, update);
  assert.equal(
    (
      await db.query(
        "SELECT count(*) FROM chat_messages WHERE conversation_id=$1 AND sender='team'",
        [conv1],
      )
    ).rows[0].count,
    "1",
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*) FROM chat_messages WHERE conversation_id=$1 AND sender='team'",
        [conv2],
      )
    ).rows[0].count,
    "0",
  );
  const unrelated = await getConversation(new Request("http://local"));
  assert(!unrelated.conversation);
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  delete process.env.TELEGRAM_USER_IDS;
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
  assert.equal(chatHealth(), "Not configured");
  assert.equal(emailHealth(), "Local preview inbox");
});
test("CSRF rejects foreign origins and public signup is unavailable", async () => {
  const req = new NextRequest("http://127.0.0.1:3000/api/booking", {
    method: "POST",
    headers: { origin: "https://evil.example" },
    body: "{}",
  });
  const response = await POST(req, context("booking"));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "Invalid request origin");
  await assert.rejects(
    auth.api.signUpEmail({
      body: {
        name: "Not allowed",
        email: "rogue@example.invalid",
        password: "Fictional-test-password-2026",
      },
    }),
  );
});
test("quota validation prevents partial gallery records when capacity is exhausted", async () => {
  await db.query("UPDATE storage SET allowance=1 WHERE id=1");
  const file = new File(
    [
      new Uint8Array(
        await sharp({
          create: { width: 10, height: 10, channels: 3, background: "#000" },
        })
          .jpeg()
          .toBuffer(),
      ),
    ],
    "fixture.jpg",
    { type: "image/jpeg" },
  );
  const before = (await db.query("SELECT count(*) FROM assets")).rows[0].count;
  await assert.rejects(
    uploadImage(file, "public", null, "Fixture", actor),
    /allowance/,
  );
  assert.equal(
    (await db.query("SELECT count(*) FROM assets")).rows[0].count,
    before,
  );
});

test("content supports one primary member, additional members and flexible package counts", () => {
  assert.equal(
    contentSchema.safeParse({ ...demoContent, team: [] }).success,
    false,
  );
  assert.equal(
    contentSchema.parse({ ...demoContent, team: [demoContent.team[0]] }).team
      .length,
    1,
  );
  assert.equal(
    contentSchema.parse({
      ...demoContent,
      team: [...demoContent.team, ...demoContent.team],
    }).team.length,
    4,
  );
  const packages = Array.from({ length: 101 }, (_, n) => ({
    ...demoContent.packages[0],
    id: randomUUID(),
    name: "Fixture package " + n,
  }));
  assert.equal(
    contentSchema.parse({ ...demoContent, packages }).packages.length,
    101,
  );
});

test("package prices display exact pounds and pence", () => {
  assert.equal(money(32150), "£321.50");
  assert.equal(money(35000), "£350");
});

test("booking emails show UK session time, exact deposit and safe customer details", () => {
  const payload = { name: "<script>Alex</script>", package: "Together Chapters", price: 17500, duration: 90, start: "2026-10-24T13:00:00Z", location: "Park & gardens" };
  const pending = emailTemplate("booking-pending", payload, "Cinematic Chapters", "studio@example.invalid");
  const confirmed = emailTemplate("booking-confirmed", payload, "Cinematic Chapters", "studio@example.invalid");
  assert(pending.plain.includes("not a confirmed booking"));
  assert(confirmed.plain.includes("request has been approved"));
  assert(confirmed.plain.includes("does not confirm receipt of payment"));
  assert(confirmed.plain.includes("£43.75"));
  assert(confirmed.plain.includes("£131.25"));
  assert(confirmed.plain.includes("14:00"));
  assert(confirmed.html.includes("&lt;script&gt;Alex&lt;/script&gt;"));
  assert(confirmed.html.includes("Park &amp; gardens"));
  assert(!confirmed.html.includes("<script>"));
  assert(confirmed.html.includes(">Reply</a>"));
  assert(!confirmed.html.includes("Amila"));
  assert(!confirmed.plain.includes("Tanush"));
  const legacy = emailTemplate("booking-confirmed", { name: "Alex" });
  assert(!legacy.plain.includes("NaN"));
  assert(!legacy.plain.includes("Invalid DateTime"));
});

test("sale settings and original prices remain draft until publication", async () => {
  const previous = await getContent("draft");
  const published = await getContent();
  const edited = {
    ...previous,
    sale: { enabled: !published.sale.enabled, bannerText: "Test package offer" },
    packages: previous.packages.map(p => ({ ...p, originalPrice: p.price + 3500 })),
  };
  await saveDraft(edited, actor);
  assert.deepEqual((await getContent("draft")).sale, edited.sale);
  assert.deepEqual((await getContent()).sale, published.sale);
  await publish(actor);
  assert.deepEqual((await getContent()).sale, edited.sale);
  assert.equal((await getContent()).packages[0].originalPrice, edited.packages[0].originalPrice);
  await saveDraft(published, actor);
  await publish(actor);
  await saveDraft(previous, actor);
});
