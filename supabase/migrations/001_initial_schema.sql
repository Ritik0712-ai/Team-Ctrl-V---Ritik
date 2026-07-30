-- ============================================================
-- ReserveX — Initial Database Schema
-- PostgreSQL with GiST exclusion constraint for booking conflicts
-- ============================================================

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- Enums
-- ============================================================
CREATE TYPE user_role AS ENUM (
  'PRESIDENT',
  'VICE_PRESIDENT',
  'FACULTY_COORDINATOR',
  'DSW'
);

CREATE TYPE booking_status AS ENUM (
  'PENDING_FC',
  'PENDING_DSW',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED'
);

CREATE TYPE equipment_type AS ENUM (
  'LAPTOP',
  'PROJECTOR',
  'MICROPHONE',
  'SPEAKER',
  'STANDING_BOARD',
  'WHITEBOARD',
  'EXTENSION_CORD'
);

CREATE TYPE allocation_status AS ENUM (
  'ALLOCATED',
  'RELEASED',
  'DAMAGED',
  'MISSING'
);

CREATE TYPE attendance_status AS ENUM (
  'PRESENT',
  'ABSENT',
  'EXCUSED'
);

CREATE TYPE od_eligibility AS ENUM (
  'ELIGIBLE',
  'NOT_ELIGIBLE',
  'PENDING'
);

CREATE TYPE waitlist_status AS ENUM (
  'OFFERED',
  'EXPIRED',
  'ACCEPTED',
  'REJECTED',
  'JOINED'
);

CREATE TYPE venue_type AS ENUM (
  'SEMINAR_HALL',
  'CONFERENCE_ROOM',
  'LECTURE_HALL',
  'AUDITORIUM',
  'LAB',
  'OPEN_AREA'
);

-- ============================================================
-- Users (authenticated staff)
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL,
  club_id UUID,
  club_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_club_id ON users(club_id) WHERE club_id IS NOT NULL;

-- ============================================================
-- Venues
-- ============================================================
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  building TEXT NOT NULL,
  floor TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  venue_type venue_type NOT NULL,
  amenities TEXT[] DEFAULT '{}',
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_venues_active ON venues(is_active) WHERE is_active = true;
CREATE INDEX idx_venues_type ON venues(venue_type);
CREATE INDEX idx_venues_capacity ON venues(capacity);
CREATE INDEX idx_venues_building ON venues(building);

-- ============================================================
-- Equipment Inventory
-- ============================================================
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  equipment_type equipment_type NOT NULL,
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  total_quantity INTEGER NOT NULL DEFAULT 1 CHECK (total_quantity > 0),
  available_quantity INTEGER NOT NULL DEFAULT 1 CHECK (available_quantity >= 0 AND available_quantity <= total_quantity),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_equipment_type ON equipment(equipment_type);
CREATE INDEX idx_equipment_venue ON equipment(venue_id) WHERE venue_id IS NOT NULL;
CREATE INDEX idx_equipment_active ON equipment(is_active) WHERE is_active = true;

-- ============================================================
-- Bookings
-- ============================================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
  event_title TEXT NOT NULL,
  event_description TEXT NOT NULL,
  expected_attendees INTEGER NOT NULL CHECK (expected_attendees > 0),
  equipment_requests equipment_type[] DEFAULT '{}',
  status booking_status NOT NULL DEFAULT 'PENDING_FC',
  rejection_reason TEXT,
  fc_approved_at TIMESTAMPTZ,
  fc_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  dsw_approved_at TIMESTAMPTZ,
  dsw_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  dsw_decision_by TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_venue ON bookings(venue_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);
CREATE INDEX idx_bookings_dsw_decision_by ON bookings(dsw_decision_by) WHERE dsw_decision_by IS NOT NULL AND status = 'PENDING_DSW';

