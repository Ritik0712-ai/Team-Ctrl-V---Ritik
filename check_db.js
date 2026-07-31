const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, status,
      attendance_records(registration_number, status)
    `)
    .eq("status", "COMPLETED");

  console.log("Error:", error);
  console.log("Data:", JSON.stringify(data, null, 2));
}

check();
