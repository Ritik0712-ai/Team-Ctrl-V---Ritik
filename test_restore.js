const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function testReject() {
  const { data: booking } = await supabase.from("bookings").select("*").eq("id", "925be2c2-d981-45d3-a421-c3c8f60bc656").single();
  console.log("Booking before:", booking.status, booking.equipment_requests_json);
  
  // mock restore
  const reqs = booking.equipment_requests_json;
  if (reqs && Array.isArray(reqs)) {
    for (const eq of reqs) {
      if (eq.id) {
        const { data: eqData } = await supabase.from("equipment").select("available_quantity").eq("id", eq.id).single();
        console.log(`Equipment ${eq.name} BEFORE:`, eqData.available_quantity);
        await supabase.from("equipment").update({ available_quantity: eqData.available_quantity + eq.quantity }).eq("id", eq.id);
        const { data: eqDataAfter } = await supabase.from("equipment").select("available_quantity").eq("id", eq.id).single();
        console.log(`Equipment ${eq.name} AFTER:`, eqDataAfter.available_quantity);
      }
    }
  }
}
testReject();
