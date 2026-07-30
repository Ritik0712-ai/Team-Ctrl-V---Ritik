import { z } from "zod";
import type {
  UserRole,
  BookingStatus,
  EquipmentType,
  AllocationStatus,
  AttendanceStatus,
  WaitlistStatus,
  BookingFormData,
} from "./types";

// ============================================================
// Auth Schemas
// ============================================================
export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ============================================================
// User Schemas
// ============================================================
export const UserRoleSchema = z.enum([
  "PRESIDENT",
  "VICE_PRESIDENT",
  "FACULTY_COORDINATOR",
  "DSW",
]);

export const CreateUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name is required"),
  role: UserRoleSchema,
  club_id: z.string().uuid().optional(),
  club_name: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

// ============================================================
// Venue Schemas
// ============================================================
export const VenueTypeSchema = z.enum([
  "SEMINAR_HALL",
  "CONFERENCE_ROOM",
  "LECTURE_HALL",
  "AUDITORIUM",
  "LAB",
  "OPEN_AREA",
]);

export const CreateVenueSchema = z.object({
  name: z.string().min(2, "Venue name is required"),
  building: z.string().min(1, "Building is required"),
  floor: z.string().min(1, "Floor is required"),
  capacity: z.number().int().positive("Capacity must be positive"),
  venue_type: VenueTypeSchema,
  amenities: z.array(z.string()).default([]),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
});

export const VenueSearchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format").optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format").optional(),
  min_capacity: z.number().int().positive().optional(),
  venue_type: VenueTypeSchema.optional(),
  building: z.string().optional(),
  query: z.string().optional(),
});

export type VenueSearchInput = z.infer<typeof VenueSearchSchema>;

// ============================================================
// Equipment Schemas
// ============================================================
export const EquipmentTypeSchema = z.enum([
  "LAPTOP",
  "PROJECTOR",
  "MICROPHONE",
  "SPEAKER",
  "STANDING_BOARD",
  "WHITEBOARD",
  "EXTENSION_CORD",
]);

export const CreateEquipmentSchema = z.object({
  name: z.string().min(2, "Equipment name is required"),
  equipment_type: EquipmentTypeSchema,
  venue_id: z.string().uuid().optional(),
  total_quantity: z.number().int().positive("Quantity must be positive").default(1),
});

export const AllocateEquipmentSchema = z.object({
  equipment_id: z.string().uuid(),
  quantity: z.number().int().positive("Quantity must be positive").default(1),
});

export const UpdateAllocationStatusSchema = z.object({
  status: z.enum(["ALLOCATED", "RELEASED", "DAMAGED", "MISSING"]),
  returned_condition: z.string().optional(),
});

// ============================================================
// Booking Schemas
// ============================================================
export const BookingStatusSchema = z.enum([
  "PENDING_FC",
  "PENDING_DSW",
  "CONFIRMED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
]);

export const BookingSegmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
}).refine(
  (data) => {
    const [sh, sm] = data.start_time.split(":").map(Number);
    const [eh, em] = data.end_time.split(":").map(Number);
    return sh * 60 + sm < eh * 60 + em;
  },
  { message: "End time must be after start time", path: ["end_time"] }
);

export const CreateBookingSchema = z.object({
  venue_id: z.string().uuid("Invalid venue ID"),
  event_title: z.string().min(5, "Event title must be at least 5 characters").max(200),
  event_description: z.string().min(10, "Description must be at least 10 characters").max(2000),
  segments: z.array(BookingSegmentSchema).min(1, "At least one time slot is required"),
  expected_attendees: z.number().int().positive("Expected attendees must be positive"),
  equipment_requests: z.array(EquipmentTypeSchema).default([]),
});

export const UpdateBookingSchema = z.object({
  event_title: z.string().min(5).max(200).optional(),
  event_description: z.string().min(10).max(2000).optional(),
  segments: z.array(BookingSegmentSchema).min(1).optional(),
  expected_attendees: z.number().int().positive().optional(),
  equipment_requests: z.array(EquipmentTypeSchema).optional(),
}).refine(
  (data) => {
    if (data.segments && data.segments.length > 0) {
      return data.segments.every((seg) => {
        const [sh, sm] = seg.start_time.split(":").map(Number);
        const [eh, em] = seg.end_time.split(":").map(Number);
        return sh * 60 + sm < eh * 60 + em;
      });
    }
    return true;
  },
  { message: "End time must be after start time", path: ["segments"] }
);

export const ApprovalDecisionSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  rejection_reason: z.string().max(500).optional(),
});

export const FCApprovalSchema = ApprovalDecisionSchema;
export const DSWApprovalSchema = ApprovalDecisionSchema.merge(
  z.object({
    equipment_allocations: z.array(
      z.object({
        equipment_id: z.string().uuid(),
        quantity: z.number().int().positive().default(1),
      })
    ).optional(),
  })
);

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
export type UpdateBookingInput = z.infer<typeof UpdateBookingSchema>;
export type FCApprovalInput = z.infer<typeof FCApprovalSchema>;
export type DSWApprovalInput = z.infer<typeof DSWApprovalSchema>;

// ============================================================
// Attendance Schemas
// ============================================================
export const AttendanceStatusSchema = z.enum(["PRESENT", "ABSENT", "EXCUSED"]);

export const RecordAttendanceSchema = z.object({
  booking_id: z.string().uuid("Invalid booking ID"),
  segment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  registration_number: z.string().min(1, "Registration number is required"),
  student_name: z.string().optional(),
  status: AttendanceStatusSchema.default("PRESENT"),
});

export const BulkAttendanceSchema = z.object({
  records: z.array(RecordAttendanceSchema),
});

export type RecordAttendanceInput = z.infer<typeof RecordAttendanceSchema>;

// ============================================================
// Waitlist Schemas
// ============================================================
export const WaitlistStatusSchema = z.enum([
  "OFFERED",
  "EXPIRED",
  "ACCEPTED",
  "REJECTED",
  "JOINED",
]);

export const JoinWaitlistSchema = z.object({
  booking_id: z.string().uuid("Invalid booking ID"),
});

export const RespondWaitlistSchema = z.object({
  accept: z.boolean(),
});

// ============================================================
// Notification Schema
// ============================================================
export const MarkNotificationReadSchema = z.object({
  notification_ids: z.array(z.string().uuid()).optional(),
  all: z.boolean().optional(),
});

// ============================================================
// Utility
// ============================================================
export const UUIDSchema = z.string().uuid("Invalid UUID");

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  page_size: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;
