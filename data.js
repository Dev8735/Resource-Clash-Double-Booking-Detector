/**
 * data.js
 * Resource catalog + seed bookings for the Resource Clash & Double-Booking Detector demo.
 * Dates are generated relative to "today" so the board always looks live, no matter
 * when this is demoed to judges.
 */

const RESOURCE_TYPES = ["Driver", "Vehicle", "Guide", "Room"];

const RESOURCE_CATALOG = [
  // 1. DRIVERS
  { id: "drv-ramesh", type: "Driver", name: "Ramesh Yadav", phone: "+91 98201-11001", rating: 4.8 },
  { id: "drv-suresh", type: "Driver", name: "Suresh Patil", phone: "+91 98202-22002", rating: 4.6 },
  { id: "drv-anita", type: "Driver", name: "Anita Deshmukh", phone: "+91 98203-33003", rating: 4.9 },
  { id: "drv-vikram", type: "Driver", name: "Vikram Joshi", phone: "+91 98204-44004", rating: 4.5 },
  { id: "drv-rajesh", type: "Driver", name: "Rajesh Kumar", phone: "+91 98205-55005", rating: 4.7 },
  { id: "drv-mahesh", type: "Driver", name: "Mahesh Patel", phone: "+91 98206-66006", rating: 4.8 },
  { id: "drv-ajay", type: "Driver", name: "Ajay Singh", phone: "+91 98207-77007", rating: 4.6 },
  { id: "drv-deepak", type: "Driver", name: "Deepak Sharma", phone: "+91 98208-88008", rating: 4.9 },
  { id: "drv-kiran", type: "Driver", name: "Kiran More", phone: "+91 98209-99009", rating: 4.7 },
  { id: "drv-sanjay", type: "Driver", name: "Sanjay Chauhan", phone: "+91 98210-00110", rating: 4.8 },

  // 2. VEHICLES
  { id: "veh-gj05-8432", type: "Vehicle", name: "GJ-05-AB-8432 – Luxury Bus – 45 Seats", seats: 45, vehicleType: "Luxury Bus", regNo: "GJ-05-AB-8432" },
  { id: "veh-gj05-1121", type: "Vehicle", name: "GJ-05-CD-1121 – Tempo Traveller – 17 Seats", seats: 17, vehicleType: "Tempo Traveller", regNo: "GJ-05-CD-1121" },
  { id: "veh-gj05-2280", type: "Vehicle", name: "GJ-05-EF-2280 – Innova – 7 Seats", seats: 7, vehicleType: "Innova", regNo: "GJ-05-EF-2280" },
  { id: "veh-gj05-7745", type: "Vehicle", name: "GJ-05-GH-7745 – Sedan – 4 Seats", seats: 4, vehicleType: "Sedan", regNo: "GJ-05-GH-7745" },
  { id: "veh-gj05-3399", type: "Vehicle", name: "GJ-05-IJ-3399 – Ertiga – 7 Seats", seats: 7, vehicleType: "Ertiga", regNo: "GJ-05-IJ-3399" },
  { id: "veh-gj05-5001", type: "Vehicle", name: "GJ-05-KL-5001 – Mini Bus – 27 Seats", seats: 27, vehicleType: "Mini Bus", regNo: "GJ-05-KL-5001" },
  { id: "veh-gj05-9002", type: "Vehicle", name: "GJ-05-MN-9002 – Volvo Coach – 45 Seats", seats: 45, vehicleType: "Volvo Coach", regNo: "GJ-05-MN-9002" },
  { id: "veh-gj05-6677", type: "Vehicle", name: "GJ-05-PQ-6677 – SUV – 6 Seats", seats: 6, vehicleType: "SUV", regNo: "GJ-05-PQ-6677" },

  // 3. TOUR GUIDES
  { id: "gd-priya", type: "Guide", name: "Priya Nair", lang: "English, Hindi, Marathi", rating: 4.9 },
  { id: "gd-aman", type: "Guide", name: "Aman Bedi", lang: "English, Hindi", rating: 4.7 },
  { id: "gd-meera", type: "Guide", name: "Meera Iyer", lang: "English, Tamil, Hindi", rating: 4.8 },
  { id: "gd-rahul", type: "Guide", name: "Rahul Verma", lang: "English, Gujarati, Hindi", rating: 4.6 },
  { id: "gd-sneha", type: "Guide", name: "Sneha Kulkarni", lang: "English, Marathi, Hindi", rating: 4.9 },
  { id: "gd-arjun", type: "Guide", name: "Arjun Shah", lang: "English, Gujarati, Hindi", rating: 4.8 },
  { id: "gd-neha", type: "Guide", name: "Neha Joshi", lang: "English, Hindi, Punjabi", rating: 4.7 },

  // 4. HOTELS & ROOMS
  // Hotel: Taj Skyline Ahmedabad
  { id: "rm-taj-101", type: "Room", name: "Taj Skyline Ahmedabad — Room 101 (Deluxe)", hotelName: "Taj Skyline Ahmedabad", roomNumber: "101", roomType: "Deluxe" },
  { id: "rm-taj-102", type: "Room", name: "Taj Skyline Ahmedabad — Room 102 (Deluxe)", hotelName: "Taj Skyline Ahmedabad", roomNumber: "102", roomType: "Deluxe" },
  { id: "rm-taj-201", type: "Room", name: "Taj Skyline Ahmedabad — Room 201 (Premium Suite)", hotelName: "Taj Skyline Ahmedabad", roomNumber: "201", roomType: "Premium Suite" },

  // Hotel: Courtyard by Marriott Surat
  { id: "rm-mar-301", type: "Room", name: "Courtyard by Marriott Surat — Room 301 (Deluxe King)", hotelName: "Courtyard by Marriott Surat", roomNumber: "301", roomType: "Deluxe King" },
  { id: "rm-mar-302", type: "Room", name: "Courtyard by Marriott Surat — Room 302 (Deluxe Twin)", hotelName: "Courtyard by Marriott Surat", roomNumber: "302", roomType: "Deluxe Twin" },
  { id: "rm-mar-401", type: "Room", name: "Courtyard by Marriott Surat — Room 401 (Executive Suite)", hotelName: "Courtyard by Marriott Surat", roomNumber: "401", roomType: "Executive Suite" },

  // Hotel: Lemon Tree Premier, Ahmedabad
  { id: "rm-lem-105", type: "Room", name: "Lemon Tree Premier, Ahmedabad — Room 105 (Business Room)", hotelName: "Lemon Tree Premier, Ahmedabad", roomNumber: "105", roomType: "Business Room" },
  { id: "rm-lem-205", type: "Room", name: "Lemon Tree Premier, Ahmedabad — Room 205 (Deluxe Room)", hotelName: "Lemon Tree Premier, Ahmedabad", roomNumber: "205", roomType: "Deluxe Room" },
  { id: "rm-lem-305", type: "Room", name: "Lemon Tree Premier, Ahmedabad — Room 305 (Suite)", hotelName: "Lemon Tree Premier, Ahmedabad", roomNumber: "305", roomType: "Suite" },

  // Hotel: The Fern Residency, Surat
  { id: "rm-fer-110", type: "Room", name: "The Fern Residency, Surat — Room 110 (Deluxe)", hotelName: "The Fern Residency, Surat", roomNumber: "110", roomType: "Deluxe" },
  { id: "rm-fer-210", type: "Room", name: "The Fern Residency, Surat — Room 210 (Premium)", hotelName: "The Fern Residency, Surat", roomNumber: "210", roomType: "Premium" },
  { id: "rm-fer-310", type: "Room", name: "The Fern Residency, Surat — Room 310 (Executive Suite)", hotelName: "The Fern Residency, Surat", roomNumber: "310", roomType: "Executive Suite" },
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
 * Seed bookings simulate realistic travel operations across Gujarat & Western India circuits.
 * Deliberately includes 2 intentional clash scenarios for demo:
 * 1. Driver Ramesh Yadav double-booked on dayOffset(0) to dayOffset(2).
 * 2. Tempo Traveller GJ-05-CD-1121 double-booked on dayOffset(1).
 * Demonstrates non-conflicting simultaneous bookings for different rooms in the SAME hotel.
 */
function buildSeedBookings() {
  return [
    // --- INTENTIONAL CLASH #1: Driver Ramesh double-booked ---
    { id: "bk-1", resourceId: "drv-ramesh", tripName: "Surat to Goa Tour", customer: "Sharma Family", startDate: dayOffset(0), endDate: dayOffset(2), status: "CONFLICT" },
    { id: "bk-2", resourceId: "drv-ramesh", tripName: "Ahmedabad City Tour", customer: "Mehta Group", startDate: dayOffset(1), endDate: dayOffset(1), status: "CONFLICT" },

    // --- INTENTIONAL CLASH #2: Vehicle GJ-05-CD-1121 double-booked ---
    { id: "bk-4", resourceId: "veh-gj05-1121", tripName: "Surat to Goa Tour", customer: "Sharma Family", startDate: dayOffset(0), endDate: dayOffset(2), status: "CONFLICT" },
    { id: "bk-5", resourceId: "veh-gj05-1121", tripName: "Mumbai Corporate Travel", customer: "Nimbus Tech Pvt Ltd", startDate: dayOffset(1), endDate: dayOffset(1), status: "CONFLICT" },

    // --- NON-CONFLICTING HOTEL ROOM BOOKINGS (SAME HOTEL, DIFFERENT ROOMS) ---
    { id: "bk-6", resourceId: "rm-taj-101", tripName: "Statue of Unity VIP", customer: "Patel Family", startDate: dayOffset(0), endDate: dayOffset(3), status: "CONFIRMED" },
    { id: "bk-7", resourceId: "rm-taj-102", tripName: "Udaipur Holiday Package", customer: "Verma Corporate", startDate: dayOffset(0), endDate: dayOffset(3), status: "CONFIRMED" },

    // --- CONFIRMED TRAVEL ITINERARIES ---
    { id: "bk-3", resourceId: "drv-suresh", tripName: "Dwarka Somnath Package", customer: "Kapoor Family", startDate: dayOffset(1), endDate: dayOffset(3), status: "CONFIRMED" },
    { id: "bk-8", resourceId: "veh-gj05-8432", tripName: "Dwarka Somnath Package", customer: "Kapoor Family", startDate: dayOffset(1), endDate: dayOffset(3), status: "CONFIRMED" },
    { id: "bk-9", resourceId: "gd-priya", tripName: "Ahmedabad Heritage Tour", customer: "Kapoor Family", startDate: dayOffset(2), endDate: dayOffset(2), status: "CONFIRMED" },
    { id: "bk-10", resourceId: "rm-mar-301", tripName: "Surat Business Summit", customer: "Nimbus Tech Pvt Ltd", startDate: dayOffset(1), endDate: dayOffset(2), status: "CONFIRMED" },

    { id: "bk-11", resourceId: "drv-anita", tripName: "Gir Wildlife Tour", customer: "D'Souza Travelers", startDate: dayOffset(3), endDate: dayOffset(5), status: "CONFIRMED" },
    { id: "bk-12", resourceId: "veh-gj05-2280", tripName: "Gir Wildlife Tour", customer: "D'Souza Travelers", startDate: dayOffset(3), endDate: dayOffset(5), status: "CONFIRMED" },
    { id: "bk-13", resourceId: "gd-aman", tripName: "Gir Safari Guide", customer: "D'Souza Travelers", startDate: dayOffset(3), endDate: dayOffset(4), status: "CONFIRMED" },

    { id: "bk-14", resourceId: "drv-vikram", tripName: "Saputara Weekend Trip", customer: "Joshi Group", startDate: dayOffset(4), endDate: dayOffset(5), status: "CONFIRMED" },
    { id: "bk-15", resourceId: "veh-gj05-6677", tripName: "Saputara Weekend Trip", customer: "Joshi Group", startDate: dayOffset(4), endDate: dayOffset(5), status: "CONFIRMED" },
    { id: "bk-16", resourceId: "rm-fer-110", tripName: "Saputara Hill Resort", customer: "Joshi Group", startDate: dayOffset(4), endDate: dayOffset(5), status: "CONFIRMED" },

    { id: "bk-17", resourceId: "gd-sneha", tripName: "Statue of Unity Tour", customer: "Patel Family", startDate: dayOffset(0), endDate: dayOffset(1), status: "CONFIRMED" },
    { id: "bk-18", resourceId: "rm-lem-105", tripName: "Ahmedabad Express Stay", customer: "Rao Delegation", startDate: dayOffset(2), endDate: dayOffset(4), status: "CONFIRMED" },
  ];
}

const STORAGE_KEY = "rcdd_state_v4";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const loaded = JSON.parse(raw);
    if (loaded && loaded.bookings) {
      loaded.bookings.forEach((b) => {
        if (!b.status) b.status = "CONFIRMED";
      });
    }
    return loaded;
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

