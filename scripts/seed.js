#!/usr/bin/env node
/**
 * ReserveX — Database Seed Script
 * Run AFTER migration: node scripts/seed.js
 */
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const PASSWORD_HASH = bcrypt.hashSync("reservex123", 10);

const clubs = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Tech Club", description: "Student technical activities club" },
  { id: "22222222-2222-2222-2222-222222222222", name: "Cultural Club", description: "Student cultural activities club" },
  { id: "33333333-3333-3333-3333-333333333333", name: "Sports Club", description: "Student sports activities club" },
  { id: "44444444-4444-4444-4444-444444444444", name: "Literary Club", description: "Student literary activities club" },
];

const users = [
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", email: "president@vit.ac.in", name: "Arjun Sharma", role: "PRESIDENT", club_id: "11111111-1111-1111-1111-111111111111", club_name: "Tech Club" },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", email: "vp@vit.ac.in", name: "Priya Patel", role: "VICE_PRESIDENT", club_id: "11111111-1111-1111-1111-111111111111", club_name: "Tech Club" },
  { id: "cccccccc-cccc-cccc-cccc-cccccccccccc", email: "fc@vit.ac.in", name: "Dr. Rajesh Kumar", role: "FACULTY_COORDINATOR", club_id: null, club_name: null },
  { id: "dddddddd-dddd-dddd-dddd-dddddddddddd", email: "dsw@vit.ac.in", name: "Prof. Meera Iyer", role: "DSW", club_id: null, club_name: null },
];

const venues = [
  { id: "v1111111-1111-1111-1111-111111111111", name: "Seminar Hall A", building: "Main Building", floor: "2nd Floor", capacity: 100, venue_type: "SEMINAR_HALL", amenities: ["Projector", "Whiteboard", "Microphone", "AC"], description: "Air-conditioned seminar hall with modern audio-visual equipment" },
  { id: "v2222222-2222-2222-2222-222222222222", name: "Seminar Hall B", building: "Main Building", floor: "2nd Floor", capacity: 80, venue_type: "SEMINAR_HALL", amenities: ["Projector", "Whiteboard", "AC"], description: "Compact seminar hall ideal for workshops" },
  { id: "v3333333-3333-3333-3333-333333333333", name: "Conference Room 1", building: "Admin Block", floor: "1st Floor", capacity: 30, venue_type: "CONFERENCE_ROOM", amenities: ["Projector", "Whiteboard", "Video Conferencing"], description: "Executive conference room with video conferencing" },
  { id: "v4444444-4444-4444-4444-444444444444", name: "Auditorium", building: "Cultural Block", floor: "Ground Floor", capacity: 500, venue_type: "AUDITORIUM", amenities: ["Projector", "Stage Lighting", "Sound System", "Green Room", "AC"], description: "Main auditorium for large events and cultural programs" },
  { id: "v5555555-5555-5555-5555-555555555555", name: "Lecture Hall 101", building: "Academic Block A", floor: "1st Floor", capacity: 150, venue_type: "LECTURE_HALL", amenities: ["Projector", "AC", "Recording Equipment"], description: "Lecture hall with recording capabilities" },
  { id: "v6666666-6666-6666-6666-666666666666", name: "Open Air Theatre", building: "Campus Green", floor: "Ground Level", capacity: 300, venue_type: "OPEN_AREA", amenities: ["Stage", "Sound System", "Lighting"], description: "Open air theatre for outdoor cultural events" },
  { id: "v7777777-7777-7777-7777-777777777777", name: "Computer Lab 1", building: "IT Building", floor: "3rd Floor", capacity: 60, venue_type: "LAB", amenities: ["Computers", "Projector", "AC", "Printer"], description: "Computer lab with 60 workstations" },
  { id: "v8888888-8888-8888-8888-888888888888", name: "Meeting Room Alpha", building: "Admin Block", floor: "2nd Floor", capacity: 15, venue_type: "CONFERENCE_ROOM", amenities: ["Whiteboard", "Video Conferencing", "TV Display"], description: "Small meeting room for team discussions" },
];

const equipment = [
  { id: "e1111111-1111-1111-1111-111111111111", name: "Dell Laptop 15\"", equipment_type: "LAPTOP", total_quantity: 10, available_quantity: 10 },
  { id: "e2222222-2222-2222-2222-222222222222", name: "Epson Projector EB-X51", equipment_type: "PROJECTOR", total_quantity: 15, available_quantity: 15 },
  { id: "e3333333-3333-3333-3333-333333333333", name: "Sony Wired Microphone", equipment_type: "MICROPHONE", total_quantity: 20, available_quantity: 20 },
  { id: "e4444444-4444-4444-4444-444444444444", name: "JBL Portable Speaker", equipment_type: "SPEAKER", total_quantity: 8, available_quantity: 8 },
  { id: "e5555555-5555-5555-5555-555555555555", name: "Flip Chart Stand", equipment_type: "STANDING_BOARD", total_quantity: 15, available_quantity: 15 },
  { id: "e6666666-6666-6666-6666-666666666666", name: "Whiteboard Portable", equipment_type: "WHITEBOARD", total_quantity: 12, available_quantity: 12 },
  { id: "e7777777-7777-7777-7777-777777777777", name: "5A Extension Cord 10m", equipment_type: "EXTENSION_CORD", total_quantity: 25, available_quantity: 25 },
  { id: "e8888888-8888-8888-8888-888888888888", name: "Wireless Collar Mic Set", equipment_type: "MICROPHONE", total_quantity: 6, available_quantity: 6 },
];

async function seed() {
  console.log("🌱 Seeding ReserveX database...\n");

  // Clubs
  console.log("  → Creating clubs...");
  for (const club of clubs) {
    const { error } = await supabase.from("clubs").upsert(club, { onConflict: "id" });
    if (error) console.error(`    ✗ Club ${club.name}:`, error.message);
    else console.log(`    ✓ ${club.name}`);
  }

  // Users
  console.log("\n  → Creating users...");
  for (const user of users) {
    const { error } = await supabase.from("users").upsert(
      { ...user, password_hash: PASSWORD_HASH },
      { onConflict: "id" }
    );
    if (error) console.error(`    ✗ ${user.email}:`, error.message);
    else console.log(`    ✓ ${user.email} (${user.role})`);
  }

  // Venues
  console.log("\n  → Creating venues...");
  for (const venue of venues) {
    const { error } = await supabase.from("venues").upsert(venue, { onConflict: "id" });
    if (error) console.error(`    ✗ ${venue.name}:`, error.message);
    else console.log(`    ✓ ${venue.name}`);
  }

  // Equipment
  console.log("\n  → Creating equipment...");
  for (const eq of equipment) {
    const { error } = await supabase.from("equipment").upsert(eq, { onConflict: "id" });
    if (error) console.error(`    ✗ ${eq.name}:`, error.message);
    else console.log(`    ✓ ${eq.name}`);
  }

  console.log("\n✅ Seed complete!");
  console.log("\nDemo accounts (all passwords: reservex123):");
  console.log("  president@vit.ac.in  — PRESIDENT, Tech Club");
  console.log("  vp@vit.ac.in         — VICE_PRESIDENT, Tech Club");
  console.log("  fc@vit.ac.in         — FACULTY_COORDINATOR");
  console.log("  dsw@vit.ac.in        — DSW (Administrator)");
}

seed().catch(console.error);
