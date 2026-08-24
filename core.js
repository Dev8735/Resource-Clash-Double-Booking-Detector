/**
 * Core scheduling logic — deliberately kept free of any DOM/browser
 * dependency so it can be unit tested directly with plain Node, the same
 * way the server-side logic in the other prototype is tested.
 *
 * Exposed as `window.RCBDCore` in the browser and as `module.exports` under
 * Node, so the exact same code that ships to the browser is what gets
 * tested.
 */
(function (root, factory) {
    const mod = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = mod;
    } else {
        root.RCBDCore = mod;
    }
})(typeof self !== 'undefined' ? self : this, function () {

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

    function todayIso() {
        return isoDate(new Date());
    }

    /** Standard inclusive date-range overlap check. */
    function overlaps(aStart, aEnd, bStart, bEnd) {
        return aStart <= bEnd && bStart <= aEnd;
    }

    /** Find existing bookings for a resource that overlap a given date range. */
    function findConflicts(bookings, resourceId, startDate, endDate, excludeBookingId) {
        return bookings.filter(
            (b) =>
                b.resourceId === resourceId &&
                b.id !== excludeBookingId &&
                overlaps(b.startDate, b.endDate, startDate, endDate)
        );
    }

    /** Suggest other resources of the same type that are free for the range. */
    function suggestAlternatives(resources, bookings, type, startDate, endDate, excludeResourceId) {
        return resources
            .filter((r) => r.type === type && r.id !== excludeResourceId)
            .filter((r) => findConflicts(bookings, r.id, startDate, endDate, null).length === 0)
            .map((r) => ({ id: r.id, name: r.name }));
    }

    /** Validate a proposed booking's dates. Returns { valid, message }. */
    function validateBookingDates(startDate, endDate, today) {
        const referenceToday = today || todayIso();

        if (!startDate || !endDate) {
            return { valid: false, message: 'Enter both a start date and an end date.' };
        }
        if (startDate < referenceToday) {
            return { valid: false, message: 'Enter a valid start date — bookings cannot start in the past.' };
        }
        if (endDate < startDate) {
            return { valid: false, message: 'End date must be on or after the start date.' };
        }
        return { valid: true, message: '' };
    }

    /** Build a resource x date grid with status per cell. */
    function buildSchedule(resources, bookings, startDate, days) {
        const dates = [];
        for (let i = 0; i < days; i++) {
            dates.push(isoDate(addDays(new Date(startDate + 'T00:00:00'), i)));
        }

        const grid = resources.map((r) => {
            const cells = dates.map((date) => {
                const bookingsOnDate = bookings.filter(
                    (b) => b.resourceId === r.id && b.startDate <= date && date <= b.endDate
                );
                let status = 'available';
                if (bookingsOnDate.length === 1) status = 'booked';
                if (bookingsOnDate.length > 1) status = 'conflict';
                return { date, status, bookings: bookingsOnDate };
            });
            return { resourceId: r.id, resourceName: r.name, resourceType: r.type, cells };
        });

        return { dates, grid };
    }

    /**
     * Rule-based (not ML) demand-pressure heuristic: a day is "high pressure"
     * if at least half of all resources are booked/conflicted, or if any
     * conflict exists that day at all. Explicitly labeled as heuristic in the
     * UI — see README.
     */
    function computePressureDays(schedule) {
        if (!schedule || schedule.grid.length === 0) return [];
        const total = schedule.grid.length;
        const days = [];

        schedule.dates.forEach((date, i) => {
            let bookedCount = 0;
            let hasConflict = false;
            for (const row of schedule.grid) {
                const cell = row.cells[i];
                if (!cell) continue;
                if (cell.status === 'booked' || cell.status === 'conflict') bookedCount++;
                if (cell.status === 'conflict') hasConflict = true;
            }
            if (hasConflict || bookedCount / total >= 0.5) {
                days.push({ date, bookedCount, total, hasConflict });
            }
        });

        return days;
    }

    /**
     * Utilization analytics: for each resource, the percentage of the visible
     * schedule window it's booked (booked or conflicted counts as utilized).
     * Sorted descending so the busiest resources surface first.
     */
    function computeUtilization(schedule) {
        if (!schedule || schedule.grid.length === 0) return [];
        const totalDays = schedule.dates.length;

        return schedule.grid
            .map((row) => {
                const busyDays = row.cells.filter((c) => c.status === 'booked' || c.status === 'conflict').length;
                const conflictDays = row.cells.filter((c) => c.status === 'conflict').length;
                return {
                    resourceId: row.resourceId,
                    resourceName: row.resourceName,
                    resourceType: row.resourceType,
                    busyDays,
                    totalDays,
                    conflictDays,
                    utilizationPct: totalDays === 0 ? 0 : Math.round((busyDays / totalDays) * 100),
                };
            })
            .sort((a, b) => b.utilizationPct - a.utilizationPct);
    }

    /** Escape a single CSV field per RFC 4180 (quote if it contains a comma, quote, or newline). */
    function csvEscape(value) {
        const str = String(value == null ? '' : value);
        if (/[",\n]/.test(str)) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    /** Convert bookings (with resolved resource names) into a CSV string. */
    function bookingsToCsv(bookings, resources) {
        const resourceById = {};
        resources.forEach((r) => (resourceById[r.id] = r));

        const header = ['Trip Name', 'Customer', 'Resource', 'Type', 'Start Date', 'End Date'];
        const lines = [header.map(csvEscape).join(',')];

        const sorted = [...bookings].sort((a, b) => a.startDate.localeCompare(b.startDate));
        sorted.forEach((b) => {
            const resource = resourceById[b.resourceId];
            const row = [
                b.tripName,
                b.customer || '',
                resource ? resource.name : b.resourceId,
                resource ? resource.type : '',
                b.startDate,
                b.endDate,
            ];
            lines.push(row.map(csvEscape).join(','));
        });

        return lines.join('\r\n');
    }

    return {
        isoDate,
        addDays,
        todayIso,
        overlaps,
        findConflicts,
        suggestAlternatives,
        validateBookingDates,
        buildSchedule,
        computePressureDays,
        computeUtilization,
        csvEscape,
        bookingsToCsv,
    };
});
