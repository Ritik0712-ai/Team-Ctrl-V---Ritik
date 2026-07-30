-- ============================================================
-- ReserveX — pg_cron Auto-Jobs
-- ============================================================
-- Enable pg_cron extension (run once per database)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- ============================================================
-- Auto-cancel stale pending bookings
-- Runs every 15 minutes
-- Cancels bookings pending FC approval for > 5 days
-- Cancels bookings pending DSW approval for > 3 days
-- ============================================================
SELECT cron.schedule(
  'auto-cancel-stale-bookings',
  '*/15 * * * *',
  $$
  UPDATE bookings
  SET
    status = 'CANCELLED',
    updated_at = NOW()
  WHERE
    status IN ('PENDING_FC', 'PENDING_DSW')
    AND updated_at < NOW() - INTERVAL '5 days'
  $$
);

-- ============================================================
-- Mark completed events
-- Runs every hour — marks CONFIRMED bookings past all segment dates as COMPLETED
-- ============================================================
SELECT cron.schedule(
  'mark-completed-bookings',
  '0 * * * *',
  $$
  UPDATE bookings
  SET
    status = 'COMPLETED',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE
    status = 'CONFIRMED'
    AND NOT EXISTS (
      SELECT 1 FROM booking_segments bs
      WHERE bs.booking_id = bookings.id
      AND bs.segment_date >= CURRENT_DATE
    )
  $$
);

-- ============================================================
-- Expire waitlist offers
-- Runs every hour — expires offers not accepted within 24 hours
-- ============================================================
SELECT cron.schedule(
  'expire-waitlist-offers',
  '30 * * * *',
  $$
  UPDATE waitlist
  SET
    status = 'EXPIRED',
    updated_at = NOW()
  WHERE
    status = 'OFFERED'
    AND offered_at < NOW() - INTERVAL '24 hours'
  $$
);

-- ============================================================
-- Cleanup expired sessions
-- Runs daily at midnight — cleans up old sessions
-- ============================================================
SELECT cron.schedule(
  'cleanup-old-audit-logs',
  '0 0 * * *',
  $$
  DELETE FROM audit_log
  WHERE created_at < NOW() - INTERVAL '90 days'
  $$
);
