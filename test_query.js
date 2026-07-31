const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function testReject() {
  const { data, error } = await supabase
    .from("booking_segments")
    .select(`
      segment_date,
      start_time,
      end_time,
      bookings!inner ( venue_id, status )
    `)
    .neq("bookings.status", "REJECTED")
    .neq("bookings.status", "CANCELLED");
    
  console.dir(data, { depth: null });
}
testReject();
