import "./env";
import { db, transaction } from "../lib/db";
import { demoContent } from "../lib/content";
import { putObject } from "../lib/storage";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
if (process.env.NODE_ENV === "production")
  throw new Error("Development seed is forbidden in production");
if ((await db.query("SELECT 1 FROM website_versions")).rowCount) {
  console.log("Seed already present; existing content preserved");
  await db.end();
  process.exit(0);
}
const photos = [
  [
    "photo-1519741497674-611481863552",
    "Wedding couple beneath a flowering arch",
  ],
  [
    "photo-1511285560929-80b456fea0bc",
    "A couple celebrating their wedding day",
  ],
  ["photo-1523438885200-e635ba2c371e", "Soft wedding details in natural light"],
  ["photo-1511795409834-ef04bbd61622", "Warmly lit celebration table"],
  ["photo-1515886657613-9f3515b0c78f", "Outdoor fashion portrait"],
  [
    "photo-1508214751196-bcfd4ca60f91",
    "Placeholder portrait of photographer one",
  ],
  [
    "photo-1500648767791-00dcc994a43e",
    "Placeholder portrait of photographer two",
  ],
];
const placements = [];
for (const [photo, alt] of photos) {
  const response = await fetch(
    `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1800&q=85`,
  );
  if (!response.ok) throw new Error("Sample photograph fetch failed");
  const input = Buffer.from(await response.arrayBuffer());
  const id = randomUUID(),
    key = `public/${id}.jpg`,
    previewKey = `public/${id}_preview.webp`;
  const original = await sharp(input).rotate().jpeg({ quality: 85 }).toBuffer();
  const preview = await sharp(input)
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const meta = await sharp(original).metadata();
  await putObject(key, original, "image/jpeg");
  await putObject(previewKey, preview, "image/webp");
  await db.query(
    "INSERT INTO assets(id,scope,key,preview_key,filename,mime,bytes,preview_bytes,width,height,alt,status) VALUES($1,'public',$2,$3,$4,'image/jpeg',$5,$6,$7,$8,$9,'ready')",
    [
      id,
      key,
      previewKey,
      photo + ".jpg",
      original.length,
      preview.length,
      meta.width,
      meta.height,
      alt,
    ],
  );
  placements.push({ id, alt, desktop: 50, mobile: 50 });
}
demoContent.hero = placements.slice(0, 2);
demoContent.wall = placements.slice(0, 5);
demoContent.team[0].portrait = placements[5];
demoContent.team[1].portrait = placements[6];
await transaction(async (c) => {
  for (const state of ["draft", "published"])
    await c.query("INSERT INTO website_versions(state,content) VALUES($1,$2)", [
      state,
      JSON.stringify(demoContent),
    ]);
  for (const p of demoContent.packages)
    await c.query("INSERT INTO packages(id,data) VALUES($1,$2)", [
      p.id,
      JSON.stringify(p),
    ]);
  await c.query("INSERT INTO resource(id,settings) VALUES(1,$1)", [
    JSON.stringify({
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
      noticeHours: 24,
      horizonDays: 180,
      pendingHours: 48,
    }),
  ]);
  await c.query("INSERT INTO storage(id,allowance) VALUES(1,$1)", [
    Number(process.env.STORAGE_ALLOWANCE_BYTES || 10737418240),
  ]);
});
console.log(
  "Fictional demo content seeded. Full Day = 480 minutes. Prices and policies need business review.",
);
await db.end();
