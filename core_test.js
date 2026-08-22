const assert = require('assert');
const core = require('./core.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL: ${name}`);
    console.log(`        ${e.message}`);
    failed++;
  }
}

console.log('overlaps()');
test('detects overlapping ranges', () => {
  assert.strictEqual(core.overlaps('2026-08-21', '2026-08-22', '2026-08-22', '2026-08-23'), true);
});
test('detects non-overlapping ranges', () => {
  assert.strictEqual(core.overlaps('2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24'), false);
});
test('detects fully contained ranges', () => {
  assert.strictEqual(core.overlaps('2026-08-21', '2026-08-25', '2026-08-22', '2026-08-23'), true);
});
test('detects identical ranges', () => {
  assert.strictEqual(core.overlaps('2026-08-21', '2026-08-22', '2026-08-21', '2026-08-22'), true);
});

console.log('\nfindConflicts()');
const bookings = [
  { id: 'b1', resourceId: 'r1', startDate: '2026-08-21', endDate: '2026-08-22' },
  { id: 'b2', resourceId: 'r1', startDate: '2026-08-24', endDate: '2026-08-25' },
  { id: 'b3', resourceId: 'r2', startDate: '2026-08-21', endDate: '2026-08-22' },
];
test('finds overlapping bookings on same resource', () => {
  const c = core.findConflicts(bookings, 'r1', '2026-08-22', '2026-08-23');
  assert.strictEqual(c.length, 1);
  assert.strictEqual(c[0].id, 'b1');
});
test('ignores other resources', () => {
  assert.strictEqual(core.findConflicts(bookings, 'r2', '2026-08-24', '2026-08-25').length, 0);
});
test('excludes a booking id when provided (for edit scenarios)', () => {
  assert.strictEqual(core.findConflicts(bookings, 'r1', '2026-08-21', '2026-08-22', 'b1').length, 0);
});
test('returns empty when no conflict exists', () => {
  assert.strictEqual(core.findConflicts(bookings, 'r1', '2026-08-26', '2026-08-27').length, 0);
});

console.log('\nsuggestAlternatives()');
const resources = [
  { id: 'r1', type: 'driver', name: 'Driver A' },
  { id: 'r2', type: 'driver', name: 'Driver B' },
  { id: 'r3', type: 'driver', name: 'Driver C' },
];
test('suggests free resources of same type', () => {
  const s = core.suggestAlternatives(resources, bookings, 'driver', '2026-08-21', '2026-08-22', 'r1');
  const ids = s.map((x) => x.id);
  assert.deepStrictEqual(ids, ['r3']); // r2 has a conflicting booking on these exact dates
});
test('excludes the originally selected resource', () => {
  const s = core.suggestAlternatives(resources, [], 'driver', '2026-08-21', '2026-08-22', 'r1');
  assert.strictEqual(s.find((x) => x.id === 'r1'), undefined);
});

console.log('\nvalidateBookingDates()  <-- the bug fix');
test('rejects a start date in the past', () => {
  const r = core.validateBookingDates('2026-08-20', '2026-08-21', '2026-08-21');
  assert.strictEqual(r.valid, false);
  assert.strictEqual(r.message, 'Enter a valid start date — bookings cannot start in the past.');
});
test('accepts a start date of today', () => {
  const r = core.validateBookingDates('2026-08-21', '2026-08-22', '2026-08-21');
  assert.strictEqual(r.valid, true);
});
test('accepts a future start date', () => {
  const r = core.validateBookingDates('2026-09-01', '2026-09-02', '2026-08-21');
  assert.strictEqual(r.valid, true);
});
test('rejects end date before start date', () => {
  const r = core.validateBookingDates('2026-08-25', '2026-08-24', '2026-08-21');
  assert.strictEqual(r.valid, false);
});
test('rejects missing dates', () => {
  assert.strictEqual(core.validateBookingDates('', '', '2026-08-21').valid, false);
});

console.log('\nbuildSchedule()');
test('marks available/booked/conflict correctly', () => {
  const sched = core.buildSchedule(
    [{ id: 'r1', type: 'driver', name: 'A' }],
    [
      { id: 'b1', resourceId: 'r1', startDate: '2026-08-21', endDate: '2026-08-21' },
      { id: 'b2', resourceId: 'r1', startDate: '2026-08-21', endDate: '2026-08-21' },
      { id: 'b3', resourceId: 'r1', startDate: '2026-08-22', endDate: '2026-08-22' },
    ],
    '2026-08-21',
    3
  );
  assert.strictEqual(sched.grid[0].cells[0].status, 'conflict'); // two bookings on day 0
  assert.strictEqual(sched.grid[0].cells[1].status, 'booked'); // one booking on day 1
  assert.strictEqual(sched.grid[0].cells[2].status, 'available'); // none on day 2
});

