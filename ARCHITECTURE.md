# ReserveX Architecture

ReserveX is built on a modern, highly scalable stack using Next.js 15 (App Router) and Supabase (PostgreSQL).

## 1. System Architecture Overview

The system follows a three-tier architecture:
1. **Presentation Layer (Client):** Next.js Server Components and Client Components (React 19).
2. **Application Layer (Server):** Next.js Route Handlers (`app/api/*`) for strictly validated REST-like endpoints.
3. **Data Layer (Database):** Supabase (PostgreSQL) with Row Level Security (RLS).

## 2. Authentication & Authorization

We use a custom JWT-based authentication system backed by Supabase.
- **Tokens:** JWTs are stored in secure, `httpOnly` cookies (`reservex_session`).
- **Middleware:** `lib/auth/middleware.ts` intercepts requests, validates the JWT, and implements Role-Based Access Control (RBAC).
- **Roles:** `PRESIDENT`, `VICE_PRESIDENT`, `FACULTY_COORDINATOR`, `DSW`.

## 3. Database Schema

- `users`: Core identity and role mapping.
- `venues`: Venue definitions, capacity, and active status.
- `equipment`: Inventory management for physical items.
- `bookings`: High-level reservation requests and metadata.
- `booking_segments`: Atomic time slots for conflict resolution.
- `notifications`: Async event triggers for the multi-level approval pipeline.
- `audit_log`: Immutable tracking of state changes for compliance.

## 4. Security Posture

- All inputs are strictly validated using `Zod` schemas before hitting the database.
- Next.js prevents exposing server-side environment variables to the browser.
- JWT secrets are rotated and verified securely using `jose`.
