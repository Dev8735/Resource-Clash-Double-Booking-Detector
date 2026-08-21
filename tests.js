/**
 * tests.js
 *
 * Automated correctness tests for conflict-engine.js — the exact module the
 * live app uses (see app.js, which calls ConflictEngine.* directly, no
 * reimplementation). Run with:
 *
 *   node tests.js
 *
 * No dependencies, no test framework — a tiny hand-rolled assert runner so
 * a judge can run it in seconds without npm install.
 */

const ConflictEngine = require("./conflict-engine.js");

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    passed++;
    console.log(`  \u2713 ${description}`);
  } else {
    failed++;
    console.log(`  \u2717 FAILED: ${description}`);
  }
}

function assertEqual(actual, expected, description) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  assert(ok, `${description} ${ok ? "" : `(expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`}`);
}

function section(title) {
  console.log(`\n${title}`);
}

/* ------------------------------------------------------------------ */
section("rangesOverlap — date range overlap logic");
/* ------------------------------------------------------------------ */

assert(
  ConflictEngine.rangesOverlap("2026-10-12", "2026-10-14", "2026-10-13", "2026-10-13") === true,
  "a range fully containing a single day counts as overlap"
);
assert(
  ConflictEngine.rangesOverlap("2026-10-12", "2026-10-13", "2026-10-13", "2026-10-15") === true,
  "ranges that share exactly one boundary day overlap (both trips need that resource that day)"
);
assert(
  ConflictEngine.rangesOverlap("2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15") === false,
  "back-to-back ranges with no shared day do NOT overlap"
);
assert(
  ConflictEngine.rangesOverlap("2026-10-01", "2026-10-31", "2026-10-15", "2026-10-16") === true,
  "a short range fully inside a long range overlaps"
);
assert(
  ConflictEngine.rangesOverlap("2026-10-15", "2026-10-15", "2026-10-15", "2026-10-15") === true,
  "identical single-day ranges overlap"
);

/* ------------------------------------------------------------------ */
section("findOverlaps — per-resource overlap search");
/* ------------------------------------------------------------------ */

const bookings = [
  { id: "b1", resourceId: "drv-1", startDate: "2026-10-12", endDate: "2026-10-14" },
  { id: "b2", resourceId: "drv-1", startDate: "2026-10-13", endDate: "2026-10-13" },
  { id: "b3", resourceId: "drv-2", startDate: "2026-10-12", endDate: "2026-10-14" },
  { id: "b4", resourceId: "drv-1", startDate: "2026-10-20", endDate: "2026-10-22" },
];

assertEqual(
  ConflictEngine.findOverlaps(bookings, "drv-1", "2026-10-13", "2026-10-13").map((b) => b.id),
  ["b1", "b2"],
  "finds both bookings that cover the queried day for the same resource"
);
assertEqual(
  ConflictEngine.findOverlaps(bookings, "drv-1", "2026-10-13", "2026-10-13", "b2").map((b) => b.id),
  ["b1"],
  "excludeBookingId correctly omits a booking from its own overlap check"
);
assertEqual(
  ConflictEngine.findOverlaps(bookings, "drv-2", "2026-10-13", "2026-10-13").map((b) => b.id),
  ["b3"],
  "never mixes overlaps across different resources"
);
assertEqual(
  ConflictEngine.findOverlaps(bookings, "drv-1", "2026-10-16", "2026-10-18").length,
  0,
  "returns nothing for a genuinely free date range"
);

/* ------------------------------------------------------------------ */
section("findAvailableAlternatives — alternative-resource suggestion");
/* ------------------------------------------------------------------ */

const resources = [
  { id: "drv-1", type: "Driver", name: "Ramesh" },
  { id: "drv-2", type: "Driver", name: "Suresh" },
  { id: "drv-3", type: "Driver", name: "Anita" },
  { id: "veh-1", type: "Vehicle", name: "MH-04-1121" },
];
const altBookings = [
  { id: "b1", resourceId: "drv-1", startDate: "2026-10-12", endDate: "2026-10-14" },
  { id: "b2", resourceId: "drv-2", startDate: "2026-10-12", endDate: "2026-10-14" },
];

assertEqual(
  ConflictEngine.findAvailableAlternatives(resources, altBookings, "Driver", "2026-10-12", "2026-10-14", "drv-1").map((r) => r.id),
  ["drv-3"],
  "only suggests a driver with zero overlap for the FULL requested range"
);
assertEqual(
  ConflictEngine.findAvailableAlternatives(resources, altBookings, "Driver", "2026-10-15", "2026-10-16", "drv-1").map((r) => r.id).sort(),
  ["drv-2", "drv-3"],
  "suggests every driver of the same type once the date range is actually free"
);
assertEqual(
  ConflictEngine.findAvailableAlternatives(resources, altBookings, "Vehicle", "2026-10-12", "2026-10-14", "veh-1").length,
  0,
  "correctly returns no suggestions when no other vehicle exists"
);
assertEqual(
  ConflictEngine.findAvailableAlternatives(resources, altBookings, "Driver", "2026-10-12", "2026-10-14", "drv-1")
    .some((r) => r.id === "drv-1"),
  false,
  "never suggests the resource that's already excluded (the one that clashed)"
);