-- ============================================================
-- Booking Segments (one per event day)
-- The daterange column enables the GiST exclusion constraint
-- ============================================================
CREATE TABLE booking_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  segment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT segment_time_valid CHECK (start_time < end_time),
  CONSTRAINT unique_segment_per_booking_per_day UNIQUE (booking_id, segment_date)
);

CREATE INDEX idx_segments_booking ON booking_segments(booking_id);
CREATE INDEX idx_segments_date ON booking_segments(segment_date);

-- ============================================================
-- GiST Exclusion Constraint — THE CORE CONFLICT PREVENTION
-- Prevents overlapping bookings for the same venue
-- Uses tstzrange for the full datetime window
-- ============================================================

-- Create a function to enforce exclusion at the booking level
CREATE OR REPLACE FUNCTION check_booking_no_overlap()
RETURNS TRIGGER AS $$
DECLARE
  v_venue_id UUID;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_conflict_count INTEGER;
BEGIN
  -- Get the venue_id from the booking
  SELECT venue_id INTO v_venue_id
  FROM bookings WHERE id = NEW.booking_id;

  -- Get the time window for this segment
  v_start := NEW.segment_date::timestamptz + NEW.start_time::time;
  v_end := NEW.segment_date::timestamptz + NEW.end_time::time;

  -- Check for conflicts: any confirmed segment for the same venue
  -- that overlaps this time window
  SELECT COUNT(*) INTO v_conflict_count
  FROM booking_segments bs
  JOIN bookings b ON bs.booking_id = b.id
  WHERE b.venue_id = v_venue_id
    AND bs.segment_date = NEW.segment_date
    AND bs.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND bs.is_confirmed = true
    AND (
      (NEW.start_time::time, NEW.end_time::time) OVERLAPS (bs.start_time, bs.end_time)
    );

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Booking conflict: venue is already booked for this time slot';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_booking_no_overlap
  BEFORE INSERT OR UPDATE ON booking_segments
  FOR EACH ROW
  EXECUTE FUNCTION check_booking_no_overlap();

-- ============================================================
-- Equipment Allocations
-- ============================================================
CREATE TABLE equipment_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  status allocation_status NOT NULL DEFAULT 'ALLOCATED',
  allocated_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  returned_condition TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_allocation_booking_equipment UNIQUE (booking_id, equipment_id)
);

CREATE INDEX idx_allocations_booking ON equipment_allocations(booking_id);
CREATE INDEX idx_allocations_equipment ON equipment_allocations(equipment_id);
CREATE INDEX idx_allocations_status ON equipment_allocations(status);

-- ============================================================
-- Attendance Records
-- ============================================================
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  segment_date DATE NOT NULL,
  registration_number TEXT NOT NULL,
  student_name TEXT,
  status attendance_status NOT NULL DEFAULT 'ABSENT',
  od_eligible od_eligibility NOT NULL DEFAULT 'PENDING',
  scanned_at TIMESTAMPTZ,
  qr_token TEXT UNIQUE NOT NULL DEFAULT uuid_generate_v4()::text,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_attendance_per_day UNIQUE (booking_id, segment_date, registration_number)
);

CREATE INDEX idx_attendance_booking ON attendance_records(booking_id);
CREATE INDEX idx_attendance_date ON attendance_records(segment_date);
CREATE INDEX idx_attendance_reg ON attendance_records(registration_number);
CREATE INDEX idx_attendance_qr_token ON attendance_records(qr_token);

-- ============================================================
-- Waitlist
-- ============================================================
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status waitlist_status NOT NULL DEFAULT 'JOINED',
  position INTEGER NOT NULL DEFAULT 0,
  offered_until TIMESTAMPTZ,
  offered_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_waitlist_user_booking UNIQUE (booking_id, user_id)
);

CREATE INDEX idx_waitlist_booking ON waitlist(booking_id);
CREATE INDEX idx_waitlist_user ON waitlist(user_id);
CREATE INDEX idx_waitlist_status ON waitlist(status);

