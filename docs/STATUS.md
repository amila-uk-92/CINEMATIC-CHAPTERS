# Remaining decisions and integration checks

## Working locally

Persisted public page, editable identity and copy, draft/preview/publish, duration packages, public media uploads/crops/ordering/use protection, secure admin/client sessions, shared approval bookings, availability/buffers/expiry/snapshots, branded durable email preview inbox, clients/galleries/originals/previews/streamed ZIPs, storage allowance and cleanup, audit events, private website conversations and authenticated Telegram webhook routing.

## Inputs still required

- The referenced latest visual mockup image was not attached. Screenshot-to-mockup matching cannot be certified.
- Studio logo/real photographer identities and approved portraits/portfolio images.
- Contact details, social links and all intended production content.
- Approved prices, edited-photo allowances, delivery expectations, full-day duration, calendar working rules, notice/buffer/horizon and pending-request expiry.
- Approved privacy/retention, cancellations, copyright/photo usage and backup retention. No legal compliance certification is claimed.
- Production PostgreSQL connection, private S3 bucket and its credentials/allowance.
- Verified email sender and SMTP/provider configuration, with explicit permission to send actual messages.
- Telegram bot token, authorised team chat and user IDs, webhook secret, an eventual HTTPS webhook URL and explicit permission for external messages.

## Deliberate limitations / checks still needed before launch

- Docker/MinIO/Mailpit configuration is supplied but Docker is absent on this machine, so that route is untested. Actual S3 bucket privacy/capacity/credentials must be checked against the chosen provider.
- SMTP provider acceptance is supported; delivery confirmation callbacks are provider specific and not implemented. Durable SMTP delivery is at least once in a crash window despite stable Message-IDs. No false delivered status is reported.
- Telegram verification/routing is tested with offline fixtures; a real authorised conversation round trip requires credentials and a public HTTPS endpoint. No live webhook was registered.
- Backup/restore procedure is documented; a real encrypted backup destination and a production restore drill are still required.
- Client image upload currently handles one photograph per submission, with progress. Large batches can be uploaded successively; no multi-file bulk queue UI is supplied.
- Email/client setup links are one-use and expire after 24 hours. Admin password recovery is a manual operator process; no public admin signup or email-based admin password reset is provided.
- The first-admin CLI's interactive prompt echoes locally. Use a private terminal or environment injected by a secret manager.
- Sample portrait photographs approximate the requested circular composition; replace them with actual black-background dramatic side-lit studio portraits.
- No production public deployment, payment, customer email, Telegram send, analytics or purchase has been performed.
