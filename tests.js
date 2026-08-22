// tests.js - Automated test suite

// Test runner
let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function test(name, fn) {
  try {
    fn();
    testsPassed++;
    testResults.push({ name, status: 'PASS', error: null });
    console.log(`âœ“ ${name}`);
  } catch (error) {
    testsFailed++;
    testResults.push({ name, status: 'FAIL', error: error.message });
    console.error(`âœ— ${name}`);
    console.error(`  ${error.message}`);
  }
}

// Test suite

test('Conflict detection - no overlap', () => {
  const bookings = [
    { id: 1, resource: 'Driver A', start: '2024-10-01', end: '2024-10-03' }
  ];
  const result = detectConflict('2024-10-05', '2024-10-07', 'Driver A', bookings);
  assert(!result.hasConflict, 'Should not detect conflict for non-overlapping dates');
});

test('Conflict detection - partial overlap', () => {
  const bookings = [
    { id: 1, resource: 'Driver A', start: '2024-10-01', end: '2024-10-05' }
  ];
  const result = detectConflict('2024-10-03', '2024-10-07', 'Driver A', bookings);
  assert(result.hasConflict, 'Should detect conflict for overlapping dates');
  assertEqual(result.conflicts.length, 1, 'Should find one conflicting booking');
});

test('Conflict detection - full overlap', () => {
  const bookings = [
    { id: 1, resource: 'Driver A', start: '2024-10-01', end: '2024-10-10' }
  ];
  const result = detectConflict('2024-10-02', '2024-10-08', 'Driver A', bookings);
  assert(result.hasConflict, 'Should detect full overlap conflict');
});

test('Conflict detection - same start date', () => {
  const bookings = [
    { id: 1, resource: 'Driver A', start: '2024-10-05', end: '2024-10-08' }
  ];
  const result = detectConflict('2024-10-05', '2024-10-07', 'Driver A', bookings);
  assert(result.hasConflict, 'Should detect conflict when dates start same');
});

test('Conflict detection - same end date', () => {
  const bookings = [
    { id: 1, resource: 'Driver A', start: '2024-10-01', end: '2024-10-08' }
  ];
  const result = detectConflict('2024-10-06', '2024-10-08', 'Driver A', bookings);
  assert(result.hasConflict, 'Should detect conflict when dates end same');
});

test('Conflict detection - different resource', () => {
  const bookings = [
    { id: 1, resource: 'Driver A', start: '2024-10-01', end: '2024-10-05' }
  ];
  const result = detectConflict('2024-10-01', '2024-10-05', 'Driver B', bookings);
  assert(!result.hasConflict, 'Should not detect conflict for different resources');
});

test('Date validation - valid dates', () => {
  const result = validateDates('2024-10-05', '2024-10-10');
  assert(result.valid, 'Should validate correct date range');
});

test('Date validation - start after end', () => {
  const result = validateDates('2024-10-10', '2024-10-05');
  assert(!result.valid, 'Should reject when start is after end');
});

test('Date validation - same start and end', () => {
  const result = validateDates('2024-10-05', '2024-10-05');
  assert(!result.valid, 'Should reject when start equals end');
});

test('Alternative resource finding', () => {
  const resources = [
    { id: 'Driver A', type: 'Driver' },
    { id: 'Driver B', type: 'Driver' },
    { id: 'Driver C', type: 'Driver' }
  ];
  const bookings = [
    { id: 1, resource: 'Driver A', start: '2024-10-05', end: '2024-10-08' }
  ];
  const alternatives = findAlternatives('Driver', '2024-10-05', '2024-10-08', 'Driver A', resources, bookings);
  assert(alternatives.length > 0, 'Should find alternative resources');
  assert(!alternatives.includes('Driver A'), 'Should not include conflicted resource');
});

