export const checkBookingNoOverlapSQL = `
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

  -- Check for conflicts: any active segment (not rejected/cancelled) for the same venue
  -- that overlaps this time window
  SELECT COUNT(*) INTO v_conflict_count
  FROM booking_segments bs
  JOIN bookings b ON bs.booking_id = b.id
  WHERE b.venue_id = v_venue_id
    AND bs.segment_date = NEW.segment_date
    AND bs.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND b.status NOT IN ('REJECTED', 'CANCELLED')
    AND (
      (NEW.start_time::time, NEW.end_time::time) OVERLAPS (bs.start_time, bs.end_time)
    );

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Booking conflict: venue is already booked or requested for this time slot';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Updating trigger function...");
  // Note: we can't run raw SQL from the JS client easily unless we use an RPC, 
  // but we can use the Supabase CLI to execute it!
}
run();
