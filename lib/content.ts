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
  teamTitle: "OUR TEAM.\nONE SHARED VISION.",
  galleryTitle: "MOMENTS BECOME\nCHAPTERS.",
  galleryDescription:
    "Relaxed, natural photography with gentle posing guidance and cinematic storytelling.\nCapturing the frames that let you live it again.",
  packagesTitle: "CHOOSE YOUR\nCHAPTER.",
  packagesDescription:
    "All packages include one photographer. A second photographer, prints, props, venue fees and other extras are quoted separately.",
  reviewsTitle: "AFTER THE\nLAST FRAME.",
  contactTitle: "YOUR NEXT\nCHAPTER\nSTARTS HERE.",
  contactDescription:
    "Providing your preferred date, location and package when enquiring helps us plan your session seamlessly.",
  footerTagline: "TWO PERSPECTIVES. ONE STORY. · MOMENTS BECOME CHAPTERS.",
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
    .min(1),
  hero: z.array(placement).max(30),
  wall: z.array(placement).max(100),
  packagesVisible: z.boolean(),
  packages: z.array(packageSchema),
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
  banner: z
    .object({
      split: z.number().min(10).max(80).default(38),
      positionX: z.number().min(0).max(100).default(50),
      positionY: z.number().min(0).max(100).default(50),
      zoom: z.number().min(100).max(250).default(100),
    })
    .default({
      split: 38,
      positionX: 50,
      positionY: 50,
      zoom: 100,
    }),
});
export type Content = z.infer<typeof contentSchema>;
export const demoContent: Content = {
  demo: true,
  copy: copyDefaults,
  banner: {
    split: 38,
    positionX: 50,
    positionY: 50,
    zoom: 100,
  },
  brand: "Cinematic Chapters",
  logo: "CC",
  headline: "MOMENTS\nBECOME\nCHAPTERS",
  description:
    "Cinematic photography based in Leicester, UK. We capture couples, portraits, birthdays, small events, baby milestones and family moments.",
  teamQuote:
    "Two perspectives. One story.\nRelaxed, natural photography with gentle posing guidance and cinematic storytelling.",
  team: [
    {
      name: "Amila Ukwattage",
      role: "PHOTOGRAPHER · CO-FOUNDER",
      sample: false,
      portrait: null,
    },
    {
      name: "Tanush Lokuge",
      role: "PHOTOGRAPHER · CO-FOUNDER",
      sample: false,
      portrait: null,
    },
  ],
  hero: [],
  wall: [],
  packagesVisible: true,
  packages: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Little Chapters",
      price: 12500,
      duration: 60,
      description: "Baby milestones and family photography.",
      inclusions: [
        "Up to 1 hour at one agreed location",
        "One photographer",
        "15 professionally edited digital images",
        "Private online gallery",
        "High-resolution downloads",
      ],
      allowance: 15,
      delivery: "Delivered within 14 days through a private online gallery",
      visible: true,
      accepting: true,
      archived: false,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Together Chapters",
      price: 17500,
      duration: 90,
      description: "Couples and individual portraits.",
      inclusions: [
        "Up to 90 minutes at one agreed location",
        "One photographer",
        "Gentle posing guidance",
        "25 professionally edited digital images",
        "Private online gallery",
        "High-resolution downloads",
      ],
      allowance: 25,
      delivery: "Delivered within 14 days through a private online gallery",
      visible: true,
      accepting: true,
      archived: false,
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Celebration Chapters",
      price: 32500,
      duration: 180,
      description: "Birthdays and small events.",
      inclusions: [
        "Up to 3 hours of photography",
        "One photographer",
        "Candid moments, celebration details & group portraits",
        "At least 50 professionally edited digital images",
        "Private online gallery",
        "High-resolution downloads",
      ],
      allowance: 50,
      delivery: "Delivered within 14 days through a private online gallery",
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
      question: "How do we book a session?",
      answer:
        "Please provide your preferred date, location and package when enquiring. A 25% deposit secures your date and is deducted from the total balance, with the remaining balance due on the session day.",
    },
    {
      question: "What is your travel policy?",
      answer:
        "Travel within Leicester is included in all packages. Travel outside Leicester is quoted clearly before booking.",
    },
    {
      question: "What happens if there is unsuitable weather for an outdoor shoot?",
      answer:
        "If unsuitable weather prevents an outdoor shoot, it will be rescheduled at no extra charge, with a new date agreed with you.",
    },
    {
      question: "How and when will we receive our photographs?",
      answer:
        "Your professionally edited photographs are delivered within 14 days through a private online gallery with full-resolution downloads.",
    },
    {
      question: "Are a second photographer or extras available?",
      answer:
        "All packages include one photographer. A second photographer, prints, props, venue fees and other extras are quoted separately upon request.",
    },
  ],
  email: "cinematic.chapters.uk@gmail.com",
  phone: "07492 897053",
  address: "Leicester, UK",
  socials: [
    {
      label: "Facebook",
      url: "https://facebook.com",
    },
  ],
  deliveryCopy:
    "Your chapter, ready to keep. Sign in to your private online gallery to view and download your high-resolution images.",
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
