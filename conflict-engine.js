/**
 * conflict-engine.js
 *
 * Pure, dependency-free date-overlap logic for the Resource Clash &
 * Double-Booking Detector. Deliberately kept separate from app.js (which
 * only handles DOM/rendering) so the SAME code that runs in the browser is
 * exactly what tests.js exercises — there is no separate "test version" of
 * the logic to drift out of sync with the real app.
 *
 * Wrapped in an IIFE so its internal helper functions never leak onto
 * `window` — plain <script> tags share one global scope, so without this,
 * a same-named function declared later in app.js would silently overwrite
 * conflict-engine's own internal functions and corrupt its results.
 *
 * Works unmodified in the browser (attaches to window.ConflictEngine) and
 * in Node (module.exports).
 */
(function (root) {
  /**
   * Do two inclusive date ranges [startA, endA] and [startB, endB] overlap?
   * Dates are ISO strings "YYYY-MM-DD", which compare correctly as plain
   * strings because the format is fixed-width and zero-padded.
   */
  function rangesOverlap(startA, endA, startB, endB) {
    return startA <= endB && startB <= endA;
  }

  /**
   * All bookings for `resourceId` that overlap [start, end], excluding the
   * booking with id `excludeBookingId` (used when re-checking an existing
   * booking against itself).
   */
  function findOverlaps(bookings, resourceId, start, end, excludeBookingId) {
    return bookings.filter(
      (b) =>
        b.resourceId === resourceId &&
        b.id !== excludeBookingId &&
        rangesOverlap(b.startDate, b.endDate, start, end)
    );
  }

  /**
   * Resources of `type` that have ZERO booking overlapping [start, end].
   * `excludeResourceId` lets the currently-requested resource be skipped
   * (it's already known to conflict — that's why we're looking for alternatives).
   */
  function findAvailableAlternatives(resources, bookings, type, start, end, excludeResourceId) {
    return resources.filter((r) => {
      if (r.type !== type || r.id === excludeResourceId) return false;
      return findOverlaps(bookings, r.id, start, end).length === 0;
    });
  }

  /**
   * Map of `${resourceId}|${date}` -> number of bookings covering that date.
   * A count of 2+ means a genuine double-booking on that resource, that day.
   */
  function computeConflictMap(bookings) {
    const map = {};
    for (const b of bookings) {
      let d = new Date(b.startDate + "T00:00:00");
      const end = new Date(b.endDate + "T00:00:00");
      // Guard against a malformed/inverted range looping forever.
      let safety = 0;
      while (d <= end && safety < 3660) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const key = `${b.resourceId}|${y}-${m}-${day}`;
        map[key] = (map[key] || 0) + 1;
        d.setDate(d.getDate() + 1);
        safety++;
      }
    }
    return map;
  }

  /** Total count of (resource, date) cells that are currently double-booked or worse. */
  function countOpenConflicts(bookings) {
    const map = computeConflictMap(bookings);
    return Object.values(map).filter((c) => c > 1).length;
  }

  /**
   * Rule-based conflict risk and severity assessment.
   * Evaluates operational impact, affected dependencies, and recommended actions.
   */
  function assessConflictSeverity(pendingBooking, overlaps, allBookings, allResources) {
    if (!overlaps || overlaps.length === 0) {
      return {
        level: "NONE",
        label: "NONE",
        color: "var(--accent)",
        reason: "No scheduling conflict detected.",
        impacts: ["Resource is fully available for selected dates."],
        recommendedAction: "Proceed with booking confirmation."
      };
    }

    const res = allResources ? allResources.find((r) => r.id === pendingBooking.resourceId) : null;
    const resName = res ? res.name : "Resource";
    const resType = res ? res.type : "Resource";

    // Check if there are other conflicts occurring for the SAME trip across other resources
    const sameTripOtherConflicts = (allBookings || []).filter(
      (b) => b.tripName === pendingBooking.tripName && b.resourceId !== pendingBooking.resourceId
    ).some((b) => findOverlaps(allBookings, b.resourceId, b.startDate, b.endDate, b.id).length > 0);

    const isDriverOrVehicle = resType === "Driver" || resType === "Vehicle";

    let level = "MEDIUM";
    const impacts = [];

    impacts.push(`1 ${resType.toLowerCase()} unavailable (${resName})`);
    impacts.push(`${overlaps.length + 1} overlapping bookings affected`);

    let reason = `${resName} is already assigned to another booking during the selected date range.`;

    if (sameTripOtherConflicts) {
      level = "CRITICAL";
      impacts.push("Multiple operational dependencies affected");
      impacts.push("High risk of immediate trip cancellation/delay");
      reason = `Critical clash: Multiple operational dependencies conflicting for "${pendingBooking.tripName}".`;
    } else if (isDriverOrVehicle && overlaps.length > 1) {
      level = "CRITICAL";
      impacts.push("Primary transport resource has multiple clashes");
      impacts.push("Severe schedule disruption across itineraries");
      reason = `${resName} (${resType}) has multiple overlapping assignments.`;
    } else if (overlaps.length > 1) {
      level = "HIGH";
      impacts.push("Resource requested for multiple concurrent trips");
      reason = `${resName} has multiple overlapping bookings on selected dates.`;
    } else if (overlaps.length === 1) {
      level = "MEDIUM";
      impacts.push("Schedule overlap between 2 bookings");
    }

    const colorMap = {
      LOW: "#ffb74d",
      MEDIUM: "#ff9800",
      HIGH: "#ff5722",
      CRITICAL: "#ff1744"
    };

    return {
      level,
      label: level,
      color: colorMap[level] || "#ff5722",
      reason,
      impacts,
      recommendedAction: `Switch to an available alternative ${resType.toLowerCase()} to prevent trip disruption.`
    };
  }

  const ConflictEngine = {
    rangesOverlap,
    findOverlaps,
    findAvailableAlternatives,
    computeConflictMap,
    countOpenConflicts,
    assessConflictSeverity,
  };

  /* UMD-style export: Node (tests.js) gets module.exports, browser gets window.ConflictEngine */
  if (typeof module !== "undefined" && module.exports) {
    module.exports = ConflictEngine;
  } else {
    root.ConflictEngine = ConflictEngine;
  }
})(typeof window !== "undefined" ? window : globalThis);