/* ------------------------------------------------------------------ */
section("computeConflictMap / countOpenConflicts — board-level aggregation");
/* ------------------------------------------------------------------ */

const clashBookings = [
  { id: "b1", resourceId: "drv-1", startDate: "2026-10-12", endDate: "2026-10-13" },
  { id: "b2", resourceId: "drv-1", startDate: "2026-10-13", endDate: "2026-10-14" }, // clashes with b1 on the 13th only
];
const map = ConflictEngine.computeConflictMap(clashBookings);
assertEqual(map["drv-1|2026-10-12"], 1, "single-booking day counts as 1, not a conflict");
assertEqual(map["drv-1|2026-10-13"], 2, "the shared day between the two bookings counts as 2");
assertEqual(map["drv-1|2026-10-14"], 1, "the day only the second booking covers counts as 1");
assertEqual(
  ConflictEngine.countOpenConflicts(clashBookings),
  1,
  "exactly one resource-day is flagged as an open conflict for this scenario"
);
assertEqual(
  ConflictEngine.countOpenConflicts([]),
  0,
  "an empty booking list has zero conflicts"
);

/* ------------------------------------------------------------------ */
section("Multi-day overlap correctness (the exact deck/demo scenario)");
/* ------------------------------------------------------------------ */

const deckBookings = [
  { id: "b1", resourceId: "drv-ramesh", startDate: "2026-10-12", endDate: "2026-10-14" },
  { id: "b2", resourceId: "drv-ramesh", startDate: "2026-10-13", endDate: "2026-10-13" },
  { id: "b3", resourceId: "veh-mh04-1121", startDate: "2026-10-12", endDate: "2026-10-14" },
  { id: "b4", resourceId: "veh-mh04-1121", startDate: "2026-10-13", endDate: "2026-10-13" },
];
const deckMap = ConflictEngine.computeConflictMap(deckBookings);
assertEqual(deckMap["drv-ramesh|2026-10-13"], 2, "Driver Ramesh shows a real clash on 13 Oct, matching the pitch deck");
assertEqual(deckMap["veh-mh04-1121|2026-10-13"], 2, "Vehicle MH-04-1121 shows a real clash on 13 Oct, matching the pitch deck");
assertEqual(ConflictEngine.countOpenConflicts(deckBookings), 2, "exactly two open conflicts across the whole board, as demoed");

/* ------------------------------------------------------------------ */
section("assessConflictSeverity — rule-based conflict risk evaluation");
/* ------------------------------------------------------------------ */

const testResources = [
  { id: "drv-ramesh", type: "Driver", name: "Ramesh Yadav" },
  { id: "drv-suresh", type: "Driver", name: "Suresh Patil" },
  { id: "veh-1", type: "Vehicle", name: "MH-04-1121" }
];

const pendingBk = {
  id: "bk-new",
  resourceId: "drv-ramesh",
  tripName: "Lonavala Weekend",
  customer: "Mehta Group",
  startDate: "2026-10-13",
  endDate: "2026-10-13"
};

const overlapsSingle = [
  { id: "bk-1", resourceId: "drv-ramesh", tripName: "Goa Beach Circuit", customer: "Sharma Family", startDate: "2026-10-12", endDate: "2026-10-14" }
];

const sevSingle = ConflictEngine.assessConflictSeverity(pendingBk, overlapsSingle, overlapsSingle, testResources);
assertEqual(sevSingle.level, "MEDIUM", "Single overlap assesses as MEDIUM severity");

const overlapsMultiple = [
  { id: "bk-1", resourceId: "drv-ramesh", tripName: "Goa Beach Circuit", customer: "Sharma Family", startDate: "2026-10-12", endDate: "2026-10-14" },
  { id: "bk-2", resourceId: "drv-ramesh", tripName: "City Tour", customer: "Verma Family", startDate: "2026-10-13", endDate: "2026-10-13" }
];
const sevMultiple = ConflictEngine.assessConflictSeverity(pendingBk, overlapsMultiple, overlapsMultiple, testResources);
assertEqual(sevMultiple.level, "CRITICAL", "Driver/Vehicle with multiple overlaps assesses as CRITICAL severity");

const sevNone = ConflictEngine.assessConflictSeverity(pendingBk, [], [], testResources);
assertEqual(sevNone.level, "NONE", "Zero overlaps returns NONE severity");

/* ------------------------------------------------------------------ */
console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}