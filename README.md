# ReserveX — Venue Booking System

> VIT's official venue booking and event management platform managed by the Dean of Student Welfare (DSW).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Frontend | React, CSS Modules, Lucide Icons |
| Backend | Next.js Route Handlers |
| Database | Supabase PostgreSQL |
| Auth | JWT (jose) + bcrypt + Supabase Service Role |
| Email | NodeMailer (SMTP) |
| Deployment | Vercel |

## Architecture

```text
Next.js App (frontend + API routes)
    ├── Route Handlers (auth, bookings, venues, equipment, attendance, OD)
    └── Supabase PostgreSQL (authoritative data store + conflict prevention)
```

**Key principle**: PostgreSQL is authoritative for booking conflict prevention using a trigger-based mechanism. Application-level availability checking provides a seamless UX, while strict Edge network cache-busting ensures realtime data accuracy across portals.

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` — Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only)
- `JWT_SECRET` — Secret for signing JWT tokens (min 32 chars)
- `SMTP_USER` — SMTP Email Address (e.g. Gmail)
- `SMTP_PASS` — SMTP App Password

Optional:
- `NEXT_PUBLIC_APP_URL` — For redirect URLs (default: http://localhost:3000)

### 3. Database Setup

Run the migration in your Supabase SQL editor:

```bash
cat supabase/migrations/001_initial_schema.sql | npx supabase db execute
```

Or paste the SQL directly into the Supabase dashboard SQL editor.

### 4. Seed Demo Data

```bash
npm run db:seed
```
*(Also contains automated scripts for seeding dummy equipment and venues if needed).*

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Testing Accounts & Data

The hardcoded demo accounts have been removed to secure the database. Instead, you can find the actual test credentials and data inside the CSV files included in the repository:

- `users - users.csv.csv`: Contains the test user accounts. Use the **email** and **plaintext_password** columns to log in as a President, Vice President, or Faculty Coordinator for various clubs.
- `clubs - clubs.csv.csv`: Contains the list of all registered clubs.
- `ReserveX_Venues - Venues.csv`: Contains the list of all venues.

**Note for DSW Admin:**
If you need to log in as the DSW to approve final requests, you can create a DSW user directly in your Supabase database or assign the `DSW` role to one of the test accounts.

## Booking Workflow

```text
Requester (President/VP)
  → Create booking request (PENDING_FC) & Select Equipment
    → Faculty Coordinator reviews (PENDING_DSW)
      → DSW approves + finalized equipment allocations (CONFIRMED)
        → Automated Emails sent to stakeholders
          → QR code generated for attendance
            → Students check in via QR scan
              → OD (On Duty) eligibility tracked & exported
```

## Key Features

- [x] **Role-based authentication** (JWT + bcrypt) across 4 hierarchical roles.
- [x] **Venue listing** with real-time availability search and conflict prevention.
- [x] **Multi-day booking** with specific time segments.
- [x] **Two-tier approval workflow** (Faculty Coordinator → DSW).
- [x] **Advanced Equipment Inventory** with automatic allocation, deduction, and restoration on rejection/cancellation.
- [x] **Dynamic custom equipment requests** handled natively alongside database items.
- [x] **QR code attendance** via a public scanning portal.
- [x] **OD (On Duty) tracking & CSV Export** for event participants.
- [x] **Automated Email Notifications** via SMTP upon approval/rejection decisions.
- [x] **Audit logging** and strict edge-network cache busting for immediate data freshness.
- [ ] Realtime WebSocket updates (Supabase Realtime)
- [ ] pg_cron auto-expiry jobs for stagnant bookings

## Project Structure

```text
Team-Ctrl-V---Ritik/
├── app/
│   ├── api/                          # Route handlers (backend logic)
│   │   ├── auth/                     #   login, logout, session (/me)
│   │   ├── bookings/                 #   CRUD, approvals, [id]/qr
│   │   ├── venues/                   #   listing, search, [id]
│   │   ├── equipment/                #   inventory management
│   │   ├── attendance/               #   record + QR check-in ([param])
│   │   ├── notifications/            #   list, mark-read
│   │   └── od/                       #   OD eligibility export
│   ├── dashboard/                    # Authenticated portal (role-aware)
│   │   ├── bookings/                 #   list, [id] detail, new (4-step wizard)
│   │   ├── approvals/                #   FC/DSW approval queue
│   │   ├── venues/                   #   browse + search
│   │   ├── equipment/                #   inventory view (DSW)
│   │   ├── attendance/               #   attendance tracking
│   │   ├── od/                       #   OD export view
│   │   ├── notifications/            #   notification center
│   │   └── layout.tsx                #   session guard + shell
│   ├── login/                        # Public login page
│   ├── attendance/                   # Public QR flows (no auth)
│   │   ├── [eventId]/                #   scan-in landing page
│   │   └── checkin/[bookingId]/      #   manual check-in fallback
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   ├── ui/                           # Button, Card, Badge, Modal, Input,
│   │                                 #   Select, Textarea, EmptyState, Spinner
│   ├── layout/                       # Sidebar, DashboardLayout
│   ├── providers/                    # AuthProvider (session context)
│   └── client/                       # SupabaseProvider
│
├── lib/
│   ├── auth/                         # jwt.ts, middleware.ts (requireAuth/requireRole)
│   ├── db/                           # Supabase server client
│   ├── email/                        # NodeMailer/SMTP integration
│   ├── realtime/                     # Supabase Realtime subscriptions
│   ├── utils/                        # qr.ts (QR generation)
│   ├── schemas.ts                    # Zod validation schemas
│   └── types.ts                      # Shared TypeScript types
│
├── supabase/
│   ├── migrations/                   # 001_initial_schema.sql, 002_cron_cleanup.sql
│   └── config.toml
│
├── scripts/
│   └── seed.js                       # Demo data seeder
│
├── __tests__/                        # Jest tests
└── .github/workflows/                # CI
```

## Database Conflict Prevention

The core booking conflict prevention is enforced by a PostgreSQL trigger:

```sql
CREATE OR REPLACE FUNCTION check_booking_no_overlap()
RETURNS TRIGGER AS $$
-- Scans for overlapping confirmed segments on the same venue/date
-- Raises EXCEPTION if a conflict is found, preventing the insert
$$ LANGUAGE plpgsql;
```

This ensures that even in race conditions, exactly one overlapping request will succeed at the database level.

## Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Ensure Next.js cache configurations (`force-dynamic`) are maintained on all dynamic API endpoints.
4. Set all environment variables (including SMTP credentials) in Vercel dashboard
5. Deploy

### Supabase

1. Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor
2. Run `npm run db:seed` to populate demo data
3. Enable Row Level Security (RLS) policies as needed for additional security
