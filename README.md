# Cinematic Chapters — Fine Art & Documentary Photography Web Platform

A production-ready photography portfolio, approval-based booking engine, client private gallery portal, admin CMS, and Telegram chat integration built from the ground up for a two-photographer studio in Leicester and the surrounding UK area.

---

## 1. Visual & Architectural Overview

- **Design System**: Warm charcoal (`#191713`), near-black (`#0D0C0A`), smoky brown (`#302921`), muted bronze (`#806849`), champagne gold (`#C8AD7F`), and warm ivory (`#F2EDE4`).
- **Typography**: 
  - **Oswald** (SIL Open Font License): Tall, heavy, narrow condensed sans-serif for main cinematic headlines.
  - **Barlow Condensed** (SIL Open Font License): Lighter condensed sans-serif for section headers, duration badges, and capsule buttons.
  - **Inter**: Highly readable body and data typography.
- **Lens-Focus Section Rail**: Fixed right-hand optical lens barrel on desktop with calibration ticks, stationary champagne pointer, and live scroll-linked section tracker; responsive top-right indicator on mobile.
- **Persistent Data & Schema Migrations**: PostgreSQL with relational constraints, integer minor unit pricing (pence), and automatic schema migrations.
- **Object Storage**: Pluggable storage architecture with local filesystem driver (`/public/uploads/` and `/data/private-storage/`) and S3-compatible cloud driver.
- **Security & Authorization**: PBKDF2 password hashing with salt, constant-time verification, HTTP-only secure cookie sessions, separated admin/client privilege boundaries, and access token validation.
- **Telegram Two-Way Chat**: Direct website visitor chat widget paired with Telegram Bot API webhook forwarding; honest fallback status when unconfigured.
- **Transactional Emails**: Durable outbox database queue with branded responsive HTML templates for booking receipts, approvals, declines, reschedules, and client gallery delivery.

---

## 2. Quickstart & Local Setup

### Prerequisites
- Node.js 18+ (tested on Node v26)
- PostgreSQL 16+ (or Homebrew `postgresql@16`)

### Installation & Database Initialization

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env.local
   ```
   Ensure `DATABASE_URL` points to your PostgreSQL instance:
   ```env
   DATABASE_URL=postgres://amila@localhost:5432/cinematic_chapters
   ```

3. **Run Schema Migrations & Demo Seed Data**:
   ```bash
   npm run seed
   ```
   This automatically creates all 16 database tables, provisions the first administrator, duration packages (2hr, 4hr, Full Day), availability windows, live portfolio content, and a demo client gallery.

4. **Run the Application**:
   - For production server:
     ```bash
     npm run build
     npm run start
     ```
   - For development mode:
     ```bash
     npm run dev
     ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Credentials & Seed Accounts

### Photographer Admin Panel
- **URL**: `http://localhost:3000/admin/login`
- **Email**: `admin@cinematicchapters.co.uk`
- **Password**: `LeicesterStudio2026!`

### Private Client Portal
- **URL**: `http://localhost:3000/client/login`
- **Demo Access Passkey**: `PORTAL-DEMO-2026`
- **Direct Link**: `http://localhost:3000/client/gallery?token=PORTAL-DEMO-2026`

---

## 4. Key Workflows & Features Verified

### 1. Public Portfolio Website
- **Hero Slideshow**: Automatic featured-photo transitions with slow photographic zoom, crossfades, dark readability overlay, and scroll cue.
- **Team Section**: Dramatic circular side-lit portraits of both photographers (`Alex Vance` and `Elena Croft`) framing the central manifesto quotation.
- **Photo Wall**: 3 continuous looping horizontal marquee rows moving in alternating directions with hover enlargement and reduced-motion fallback.
- **Duration Packages**: 2 Hours (£350), 4 Hours (£600), and Full Day 8 Hours (£1,200) with detailed inclusions, allowances, and mobile duration tab switcher.
- **Shared Calendar Booking**: Immediate slot holding, Europe/London time zone calculation, notice buffer validation, and conflict locks.
- **Website Chat**: In-site visitor conversation widget with instant team delivery.

### 2. Admin Control Center
- **Session Bookings**: Approve, decline, or reschedule requests with strict concurrency and buffer checks.
- **Package Management**: Add, edit, reorder, toggle public visibility, toggle acceptance of bookings, or archive packages without cascading deletions of past bookings.
- **Website Content Editor**: Draft vs. Live publishing model with rollback-safe staging.
- **Private Galleries & Storage**: Create clients, generate access keys, upload full-resolution photos, stream web-sized previews, build ZIP packages, monitor storage capacity with 80% low-storage warnings, and revoke access.

---

## 5. Integration Verification & Testing

Run the automated integration test suite:
```bash
npm run test
```
**Test Results**:
- `PASS`: Database schema migration succeeds without errors.
- `PASS`: PBKDF2 password hashing & constant-time verification behaves correctly.
- `PASS`: Archiving a package preserves existing historical bookings and package snapshots.
- `PASS`: Overlap query correctly detects conflict with pending reservation and setup buffer.
- `PASS`: Client B is strictly prevented from accessing Client A private assets.
- `PASS`: Transactional email outbox durably queues and records delivery.
- `PASS`: Telegram integration health report is honest (fallback active when tokens absent).

---

## 6. External Service Configuration Guide

- **Transactional Email (Resend / SMTP)**:
  Set `EMAIL_DRIVER=resend` and supply `RESEND_API_KEY`. Defaults to `EMAIL_DRIVER=local` where emails are durably recorded in `email_outbox` for admin inspection.
- **Telegram Bot Integration**:
  1. Create a bot with `@BotFather` on Telegram to receive `TELEGRAM_BOT_TOKEN`.
  2. Create a channel or group with your photographers and obtain `TELEGRAM_CHAT_ID`.
  3. Register your webhook URL to `/api/chat/telegram-webhook`.
  When tokens are empty, the website chat displays an honest notice that direct Telegram routing is pending and stores inquiries for studio dashboard review.
- **S3 Object Storage**:
  Supply `STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`. Local filesystem driver is used by default.