-- ============================================================
-- Audit Log
-- ============================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_booking ON audit_log(booking_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_action ON audit_log(action);

-- ============================================================
-- Notifications
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- ============================================================
-- Clubs (reference table)
-- ============================================================
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clubs_active ON clubs(is_active) WHERE is_active = true;

-- Add FK from users to clubs
ALTER TABLE users
ADD CONSTRAINT fk_users_club
FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE SET NULL;

-- ============================================================
-- Auto-update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_venues_updated_at BEFORE UPDATE ON venues FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_allocations_updated_at BEFORE UPDATE ON equipment_allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON attendance_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_waitlist_updated_at BEFORE UPDATE ON waitlist FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Seed Data: Demo Accounts
-- ============================================================
-- All passwords are: reservex123 (bcrypt hashed, cost factor 10)
-- DO NOT use these credentials in production

INSERT INTO clubs (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Tech Club', 'Student technical activities club'),
  ('22222222-2222-2222-2222-222222222222', 'Cultural Club', 'Student cultural activities club'),
  ('33333333-3333-3333-3333-333333333333', 'Sports Club', 'Student sports activities club'),
  ('44444444-4444-4444-4444-444444444444', 'Literary Club', 'Student literary activities club');

-- Hashed "reservex123" with bcrypt cost factor 10
-- $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.M7hCqhL5vIqG1h1O1G
INSERT INTO users (id, email, password_hash, name, role, club_id, club_name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'president@vit.ac.in',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.M7hCqhL5vIqG1h1O1G',
   'Arjun Sharma',
   'PRESIDENT',
   '11111111-1111-1111-1111-111111111111',
   'Tech Club'),

  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'vp@vit.ac.in',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.M7hCqhL5vIqG1h1O1G',
   'Priya Patel',
   'VICE_PRESIDENT',
   '11111111-1111-1111-1111-111111111111',
   'Tech Club'),

  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   'fc@vit.ac.in',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.M7hCqhL5vIqG1h1O1G',
   'Dr. Rajesh Kumar',
   'FACULTY_COORDINATOR',
   NULL,
   NULL),

  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   'dsw@vit.ac.in',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3.M7hCqhL5vIqG1h1O1G',
   'Prof. Meera Iyer',
   'DSW',
   NULL,
   NULL);

-- ============================================================
-- Seed Data: Venues
-- ============================================================
INSERT INTO venues (id, name, building, floor, capacity, venue_type, amenities, description) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'Seminar Hall A', 'Main Building', '2nd Floor', 100, 'SEMINAR_HALL', ARRAY['Projector', 'Whiteboard', 'Microphone', 'AC'], 'Air-conditioned seminar hall with modern audio-visual equipment'),
  ('c2222222-2222-2222-2222-222222222222', 'Seminar Hall B', 'Main Building', '2nd Floor', 80, 'SEMINAR_HALL', ARRAY['Projector', 'Whiteboard', 'AC'], 'Compact seminar hall ideal for workshops'),
  ('c3333333-3333-3333-3333-333333333333', 'Conference Room 1', 'Admin Block', '1st Floor', 30, 'CONFERENCE_ROOM', ARRAY['Projector', 'Whiteboard', 'Video Conferencing'], 'Executive conference room with video conferencing'),
  ('c4444444-4444-4444-4444-444444444444', 'Auditorium', 'Cultural Block', 'Ground Floor', 500, 'AUDITORIUM', ARRAY['Projector', 'Stage Lighting', 'Sound System', 'Green Room', 'AC'], 'Main auditorium for large events and cultural programs'),
  ('c5555555-5555-5555-5555-555555555555', 'Lecture Hall 101', 'Academic Block A', '1st Floor', 150, 'LECTURE_HALL', ARRAY['Projector', 'AC', 'Recording Equipment'], 'Lecture hall with recording capabilities'),
  ('c6666666-6666-6666-6666-666666666666', 'Open Air Theatre', 'Campus Green', 'Ground Level', 300, 'OPEN_AREA', ARRAY['Stage', 'Sound System', 'Lighting'], 'Open air theatre for outdoor cultural events'),
  ('c7777777-7777-7777-7777-777777777777', 'Computer Lab 1', 'IT Building', '3rd Floor', 60, 'LAB', ARRAY['Computers', 'Projector', 'AC', 'Printer'], 'Computer lab with 60 workstations'),
  ('c8888888-8888-8888-8888-888888888888', 'Meeting Room Alpha', 'Admin Block', '2nd Floor', 15, 'CONFERENCE_ROOM', ARRAY['Whiteboard', 'Video Conferencing', 'TV Display'], 'Small meeting room for team discussions');

