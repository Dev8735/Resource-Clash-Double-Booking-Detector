/**
 * data.js
 * Resource catalog + seed bookings for the Resource Clash & Double-Booking Detector demo.
 * Dates are generated relative to "today" so the board always looks live, no matter
 * when this is demoed to judges.
 */

const RESOURCE_TYPES = ["Driver", "Vehicle", "Guide", "Room"];

const RESOURCE_CATALOG = [
  // Drivers
  { id: "drv-ramesh",   type: "Driver",  name: "Ramesh Yadav",        phone: "+91 98201-XXXXX", rating: 4.8 },
  { id: "drv-suresh",   type: "Driver",  name: "Suresh Patil",        phone: "+91 98202-XXXXX", rating: 4.6 },
  { id: "drv-anita",    type: "Driver",  name: "Anita Deshmukh",      phone: "+91 98203-XXXXX", rating: 4.9 },
  { id: "drv-vikram",   type: "Driver",  name: "Vikram Joshi",        phone: "+91 98204-XXXXX", rating: 4.5 },
  // Vehicles
  { id: "veh-mh04-1121",type: "Vehicle", name: "MH-04-1121 (Tempo Traveller)", seats: 12 },
  { id: "veh-mh04-2280",type: "Vehicle", name: "MH-04-2280 (Innova)",          seats: 7 },
  { id: "veh-mh12-7745",type: "Vehicle", name: "MH-12-7745 (Sedan)",           seats: 4 },
  { id: "veh-mh02-3399",type: "Vehicle", name: "MH-02-3399 (Ertiga)",          seats: 7 },
  // Guides
  { id: "gd-priya",     type: "Guide",   name: "Priya Nair",          lang: "English, Hindi, Marathi", rating: 4.9 },
  { id: "gd-aman",      type: "Guide",   name: "Aman Bedi",           lang: "English, Hindi",          rating: 4.7 },
  { id: "gd-meera",     type: "Guide",   name: "Meera Iyer",          lang: "English, Tamil, Hindi",   rating: 4.8 },
  // Rooms
  { id: "rm-204",       type: "Room",    name: "Hotel Room 204 (Deluxe)",   floor: 2 },
  { id: "rm-210",       type: "Room",    name: "Hotel Room 210 (Suite)",     floor: 2 },
  { id: "rm-305",       type: "Room",    name: "Hotel Room 305 (Standard)", floor: 3 },
  { id: "rm-401",       type: "Room",    name: "Hotel Room 401 (Deluxe)",   floor: 4 },
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
 * Expanded with more bookings for a richer demo.
 */
function buildSeedBookings() {
  return [
    // Clash #1: Driver Ramesh double-booked
    { id: "bk-1", resourceId: "drv-ramesh",    tripName: "Goa Beach Circuit",     customer: "Sharma Family",      startDate: dayOffset(0), endDate: dayOffset(2) },
    { id: "bk-2", resourceId: "drv-ramesh",    tripName: "Lonavala Weekend",      customer: "Mehta Group",        startDate: dayOffset(1), endDate: dayOffset(1) },
    // Clash #2: Vehicle MH-04-1121 double-booked
    { id: "bk-4", resourceId: "veh-mh04-1121", tripName: "Goa Beach Circuit",     customer: "Sharma Family",      startDate: dayOffset(0), endDate: dayOffset(2) },
    { id: "bk-5", resourceId: "veh-mh04-1121", tripName: "Corporate Offsite",     customer: "Nimbus Tech Pvt Ltd", startDate: dayOffset(1), endDate: dayOffset(1) },
    // Normal bookings (no clashes)
    { id: "bk-3", resourceId: "drv-suresh",    tripName: "Alibaug Getaway",       customer: "Kapoor Family",       startDate: dayOffset(1), endDate: dayOffset(3) },
    { id: "bk-6", resourceId: "rm-204",        tripName: "Sharma Family Stay",    customer: "Sharma Family",       startDate: dayOffset(0), endDate: dayOffset(3) },
    { id: "bk-7", resourceId: "gd-priya",      tripName: "Old City Heritage Walk", customer: "Kapoor Family",      startDate: dayOffset(2), endDate: dayOffset(2) },
    { id: "bk-8", resourceId: "veh-mh04-2280", tripName: "Alibaug Getaway",       customer: "Kapoor Family",       startDate: dayOffset(1), endDate: dayOffset(3) },
    { id: "bk-9", resourceId: "rm-210",        tripName: "Nimbus Offsite Stay",   customer: "Nimbus Tech Pvt Ltd", startDate: dayOffset(1), endDate: dayOffset(2) },
    // Extra bookings for richer demo
    { id: "bk-10", resourceId: "drv-anita",    tripName: "Pune Wine Tour",        customer: "D'Souza Couple",      startDate: dayOffset(3), endDate: dayOffset(4) },
    { id: "bk-11", resourceId: "veh-mh12-7745",tripName: "Pune Wine Tour",        customer: "D'Souza Couple",      startDate: dayOffset(3), endDate: dayOffset(4) },
    { id: "bk-12", resourceId: "gd-aman",      tripName: "Mumbai Darshan",        customer: "Singh Family",        startDate: dayOffset(0), endDate: dayOffset(0) },
    { id: "bk-13", resourceId: "rm-305",       tripName: "Singh Staycation",      customer: "Singh Family",        startDate: dayOffset(0), endDate: dayOffset(1) },
    { id: "bk-14", resourceId: "drv-vikram",   tripName: "Airport Transfer",      customer: "Johnson Party",       startDate: dayOffset(4), endDate: dayOffset(4) },
    { id: "bk-15", resourceId: "gd-meera",     tripName: "Elephanta Caves Tour",  customer: "Chen Group",          startDate: dayOffset(3), endDate: dayOffset(3) },
  ];
}

const STORAGE_KEY = "rcdd_state_v2";

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
  const bookings = buildSeedBookings();
  const alerts = [];
  
  // Dynamically compute seed conflict alerts on first run
  const CE = window.ConflictEngine || {
    computeConflictMap: () => ({}),
    findOverlaps: () => []
  };
  
  const conflictMap = CE.computeConflictMap(bookings);
  const flagged = new Set();
  
  // Sort bookings by date so alerts appear in order
  const sortedBookings = bookings.slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
  
  for (const b of sortedBookings) {
    const overlaps = CE.findOverlaps(bookings, b.resourceId, b.startDate, b.endDate, b.id);
    if (overlaps.length > 0 && !flagged.has(b.id)) {
      const res = RESOURCE_CATALOG.find((r) => r.id === b.resourceId);
      const resName = res ? res.name : b.resourceId;
      const overlapsText = overlaps.map(o => `"${o.tripName}"`).join(" & ");
      alerts.push({
        time: "09:00 AM",
        text: `Clash: ${resName} double-booked. "${b.tripName}" overlaps with ${overlapsText} on ${b.startDate}.`
      });
      flagged.add(b.id);
      overlaps.forEach(o => flagged.add(o.id));
    }
  }

  return {
    resources: RESOURCE_CATALOG.map((r) => ({ ...r })),
    bookings,
    alerts,
  };
}
