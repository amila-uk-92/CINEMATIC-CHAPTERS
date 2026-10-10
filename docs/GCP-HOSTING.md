# GCP trial and moving to another host

## Deployment configuration (10 October 2026)

- Project: `cinematic-chapters-511211`.
- VM: `chapters-web`, zone `us-central1-a`, Debian 13, `e2-micro`, 30 GB standard persistent disk.
- Reserved Standard-tier IPv4: `chapters-ip`, `35.209.119.3`.
- Dedicated network: `chapters-net`, subnet `chapters-subnet` (`10.42.0.0/24`). Public traffic is limited to ports 80 and 443; SSH is limited to Google's IAP tunnel range.
- Application: `/srv/chapters/app`; private database and media: `/srv/chapters/data`.
- Runtime: official Node.js 24 LTS, with its archive verified against the official SHA-256 manifest. Services: `chapters-web`, `chapters-worker`, `nginx`; production credentials are generated on the VM and excluded from source control.
- DNS remains at Spaceship. Saved records: root A to `35.209.119.3`, `www` CNAME to `cinematic-chapters.co.uk`, TTL 300 seconds.
- Live URL: `https://cinematic-chapters.co.uk`. HTTP and HTTPS `www` redirect to the canonical HTTPS domain. Let's Encrypt certificate issued on 10 October 2026, with automatic renewal enabled.
- Production build uses the supported Webpack option with a 512 MB Node heap to fit this VM. Compilation, TypeScript and page generation passed; all 19 workflow tests passed on Linux. Public pages, published content, photographs, security headers, anonymous access rejection and canonical redirects passed the deployment checks.
- Customer notifications remain in preview mode. Published content still includes sample testimonials and development preview labels; deployment does not replace those with customer content.

`node scripts/package-deployment.mjs` prepares a consistent SQLite snapshot, removes local sessions from that snapshot, and bundles source and media without Windows dependencies or local secrets. The archive lives in ignored `.data/deployment/`. `scripts/deploy-vm.sh` installs Linux dependencies and services for the initial deployment; its existing-data guard preserves the production database on subsequent runs. A fresh snapshot does not overwrite an existing production database.

Connect with `gcloud compute ssh chapters-web --zone=us-central1-a --tunnel-through-iap`. Check services with `sudo systemctl status chapters-web chapters-worker nginx`, and logs with `sudo journalctl -u chapters-web -u chapters-worker`. Certificate renewal uses the installed Certbot timer. DNS, HTTPS and application checks passed on 10 October 2026.

The current app uses SQLite (`lib/db.ts`) and private local photo storage (`lib/storage.ts`). It can run on a Linux VM without a managed database or provider-specific application services. Cloud Run is not a drop-in replacement for this layout.

## Initial configuration

- One Compute Engine `e2-micro` VM, in `us-east1`, `us-central1` or `us-west1`; free-tier usage is shared across the billing account.
- Up to 30 GB standard persistent disk (`pd-standard`), not the default balanced disk. This includes the OS, application, database and photographs.
- Linux, with no paid OS licence; build the application on a compatible Linux build environment rather than relying on the VM's limited memory.
- One external IPv4 address. This is charged separately (currently USD 0.005/hour, with one free hour/month).
- Consider Standard network tier for direct VM traffic: its separate allowance currently covers the first 200 GiB/month across the billing account. Do not assume this allowance applies to Premium networking or Cloud Storage downloads.
- No load balancer, Cloud NAT, managed SQL or paid support required for this initial layout.
- Keep DNS at Spaceship. Connect `cinematic-chapters.co.uk` and `www` only after checking the deployment, HTTPS and the public content.

Before creating billable resources, confirm the exact console configuration, applicable free-tier usage, billing account and total. An alerts-only budget does not impose a spending cap.

## Runtime and data

Run the Next.js production server and background worker under a service manager, with HTTPS handled by a reverse proxy. The application's start script listens on 127.0.0.1. Keep the database and media outside the public web root.

Set `DATABASE_URL` to the SQLite file path, `STORAGE_DRIVER=local`, `LOCAL_STORAGE_PATH` to the private media directory, and `BETTER_AUTH_URL=https://cinematic-chapters.co.uk`. Store the authentication secret securely. Do not transfer Windows `node_modules` or Windows native binaries to Linux: install dependencies for Linux.

Email is currently a preview adapter. Real customer notification delivery needs a separately configured email provider. Verify bookings, administration, image processing and client downloads before declaring the website ready for customers.

## Backup and migration

1. Stop the app and worker temporarily so no writes occur during the snapshot.
2. Back up the SQLite database consistently (SQLite backup API or a clean checkpoint and closed database); do not copy only the main database file while WAL writes are active.
3. Copy the matching private photo directory, including originals, previews and ZIPs. Protect backups with encryption and restrict access.
4. Preserve the source commit, package lockfile and environment configuration; transfer secrets securely and exclude them from Git.
5. On the new Linux host, install matching dependencies, restore the database and photo files, and run the app and worker with external messaging disabled initially.
6. Test public pages, admin sign-in, package prices, bookings, client access, photo previews and complete ZIP downloads. Keep the existing host available until the replacement is verified.
7. Pause writes for the final synchronisation, move the latest data, then point the domain's DNS to the new server. Configure HTTPS on the replacement and account for cached DNS records during the transition.
8. Once the new host is stable and no traffic or writes remain on the old host, retire the GCP resources. A stopped VM can still incur disk and reserved-IP costs; review all remaining resources and billing.

Migration is portable, but needs a coordinated data transfer and may require a short maintenance window. The domain stays registered at Spaceship.

## References

- https://docs.cloud.google.com/free/docs/free-cloud-features
- https://cloud.google.com/vpc/network-pricing
- https://docs.cloud.google.com/billing/docs/how-to/budgets
