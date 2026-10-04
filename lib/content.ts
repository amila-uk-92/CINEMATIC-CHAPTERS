import { z } from "zod";
import { db, transaction, audit, lock } from "./db";
const text = z.string().trim().max(4000);
const uuid = z.string().uuid();
export const packageSchema = z.object({
  id: uuid,
  name: text.min(1).max(80),
  price: z.number().int().min(0).max(10000000),
  duration: z.number().int().min(30).max(1440),
  description: text,
  inclusions: z.array(text).max(20),
  allowance: z.number().int().min(0),
  delivery: text,
  visible: z.boolean(),
  accepting: z.boolean(),
  archived: z.boolean(),
  image: uuid.nullable().optional(),
});
const placement = z.object({
  id: uuid,
  alt: text.min(1),
  desktop: z.number().min(0).max(100).default(50),
  mobile: z.number().min(0).max(100).default(50),
});
export const copyDefaults = {
  heroEyebrow: "TWO PERSPECTIVES. ONE STORY.",
  teamTitle: "TWO PEOPLE.\nONE SHARED VISION.",
  galleryTitle: "LIFE, IN ITS\nMOST HONEST LIGHT.",
  galleryDescription:
    "A glance. A gathering. A feeling.\nThe frames that let you live it again.",
  packagesTitle: "YOUR MOMENTS.\nYOUR CHAPTER.",
  packagesDescription: "Choose the time. We’ll take care of the frames.",
  reviewsTitle: "AFTER THE\nLAST FRAME.",
  contactTitle: "YOUR NEXT\nCHAPTER\nSTARTS HERE.",
  contactDescription: "Tell us about the moments that matter to you.",
  footerTagline: "PHOTOGRAPHY FOR THE MOMENTS THAT MATTER.",
};
export const contentSchema = z.object({
  demo: z.boolean().default(true),
  copy: z
    .object(
      Object.fromEntries(
        Object.entries(copyDefaults).map(([key, value]) => [
          key,
          text.default(value),
        ]),
      ) as Record<keyof typeof copyDefaults, z.ZodDefault<typeof text>>,
    )
    .default(copyDefaults),
  brand: text.min(1).max(80),
  logo: text.max(8),
  headline: text.min(1),
  description: text,
  teamQuote: text,
  team: z
    .array(
      z.object({
        name: text,
        role: text,
        sample: z.boolean().default(true),
        portrait: placement.nullable(),
      }),
    )
    .length(2),
  hero: z.array(placement).max(10),
  wall: z.array(placement).max(40),
  packagesVisible: z.boolean(),
  packages: z.array(packageSchema).max(20),
  reviewsVisible: z.boolean(),
  reviews: z
    .array(z.object({ quote: text, name: text, sample: z.boolean() }))
    .max(30),
  faqs: z.array(z.object({ question: text, answer: text })).max(30),
  email: z.email(),
  phone: text,
  address: text,
  socials: z
    .array(
      z.object({
        label: text,
        url: z.url().refine((v) => v.startsWith("https://"), "Use HTTPS links"),
      }),
    )
    .max(10),
  deliveryCopy: text,
});
export type Content = z.infer<typeof contentSchema>;
export const demoContent: Content = {
  demo: true,
  copy: copyDefaults,
  brand: "Cinematic Chapters",
  logo: "CC",
  headline: "MOMENTS\nBECOME\nCHAPTERS",
  description:
    "Cinematic photography for the moments that matter.\nBased in Leicester. Creating stories across the surrounding area.",
  teamQuote: "Different perspectives.\nThe same love for real moments.",
  team: [
    {
      name: "Photographer One",
      role: "PHOTOGRAPHER · STORYTELLER",
      sample: true,
      portrait: null,
    },
    {
      name: "Photographer Two",
      role: "PHOTOGRAPHER · STORYTELLER",
      sample: true,
      portrait: null,
    },
  ],
  hero: [],
  wall: [],
  packagesVisible: true,
  packages: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "2 Hours",
      price: 35000,
      duration: 120,
      description: "A little time. A lasting chapter.",
      inclusions: [
        "Two photographers, one shared vision",
        "A private online gallery",
        "Full-resolution photo collection",
      ],
      allowance: 40,
      delivery: "Delivery estimate to be agreed",
      visible: true,
      accepting: true,
      archived: false,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "4 Hours",
      price: 60000,
      duration: 240,
      description: "Space for the story to unfold.",
      inclusions: [
        "Two photographers, one shared vision",
        "A private online gallery",
        "Full-resolution photo collection",
      ],
      allowance: 80,
      delivery: "Delivery estimate to be agreed",
      visible: true,
      accepting: true,
      archived: false,
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Full Day",
      price: 120000,
      duration: 480,
      description: "From the first feeling to the final frame.",
      inclusions: [
        "Two photographers, one shared vision",
        "A private online gallery",
        "Full-resolution photo collection",
      ],
      allowance: 160,
      delivery: "Delivery estimate to be agreed",
      visible: true,
      accepting: true,
      archived: false,
    },
  ],
  reviewsVisible: true,
  reviews: [
    {
      quote: "The little moments are the ones we come back to.",
      name: "Sample review · fictional",
      sample: true,
    },
    {
      quote: "A chapter worth keeping, frame by frame.",
      name: "Sample review · fictional",
      sample: true,
    },
  ],
  faqs: [
    {
      question: "How does booking work?",
      answer:
        "Choose a duration and request a time. Your request is pending until the studio confirms it.",
    },
    {
      question: "Where do you photograph?",
      answer:
        "Based in Leicester and working across the surrounding area. Travel arrangements are agreed with the studio.",
    },
    {
      question: "How will we receive our photos?",
      answer:
        "Through a private client gallery with one download for the complete collection. Delivery timing is agreed with the studio.",
    },
  ],
  email: "studio@example.invalid",
  phone: "Contact details to be added",
  address: "Leicester & the surrounding area",
  socials: [],
  deliveryCopy:
    "Your chapter, ready to keep. Sign in to your private gallery and download your complete collection.",
};
export async function getContent(state = "published"): Promise<Content> {
  const r = await db.query(
    "SELECT content FROM website_versions WHERE state=$1",
    [state],
  );
  if (!r.rowCount)
    throw new Error("Database needs demo seed or published content");
  return contentSchema.parse(r.rows[0].content);
}
export function assetIds(content: Content) {
  return [
    ...content.hero,
    ...content.wall,
    ...content.team.flatMap((t) => (t.portrait ? [t.portrait] : [])),
    ...content.packages.flatMap((p) => (p.image ? [{ id: p.image }] : [])),
  ].map((p) => p.id);
}
export async function saveDraft(raw: unknown, actor: string) {
  const content = contentSchema.parse(raw);
  await transaction(async (c) => {
    await lock(c, 101);
    await c.query(
      "UPDATE website_versions SET content=$1,created_at=now() WHERE state='draft'",
      [JSON.stringify(content)],
    );
    await audit(c, actor, "content.draft");
  });
  return content;
}
export async function publish(actor: string) {
  return transaction(async (c) => {
    await lock(c, 101);
    const draft = contentSchema.parse(
      (
        await c.query(
          "SELECT content FROM website_versions WHERE state='draft' FOR UPDATE",
        )
      ).rows[0].content,
    );
    const ids = assetIds(draft);
    if (
      ids.length &&
      (
        await c.query(
          "SELECT id FROM assets WHERE id=ANY($1::uuid[]) AND scope='public' AND status='ready'",
          [ids],
        )
      ).rowCount !== new Set(ids).size
    )
      throw new Error("One or more assets are not ready");
    await c.query(
      "UPDATE website_versions SET content=$1,created_at=now() WHERE state='published'",
      [JSON.stringify(draft)],
    );
    await c.query(
      "UPDATE packages SET archived=true,accepting=false,visible=false",
    );
    for (const p of draft.packages)
      await c.query(
        "INSERT INTO packages(id,data,visible,accepting,archived) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET data=excluded.data,visible=excluded.visible,accepting=excluded.accepting,archived=excluded.archived",
        [p.id, JSON.stringify(p), p.visible, p.accepting, p.archived],
      );
    await audit(c, actor, "content.publish");
    return draft;
  });
}
