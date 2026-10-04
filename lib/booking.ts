import { DateTime } from "luxon";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db, transaction, lock, audit, SQL } from "./db";
import { hash } from "./http";
import { enqueueEmail } from "./email";
export const zone = "Europe/London";
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const window = z
  .tuple([time, time])
  .refine((v) => v[0] < v[1], "Closing time must follow opening time");
export const settingsSchema = z.object({
  weekly: z.record(z.string().regex(/^[1-7]$/), window.nullable()),
  overrides: z.record(
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    window.nullable(),
  ),
  blocks: z
    .array(
      z
        .object({
          start: z.iso.datetime({ offset: true }),
          end: z.iso.datetime({ offset: true }),
          label: z.string().max(80),
        })
        .refine((b) => Date.parse(b.end) > Date.parse(b.start)),
    )
    .max(500),
  buffer: z.number().int().min(0).max(180),
  noticeHours: z.number().int().min(0).max(720),
  horizonDays: z.number().int().min(1).max(730),
  pendingHours: z.number().int().min(1).max(168),
});
export type Settings = z.infer<typeof settingsSchema>;
export type Slot = { start: string; end: string; label: string };
export async function expirePending(c: SQL = db) {
  await c.query(
    "UPDATE bookings SET state='expired' WHERE state='pending' AND expires_at<=now()",
  );
}
export function generateSlots(
  date: string,
  duration: number,
  settings: Settings,
  reservations: { start: string; end: string }[],
  now: DateTime = DateTime.now(),
): Slot[] {
  const day = DateTime.fromISO(date, { zone });
  if (!day.isValid || date !== day.toISODate()) return [];
  if (
    day.startOf("day") >
    now.setZone(zone).plus({ days: settings.horizonDays }).endOf("day")
  )
    return [];
  const hours = Object.hasOwn(settings.overrides, date)
    ? settings.overrides[date]
    : settings.weekly[String(day.weekday)];
  if (!hours) return [];
  const open = DateTime.fromISO(`${date}T${hours[0]}`, { zone }),
    close = DateTime.fromISO(`${date}T${hours[1]}`, { zone });
  if (
    open.toFormat("HH:mm") !== hours[0] ||
    close.toFormat("HH:mm") !== hours[1]
  )
    return [];
  const conflicts = [...reservations, ...settings.blocks];
  const slots: Slot[] = [];
  // Increment real UTC instants: repeated autumn hour stays distinct; nonexistent spring times never appear.
  for (
    let start = open.plus({ minutes: settings.buffer });
    start.plus({ minutes: duration + settings.buffer }) <= close;
    start = start.plus({ minutes: 30 })
  ) {
    const end = start.plus({ minutes: duration }),
      a = start.minus({ minutes: settings.buffer }).toMillis(),
      b = end.plus({ minutes: settings.buffer }).toMillis();
    if (start < now.plus({ hours: settings.noticeHours })) continue;
    if (conflicts.some((r) => a < Date.parse(r.end) && b > Date.parse(r.start)))
      continue;
    slots.push({
      start: start.toUTC().toISO()!,
      end: end.toUTC().toISO()!,
      label: start.toFormat("HH:mm") + " " + (start.isInDST ? "BST" : "GMT"),
    });
  }
  return slots;
}
async function slotData(c: SQL, date: string, pkgId: string) {
  const s = settingsSchema.parse(
    (await c.query("SELECT settings FROM resource WHERE id=1")).rows[0]
      .settings,
  );
  const p = (
    await c.query(
      "SELECT * FROM packages WHERE id=$1 AND visible AND accepting AND NOT archived",
      [pkgId],
    )
  ).rows[0];
  if (!p) throw new Error("Package is not accepting requests");
  const startDay = DateTime.fromISO(date, { zone }).startOf("day").toISO()!;
  const endDay = DateTime.fromISO(date, { zone })
    .plus({ days: 1 })
    .startOf("day")
    .toISO()!;
  const r = (
    await c.query(
      "SELECT json_extract(reserved, '$[0]') AS start, json_extract(reserved, '$[1]') AS end FROM bookings WHERE state IN ('pending','confirmed') AND json_extract(reserved, '$[0]') < $1 AND json_extract(reserved, '$[1]') > $2",
      [endDay, startDay],
    )
  ).rows.map((r) => ({
    start: new Date(r.start).toISOString(),
    end: new Date(r.end).toISOString(),
  }));
  return {
    settings: s,
    pkg: p.data,
    slots: generateSlots(date, p.data.duration, s, r),
  };
}
export async function availability(date: string, pkgId: string) {
  return transaction(async (c) => {
    await lock(c, 103);
    await expirePending(c);
    const data = await slotData(c, date, pkgId);
    const day = DateTime.fromISO(date, { zone });
    const hours = Object.hasOwn(data.settings.overrides, date)
      ? data.settings.overrides[date]
      : data.settings.weekly[String(day.weekday)];
    const ideal = generateSlots(
      date,
      data.pkg.duration,
      { ...data.settings, blocks: [] },
      [],
    );
    return {
      slots: data.slots,
      status: !hours
        ? "blocked"
        : !data.slots.length
          ? "fully-booked"
          : data.slots.length < ideal.length
            ? "partially-available"
            : "available",
    };
  });
}
export const bookingSchema = z.object({
  packageId: z.string().uuid(),
  start: z.iso.datetime({ offset: true }),
  name: z.string().trim().min(2).max(100),
  email: z
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  phone: z.string().trim().min(5).max(40),
  message: z.string().trim().max(2000),
  idempotencyKey: z.string().uuid(),
});
export async function requestBooking(raw: unknown) {
  const b = bookingSchema.parse(raw),
    fingerprint = hash(JSON.stringify({ ...b, idempotencyKey: undefined }));
  return transaction(async (c) => {
    await lock(c, 103);
    await expirePending(c);
    const prior = (
      await c.query("SELECT * FROM bookings WHERE idempotency_key=$1", [
        b.idempotencyKey,
      ])
    ).rows[0];
    if (prior) {
      if (prior.request_hash !== fingerprint)
        throw new Error("Retry key belongs to a different request");
      return { id: prior.id, state: prior.state };
    }
    const published = (
      await c.query(
        "SELECT content FROM website_versions WHERE state='published'",
      )
    ).rows[0].content;
    if (!published.packagesVisible)
      throw new Error(
        "Online package booking is currently hidden; please enquire",
      );
    const local = DateTime.fromISO(b.start).setZone(zone);
    const data = await slotData(c, local.toISODate()!, b.packageId);
    const slot = data.slots.find(
      (s) => Date.parse(s.start) === Date.parse(b.start),
    );
    if (!slot)
      throw new Error(
        "That time is no longer available. Please choose another slot",
      );
    const id = randomUUID(),
      before = DateTime.fromISO(slot.start)
        .minus({ minutes: data.settings.buffer })
        .toISO(),
      after = DateTime.fromISO(slot.end)
        .plus({ minutes: data.settings.buffer })
        .toISO();
    await c.query(
      `INSERT INTO bookings(id,package_id,snapshot,name,email,phone,message,starts_at,ends_at,reserved,state,expires_at,idempotency_key,request_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,json_array($10,$11),'pending',strftime('%Y-%m-%dT%H:%M:%fZ','now','+' || $12 || ' hours'),$13,$14)`,
      [
        id,
        b.packageId,
        JSON.stringify(data.pkg),
        b.name,
        b.email,
        b.phone,
        b.message,
        slot.start,
        slot.end,
        before,
        after,
        data.settings.pendingHours,
        b.idempotencyKey,
        fingerprint,
      ],
    );
    await enqueueEmail(c, `booking:${id}:pending`, b.email, "booking-pending", {
      name: b.name,
      package: data.pkg.name,
      start: slot.start,
    });
    return { id, state: "pending" };
  });
}
export async function updateBooking(
  id: string,
  action: string,
  start: string | undefined,
  actor: string,
) {
  return transaction(async (c) => {
    await lock(c, 103);
    await expirePending(c);
    const b = (
      await c.query("SELECT * FROM bookings WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (!b) throw new Error("Booking not found");
    if (action === "reschedule") {
      if (!["pending", "confirmed"].includes(b.state) || !start)
        throw new Error("Only active bookings can be rescheduled");
      const settings = settingsSchema.parse(
        (await c.query("SELECT settings FROM resource WHERE id=1")).rows[0]
          .settings,
      );
      const r = (
        await c.query(
          "SELECT json_extract(reserved, '$[0]') AS start, json_extract(reserved, '$[1]') AS end FROM bookings WHERE id<>$1 AND state IN ('pending','confirmed')",
          [id],
        )
      ).rows.map((r) => ({
        start: new Date(r.start).toISOString(),
        end: new Date(r.end).toISOString(),
      }));
      const day = DateTime.fromISO(start).setZone(zone).toISODate();
      const slot =
        day &&
        generateSlots(day, b.snapshot.duration, settings, r).find(
          (s) => Date.parse(s.start) === Date.parse(start),
        );
      if (!slot)
        throw new Error("Reschedule conflicts with availability or buffers");
      await c.query(
        "UPDATE bookings SET starts_at=$2,ends_at=$3,reserved=json_array($4,$5) WHERE id=$1",
        [
          id,
          slot.start,
          slot.end,
          DateTime.fromISO(slot.start)
            .minus({ minutes: settings.buffer })
            .toISO(),
          DateTime.fromISO(slot.end).plus({ minutes: settings.buffer }).toISO(),
        ],
      );
      await enqueueEmail(
        c,
        `booking:${id}:reschedule:${randomUUID()}`,
        b.email,
        "booking-rescheduled",
        { name: b.name, package: b.snapshot.name, start: slot.start },
      );
    } else {
      const state = (
        {
          approve: "confirmed",
          decline: "declined",
          cancel: "cancelled",
        } as Record<string, string>
      )[action];
      if (!state) throw new Error("Unknown booking action");
      if (action === "approve" && b.state !== "pending")
        throw new Error("Only pending requests can be approved");
      if (!["pending", "confirmed"].includes(b.state))
        throw new Error("Booking is no longer active");
      // Existing reservation is retained on approval. The exclusion constraint is still enforced.
      await c.query("UPDATE bookings SET state=$2 WHERE id=$1", [id, state]);
      await enqueueEmail(
        c,
        `booking:${id}:${state}`,
        b.email,
        `booking-${state}`,
        {
          name: b.name,
          package: b.snapshot.name,
          start: new Date(b.starts_at).toISOString(),
        },
      );
    }
    await audit(c, actor, "booking." + action, id);
    return { ok: true };
  });
}
export async function updateSettings(raw: unknown, actor: string) {
  const s = settingsSchema.parse(raw);
  return transaction(async (c) => {
    await lock(c, 103);
    await expirePending(c);
    const active = (
      await c.query(
        "SELECT id,starts_at,ends_at,snapshot FROM bookings WHERE state IN ('pending','confirmed')",
      )
    ).rows;
    const conflicts = active.filter((b) => {
      const start = DateTime.fromISO(new Date(b.starts_at).toISOString(), { zone }),
        end = DateTime.fromISO(new Date(b.ends_at).toISOString(), { zone }),
        date = start.toISODate()!;
      const hours = Object.hasOwn(s.overrides, date)
        ? s.overrides[date]
        : s.weekly[String(start.weekday)];
      if (!hours) return true;
      const a = start.minus({ minutes: s.buffer }),
        z = end.plus({ minutes: s.buffer });
      return (
        a < DateTime.fromISO(date + "T" + hours[0], { zone }) ||
        z > DateTime.fromISO(date + "T" + hours[1], { zone }) ||
        s.blocks.some(
          (r) =>
            a.toMillis() < Date.parse(r.end) &&
            z.toMillis() > Date.parse(r.start),
        )
      );
    });
    if (conflicts.length)
      throw new Error(
        `Settings conflict with ${conflicts.length} active reservation(s): ${conflicts.map((b) => b.id.slice(0, 8)).join(", ")}`,
      );
    // Recalculate protected ranges under the same lock; SQL exclusion rejects newly overlapping buffers.
    await c.query(
      "UPDATE bookings SET reserved=json_array(strftime('%Y-%m-%dT%H:%M:%fZ', starts_at, '-' || $1 || ' minutes'), strftime('%Y-%m-%dT%H:%M:%fZ', ends_at, '+' || $1 || ' minutes')) WHERE state IN ('pending','confirmed')",
      [s.buffer],
    );
    await c.query("UPDATE resource SET settings=$1 WHERE id=1", [
      JSON.stringify(s),
    ]);
    await audit(c, actor, "availability.update");
    return s;
  });
}