console.log('\ncomputePressureDays()');
test('flags a day as high-pressure when a conflict exists', () => {
  const sched = core.buildSchedule(
    [{ id: 'r1', type: 'driver', name: 'A' }, { id: 'r2', type: 'driver', name: 'B' }],
    [
      { id: 'b1', resourceId: 'r1', startDate: '2026-08-21', endDate: '2026-08-21' },
      { id: 'b2', resourceId: 'r1', startDate: '2026-08-21', endDate: '2026-08-21' },
    ],
    '2026-08-21',
    2
  );
  const days = core.computePressureDays(sched);
  assert.strictEqual(days.length, 1);
  assert.strictEqual(days[0].hasConflict, true);
});
test('does not flag a quiet day', () => {
  const sched = core.buildSchedule(
    [{ id: 'r1', type: 'driver', name: 'A' }, { id: 'r2', type: 'driver', name: 'B' }],
    [],
    '2026-08-21',
    2
  );
  assert.strictEqual(core.computePressureDays(sched).length, 0);
});

console.log('\ncomputeUtilization()');
test('computes correct utilization percentage per resource', () => {
  const sched = core.buildSchedule(
    [{ id: 'r1', type: 'driver', name: 'A' }, { id: 'r2', type: 'driver', name: 'B' }],
    [
      { id: 'b1', resourceId: 'r1', startDate: '2026-08-21', endDate: '2026-08-22' },
      { id: 'b2', resourceId: 'r1', startDate: '2026-08-23', endDate: '2026-08-23' },
    ],
    '2026-08-21',
    4
  );
  const util = core.computeUtilization(sched);
  const r1 = util.find((u) => u.resourceId === 'r1');
  const r2 = util.find((u) => u.resourceId === 'r2');
  assert.strictEqual(r1.busyDays, 3);
  assert.strictEqual(r1.utilizationPct, 75); // 3 of 4 days
  assert.strictEqual(r2.utilizationPct, 0);
});
test('sorts descending by utilization', () => {
  const sched = core.buildSchedule(
    [{ id: 'r1', type: 'driver', name: 'Busy' }, { id: 'r2', type: 'driver', name: 'Idle' }],
    [{ id: 'b1', resourceId: 'r1', startDate: '2026-08-21', endDate: '2026-08-24' }],
    '2026-08-21',
    4
  );
  const util = core.computeUtilization(sched);
  assert.strictEqual(util[0].resourceId, 'r1');
  assert.strictEqual(util[1].resourceId, 'r2');
});
test('counts conflict days as busy and reports them separately', () => {
  const sched = core.buildSchedule(
    [{ id: 'r1', type: 'driver', name: 'A' }],
    [
      { id: 'b1', resourceId: 'r1', startDate: '2026-08-21', endDate: '2026-08-21' },
      { id: 'b2', resourceId: 'r1', startDate: '2026-08-21', endDate: '2026-08-21' },
    ],
    '2026-08-21',
    1
  );
  const util = core.computeUtilization(sched);
  assert.strictEqual(util[0].busyDays, 1);
  assert.strictEqual(util[0].conflictDays, 1);
});

console.log('\ncsvEscape() / bookingsToCsv()');
test('leaves plain values unescaped', () => {
  assert.strictEqual(core.csvEscape('Goa Trip'), 'Goa Trip');
});
test('quotes values containing a comma', () => {
  assert.strictEqual(core.csvEscape('Sharma, Family'), '"Sharma, Family"');
});
test('escapes embedded quotes by doubling them', () => {
  assert.strictEqual(core.csvEscape('Say "hello"'), '"Say ""hello"""');
});
test('produces a correct CSV with header and rows', () => {
  const resources = [{ id: 'r1', type: 'driver', name: 'Ramesh' }];
  const bookings = [
    { id: 'b1', resourceId: 'r1', tripName: 'Goa Trip', customer: 'Sharma Family', startDate: '2026-08-21', endDate: '2026-08-22' },
  ];
  const csv = core.bookingsToCsv(bookings, resources);
  const lines = csv.split('\r\n');
  assert.strictEqual(lines[0], 'Trip Name,Customer,Resource,Type,Start Date,End Date');
  assert.strictEqual(lines[1], 'Goa Trip,Sharma Family,Ramesh,driver,2026-08-21,2026-08-22');
});
test('sorts CSV rows by start date', () => {
  const resources = [{ id: 'r1', type: 'driver', name: 'A' }];
  const bookings = [
    { id: 'b1', resourceId: 'r1', tripName: 'Later', customer: '', startDate: '2026-08-25', endDate: '2026-08-25' },
    { id: 'b2', resourceId: 'r1', tripName: 'Earlier', customer: '', startDate: '2026-08-20', endDate: '2026-08-20' },
  ];
  const lines = core.bookingsToCsv(bookings, resources).split('\r\n');
  assert.ok(lines[1].startsWith('Earlier'));
  assert.ok(lines[2].startsWith('Later'));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
