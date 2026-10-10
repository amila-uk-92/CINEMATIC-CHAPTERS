# Gmail notifications

Booking acknowledgements and approvals use the same SMTP transport as gallery notifications. Header and footer graphics are attached inline, so they do not depend on remote image URLs. Headings use the website's Barlow Condensed font with condensed system fallbacks for email clients that do not support web fonts.

Save configuration in the ignored `.env.local` file, never in source control:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=cinematic.chapters.uk@gmail.com
SMTP_PASSWORD=your-google-app-password
EMAIL_FROM=Cinematic Chapters <cinematic.chapters.uk@gmail.com>
```

Create the App Password in the **same Google account** as `SMTP_USER`, with 2-Step Verification enabled. The normal Google account password will not work. Spaces in Google's displayed App Password are removed by the adapter.

Run `npm run test:gmail` to authenticate and send two clearly marked fictional booking emails only to `amila.indrajith.ukwattage@gmail.com`. It does not create bookings or drain the notification queue. On Windows, if the machine requires its system certificate store, run with `NODE_OPTIONS=--use-system-ca`. Never disable certificate verification.

Local development stays in preview mode unless explicitly enabled. Live worker delivery requires:

```dotenv
EMAIL_DRIVER=smtp
ALLOW_EXTERNAL_MESSAGES=true
```

Restart the application and worker after changing configuration. Check outstanding queued/failed notifications before enabling live delivery. `accepted` means the SMTP provider accepted the message, not that it reached the recipient's inbox. Check inbox and spam separately.

For password rotation, create a replacement App Password, update local and server configuration, verify authentication, restart the worker, then revoke the previous App Password in Google Account settings.
