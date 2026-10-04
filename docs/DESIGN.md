# Design and provenance

The supplied attachment contains a specification but no latest mockup image. This implementation follows its written warm charcoal/champagne palette, condensed headline direction, circular team portraits, three moving photo rows, duration packages and optical section rail. Exact screenshot comparison is therefore **unverified**.

Headings/navigation/buttons use **Barlow Condensed**, regular and bold, downloaded from the Google Fonts source repository and hosted locally. Licence: SIL Open Font License 1.1, included at `public/fonts/OFL.txt`. This is an approximation chosen for the described visual direction; no claim is made about the screenshot's exact font. Body and admin data use a readable system Arial/Helvetica stack. Email uses Arial Narrow/Impact fallback, without remote font loading.

Font source: https://github.com/google/fonts/tree/main/ofl/barlowcondensed

Seed photography comes from Unsplash's image CDN. It is development sample material, not the studio's own work or actual team identities. The relevant pages and Unsplash licence should be reviewed before any production use. Seed image IDs:

- photo-1519741497674-611481863552
- photo-1511285560929-80b456fea0bc
- photo-1523438885200-e635ba2c371e
- photo-1511795409834-ef04bbd61622
- photo-1515886657613-9f3515b0c78f
- photo-1508214751196-bcfd4ca60f91
- photo-1500648767791-00dcc994a43e

Sample reviews, prices and identities are visibly labelled. The portraits are circular sample photos with restrained colour grading, not a claim of finished black-background, side-lit portraits. Replace them with approved studio photographs.

Reduced motion freezes photographic zoom and photo rows while retaining section information. Mobile duration tabs have arrow-key selection. The mobile focus strip reserves viewport space so it does not overlay page text or controls.

Official references consulted when selecting current dependencies:

- Next.js installation: https://nextjs.org/docs/app/getting-started/installation
- Better Auth PostgreSQL adapter: https://better-auth.com/docs/adapters/postgresql
- Better Auth configuration/security: https://better-auth.com/docs/reference/options
- PostgreSQL range/exclusion constraints: https://www.postgresql.org/docs/current/rangetypes.html
- AWS JavaScript v3 S3 adapter: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-s3.html
- Telegram Bot API webhook: https://core.telegram.org/bots/api#setwebhook
- Embedded PostgreSQL development helper: https://github.com/leinelissen/embedded-postgres

Exact installed versions are locked; upgrades should re-run integration and browser suites.
