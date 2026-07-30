// ============================================================
// ReserveX — Core Types
// ============================================================

export type UserRole = "PRESIDENT" | "VICE_PRESIDENT" | "FACULTY_COORDINATOR" | "DSW";

export type BookingStatus =
  | "PENDING_FC"
  | "PENDING_DSW"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

export type EquipmentType =
  | "LAPTOP"
  | "PROJECTOR"
  | "MICROPHONE"
  | "SPEAKER"
  | "STANDING_BOARD"
  | "WHITEBOARD"
  | "EXTENSION_CORD";

export type AllocationStatus = "ALLOCATED" | "RELEASED" | "DAMAGED" | "MISSING";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED";

export type ODEligibility = "ELIGIBLE" | "NOT_ELIGIBLE" | "PENDING";

export type WaitlistStatus = "OFFERED" | "EXPIRED" | "ACCEPTED" | "REJECTED" | "JOINED";

// ============================================================
// User
// ============================================================
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  club_id?: string;
  club_name?: string;
  created_at: string;
}

export interface PublicUser {
  id: string;
  name: string;
  role: UserRole;
  club_id?: string;
  club_name?: string;
}

// ============================================================
// Session
// ============================================================
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  club_id?: string;
  club_name?: string;
}

export interface SessionPayload {
  user: SessionUser;
  exp: number;
  iat: number;
}

// ============================================================
// Venue
// ============================================================
export interface Venue {
  id: string;
  name: string;
  building: string;
  floor: string;
  capacity: number;
  venue_type: "SEMINAR_HALL" | "CONFERENCE_ROOM" | "LECTURE_HALL" | "AUDITORIUM" | "LAB" | "OPEN_AREA";
  amenities: string[];
  description?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
}

// ============================================================
// Booking
// ============================================================
export interface Booking {
  id: string;
  user_id: string;
  club_id?: string;
  venue_id: string;
  event_title: string;
  event_description: string;
  start_time: string; // ISO datetime
  end_time: string;   // ISO datetime
  expected_attendees: number;
  equipment_requests: EquipmentType[];
  status: BookingStatus;
  rejection_reason?: string;
  fc_approved_at?: string;
  fc_approved_by?: string;
  dsw_approved_at?: string;
  dsw_approved_by?: string;
  dsw_decision_by?: string;
  created_at: string;
  updated_at: string;
  // Joined
  venue?: Venue;
  user?: PublicUser;
  booking_segments?: BookingSegment[];
  equipment_allocations?: EquipmentAllocation[];
  attendance_records?: AttendanceRecord[];
}

export interface BookingSegment {
  id: string;
  booking_id: string;
  segment_date: string; // date only (YYYY-MM-DD)
  start_time: string;  // time only (HH:MM)
  end_time: string;    // time only (HH:MM)
  is_confirmed: boolean;
  created_at: string;
}

// ============================================================
// Equipment
// ============================================================
export interface Equipment {
  id: string;
  name: string;
  equipment_type: EquipmentType;
  venue_id?: string;
  is_available: boolean;
  total_quantity: number;
  available_quantity: number;
  created_at: string;
}

export interface EquipmentAllocation {
  id: string;
  booking_id: string;
  equipment_id: string;
  quantity: number;
  status: AllocationStatus;
  allocated_at?: string;
  released_at?: string;
  returned_condition?: string;
  created_at: string;
  // Joined
  equipment?: Equipment;
}

// ============================================================
// Attendance
// ============================================================
export interface AttendanceRecord {
  id: string;
  booking_id: string;
  segment_date: string;
  registration_number: string;
  student_name?: string;
  status: AttendanceStatus;
  scanned_at?: string;
  qr_token: string;
  created_at: string;
}

export interface AttendanceSummary {
  total_expected: number;
  total_present: number;
  total_absent: number;
  attendance_percentage: number;
  eligible_for_od: number;
  not_eligible_for_od: number;
}

// ============================================================
// Waitlist
// ============================================================
export interface WaitlistEntry {
  id: string;
  booking_id: string;
  user_id: string;
  status: WaitlistStatus;
  position: number;
  offered_until?: string;
  offered_at?: string;
  responded_at?: string;
  created_at: string;
  // Joined
  booking?: Booking;
  user?: PublicUser;
}

// ============================================================
// Audit
// ============================================================
export interface AuditEntry {
  id: string;
  booking_id: string;
  user_id: string;
  action: string;
  details?: Record<string, unknown>;
  created_at: string;
  // Joined
  user?: PublicUser;
}

// ============================================================
// Notification
// ============================================================
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

// ============================================================
// API Response Types
// ============================================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BookingConflict {
  venue_id: string;
  venue_name: string;
  conflicting_bookings: Array<{
    id: string;
    start_time: string;
    end_time: string;
    event_title: string;
  }>;
}

// ============================================================
// Venue Availability
// ============================================================
export interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface VenueAvailability {
  venue: Venue;
  date: string;
  slots: TimeSlot[];
  has_conflicts: boolean;
}

export interface VenueRankingResult {
  venue: Venue;
  rank: number;
  conflict_count: number;
  distance_score?: number;
  capacity_score?: number;
  overall_score: number;
}

// ============================================================
// Booking Form
// ============================================================
export interface BookingFormData {
  venue_id: string;
  event_title: string;
  event_description: string;
  segments: Array<{
    date: string;
    start_time: string;
    end_time: string;
  }>;
  expected_attendees: number;
  equipment_requests: EquipmentType[];
}
