import { createClient } from "@supabase/supabase-js";

// IN-MEMORY MOCK DATA FOR LOCAL TESTING
let _idCounter = 1;
const MOCK_DB = {
  bookings: [] as any[],
  booking_segments: [] as any[],
  venues: [
    { id: "v1", name: "Main Auditorium", capacity: 1000, is_active: true, building: "Main Block", floor: "Ground", venue_type: "AUDITORIUM", amenities: ["Projector", "AC", "WiFi"] },
    { id: "v2", name: "Anna Auditorium", capacity: 400, is_active: true, building: "TT", floor: "1st", venue_type: "AUDITORIUM", amenities: ["AC", "Audio System"] },
    { id: "v3", name: "CS Lab 1", capacity: 60, is_active: true, building: "SJT", floor: "3rd", venue_type: "LAB", amenities: ["Computers", "AC"] }
  ],
  users: [
    { id: "10000000-0000-0000-0000-000000000001", email: "president@vit.ac.in", name: "Demo President", role: "PRESIDENT", club_name: "Tech Club" },
    { id: "10000000-0000-0000-0000-000000000003", email: "fc@vit.ac.in", name: "Demo FC", role: "FACULTY_COORDINATOR" },
    { id: "10000000-0000-0000-0000-000000000004", email: "dsw@vit.ac.in", name: "Demo DSW", role: "DSW" }
  ],
  equipment: [
    { id: "e1", name: "Projector", total_quantity: 10, available_quantity: 10 },
    { id: "e2", name: "Microphone", total_quantity: 20, available_quantity: 20 },
    { id: "e3", name: "Whiteboard", total_quantity: 5, available_quantity: 5 }
  ],
  notifications: [] as any[],
  audit_log: [] as any[]
};

function createMockClient() {
  const createMockBuilder = (table: keyof typeof MOCK_DB | string) => {
    let resultData: any[] = MOCK_DB[table as keyof typeof MOCK_DB] || [];
    let isSingle = false;
    let isInsert = false;
    let isUpdate = false;
    let updateData: any = null;
    let insertData: any = null;
    
    const builder = {
      select: () => builder,
      eq: (field: string, value: any) => {
        resultData = resultData.filter(item => item[field] === value);
        return builder;
      },
      neq: (field: string, value: any) => {
        resultData = resultData.filter(item => item[field] !== value);
        return builder;
      },
      in: (field: string, values: any[]) => {
        resultData = resultData.filter(item => values.includes(item[field]));
        return builder;
      },
      or: () => builder, // Simplified
      order: () => builder, // Simplified
      range: () => builder,
      limit: (n: number) => {
        resultData = resultData.slice(0, n);
        return builder;
      },
      single: async () => {
        isSingle = true;
        const data = resultData[0] || null;
        return { data, error: !data ? { message: "Not found", code: "PGRST116" } : null };
      },
      insert: (data: any) => {
        isInsert = true;
        insertData = Array.isArray(data) ? data : [data];
        return builder;
      },
      update: (data: any) => {
        isUpdate = true;
        updateData = data;
        return builder;
      },
      delete: () => {
        // Just empty the results for now from DB
        const idsToDelete = resultData.map(r => r.id);
        if (MOCK_DB[table as keyof typeof MOCK_DB]) {
          (MOCK_DB[table as keyof typeof MOCK_DB] as any[]) = (MOCK_DB[table as keyof typeof MOCK_DB] as any[]).filter(item => !idsToDelete.includes(item.id));
        }
        return builder;
      },
      then: (resolve: any) => {
        if (isInsert) {
          const inserted = insertData.map((d: any) => ({ id: `new-id-${_idCounter++}`, created_at: new Date().toISOString(), ...d }));
          if (MOCK_DB[table as keyof typeof MOCK_DB]) {
             MOCK_DB[table as keyof typeof MOCK_DB].push(...inserted);
          }
          resolve({ data: inserted.length === 1 ? inserted[0] : inserted, error: null });
          return;
        }
        if (isUpdate) {
          const updated = resultData.map(item => ({ ...item, ...updateData }));
          if (MOCK_DB[table as keyof typeof MOCK_DB]) {
             const tableData = MOCK_DB[table as keyof typeof MOCK_DB] as any[];
             updated.forEach(u => {
               const idx = tableData.findIndex(t => t.id === u.id);
               if (idx !== -1) tableData[idx] = u;
             });
          }
          resolve({ data: updated, error: null });
          return;
        }

        // Return relation mock (e.g., joins)
        const finalData = resultData.map(item => {
           let enhanced = { ...item };
           if (table === 'bookings') {
             enhanced.venue = MOCK_DB.venues.find(v => v.id === item.venue_id);
             enhanced.user = MOCK_DB.users.find(u => u.id === item.user_id);
           }
           if (table === 'booking_segments') {
             enhanced.booking = MOCK_DB.bookings.find(b => b.id === item.booking_id);
           }
           return enhanced;
        });

        resolve({ data: isSingle ? finalData[0] || null : finalData, count: finalData.length, error: null });
      }
    };
    return builder;
  };

  return {
    from: (table: string) => createMockBuilder(table),
    rpc: async () => ({ data: null, error: null }),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null })
    }
  } as any;
}

export function createServerClient() {
  return createMockClient();
}

export function createServerClientWithUser(accessToken: string) {
  return createMockClient();
}
