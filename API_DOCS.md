# REST API Documentation

All API endpoints are located under `/api/*` and accept/return standard `application/json` payloads.

## Authentication Endpoints

### `POST /api/auth/login`
Authenticates a user and provisions an HttpOnly JWT cookie.
- **Body:** `{ "email": "user@example.com", "password": "password" }`
- **Response:** `200 OK` `{ "success": true, "user": {...}, "redirect": "/dashboard" }`

### `POST /api/auth/logout`
Destroys the session cookie.
- **Response:** `200 OK` `{ "success": true }`

## Booking Endpoints

### `GET /api/bookings`
Retrieves a paginated list of bookings.
- **Roles:** `ALL`
- **Query Params:** `page`, `page_size`

### `POST /api/bookings`
Creates a new booking request.
- **Roles:** `PRESIDENT`, `VICE_PRESIDENT`
- **Body:** Follows `CreateBookingSchema` (Zod).

### `POST /api/bookings/approvals`
Approves or rejects a pending booking.
- **Roles:** `FACULTY_COORDINATOR`, `DSW`
- **Body:** `{ "booking_id": "uuid", "action": "APPROVE" | "REJECT", "comments": "string" }`

## Attendance Endpoints

### `GET /api/attendance/[param]`
Validates an attendance token and marks check-in for the user.
- **Roles:** `ALL`
- **Response:** `200 OK` or `400 Bad Request` if token is invalid or expired.
