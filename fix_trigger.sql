CREATE OR REPLACE FUNCTION check_booking_no_overlap()
RETURNS TRIGGER AS $$
DECLARE
  v_venue_id UUID;
  v_conflict_count INTEGER;
BEGIN
  -- Get the venue_id from the booking
  SELECT venue_id INTO v_venue_id FROM bookings WHERE id = NEW.booking_id;

  -- Check for conflicts
  SELECT COUNT(*) INTO v_conflict_count
  FROM booking_segments bs
  JOIN bookings b ON bs.booking_id = b.id
  WHERE b.venue_id = v_venue_id
    AND bs.segment_date = NEW.segment_date
    AND bs.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND b.status::text NOT IN ('REJECTED', 'CANCELLED')
    AND NEW.start_time < bs.end_time 
    AND NEW.end_time > bs.start_time;

  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'Booking conflict: venue is already booked or requested for this time slot';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