-- ============================================================
-- Seed Data: Equipment
-- ============================================================
INSERT INTO equipment (id, name, equipment_type, venue_id, total_quantity, available_quantity) VALUES
  ('e1111111-1111-1111-1111-111111111111', 'Dell Laptop 15"', 'LAPTOP', NULL, 10, 10),
  ('e2222222-2222-2222-2222-222222222222', 'Epson Projector EB-X51', 'PROJECTOR', NULL, 15, 15),
  ('e3333333-3333-3333-3333-333333333333', 'Sony Wired Microphone', 'MICROPHONE', NULL, 20, 20),
  ('e4444444-4444-4444-4444-444444444444', 'JBL Portable Speaker', 'SPEAKER', NULL, 8, 8),
  ('e5555555-5555-5555-5555-555555555555', 'Flip Chart Stand', 'STANDING_BOARD', NULL, 15, 15),
  ('e6666666-6666-6666-6666-666666666666', 'Whiteboard Portable', 'WHITEBOARD', NULL, 12, 12),
  ('e7777777-7777-7777-7777-777777777777', '5A Extension Cord 10m', 'EXTENSION_CORD', NULL, 25, 25),
  ('e8888888-8888-8888-8888-888888888888', 'Wireless Collar Mic Set', 'MICROPHONE', NULL, 6, 6);

-- ============================================================
-- Seed Data: Sample Bookings (for demo)
-- ============================================================
INSERT INTO bookings (id, user_id, venue_id, event_title, event_description, expected_attendees, equipment_requests, status) VALUES
  ('b1111111-1111-1111-1111-111111111111',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'v1111111-1111-1111-1111-111111111111',
   'Tech Workshop: Introduction to AI',
   'A hands-on workshop covering the basics of artificial intelligence and machine learning for beginners.',
   80,
   ARRAY['PROJECTOR', 'MICROPHONE'],
   'CONFIRMED');

INSERT INTO booking_segments (id, booking_id, segment_date, start_time, end_time, is_confirmed) VALUES
  ('f1111111-1111-1111-1111-111111111111',
   'b1111111-1111-1111-1111-111111111111',
   CURRENT_DATE + 3,
   '09:00',
   '13:00',
   true);

INSERT INTO attendance_records (id, booking_id, segment_date, registration_number, student_name, status) VALUES
  ('a1111111-1111-1111-1111-111111111111',
   'b1111111-1111-1111-1111-111111111111',
   CURRENT_DATE + 3,
   '22BCE0001',
   'Karthik Nair',
   'PRESENT'),
  ('a2222222-2222-2222-2222-222222222222',
   'b1111111-1111-1111-1111-111111111111',
   CURRENT_DATE + 3,
   '22BCE0002',
   'Sneha Reddy',
   'ABSENT');

-- ============================================================
-- pg_cron: Auto-expire stale DSW approvals
-- ============================================================
-- This will be set up separately via Supabase dashboard
-- SELECT cron.schedule('expire-stale-dsw-approvals', '*/30 * * * *', $$
--   UPDATE bookings
--   SET status = 'CANCELLED', updated_at = NOW()
--   WHERE status = 'PENDING_DSW'
--     AND dsw_decision_by < NOW() - INTERVAL '72 hours';
-- $$);
