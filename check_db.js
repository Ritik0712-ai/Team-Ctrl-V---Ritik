const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data } = await supabase.from("bookings").select("id, event_title, equipment_requests_json, status");
  console.dir(data, { depth: null });
  const { data: eq } = await supabase.from("equipment").select("id, name, available_quantity, total_quantity");
  console.dir(eq, { depth: null });
  const { data: alloc } = await supabase.from("equipment_allocations").select("*");
  console.dir(alloc, { depth: null });
}
check();
