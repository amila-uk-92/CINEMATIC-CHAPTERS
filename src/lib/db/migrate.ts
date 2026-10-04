import { exec } from './index';

export async function runMigrations() {
  console.log('Running database schema migrations...');

  await exec(`
    -- 1. Admin Users
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 2. Sessions (Admin & Client)
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL, -- 'admin' or 'client'
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

    -- 3. Website Content (Draft and Published versions)
    CREATE TABLE IF NOT EXISTS website_content (
      id TEXT PRIMARY KEY, -- 'live' or 'draft'
      data JSONB NOT NULL,
      updated_by TEXT,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 4. Media Assets Library
    CREATE TABLE IF NOT EXISTS media_assets (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes BIGINT NOT NULL,
      storage_key TEXT NOT NULL,
      url TEXT NOT NULL,
      alt_text TEXT,
      crop_focal_point JSONB, -- { x: 0.5, y: 0.5 }
      section_tag TEXT, -- 'hero', 'team_left', 'team_right', 'wall', 'package', 'general'
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 5. Duration-based Packages
    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price_in_pence INTEGER NOT NULL, -- minor integer units (£350 = 35000)
      duration_minutes INTEGER NOT NULL, -- e.g. 120, 240, 480
      description TEXT NOT NULL,
      inclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
      photo_allowance TEXT NOT NULL,
      delivery_estimate TEXT NOT NULL,
      bg_image_url TEXT,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_public_visible BOOLEAN NOT NULL DEFAULT true,
      is_accepting_bookings BOOLEAN NOT NULL DEFAULT true,
      is_archived BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 6. Shared Availability Configuration and Overrides
    CREATE TABLE IF NOT EXISTS availability_config (
      id TEXT PRIMARY KEY, -- 'default'
      weekly_schedule JSONB NOT NULL, -- { mon: [{start: '09:00', end: '18:00'}], ... }
      min_notice_hours INTEGER NOT NULL DEFAULT 48,
      booking_horizon_days INTEGER NOT NULL DEFAULT 90,
      buffer_minutes INTEGER NOT NULL DEFAULT 60, -- travel / setup buffer
      pending_expiry_hours INTEGER NOT NULL DEFAULT 24,
      packages_section_visible BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 7. Blocked Dates / Slots
    CREATE TABLE IF NOT EXISTS blocked_periods (
      id TEXT PRIMARY KEY,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      reason TEXT,
      is_full_day BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_blocked_times ON blocked_periods(start_time, end_time);

    -- 8. Booking Requests
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      package_id TEXT, -- nullable to preserve bookings if package is deleted
      package_snapshot JSONB NOT NULL, -- snapshot of name, price, duration, inclusions
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      session_date DATE NOT NULL,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      location_notes TEXT,
      customer_message TEXT,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'declined', 'cancelled', 'expired'
      expires_at TIMESTAMPTZ, -- for pending requests
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_bookings_times ON bookings(start_time, end_time, status);

    -- 9. Client Identities and Galleries
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      access_token TEXT UNIQUE NOT NULL, -- magic token or login passphrase hash
      passphrase_hash TEXT,
      access_revoked BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      session_date DATE NOT NULL,
      description TEXT,
      expires_at TIMESTAMPTZ,
      zip_status TEXT NOT NULL DEFAULT 'idle', -- 'idle', 'processing', 'ready', 'failed'
      zip_storage_key TEXT,
      zip_size_bytes BIGINT DEFAULT 0,
      total_bytes BIGINT DEFAULT 0,
      photo_count INTEGER NOT NULL DEFAULT 0,
      is_archived BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 10. Album Photos
    CREATE TABLE IF NOT EXISTS album_photos (
      id TEXT PRIMARY KEY,
      album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      storage_key TEXT NOT NULL, -- private storage
      preview_storage_key TEXT NOT NULL, -- web-sized preview
      size_bytes BIGINT NOT NULL,
      width INTEGER,
      height INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_album_photos_album ON album_photos(album_id);

    -- 11. Website Chat Conversations & Messages
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id TEXT PRIMARY KEY,
      visitor_token TEXT UNIQUE NOT NULL,
      visitor_name TEXT,
      visitor_email TEXT,
      status TEXT NOT NULL DEFAULT 'open', -- 'open', 'closed'
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_chat_visitor ON chat_conversations(visitor_token);

    -- Maps Telegram message IDs to web conversation IDs
    CREATE TABLE IF NOT EXISTS telegram_message_map (
      id TEXT PRIMARY KEY,
      telegram_message_id BIGINT NOT NULL,
      conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_telegram_msg ON telegram_message_map(telegram_message_id);

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      sender TEXT NOT NULL, -- 'visitor' or 'team'
      message_text TEXT NOT NULL,
      telegram_sent BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id);

    -- 12. Notification Outbox (Transactional Email reliability)
    CREATE TABLE IF NOT EXISTS email_outbox (
      id TEXT PRIMARY KEY,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      template_name TEXT NOT NULL,
      payload JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'sent', 'failed'
      error_message TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 13. Audit Log for administrative accountability
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log('Database migrations completed successfully.');
}
