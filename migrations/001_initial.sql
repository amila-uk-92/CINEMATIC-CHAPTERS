CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  "emailVerified" INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS "session" (
  id TEXT PRIMARY KEY,
  "expiresAt" TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS auth_session_user_idx ON "session"("userId");

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TEXT,
  "refreshTokenExpiresAt" TEXT,
  scope TEXT,
  password TEXT,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS account_user ON account("userId");

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS "rateLimit" (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  count INTEGER NOT NULL,
  "lastRequest" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admins (
  user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE REFERENCES "user"(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS setup_tokens (
  hash TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS website_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  state TEXT NOT NULL CHECK(state IN ('draft','published')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS one_content_per_state ON website_versions(state);

CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  visible INTEGER NOT NULL DEFAULT 1,
  accepting INTEGER NOT NULL DEFAULT 1,
  archived INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS resource (
  id INTEGER PRIMARY KEY CHECK(id=1),
  settings TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  package_id TEXT REFERENCES packages(id) ON DELETE SET NULL,
  snapshot TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  reserved TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','confirmed','declined','cancelled','expired')),
  expires_at TEXT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  request_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK(ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS booking_time ON bookings(starts_at);

CREATE TRIGGER IF NOT EXISTS check_booking_overlap_insert
BEFORE INSERT ON bookings
FOR EACH ROW
WHEN NEW.state IN ('pending', 'confirmed') AND EXISTS (
  SELECT 1 FROM bookings
  WHERE id <> NEW.id
    AND state IN ('pending', 'confirmed')
    AND (
      CASE WHEN json_valid(NEW.reserved) AND json_valid(reserved) THEN
        json_extract(NEW.reserved, '$[0]') < json_extract(reserved, '$[1]')
        AND json_extract(NEW.reserved, '$[1]') > json_extract(reserved, '$[0]')
      ELSE
        NEW.reserved = reserved
      END
    )
)
BEGIN
  SELECT RAISE(ABORT, '23P01: conflicting key value violates exclusion constraint');
END;

CREATE TRIGGER IF NOT EXISTS check_booking_overlap_update
BEFORE UPDATE OF reserved, state ON bookings
FOR EACH ROW
WHEN NEW.state IN ('pending', 'confirmed') AND EXISTS (
  SELECT 1 FROM bookings
  WHERE id <> NEW.id
    AND state IN ('pending', 'confirmed')
    AND (
      CASE WHEN json_valid(NEW.reserved) AND json_valid(reserved) THEN
        json_extract(NEW.reserved, '$[0]') < json_extract(reserved, '$[1]')
        AND json_extract(NEW.reserved, '$[1]') > json_extract(reserved, '$[0]')
      ELSE
        NEW.reserved = reserved
      END
    )
)
BEGIN
  SELECT RAISE(ABORT, '23P01: conflicting key value violates exclusion constraint');
END;

CREATE TABLE IF NOT EXISTS galleries (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  title TEXT NOT NULL,
  session_date TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'processing' CHECK(state IN ('processing','ready','failed','pending-cleanup','deleted')),
  version INTEGER NOT NULL DEFAULT 0,
  zip_key TEXT,
  zip_bytes INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  processing_bytes INTEGER NOT NULL DEFAULT 0 CHECK(processing_bytes>=0)
);
CREATE INDEX IF NOT EXISTS gallery_customer ON galleries(customer_id);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  gallery_id TEXT REFERENCES galleries(id),
  scope TEXT NOT NULL CHECK(scope IN ('public','client')),
  key TEXT UNIQUE NOT NULL,
  preview_key TEXT,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL CHECK(bytes>=0),
  preview_bytes INTEGER NOT NULL DEFAULT 0,
  reserved_bytes INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  alt TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'processing' CHECK(status IN ('processing','ready','failed','pending-cleanup','deleted')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS asset_gallery ON assets(gallery_id);

CREATE TABLE IF NOT EXISTS storage (
  id INTEGER PRIMARY KEY CHECK(id=1),
  allowance INTEGER NOT NULL CHECK(allowance>0)
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('gallery','cleanup','asset-cleanup','object-cleanup','telegram')),
  payload TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','done','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  locked_at TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS job_queue ON jobs(state,available_at);

CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY,
  dedupe TEXT UNIQUE NOT NULL,
  recipient TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','preview','accepted','delivered','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  provider_id TEXT,
  error TEXT,
  html TEXT,
  plain TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS notification_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  outbox_id TEXT NOT NULL REFERENCES outbox(id),
  state TEXT NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK(sender IN ('visitor','team')),
  body TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'queued',
  telegram_message_id INTEGER UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS chat_conversation ON chat_messages(conversation_id,created_at);

CREATE TABLE IF NOT EXISTS telegram_updates (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  resets_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS worker_health (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
