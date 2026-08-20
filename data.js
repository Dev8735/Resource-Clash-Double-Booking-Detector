/**
 * data.js
 * Resource catalog + seed bookings for the Resource Clash & Double-Booking Detector demo.
 * Dates are generated relative to "today" so the board always looks live, no matter
 * when this is demoed to judges.
 */

const RESOURCE_TYPES = ["Driver", "Vehicle", "Guide", "Room"];

const RESOURCE_CATALOG = [
  { id: "drv-ramesh",   type: "Driver",  name: "Ramesh Yadav" },
  { id: "drv-suresh",   type: "Driver",  name: "Suresh Patil" },
  { id: "drv-anita",    type: "Driver",  name: "Anita Deshmukh" },
  { id: "veh-mh04-1121",type: "Vehicle", name: "MH-04-1121 (Tempo Traveller)" },
  { id: "veh-mh04-2280",type: "Vehicle", name: "MH-04-2280 (Innova)" },
  { id: "veh-mh12-7745",type: "Vehicle", name: "MH-12-7745 (Sedan)" },
  { id: "gd-priya",     type: "Guide",   name: "Priya Nair" },
  { id: "gd-aman",      type: "Guide",   name: "Aman Bedi" },
  { id: "rm-204",       type: "Room",    name: "Hotel Room 204" },
  { id: "rm-210",       type: "Room",    name: "Hotel Room 210" },
  { id: "rm-305",       type: "Room",    name: "Hotel Room 305" },
];

/** Format a Date object as YYYY-MM-DD (local, no timezone drift). */
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** today + offset days, as YYYY-MM-DD */
function dayOffset(offset) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return fmtDate(d);
}

/**
 * Seed bookings deliberately recreate the clash scenario from the pitch deck:
 * Driver Ramesh AND Vehicle MH-04-1121 are both double-booked on the same day,
 * while Driver Suresh sits free as the obvious alternative.
 */
function buildSeedBookings() {
  return [
    { id: "bk-1", resourceId: "drv-ramesh",    tripName: "Goa Beach Circuit",     customer: "Sharma Family",      startDate: dayOffset(0), endDate: dayOffset(2) },
    { id: "bk-2", resourceId: "drv-ramesh",    tripName: "Lonavala Weekend",      customer: "Mehta Group",        startDate: dayOffset(1), endDate: dayOffset(1) }, // clashes with bk-1
    { id: "bk-3", resourceId: "drv-suresh",    tripName: "Alibaug Getaway",       customer: "Kapoor Family",       startDate: dayOffset(1), endDate: dayOffset(3) },
    { id: "bk-4", resourceId: "veh-mh04-1121", tripName: "Goa Beach Circuit",     customer: "Sharma Family",      startDate: dayOffset(0), endDate: dayOffset(2) },
    { id: "bk-5", resourceId: "veh-mh04-1121", tripName: "Corporate Offsite",     customer: "Nimbus Tech Pvt Ltd", startDate: dayOffset(1), endDate: dayOffset(1) }, // clashes with bk-4
    { id: "bk-6", resourceId: "rm-204",        tripName: "Sharma Family Stay",    customer: "Sharma Family",      startDate: dayOffset(0), endDate: dayOffset(3) },
    { id: "bk-7", resourceId: "gd-priya",      tripName: "Old City Heritage Walk",customer: "Kapoor Family",       startDate: dayOffset(2), endDate: dayOffset(2) },
    { id: "bk-8", resourceId: "veh-mh04-2280", tripName: "Alibaug Getaway",       customer: "Kapoor Family",       startDate: dayOffset(1), endDate: dayOffset(3) },
    { id: "bk-9", resourceId: "rm-210",        tripName: "Nimbus Offsite Stay",   customer: "Nimbus Tech Pvt Ltd", startDate: dayOffset(1), endDate: dayOffset(2) },
  ];
}

const STORAGE_KEY = "rcdd_state_v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load saved state, starting fresh.", e);
    return null;
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save state", e);
  }
}

function freshState() {
  return {
    resources: RESOURCE_CATALOG.map((r) => ({ ...r })),
    bookings: buildSeedBookings(),
    alerts: [],
  };
}
