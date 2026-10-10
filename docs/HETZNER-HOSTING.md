# Current production hosting

Cinematic Chapters runs on the existing Hetzner server at 65.108.218.231. Spaceship manages DNS: the root A record points to this server and `www` is a CNAME to the root. Nginx redirects HTTP and `www` to https://cinematic-chapters.co.uk. Certbot renews the certificate through its enabled timer.

The GCP VM, its disk and reserved address have been removed. `GCP-HOSTING.md` describes the previous deployment.

## Application and data

- Source and production build: `/srv/chapters/app`
- Private configuration: `/srv/chapters/app/.env.local` (never commit or print)
- SQLite and photographs: `/srv/chapters/data`
- Isolated Node runtime: `/opt/chapters-node24/bin/node`
- Web service: `chapters-web`, listening only on `127.0.0.1:3002`
- Background service: `chapters-worker`
- Nginx configuration: `/etc/nginx/sites-available/cinematic-chapters`

The existing trading applications use ports 3000 and 3001. Preserve their Node runtime, services, files and Nginx configuration when deploying this website.

## Deploy and verify

Build the committed source in a separate staging directory with the production Node runtime. Preserve the live `.env.local`, SQLite database and photo directory; never replace them with local development data. Switch the successful build into place and restart the web service and worker. Run `scripts/verify-deployment.mjs` against the public HTTPS URL and check both services remain active. Remove the temporary staging directory after verification.

Check logs with `journalctl -u chapters-web -u chapters-worker`. Gmail delivery uses the existing production SMTP configuration; see `GMAIL.md`. Design test emails deliberately include `[TEST]`; normal booking notifications do not.

## Backups

The migration backup was retained locally in the ignored `.data/deployment` directory. It includes private configuration and must be protected. Application source is recoverable from Git, but customer bookings and photographs require separate consistent backups. See `BACKUP.md`; an automated off-server backup has not been configured by this migration.
