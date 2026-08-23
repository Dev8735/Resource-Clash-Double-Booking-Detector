/**
 * CLASHGUARD — seed / demo data
 * Dates are generated relative to "today" at load time so the seeded
 * clashes are always visible in the current week, no matter when this
 * is opened.
 */

function isoDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

const RESOURCE_TYPES = {
  driver: { label: 'Driver', glyph: 'D', color: '#2dd4ea' },
  vehicle: { label: 'Vehicle', glyph: 'V', color: '#34d399' },
  guide: { label: 'Guide', glyph: 'G', color: '#8b7cf6' },
  room: { label: 'Room', glyph: 'R', color: '#ffb020' },
};

function buildSeedData() {
  const today = new Date();
  const d = (offset) => isoDate(addDays(today, offset));

  const resources = [
    { id: 'r1', type: 'driver', name: 'Ramesh Yadav' },
    { id: 'r2', type: 'driver', name: 'Suresh Patil' },
    { id: 'r3', type: 'driver', name: 'Anita Deshmukh' },
    { id: 'r4', type: 'driver', name: 'Vikram Joshi' },
    { id: 'r5', type: 'driver', name: 'Farhan Sheikh' },
    { id: 'r6', type: 'vehicle', name: 'MH-04-1121 · Tempo Traveller' },
    { id: 'r7', type: 'vehicle', name: 'MH-04-2280 · Innova' },
    { id: 'r8', type: 'vehicle', name: 'MH-12-7745 · Sedan' },
    { id: 'r9', type: 'vehicle', name: 'MH-02-3399 · Ertiga' },
    { id: 'r10', type: 'guide', name: 'Priya Nair' },
    { id: 'r11', type: 'guide', name: 'Aman Bedi' },
    { id: 'r12', type: 'guide', name: 'Meera Iyer' },
    { id: 'r13', type: 'room', name: 'Room 204 · Deluxe' },
    { id: 'r14', type: 'room', name: 'Room 210 · Suite' },
    { id: 'r15', type: 'room', name: 'Room 305 · Standard' },
  ];

  const bookings = [
    { id: 'b1', resourceId: 'r1', tripName: 'Goa Beach Circuit', customer: 'Sharma Family', startDate: d(0), endDate: d(1) },
    { id: 'b2', resourceId: 'r1', tripName: 'Corporate Offsite', customer: 'Nexlogic Pvt Ltd', startDate: d(1), endDate: d(2) },
    { id: 'b3', resourceId: 'r2', tripName: 'Lonavala Weekend', customer: 'Kapoor Family', startDate: d(0), endDate: d(2) },
    { id: 'b4', resourceId: 'r3', tripName: 'Airport Transfer Package', customer: 'Verma Group', startDate: d(3), endDate: d(4) },
    { id: 'b5', resourceId: 'r4', tripName: 'Heritage Walk Tour', customer: 'Iyer Family', startDate: d(4), endDate: d(4) },
    { id: 'b6', resourceId: 'r6', tripName: 'Goa Beach Circuit', customer: 'Sharma Family', startDate: d(0), endDate: d(1) },
    { id: 'b7', resourceId: 'r6', tripName: 'College Group Tour', customer: 'MIT Alumni Assoc.', startDate: d(1), endDate: d(1) },
    { id: 'b8', resourceId: 'r7', tripName: 'Corporate Offsite', customer: 'Nexlogic Pvt Ltd', startDate: d(1), endDate: d(2) },
    { id: 'b9', resourceId: 'r7', tripName: 'Wedding Guest Pickup', customer: 'Rao Family', startDate: d(2), endDate: d(2) },
    { id: 'b10', resourceId: 'r8', tripName: 'Airport Transfer', customer: 'Verma Group', startDate: d(3), endDate: d(3) },
    { id: 'b11', resourceId: 'r10', tripName: 'Heritage Walk Tour', customer: 'Iyer Family', startDate: d(2), endDate: d(2) },
    { id: 'b12', resourceId: 'r11', tripName: 'Old City Food Trail', customer: 'Bedi Group', startDate: d(0), endDate: d(0) },
    { id: 'b13', resourceId: 'r13', tripName: 'Sharma Family Stay', customer: 'Sharma Family', startDate: d(0), endDate: d(3) },
    { id: 'b14', resourceId: 'r14', tripName: 'Kapoor Family Stay', customer: 'Kapoor Family', startDate: d(1), endDate: d(2) },
    { id: 'b15', resourceId: 'r15', tripName: 'Verma Group Stay', customer: 'Verma Group', startDate: d(3), endDate: d(4) },
    { id: 'b16', resourceId: 'r9', tripName: 'Temple Circuit', customer: 'Joshi Family', startDate: d(5), endDate: d(6) },
    { id: 'b17', resourceId: 'r12', tripName: 'Sunset Cruise Transfer', customer: 'Bedi Group', startDate: d(1), endDate: d(1) },
  ];

  return { resources, bookings };
}

function loadState() {
  try {
    const raw = localStorage.getItem('clashguard_state_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.resources) && Array.isArray(parsed.bookings)) {
        return parsed;
      }
    }
  } catch (e) { /* fall through to seed */ }
  return buildSeedData();
}

function saveState(state) {
  try {
    localStorage.setItem('clashguard_state_v1', JSON.stringify({
      resources: state.resources,
      bookings: state.bookings,
    }));
  } catch (e) { /* storage unavailable — degrade silently */ }
}

function clearState() {
  try { localStorage.removeItem('clashguard_state_v1'); } catch (e) { /* noop */ }
}