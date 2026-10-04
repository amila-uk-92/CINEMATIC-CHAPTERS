# Verification report

Verified locally on 3 October 2026 (Europe/London). Node 26.7.0, Next.js 16.3.8, Better Auth 1.7.7, real PostgreSQL 18 via the project-local helper. Dependencies are pinned and locked.

| Check                                            | Actual result                                                                                                               |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| TypeScript (`npm run typecheck`)                 | Passed                                                                                                                      |
| PostgreSQL/server integration suite (`npm test`) | 17 passed, 0 failed; disposable database and storage                                                                        |
| Browser suite (`npm run test:browser`)           | 5 passed, 0 failed; disposable database, random test identities, own worker and app                                         |
| Responsive public page                           | 360, 390, 430, 768 and 1440 px checked; no document horizontal overflow                                                     |
| Responsive admin overview                        | Same five widths checked; no document horizontal overflow                                                                   |
| Mobile duration tabs                             | One visible card, keyboard-compatible selection, correct selected price                                                     |
| Focus indicator                                  | Scroll-linked section selection and hidden-package renumbering verified; mobile strip reserves space                        |
| Public accessibility                             | Axe scan: no serious or critical findings in the tested desktop state                                                       |
| Admin availability accessibility                 | Axe scan: no serious or critical findings in the tested state                                                               |
| Content publishing                               | Draft stays private, saved preview shows draft, publication changes public content                                          |
| Hidden packages                                  | Cards, navigation and focus labels removed; booking offers enquiry                                                          |
| Booking browser flow                             | Request stored as pending, admin approval changes to confirmed; notification remains durable                                |
| Public upload                                    | Actual file uploaded/processed and shown in admin media library                                                             |
| Client gallery browser flow                      | Customer and gallery created, image processed, one-use access setup, client login, preview and actual complete ZIP download |
| Deletion browser flow                            | Confirmation exercised, gallery access revoked, worker reaches deleted state, unused public asset physically cleaned        |
| London DST                                       | Spring nonexistent hour excluded; autumn repeated hour produces distinct UTC instants with correct elapsed duration         |
| Concurrency                                      | Two simultaneous overlapping requests cannot both succeed; direct SQL bypass still rejected by exclusion constraint         |
| Client isolation                                 | A different client cannot read the gallery, its preview or ZIP; client cannot become admin                                  |
| Gallery processing                               | Original bytes preserved, ZIP signature checked, missing original failure can be retried                                    |
| Storage accounting                               | Capacity exhaustion refuses upload without new asset record; cleanup releases charged space                                 |
| Email failure                                    | Booking survives simulated SMTP outage; one durable outbox row retries to local preview                                     |
| Telegram routing                                 | Offline webhook fixtures validate secret/chat/user, deduplicate update and isolate reply conversation                       |
| Dependency audit                                 | npm reports 0 vulnerabilities for installed dependencies at verification time                                               |

## Screenshots

Saved in `screenshots/`:

- `hero-desktop.png`, `hero-mobile.png`.
- `portfolio-360.png`, `portfolio-390.png`, `portfolio-430.png`, `portfolio-768.png`, `portfolio-1440.png`.
- `packages-360.png`, `packages-390.png`, `packages-430.png`.
- `booking-request.png`, `booking-approved.png`.
- `admin-gallery.png`, `client-gallery.png`, `admin-availability.png`.

Mobile full-page captures show the viewport because the public scroll area deliberately reserves a separate focus strip; the package captures show the lower section. Desktop full-page screenshots include the entire page. Visual inspection checked the hero and mobile package treatment against the supplied written design direction. The missing mockup prevents exact comparison.

## Boundaries

Axe scans and functional tests are useful checks, not an accessibility certification or exhaustive penetration test. Live S3/SMTP/Telegram integrations, Docker services and an encrypted production backup/restore drill remain unverified. No real customer messages, Telegram webhook registration, purchase or deployment occurred. See `STATUS.md` for configuration/business inputs and known provider-delivery limits.
