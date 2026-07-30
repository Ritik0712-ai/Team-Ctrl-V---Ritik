# ReserveX — Venue Booking System

> VIT's official venue booking and event management platform managed by the Dean of Student Welfare (DSW).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Frontend | React 19, CSS Modules |
| Backend | Next.js Route Handlers |
| Database | Supabase PostgreSQL |
| Auth | JWT (jose) + bcrypt |
| Email | Resend |
| Deployment | Vercel |

## Architecture

```
Next.js App (frontend + API routes)
    ├── Route Handlers (auth, bookings, venues, equipment, attendance)
    └── Supabase PostgreSQL (authoritative data store + conflict prevention)
```

**Key principle**: PostgreSQL is authoritative for booking conflict prevention using a trigger-based mechanism. Application-level availability checking is for UX only.

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

Optional:
- `RESEND_API_KEY` — For email notifications
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

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Accounts

All passwords: `reservex123`

| Email | Role | Club |
|-------|------|------|
| president@vit.ac.in | President | Tech Club |
| vp@vit.ac.in | Vice President | Tech Club |
| fc@vit.ac.in | Faculty Coordinator | — |
| dsw@vit.ac.in | DSW (Admin) | — |

## Booking Workflow

```
Requester (President/VP)
  → Create booking request (PENDING_FC)
    → Faculty Coordinator reviews (PENDING_DSW)
      → DSW approves + allocates equipment (CONFIRMED)
        → QR code for attendance
          → Students check in via QR scan
            → OD eligibility exported
```

## Key Features

- [x] Role-based authentication (JWT + bcrypt)
- [x] Venue listing with search and filters
- [x] Multi-day booking with segments
- [x] Booking conflict prevention (PostgreSQL trigger)
- [x] Two-tier approval (FC → DSW)
- [x] Equipment allocation with availability tracking
- [x] QR code attendance (public scan page)
- [x] Audit log
- [x] Notifications
- [ ] Realtime updates
- [ ] Email notifications (Resend)
- [ ] pg_cron auto-expiry jobs
- [ ] Waitlist system
- [ ] OD export

## Project Structure

```
app/
  api/              # Route handlers
    auth/           # Login, logout, session
    bookings/       # CRUD, approvals
    venues/         # Venue listing and search
    equipment/      # Equipment management
    attendance/     # QR check-in
  dashboard/        # Authenticated portal pages
  login/           # Login page
  attendance/       # Public QR attendance page
components/
  ui/              # Reusable UI components (Button, Card, Badge, Modal, etc.)
  layout/          # Sidebar, dashboard layout
  providers/       # Auth context
lib/
  auth/            # JWT utilities, middleware, route guards
  db/              # Supabase server client
  schemas.ts       # Zod validation schemas
  types.ts         # TypeScript types
supabase/
  migrations/      # Database schema SQL (with triggers)
scripts/
  seed.js          # Demo data seeder
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

This means even if two requests arrive simultaneously, exactly one will succeed.

## Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Set all environment variables in Vercel dashboard
4. Deploy

### Supabase

1. Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL editor
2. Run `npm run db:seed` to populate demo data
3. Enable Row Level Security (RLS) policies as needed for additional security
