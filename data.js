/**
 * Seed / demo data for the Resource Clash & Double-Booking Detector.
 * Dates are generated relative to "today" at load time, so the seeded
 * conflicts are always visible in the current week, no matter when a judge
 * opens the app.
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

function buildSeedData() {
  const today = new Date();
  const d = (offset) => isoDate(addDays(today, offset));

  const resources = [
    { id: 'r1', type: 'driver', name: 'Ramesh Yadav' },
    { id: 'r2', type: 'driver', name: 'Suresh Patil' },
    { id: 'r3', type: 'driver', name: 'Anita Deshmukh' },
    { id: 'r4', type: 'driver', name: 'Vikram Joshi' },
    { id: 'r5', type: 'vehicle', name: 'MH-04-1121 (Tempo Traveller)' },
    { id: 'r6', type: 'vehicle', name: 'MH-04-2280 (Innova)' },
    { id: 'r7', type: 'vehicle', name: 'MH-12-7745 (Sedan)' },
    { id: 'r8', type: 'vehicle', name: 'MH-02-3399 (Ertiga)' },
    { id: 'r9', type: 'guide', name: 'Priya Nair' },
    { id: 'r10', type: 'guide', name: 'Aman Bedi' },
    { id: 'r11', type: 'guide', name: 'Meera Iyer' },
    { id: 'r12', type: 'room', name: 'Hotel Room 204 (Deluxe)' },
    { id: 'r13', type: 'room', name: 'Hotel Room 210 (Suite)' },
    { id: 'r14', type: 'room', name: 'Hotel Room 305 (Standard)' },
  ];

  const bookings = [
    { id: 'b1', resourceId: 'r1', tripName: 'Goa Beach Circuit', customer: 'Sharma Family', startDate: d(0), endDate: d(1) },
    { id: 'b2', resourceId: 'r1', tripName: 'Corporate Offsite', customer: 'Nexlogic Pvt Ltd', startDate: d(1), endDate: d(2) },
    { id: 'b3', resourceId: 'r2', tripName: 'Lonavala Weekend', customer: 'Kapoor Family', startDate: d(0), endDate: d(2) },
    { id: 'b4', resourceId: 'r3', tripName: 'Airport Transfer Package', customer: 'Verma Group', startDate: d(3), endDate: d(4) },
    { id: 'b5', resourceId: 'r4', tripName: 'Heritage Walk Tour', customer: 'Iyer Family', startDate: d(4), endDate: d(4) },
    { id: 'b6', resourceId: 'r5', tripName: 'Goa Beach Circuit', customer: 'Sharma Family', startDate: d(0), endDate: d(1) },
    { id: 'b7', resourceId: 'r5', tripName: 'College Group Tour', customer: 'MIT Alumni Assoc.', startDate: d(1), endDate: d(1) },
    { id: 'b8', resourceId: 'r6', tripName: 'Corporate Offsite', customer: 'Nexlogic Pvt Ltd', startDate: d(1), endDate: d(2) },
    { id: 'b9', resourceId: 'r6', tripName: 'Wedding Guest Pickup', customer: 'Rao Family', startDate: d(2), endDate: d(2) },
    { id: 'b10', resourceId: 'r7', tripName: 'Airport Transfer', customer: 'Verma Group', startDate: d(3), endDate: d(3) },
    { id: 'b11', resourceId: 'r9', tripName: 'Heritage Walk Tour', customer: 'Iyer Family', startDate: d(2), endDate: d(2) },
    { id: 'b12', resourceId: 'r10', tripName: 'Old City Food Trail', customer: 'Bedi Group', startDate: d(0), endDate: d(0) },
    { id: 'b13', resourceId: 'r12', tripName: 'Sharma Family Stay', customer: 'Sharma Family', startDate: d(0), endDate: d(3) },
    { id: 'b14', resourceId: 'r13', tripName: 'Kapoor Family Stay', customer: 'Kapoor Family', startDate: d(1), endDate: d(2) },
    { id: 'b15', resourceId: 'r14', tripName: 'Verma Group Stay', customer: 'Verma Group', startDate: d(3), endDate: d(4) },
  ];

  return { resources, bookings };
}