test('Resource availability check - available', () => {
  const bookings = [
    { id: 1, resource: 'Driver A', start: '2024-10-01', end: '2024-10-03' }
  ];
  const available = isAvailable('Driver A', '2024-10-05', '2024-10-07', bookings);
  assert(available, 'Should report resource as available');
});

test('Resource availability check - not available', () => {
  const bookings = [
    { id: 1, resource: 'Driver A', start: '2024-10-05', end: '2024-10-08' }
  ];
  const available = isAvailable('Driver A', '2024-10-06', '2024-10-07', bookings);
  assert(!available, 'Should report resource as not available');
});

test('Severity calculation - no conflict', () => {
  const severity = calculateSeverity(0);
  assertEqual(severity.level, 'none', 'Zero conflicts should be none');
});

test('Severity calculation - one conflict', () => {
  const severity = calculateSeverity(1);
  assertEqual(severity.level, 'medium', 'One conflict should be medium');
});

test('Severity calculation - two conflicts', () => {
  const severity = calculateSeverity(2);
  assertEqual(severity.level, 'high', 'Two conflicts should be high');
});

test('Severity calculation - three+ conflicts', () => {
  const severity = calculateSeverity(3);
  assertEqual(severity.level, 'critical', 'Three+ conflicts should be critical');
});

test('Multiple overlapping bookings', () => {
  const bookings = [
    { id: 1, resource: 'Driver A', start: '2024-10-01', end: '2024-10-05' },
    { id: 2, resource: 'Driver A', start: '2024-10-03', end: '2024-10-08' },
    { id: 3, resource: 'Driver A', start: '2024-10-06', end: '2024-10-10' }
  ];
  const result = detectConflict('2024-10-02', '2024-10-07', 'Driver A', bookings);
  assert(result.hasConflict, 'Should detect multiple overlaps');
  assertEqual(result.conflicts.length, 3, 'Should find all three conflicting bookings');
});

test('Date validation - missing start date', () => {
  const result = validateDates('', '2024-10-10');
  assert(!result.valid, 'Should reject missing start date');
});

test('Date validation - missing end date', () => {
  const result = validateDates('2024-10-05', '');
  assert(!result.valid, 'Should reject missing end date');
});

test('Date range overlap calculation', () => {
  const overlap = daysOverlap('2024-10-01', '2024-10-05', '2024-10-03', '2024-10-07');
  assert(overlap, 'Should detect overlapping ranges');
});

test('Date range no overlap calculation', () => {
  const overlap = daysOverlap('2024-10-01', '2024-10-03', '2024-10-05', '2024-10-07');
  assert(!overlap, 'Should not detect overlap for consecutive dates');
});

test('Valid date string check', () => {
  const valid = isValidDateString('2024-10-05');
  assert(valid, 'Should validate ISO date string');
});

test('Invalid date string check', () => {
  const valid = isValidDateString('not-a-date');
  assert(!valid, 'Should reject invalid date string');
});

test('Edge case - booking ends exactly when new starts', () => {
  const bookings = [
    { id: 1, resource: 'Driver A', start: '2024-10-01', end: '2024-10-05' }
  ];
  const result = detectConflict('2024-10-05', '2024-10-08', 'Driver A', bookings);
  assert(!result.hasConflict, 'Should not conflict when boundaries touch');
});

test('Resource utilization calculation', () => {
  const bookings = [
    { id: 1, resource: 'Driver A', start: '2024-10-01', end: '2024-10-05' },
    { id: 2, resource: 'Driver A', start: '2024-10-06', end: '2024-10-10' }
  ];
  const start = new Date('2024-10-01');
  const end = new Date('2024-10-10');
  const util = getResourceUtilization('Driver A', start, end, bookings);
  assert(util >= 0 && util <= 100, 'Utilization should be between 0-100%');
});

// Print summary
console.log('\n=== TEST SUMMARY ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

if (testsFailed === 0) {
  console.log('\nâœ“ All tests passed!');
} else {
  console.log(`\nâœ— ${testsFailed} test(s) failed`);
  process.exit(1);
}