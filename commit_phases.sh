#!/bin/bash

# Configure user
git config user.name "Ritik Agarwal"
git config user.email "ritikagarwal2468@gmail.com"

# Delete all commits but keep files
git update-ref -d HEAD
git rm --cached -r .

# Phase 1: Project Setup & Authentication
git add package.json package-lock.json tsconfig.json next.config.ts eslint.config.mjs .gitignore README.md IMPLEMENTATION_STATUS.md
git add app/layout.tsx app/globals.css app/page.tsx app/page.module.css app/favicon.ico
git add lib/types.ts lib/schemas.ts
git add lib/auth components/providers components/client app/api/auth app/login
git add components/ui public
git commit -m "feat(phase-1): project setup and authentication"

# Phase 2: Database Schema & Supabase Setup
git add supabase lib/db
git commit -m "feat(phase-2): database schema and supabase setup"

# Phase 3: Dashboard Layout & Navigation
git add app/dashboard/layout.tsx app/dashboard/page.tsx app/dashboard/page.module.css components/layout
git commit -m "feat(phase-3): dashboard layout and navigation"

# Phase 4: Venues and Equipment Management
git add app/api/venues app/dashboard/venues app/api/equipment app/dashboard/equipment
git commit -m "feat(phase-4): venues and equipment management"

# Phase 5: Booking Management System
git add app/api/bookings/route.ts app/api/bookings/[id]/route.ts app/dashboard/bookings scripts
git commit -m "feat(phase-5): booking management system"

# Phase 6: Multi-level Approval Workflow
git add app/api/bookings/approvals/route.ts app/dashboard/approvals app/api/notifications app/dashboard/notifications lib/email
git commit -m "feat(phase-6): multi-level approval workflow"

# Phase 7: Real-time QR Check-in & Attendance
git add app/api/attendance app/attendance app/dashboard/attendance lib/utils/qr.ts lib/realtime
git commit -m "feat(phase-7): real-time QR check-in and attendance"

# Phase 8: Export & Reporting (OD)
git add app/api/od app/dashboard/od
git commit -m "feat(phase-8): OD export and reporting"

# Catch anything remaining
git add .
if ! git diff --cached --quiet; then
  git commit -m "fix: remaining project files and configurations"
fi

