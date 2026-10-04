import Shell from "@/components/Shell";
import { notFound } from "next/navigation";
const policies: Record<
  string,
  { title: string; sections: [string, string][] }
> = {
  privacy: {
    title: "PRIVACY & RETENTION",
    sections: [
      [
        "Draft notice",
        "Business/legal review required before launch. Replace the contact identity, lawful bases, retention periods, processors, and rights-handling details with approved business information. This draft is not a certification of legal compliance.",
      ],
      [
        "Information collected",
        "Booking requests collect contact details and a session message. Client galleries hold photographs and access records. Website chat stores messages and forwards them to the authorised studio Telegram chat only when configured.",
      ],
      [
        "Access and cookies",
        "Essential HTTP-only session cookies support studio login, client access and private chat. No analytics or nonessential tracking is enabled. Private gallery access is checked on the server.",
      ],
      [
        "Retention and deletion",
        "Gallery expiry is configurable. Expired galleries lose access immediately and are queued for file cleanup. Database audit and booking retention periods need business approval. Backup retention is separate; deleting active files does not erase retained backups.",
      ],
      [
        "Your requests",
        "The business contact and procedure for access, correction, deletion and complaints must be added before launch. Do not upload sensitive customer material until those decisions are approved.",
      ],
    ],
  },
  terms: {
    title: "SESSION & GALLERY TERMS",
    sections: [
      [
        "Draft policy",
        "Business/legal review required. Demo prices, edited-photo allowances and delivery wording are unverified and must be approved or replaced.",
      ],
      [
        "Booking requests",
        "A request is pending approval and is not confirmed until the studio confirms it. Pending requests reserve time temporarily. The expiry duration is configurable. No payment or deposit is collected by this application.",
      ],
      [
        "Cancellation and rescheduling",
        "Business cancellation terms, notice requirements, travel costs and rescheduling policy must be agreed before launch. Administrative cancellation and rescheduling actions send status notifications.",
      ],
      [
        "Photograph usage",
        "Copyright ownership, client usage licence, sharing permission and model releases must be reviewed and added by the business. Sample portfolio photographs are development placeholders.",
      ],
      [
        "Private gallery access",
        "Access is personal, may expire, and can be revoked. Complete ZIP downloads are provided. Already downloaded files cannot be revoked. Backup retention and any extension requests must be agreed with the studio.",
      ],
    ],
  },
};
export default async function Policy({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const p = policies[name];
  if (!p) notFound();
  return (
    <Shell title="DRAFT BUSINESS POLICY">
      <article id="main" className="workspace policy">
        <p className="eyebrow">DRAFT · BUSINESS AND LEGAL REVIEW REQUIRED</p>
        <h1>{p.title}</h1>
        {p.sections.map(([title, body]) => (
          <section key={title}>
            <h2>{title.toUpperCase()}</h2>
            <p>{body}</p>
          </section>
        ))}
      </article>
    </Shell>
  );
}
