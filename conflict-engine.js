// conflict-engine.js - Core conflict detection algorithm

function detectConflict(newStart, newEnd, resource, allBookings) {
  const newStartDate = new Date(newStart);
  const newEndDate = new Date(newEnd);

  const conflicts = allBookings.filter(booking => {
    if (booking.resource !== resource) return false;
    const existingStart = new Date(booking.start);
    const existingEnd = new Date(booking.end);

    // Two date ranges conflict if: start1 < end2 AND start2 < end1
    return newStartDate < existingEnd && newEndDate > existingStart;
  });

  return {
    hasConflict: conflicts.length > 0,
    conflicts: conflicts,
    severity: calculateSeverity(conflicts.length)
  };
}

function calculateSeverity(conflictCount) {
  if (conflictCount === 0) return { level: 'none', label: 'NO CONFLICT' };
  if (conflictCount === 1) return { level: 'medium', label: 'MEDIUM' };
  if (conflictCount === 2) return { level: 'high', label: 'HIGH' };
  return { level: 'critical', label: 'CRITICAL' };
}

function findAlternatives(resourceType, start, end, excludeResource, allResources, allBookings) {
  const alternatives = [];

  allResources.forEach(resource => {
    if (!resource.id.includes(resourceType) || resource.id === excludeResource) return;

    const hasConflict = allBookings.some(booking => {
      if (booking.resource !== resource.id) return false;
      const bookingStart = new Date(booking.start);
      const bookingEnd = new Date(booking.end);
      const newStart = new Date(start);
      const newEnd = new Date(end);

      return newStart < bookingEnd && newEnd > bookingStart;
    });

    if (!hasConflict) {
      alternatives.push(resource.id);
    }
  });

  return alternatives;
}

function isAvailable(resourceId, start, end, allBookings) {
  return !allBookings.some(booking => {
    if (booking.resource !== resourceId) return false;
    const bookingStart = new Date(booking.start);
    const bookingEnd = new Date(booking.end);
    const newStart = new Date(start);
    const newEnd = new Date(end);

    return newStart < bookingEnd && newEnd > bookingStart;
  });
}

function getResourceUtilization(resourceId, startDate, endDate, allBookings) {
  const daysDuration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const bookings = allBookings.filter(b => b.resource === resourceId);

  let bookedDays = 0;
  bookings.forEach(booking => {
    const bStart = new Date(booking.start);
    const bEnd = new Date(booking.end);
    const overlapStart = Math.max(startDate, bStart);
    const overlapEnd = Math.min(endDate, bEnd);

    if (overlapStart < overlapEnd) {
      bookedDays += Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
    }
  });

  return daysDuration > 0 ? (bookedDays / daysDuration) * 100 : 0;
}