/**
 * app.js
 * Resource Clash & Double-Booking Detector — client-side controller logic.
 *
 * Everything runs in the browser against an in-memory + localStorage store.
 * Delegates to conflict-engine.js for mathematical date-overlap checks.
 */

let state = loadState() || freshState();
let boardStartDate = dayOffset(0);
const BOARD_DAYS = 7;
let currentView = "grid"; // "grid" or "timeline"
let lastCanceledBooking = null; // Store last canceled booking for Ctrl+Z undo
let demoTimeoutIds = []; // Track demo tour timeouts for clean cancellation

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheEls();
  bindEvents();
  populateResourceTypeFilter();
  populateBookingFormOptions();
  renderAll();
});

function cacheEls() {
  els.board = document.getElementById("board-container");
  els.boardRangeLabel = document.getElementById("week-label");
  els.statBookings = document.getElementById("stat-bookings");
  els.statConflicts = document.getElementById("stat-conflicts");
  els.statResolved = document.getElementById("stat-resolved");
  els.statResources = document.getElementById("stat-resources");
  els.statUtilization = document.getElementById("stat-utilization");
  els.operationalSummary = document.getElementById("operational-summary");
  els.alertFeed = document.getElementById("conflict-feed");
  els.forecastList = document.getElementById("pressure-panel");
  els.bookingForm = document.getElementById("booking-form");
  els.formType = document.getElementById("form-type");
  els.formResource = document.getElementById("form-resource");
  els.formNewResourceWrap = document.getElementById("form-new-resource-wrap");
  els.formNewResourceName = document.getElementById("form-new-resource-name");
  els.formTrip = document.getElementById("form-trip");
  els.formCustomer = document.getElementById("form-customer");
  els.formStart = document.getElementById("form-start");
  els.formEnd = document.getElementById("form-end");
  els.formFeedback = document.getElementById("form-feedback");
  els.conflictModal = document.getElementById("conflict-modal");
  els.conflictModalBody = document.getElementById("conflict-modal-body");
  els.conflictSeverityBadge = document.getElementById("conflict-severity-badge");
  els.conflictProceedBtn = document.getElementById("conflict-proceed-btn");
  els.conflictSwitchBtn = document.getElementById("conflict-switch-btn");
  els.conflictViewScheduleBtn = document.getElementById("conflict-view-schedule-btn");
  els.conflictCancelBtn = document.getElementById("conflict-cancel-btn");
  els.inspectModal = document.getElementById("inspect-modal");
  els.inspectModalBody = document.getElementById("inspect-modal-body");
  els.inspectCloseBtn = document.getElementById("inspect-close-btn");
  els.resetBtn = document.getElementById("reset-btn");
  els.printBtn = document.getElementById("print-btn");
  els.prevWeekBtn = document.getElementById("prev-week-btn");
  els.todayBtn = document.getElementById("today-btn");
  els.nextWeekBtn = document.getElementById("next-week-btn");
  els.typeFilter = document.getElementById("type-filter");
  els.clock = document.getElementById("live-clock");
  els.searchInput = document.getElementById("search-input");
  els.viewGridBtn = document.getElementById("view-grid-btn");
  els.viewTimelineBtn = document.getElementById("view-timeline-btn");
  els.bookingsList = document.getElementById("bookings-list");
  els.resourceForm = document.getElementById("resource-form");
  els.newResourceType = document.getElementById("new-resource-type");
  els.newResourceName = document.getElementById("new-resource-name");
  els.demoBtn = document.getElementById("demo-btn");
}

function bindEvents() {
  els.formType.addEventListener("change", () => {
    populateResourceOptionsForType(els.formType.value);
  });
  els.formResource.addEventListener("change", toggleNewResourceField);
  els.bookingForm.addEventListener("submit", onSubmitBooking);
  els.resourceForm.addEventListener("submit", onAddResourceOnly);
  els.resetBtn.addEventListener("click", onResetDemo);
  els.printBtn.addEventListener("click", () => window.print());
  els.prevWeekBtn.addEventListener("click", () => shiftBoard(-BOARD_DAYS));
  els.nextWeekBtn.addEventListener("click", () => shiftBoard(BOARD_DAYS));
  els.todayBtn.addEventListener("click", () => {
    boardStartDate = dayOffset(0);
    renderBoard();
  });
  els.typeFilter.addEventListener("change", renderBoard);
  if (els.searchInput) {
    els.searchInput.addEventListener("input", renderBoard);
  }
  if (els.demoBtn) {
    els.demoBtn.addEventListener("click", runDemoTour);
  }

  // Grid/Timeline Toggle listeners
  if (els.viewGridBtn) {
    els.viewGridBtn.addEventListener("click", () => {
      currentView = "grid";
      els.viewGridBtn.classList.add("active");
      els.viewTimelineBtn.classList.remove("active");
      renderBoard();
    });
  }
  if (els.viewTimelineBtn) {
    els.viewTimelineBtn.addEventListener("click", () => {
      currentView = "timeline";
      els.viewTimelineBtn.classList.add("active");
      els.viewGridBtn.classList.remove("active");
      renderBoard();
    });
  }

  // Modal Actions
  els.conflictCancelBtn.addEventListener("click", closeConflictModal);
  els.inspectCloseBtn.addEventListener("click", closeInspectModal);
  if (els.conflictViewScheduleBtn) {
    els.conflictViewScheduleBtn.addEventListener("click", () => {
      closeConflictModal();
      if (els.board) els.board.scrollIntoView({ behavior: "smooth" });
    });
  }
  
  els.conflictProceedBtn.addEventListener("click", () => {
    if (!pendingConflict) return;
    const booking = { ...pendingConflict.pendingBooking, status: "CONFLICT" };
    commitBooking(booking);
    showFormError("Booked anyway — marked with status CONFLICT.");
    showToast("Booked anyway — status marked as CONFLICT.", "error");
    closeConflictModal();
  });

  els.conflictSwitchBtn.addEventListener("click", () => {
    if (!pendingConflict || pendingConflict.alternatives.length === 0) return;
    const alt = pendingConflict.alternatives[0];
    const oldResName = pendingConflict.resource ? pendingConflict.resource.name : "requested resource";
    const booking = {
      ...pendingConflict.pendingBooking,
      id: `bk-${Date.now()}`,
      resourceId: alt.id,
      status: "RESOLVED"
    };
    commitBooking(booking);
    
    // Add dynamic resolution alert
    const timeStr = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    state.alerts.push({
      time: timeStr,
      text: `Conflict resolved: Driver/Resource changed from ${oldResName} to ${alt.name} for "${booking.tripName}". Status set to RESOLVED.`
    });
    saveState(state);
    
    showFormSuccess(`✓ Conflict resolved: ${alt.name} assigned.`);
    showToast(`Conflict resolved successfully. Alternative resource assigned (${alt.name}).`, "success");
    closeConflictModal();
  });

  // Global Keyboard Shortcuts
  document.addEventListener("keydown", handleKeyboardShortcuts);

  updateClock();
  setInterval(updateClock, 1000 * 30);
}

function updateClock() {
  const now = new Date();
  els.clock.textContent = now.toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/* ---------------------------------------------------------------------- */
/* Date helpers (board-relative)                                          */
/* ---------------------------------------------------------------------- */

function shiftBoard(days) {
  const d = new Date(boardStartDate + "T00:00:00");
  d.setDate(d.getDate() + days);
  const today = dayOffset(0);
  const candidate = fmtDate(d);
  boardStartDate = candidate < today ? today : candidate;
  renderBoard();
}

function boardDates() {
  const out = [];
  const start = new Date(boardStartDate + "T00:00:00");
  for (let i = 0; i < BOARD_DAYS; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(fmtDate(d));
  }
  return out;
}

/* ---------------------------------------------------------------------- */
/* Core conflict-detection logic delegation                                */
/* ---------------------------------------------------------------------- */

function findOverlaps(resourceId, start, end, excludeBookingId) {
  return ConflictEngine.findOverlaps(state.bookings, resourceId, start, end, excludeBookingId);
}

function findAvailableAlternatives(type, start, end, excludeResourceId) {
  return ConflictEngine.findAvailableAlternatives(state.resources, state.bookings, type, start, end, excludeResourceId);
}

function computeConflictMap() {
  return ConflictEngine.computeConflictMap(state.bookings);
}

/* ---------------------------------------------------------------------- */
/* Rendering                                                              */
/* ---------------------------------------------------------------------- */

function renderAll() {
  renderBoard();
  renderStats();
  renderOperationalSummary();
  renderAlerts();
  renderForecast();
  renderBookings();
}

function renderBoard() {
  const dates = boardDates();
  const today = dayOffset(0);
  els.prevWeekBtn.disabled = (dates[0] <= today);
  const first = new Date(dates[0] + "T00:00:00");
  const last = new Date(dates[dates.length - 1] + "T00:00:00");
  els.boardRangeLabel.textContent = `${first.toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${last.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  const typeFilterVal = els.typeFilter.value;
  const conflictMap = computeConflictMap();

  let resources = state.resources;
  if (typeFilterVal !== "all") {
    resources = resources.filter((r) => r.type.toLowerCase() === typeFilterVal.toLowerCase());
  }

  // Filter resources based on Search Input
  const searchQuery = els.searchInput ? els.searchInput.value.toLowerCase().trim() : "";
  if (searchQuery) {
    resources = resources.filter(
      (r) =>
        r.name.toLowerCase().includes(searchQuery) ||
        r.type.toLowerCase().includes(searchQuery)
    );
  }

  if (currentView === "grid") {
    renderGridView(resources, dates, conflictMap);
  } else {
    renderTimelineView(resources, dates);
  }
}

function renderGridView(resources, dates, conflictMap) {
  const table = document.createElement("table");
  table.className = "board-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const cornerTh = document.createElement("th");
  cornerTh.textContent = "Resource";
  cornerTh.className = "corner-cell";
  headRow.appendChild(cornerTh);
  for (const date of dates) {
    const th = document.createElement("th");
    const d = new Date(date + "T00:00:00");
    const isToday = date === dayOffset(0);
    th.innerHTML = `<span class="day-name">${d.toLocaleDateString(undefined, { weekday: "short" })}</span><span class="day-num">${d.getDate()}</span>`;
    if (isToday) th.classList.add("is-today");
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  if (resources.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = dates.length + 1;
    td.className = "empty-row";
    td.textContent = "No matching resources found.";
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const resource of resources) {
    const tr = document.createElement("tr");
    const nameTd = document.createElement("td");
    nameTd.className = "resource-cell";
    nameTd.innerHTML = `<span class="type-badge ${resource.type.toLowerCase()}">${resource.type}</span><span class="resource-name">${resource.name}</span>`;
    tr.appendChild(nameTd);

    for (const date of dates) {
      const td = document.createElement("td");
      const key = `${resource.id}|${date}`;
      const count = conflictMap[key] || 0;
      const bookingsForCell = state.bookings.filter(
        (b) => b.resourceId === resource.id && b.startDate <= date && date <= b.endDate
      );

      let cellClass = "status-available";
      let label = "Open";
      if (count > 1) {
        cellClass = "status-conflict";
        label = "Conflict!";
      } else if (count === 1) {
        const isResolvedCell = bookingsForCell.some(b => b.status === "RESOLVED");
        if (isResolvedCell) {
          cellClass = "status-resolved";
          label = "✓ Resolved";
        } else {
          cellClass = "status-booked";
          label = "Booked";
        }
      }
      td.className = `board-cell ${cellClass}`;
      td.innerHTML = `<span class="cell-label">${label}</span>`;
      if (bookingsForCell.length) {
        const tripNames = bookingsForCell.map((b) => `${b.tripName} (${b.customer}) [${b.status || 'CONFIRMED'}]`).join(" + ");
        td.title = tripNames;
      }
      if (count > 1) {
        td.setAttribute("role", "button");
        td.setAttribute("tabindex", "0");
        td.setAttribute("aria-label", `Conflict on ${resource.name}, ${date} — click for details`);
        td.addEventListener("click", () => openInspectModal(resource.id, date));
        td.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openInspectModal(resource.id, date);
          }
        });
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  els.board.innerHTML = "";
  els.board.appendChild(table);
}

function renderTimelineView(resources, dates) {
  const container = document.createElement("div");
  container.className = "timeline-view";

  // Create timeline headers
  const headerRow = document.createElement("div");
  headerRow.className = "timeline-header-row";
  
  const labelHeader = document.createElement("div");
  labelHeader.className = "timeline-label-header";
  labelHeader.textContent = "Resource";
  headerRow.appendChild(labelHeader);

  const tracksHeader = document.createElement("div");
  tracksHeader.className = "timeline-tracks-header";
  
  for (const date of dates) {
    const d = new Date(date + "T00:00:00");
    const dayCol = document.createElement("div");
    dayCol.className = "timeline-header-day";
    if (date === dayOffset(0)) dayCol.classList.add("is-today");
    dayCol.innerHTML = `<span class="day-name">${d.toLocaleDateString(undefined, { weekday: "short" })}</span><span class="day-num">${d.getDate()}</span>`;
    tracksHeader.appendChild(dayCol);
  }
  headerRow.appendChild(tracksHeader);
  container.appendChild(headerRow);

  if (resources.length === 0) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = "No matching resources found.";
    container.appendChild(empty);
    els.board.innerHTML = "";
    els.board.appendChild(container);
    return;
  }

  // Create tracks for each resource
  for (const resource of resources) {
    const row = document.createElement("div");
    row.className = "timeline-row";

    // Label column
    const labelDiv = document.createElement("div");
    labelDiv.className = "timeline-label";
    labelDiv.innerHTML = `<span class="type-badge ${resource.type.toLowerCase()}">${resource.type}</span><span class="resource-name">${resource.name}</span>`;
    row.appendChild(labelDiv);

    // Track column
    const trackDiv = document.createElement("div");
    trackDiv.className = "timeline-track";

    // Find bookings overlapping current week
    const weekStart = dates[0];
    const weekEnd = dates[dates.length - 1];

    const bookingsForResource = state.bookings.filter(
      (b) =>
        b.resourceId === resource.id &&
        ConflictEngine.rangesOverlap(b.startDate, b.endDate, weekStart, weekEnd)
    );

    for (const b of bookingsForResource) {
      // Find intersection date range
      const startIntersect = b.startDate < weekStart ? weekStart : b.startDate;
      const endIntersect = b.endDate > weekEnd ? weekEnd : b.endDate;

      // Calculate indices for percentage layout
      const startIndex = dates.indexOf(startIntersect);
      const endIndex = dates.indexOf(endIntersect);
      
      if (startIndex !== -1 && endIndex !== -1) {
        const daysCount = endIndex - startIndex + 1;
        const leftPercent = (startIndex / 7) * 100;
        const widthPercent = (daysCount / 7) * 100;

        const bar = document.createElement("div");
        bar.className = "timeline-bar";
        
        // Find if this booking has a conflict
        const hasConflict = b.status === "CONFLICT" || findOverlaps(b.resourceId, b.startDate, b.endDate, b.id).length > 0;
        const isResolved = b.status === "RESOLVED" && !hasConflict;

        if (hasConflict) {
          bar.classList.add("conflict");
          bar.style.cursor = "pointer";
          bar.addEventListener("click", () => {
            let curr = new Date(b.startDate + "T00:00:00");
            const final = new Date(b.endDate + "T00:00:00");
            let inspectDate = b.startDate;
            while (curr <= final) {
              const dStr = fmtDate(curr);
              const count = state.bookings.filter(
                (ob) => ob.resourceId === resource.id && ob.startDate <= dStr && dStr <= ob.endDate
              ).length;
              if (count > 1) {
                inspectDate = dStr;
                break;
              }
              curr.setDate(curr.getDate() + 1);
            }
            openInspectModal(resource.id, inspectDate);
          });
        } else if (isResolved) {
          bar.style.background = "linear-gradient(135deg, rgba(0, 230, 118, 0.4), rgba(0, 212, 255, 0.4))";
          bar.style.borderColor = "var(--guide)";
        }

        bar.style.left = `${leftPercent}%`;
        bar.style.width = `${widthPercent}%`;
        bar.textContent = isResolved ? `✓ ${b.tripName}` : `${b.tripName} (${b.customer})`;
        bar.title = `${b.tripName} (${b.customer}) &middot; ${b.startDate} to ${b.endDate} [${b.status || 'CONFIRMED'}]`;
        trackDiv.appendChild(bar);
      }
    }
    row.appendChild(trackDiv);
    container.appendChild(row);
  }

  els.board.innerHTML = "";
  els.board.appendChild(container);
}

function renderStats() {
  const dates = boardDates();
  const conflictMap = computeConflictMap();
  
  const openConflicts = state.bookings.filter(b => b.status === "CONFLICT" || findOverlaps(b.resourceId, b.startDate, b.endDate, b.id).length > 0).length;
  const resolvedCount = state.bookings.filter(b => b.status === "RESOLVED").length;

  els.statBookings.textContent = state.bookings.length;
  els.statConflicts.textContent = openConflicts;
  if (els.statResolved) els.statResolved.textContent = resolvedCount;
  els.statResources.textContent = state.resources.length;

  const totalSlots = state.resources.length * dates.length;
  const bookedSlots = dates.reduce((sum, date) => {
    return (
      sum +
      state.resources.filter((r) => {
        const key = `${r.id}|${date}`;
        return (conflictMap[key] || 0) >= 1;
      }).length
    );
  }, 0);
  const utilization = totalSlots ? Math.round((bookedSlots / totalSlots) * 100) : 0;
  els.statUtilization.textContent = `${utilization}%`;

  els.statConflicts.parentElement.classList.toggle("stat-card--alert", openConflicts > 0);
}

function renderOperationalSummary() {
  if (!els.operationalSummary) return;

  const today = dayOffset(0);
  const availableTodayCount = state.resources.filter(r => {
    const overlapping = state.bookings.filter(b => b.resourceId === r.id && b.startDate <= today && today <= b.endDate);
    return overlapping.length === 0;
  }).length;

  const confirmedCount = state.bookings.filter(b => b.status === "CONFIRMED").length;
  const openConflictsCount = state.bookings.filter(b => b.status === "CONFLICT" || findOverlaps(b.resourceId, b.startDate, b.endDate, b.id).length > 0).length;
  const resolvedCount = state.bookings.filter(b => b.status === "RESOLVED").length;

  let criticalCount = 0;
  for (const b of state.bookings) {
    const overlaps = findOverlaps(b.resourceId, b.startDate, b.endDate, b.id);
    if (overlaps.length > 0) {
      const sev = ConflictEngine.assessConflictSeverity(b, overlaps, state.bookings, state.resources);
      if (sev.level === "CRITICAL") criticalCount++;
    }
  }

  els.operationalSummary.innerHTML = `
    <div class="summary-metric-card">
      <span class="summary-icon">🟢</span>
      <div class="summary-details">
        <span class="summary-val">${availableTodayCount}</span>
        <span class="summary-lbl">Resources Available</span>
      </div>
    </div>
    <div class="summary-metric-card">
      <span class="summary-icon">🔵</span>
      <div class="summary-details">
        <span class="summary-val">${confirmedCount}</span>
        <span class="summary-lbl">Confirmed Bookings</span>
      </div>
    </div>
    <div class="summary-metric-card">
      <span class="summary-icon">🟠</span>
      <div class="summary-details">
        <span class="summary-val">${openConflictsCount}</span>
        <span class="summary-lbl">Conflicts Detected</span>
      </div>
    </div>
    <div class="summary-metric-card">
      <span class="summary-icon">✓</span>
      <div class="summary-details">
        <span class="summary-val">${resolvedCount}</span>
        <span class="summary-lbl">Conflict Resolved</span>
      </div>
    </div>
    <div class="summary-metric-card" style="grid-column: span 2;">
      <span class="summary-icon">🔴</span>
      <div class="summary-details">
        <span class="summary-val">${criticalCount}</span>
        <span class="summary-lbl">Critical Issues</span>
      </div>
    </div>
  `;
}

function renderAlerts() {
  els.alertFeed.innerHTML = "";
  if (state.alerts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "feed-empty";
    empty.textContent = "No conflicts raised yet. The feed fills up the moment a clash is detected.";
    els.alertFeed.appendChild(empty);
    return;
  }
  for (const alert of state.alerts.slice().reverse()) {
    const div = document.createElement("div");
    div.className = "feed-item";
    if (alert.text.startsWith("Resolved") || alert.text.startsWith("Conflict resolved")) {
      div.style.background = "rgba(0, 230, 118, 0.08)";
      div.style.borderColor = "rgba(0, 230, 118, 0.3)";
    }
    div.innerHTML = `
      <span class="alert-time" style="font-weight:bold; font-size:11px; color:var(--text-dim); margin-right:8px;">${alert.time}</span>
      <span class="alert-text">${alert.text}</span>
    `;
    els.alertFeed.appendChild(div);
  }
}

function renderForecast() {
  const dates = boardDates();
  const conflictMap = computeConflictMap();
  const byType = {};
  for (const type of RESOURCE_TYPES) {
    const resourcesOfType = state.resources.filter((r) => r.type === type);
    if (resourcesOfType.length === 0) continue;
    let bookedSlots = 0;
    const totalSlots = resourcesOfType.length * dates.length;
    for (const r of resourcesOfType) {
      for (const date of dates) {
        const key = `${r.id}|${date}`;
        if ((conflictMap[key] || 0) >= 1) bookedSlots++;
      }
    }
    byType[type] = totalSlots ? Math.round((bookedSlots / totalSlots) * 100) : 0;
  }

  els.forecastList.innerHTML = "";
  const entries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  for (const [type, pct] of entries) {
    const li = document.createElement("div");
    li.className = "forecast-item";
    li.style.marginBottom = "10px";
    const high = pct >= 70;
    li.innerHTML = `
      <div class="forecast-row" style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12.5px;">
        <span class="forecast-type" style="font-weight:600;">${type}</span>
        <span class="forecast-pct" style="color:${high ? "var(--conflict)" : "var(--accent)"}; font-weight:bold;">${pct}%</span>
      </div>
      <div class="forecast-bar" style="background:rgba(255,255,255,0.05); height:6px; border-radius:3px; overflow:hidden;">
        <div class="forecast-bar-fill" style="width:${pct}%; background:${high ? "var(--conflict)" : "var(--accent)"}; height:100%;"></div>
      </div>
      ${high ? `<div class="forecast-note" style="font-size:11px; color:var(--conflict); margin-top:4px;">High demand this week — consider adding ${type.toLowerCase()} capacity.</div>` : ""}
    `;
    els.forecastList.appendChild(li);
  }

  // Dynamic Heuristic Insights
  const insightsDiv = document.createElement("div");
  insightsDiv.className = "forecast-insights";
  insightsDiv.style.marginTop = "14px";
  insightsDiv.style.borderTop = "1px solid var(--border)";
  insightsDiv.style.paddingTop = "12px";

  const insightsTitle = document.createElement("div");
  insightsTitle.className = "panel-title";
  insightsTitle.style.fontSize = "11px";
  insightsTitle.style.marginBottom = "6px";
  insightsTitle.textContent = "Utilization Heuristics";
  insightsDiv.appendChild(insightsTitle);

  const insightsList = document.createElement("ul");
  insightsList.style.margin = "0";
  insightsList.style.paddingLeft = "16px";
  insightsList.style.fontSize = "12px";
  insightsList.style.color = "var(--text-dim)";
  insightsList.style.lineHeight = "1.6";

  let hasInsights = false;
  for (const [type, pct] of Object.entries(byType)) {
    let text = "";
    if (pct >= 75) {
      text = `High demand for ${type}s this week (${pct}% occupancy).`;
    } else if (pct < 30) {
      text = `${type}s have available capacity (${pct}% loaded).`;
    } else {
      text = `${type} utilization is moderate (${pct}%).`;
    }
    const li = document.createElement("li");
    li.textContent = text;
    insightsList.appendChild(li);
    hasInsights = true;
  }
  insightsDiv.appendChild(insightsList);
  els.forecastList.appendChild(insightsDiv);
}

function renderBookings() {
  if (!els.bookingsList) return;
  els.bookingsList.innerHTML = "";
  if (state.bookings.length === 0) {
    const empty = document.createElement("div");
    empty.className = "feed-empty";
    empty.textContent = "No active bookings.";
    els.bookingsList.appendChild(empty);
    return;
  }

  // Sort bookings start date descending
  const sorted = state.bookings.slice().sort((a, b) => b.startDate.localeCompare(a.startDate) || a.id.localeCompare(b.id));

  for (const b of sorted) {
    const resource = state.resources.find((r) => r.id === b.resourceId);
    const rName = resource ? resource.name : "Unknown Resource";
    const rType = resource ? resource.type : "Unknown";

    const hasConflict = findOverlaps(b.resourceId, b.startDate, b.endDate, b.id).length > 0;
    const status = b.status || (hasConflict ? "CONFLICT" : "CONFIRMED");
    let statusClass = "confirmed";
    if (status === "CONFLICT" || hasConflict) statusClass = "conflict";
    else if (status === "RESOLVED") statusClass = "resolved";
    else if (status === "CANCELLED") statusClass = "cancelled";

    const div = document.createElement("div");
    div.className = "booking-row";
    div.style.marginBottom = "6px";
    
    const badge = `<span class="status-pill ${statusClass}" style="margin-left:6px;">${status}</span>`;

    div.innerHTML = `
      <div class="booking-info">
        <div style="font-weight:600; font-size:13px; color:var(--text);">${b.tripName} ${badge}</div>
        <div style="font-size:11.5px; color:var(--text-dim); margin-top:2px;">
          ${b.customer} &middot; <span class="type-badge ${rType.toLowerCase()}">${rType}</span> <strong>${rName}</strong>
        </div>
        <div style="font-size:11px; color:var(--accent); margin-top:2px;">
          ${b.startDate} to ${b.endDate}
        </div>
      </div>
      <div>
        <button type="button" class="cancel-btn" data-id="${b.id}">Cancel</button>
      </div>
    `;

    div.querySelector(".cancel-btn").addEventListener("click", () => {
      cancelBooking(b.id);
    });

    els.bookingsList.appendChild(div);
  }
}

/* ---------------------------------------------------------------------- */
/* Booking Actions                                                        */
/* ---------------------------------------------------------------------- */

function populateResourceTypeFilter() {
  els.typeFilter.innerHTML = `<option value="all">All resource types</option>`;
  for (const type of RESOURCE_TYPES) {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = type;
    els.typeFilter.appendChild(opt);
  }
}

function populateBookingFormOptions() {
  els.formType.innerHTML = "";
  for (const type of RESOURCE_TYPES) {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = type;
    els.formType.appendChild(opt);
  }
  populateResourceOptionsForType(els.formType.value);
  els.formStart.value = dayOffset(0);
  els.formEnd.value = dayOffset(0);
}

function populateResourceOptionsForType(type) {
  els.formResource.innerHTML = "";
  const matching = state.resources.filter((r) => r.type.toLowerCase() === type.toLowerCase());
  for (const r of matching) {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = r.name;
    els.formResource.appendChild(opt);
  }
  const newOpt = document.createElement("option");
  newOpt.value = "__new__";
  newOpt.textContent = "+ Add a new resource…";
  els.formResource.appendChild(newOpt);
  toggleNewResourceField();
}

function toggleNewResourceField() {
  const isNew = els.formResource.value === "__new__";
  els.formNewResourceWrap.classList.toggle("hidden", !isNew);
  if (isNew) {
    els.formNewResourceName.focus();
  }
}

function onSubmitBooking(e) {
  if (e && e.preventDefault) e.preventDefault();
  
  els.formFeedback.textContent = "";
  els.formFeedback.className = "form-feedback";

  const type = els.formType.value;
  const start = els.formStart.value;
  const end = els.formEnd.value;
  const trip = els.formTrip.value.trim();
  const customer = els.formCustomer.value.trim();

  // Validate dates
  const today = dayOffset(0);
  if (!start || start < today) {
    showFormError("Enter a valid date. Bookings cannot be made for past dates.");
    return;
  }
  if (!end || end < today) {
    showFormError("Enter a valid date. Bookings cannot be made for past dates.");
    return;
  }
  if (start > end) {
    showFormError("Check the dates — the end date can't be before the start date.");
    return;
  }
  if (!trip || !customer) {
    showFormError("Trip name and customer are both required.");
    return;
  }

  let resourceId = els.formResource.value;
  if (resourceId === "__new__") {
    const newName = els.formNewResourceName.value.trim();
    if (!newName) {
      showFormError("Name the new resource before adding it.");
      return;
    }
    const catCasing = type.charAt(0).toUpperCase() + type.slice(1);
    const existing = state.resources.find(
      (r) => r.type === catCasing && r.name.toLowerCase() === newName.toLowerCase()
    );
    if (existing) {
      showFormError(`"${newName}" already exists as a ${type.toLowerCase()}.`);
      return;
    }
    resourceId = `${type.toLowerCase()}-${slugify(newName)}-${Date.now()}`;
    state.resources.push({ id: resourceId, type: catCasing, name: newName });
  }

  const pendingBooking = {
    id: `bk-${Date.now()}`,
    resourceId,
    tripName: trip,
    customer,
    startDate: start,
    endDate: end,
    status: "CONFIRMED"
  };

  const overlaps = findOverlaps(resourceId, start, end);
  if (overlaps.length > 0) {
    pendingBooking.status = "CONFLICT";
    openConflictModal(pendingBooking, overlaps, type);
    return;
  }

  commitBooking(pendingBooking);
  showFormSuccess("✓ Booking Confirmed. No scheduling conflict detected.");
  showToast("✓ Booking Confirmed. No scheduling conflict detected.", "success");
}

function showFormError(msg) {
  els.formFeedback.textContent = msg;
  els.formFeedback.className = "form-feedback form-feedback-error";
}
function showFormSuccess(msg) {
  els.formFeedback.textContent = msg;
  els.formFeedback.className = "form-feedback form-feedback-success";
}

function commitBooking(booking) {
  state.bookings.push(booking);
  saveState(state);
  populateResourceOptionsForType(els.formType.value);
  renderAll();
  
  // Reset booking form inputs
  els.formTrip.value = "";
  els.formCustomer.value = "";
  els.formNewResourceName.value = "";
  els.formStart.value = dayOffset(0);
  els.formEnd.value = dayOffset(0);
  toggleNewResourceField();
}

function onAddResourceOnly(e) {
  e.preventDefault();
  const typeVal = els.newResourceType.value;
  const nameVal = els.newResourceName.value.trim();
  if (!nameVal) {
    showToast("Please enter a resource name.", "error");
    return;
  }
  const type = typeVal.charAt(0).toUpperCase() + typeVal.slice(1);
  const existing = state.resources.find(
    (r) => r.type === type && r.name.toLowerCase() === nameVal.toLowerCase()
  );
  if (existing) {
    showToast(`"${nameVal}" already exists as a ${typeVal}.`, "error");
    return;
  }
  const resourceId = `${typeVal}-${slugify(nameVal)}-${Date.now()}`;
  state.resources.push({ id: resourceId, type, name: nameVal });
  saveState(state);
  
  populateBookingFormOptions();
  renderAll();
  els.newResourceName.value = "";
  showToast(`✓ Resource "${nameVal}" added successfully.`, "success");
}

function cancelBooking(bookingId) {
  const idx = state.bookings.findIndex((b) => b.id === bookingId);
  if (idx === -1) return;
  const booking = state.bookings[idx];
  
  if (!confirm(`Cancel booking "${booking.tripName}" for ${booking.customer}?`)) return;
  
  booking.status = "CANCELLED";
  lastCanceledBooking = { ...booking, index: idx };
  state.bookings.splice(idx, 1);
  saveState(state);
  
  showToast(`Booking "${booking.tripName}" canceled. Press Ctrl+Z to undo.`, "success");
  populateResourceOptionsForType(els.formType.value);
  renderAll();
}

function undoLastCancel() {
  if (!lastCanceledBooking) {
    showToast("Nothing to undo.", "error");
    return;
  }
  const { index, ...booking } = lastCanceledBooking;
  const overlaps = findOverlaps(booking.resourceId, booking.startDate, booking.endDate);
  
  state.bookings.splice(index, 0, booking);
  saveState(state);
  
  if (overlaps.length > 0) {
    showToast(`Restored booking "${booking.tripName}" (Conflict detected).`, "error");
  } else {
    showToast(`✓ Restored booking "${booking.tripName}" successfully.`, "success");
  }
  lastCanceledBooking = null;
  populateResourceOptionsForType(els.formType.value);
  renderAll();
}

/* ---------------------------------------------------------------------- */
/* Conflict modals & inspector                                            */
/* ---------------------------------------------------------------------- */

let pendingConflict = null;

function openConflictModal(pendingBooking, overlaps, type) {
  const resource = state.resources.find((r) => r.id === pendingBooking.resourceId);
  const catCasing = type.charAt(0).toUpperCase() + type.slice(1);
  const alternatives = findAvailableAlternatives(catCasing, pendingBooking.startDate, pendingBooking.endDate, pendingBooking.resourceId);

  pendingConflict = { pendingBooking, alternatives, resource };

  // Calculate severity
  const severity = ConflictEngine.assessConflictSeverity(pendingBooking, overlaps, state.bookings, state.resources);

  if (els.conflictSeverityBadge) {
    els.conflictSeverityBadge.textContent = severity.label;
    els.conflictSeverityBadge.className = `severity-badge severity-${severity.level.toLowerCase()}`;
  }

  const existingBooking = overlaps[0];

  const impactItems = severity.impacts.map(i => `<li>${i}</li>`).join("");

  els.conflictModalBody.innerHTML = `
    <div style="background: rgba(255,59,92,0.06); border: 1px solid rgba(255,59,92,0.2); border-radius: 8px; padding: 12px; margin-bottom: 14px;">
      <div style="font-weight: 700; font-size: 13.5px; color: var(--conflict); margin-bottom: 4px;">
        Requested Resource: ${resource ? resource.name : "Resource"} (${catCasing})
      </div>
      <div style="font-size: 12.5px; color: var(--text);">
        <strong>Reason:</strong> ${severity.reason}
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px;">
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 6px; padding: 10px;">
        <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; color: var(--accent); margin-bottom: 4px;">New Booking Request</div>
        <div style="font-weight: 600; font-size: 13px;">${pendingBooking.tripName}</div>
        <div style="font-size: 11.5px; color: var(--text-dim);">${pendingBooking.customer}</div>
        <div style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">${pendingBooking.startDate} → ${pendingBooking.endDate}</div>
      </div>
      <div style="background: rgba(255,59,92,0.04); border: 1px solid rgba(255,59,92,0.2); border-radius: 6px; padding: 10px;">
        <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; color: var(--conflict); margin-bottom: 4px;">Conflicting Existing Booking</div>
        <div style="font-weight: 600; font-size: 13px;">${existingBooking ? existingBooking.tripName : "Existing Trip"}</div>
        <div style="font-size: 11.5px; color: var(--text-dim);">${existingBooking ? existingBooking.customer : ""}</div>
        <div style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">${existingBooking ? existingBooking.startDate + " → " + existingBooking.endDate : ""}</div>
      </div>
    </div>

    <div style="margin-bottom: 14px;">
      <div style="font-weight: bold; font-size: 11px; text-transform: uppercase; color: var(--text-dim); margin-bottom: 4px;">Operational Impact & Severity</div>
      <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: var(--text); line-height: 1.5;">${impactItems}</ul>
    </div>

    ${
      alternatives.length
        ? `<div style="padding:12px; border:1px solid rgba(0,230,118,0.3); background:rgba(0,230,118,0.06); border-radius:8px;">
             <div style="color:var(--guide); font-weight:bold; font-size:12.5px; display:flex; align-items:center; gap:6px;">
               <span>✓ Available Alternative Resource:</span>
             </div>
             <div style="margin-top:4px; font-size: 14px; font-weight: 700; color:var(--text);">${alternatives[0].name}</div>
             <div style="font-size: 11.5px; color:var(--text-dim); margin-top:2px;">Available for the complete selected date range (${pendingBooking.startDate} → ${pendingBooking.endDate}).</div>
           </div>`
        : `<p style="font-size:12.5px; color:var(--conflict); font-style:italic;">No other ${type.toLowerCase()} is available for this exact date range.</p>`
    }
  `;

  els.conflictSwitchBtn.disabled = alternatives.length === 0;
  els.conflictSwitchBtn.textContent = alternatives.length
    ? `Switch to ${alternatives[0].name}`
    : "No alternative available";

  els.conflictModal.classList.remove("hidden");

  // Log conflict feed alert
  const alertText = `Conflict detected: ${resource ? resource.name : "Resource"} double-booked ${pendingBooking.startDate}→${pendingBooking.endDate}. Severity: ${severity.level}.` +
    (alternatives.length ? ` Suggested ${alternatives[0].name}.` : " No free alternative found.");
  
  const timeStr = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  state.alerts.push({ time: timeStr, text: alertText });
  saveState(state);
  renderAlerts();
}

function closeConflictModal() {
  els.conflictModal.classList.add("hidden");
  pendingConflict = null;
}

function openInspectModal(resourceId, date) {
  const resource = state.resources.find((r) => r.id === resourceId);
  const collidingBookings = state.bookings.filter(
    (b) => b.resourceId === resourceId && b.startDate <= date && date <= b.endDate
  );

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long", month: "short", day: "numeric", year: "numeric",
  });

  const rows = collidingBookings
    .map((b) => {
      const alternatives = findAvailableAlternatives(resource.type, b.startDate, b.endDate, resourceId);
      const altBtn = alternatives.length
        ? `<button class="btn inspect-reassign-btn" data-booking-id="${b.id}" data-alt-id="${alternatives[0].id}">Reassign to ${alternatives[0].name}</button>`
        : `<span class="inspect-why" style="color:var(--text-dim); font-size:11.5px;">No alternative ${resource.type.toLowerCase()} free for ${b.startDate} → ${b.endDate}</span>`;
      return `
        <div class="inspect-booking-row" style="background:rgba(255,255,255,0.02); border:1px solid var(--border); border-radius:6px; padding:10px; margin-bottom:8px;">
          <div class="inspect-booking-title" style="font-weight:bold; font-size:13px;">${b.tripName}</div>
          <div class="inspect-booking-meta" style="font-size:11.5px; color:var(--text-dim); margin-top:2px;">${b.customer} &middot; ${b.startDate} to ${b.endDate}</div>
          <div class="inspect-booking-actions" style="margin-top:6px;">${altBtn}</div>
        </div>
      `;
    })
    .join("");

  els.inspectModalBody.innerHTML = `
    <p class="inspect-cell-header" style="margin-bottom:14px; font-size:12.5px; color:var(--text);">
      <strong>${resource.name}</strong> has <strong>${collidingBookings.length} overlapping bookings</strong>
      on <strong>${dateLabel}</strong>. Click below to clear the clash:
    </p>
    ${rows}
  `;

  // Bind inspect reassignment buttons
  els.inspectModalBody.querySelectorAll(".inspect-reassign-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const bookingId = btn.getAttribute("data-booking-id");
      const altId = btn.getAttribute("data-alt-id");
      const booking = state.bookings.find((b) => b.id === bookingId);
      const altResource = state.resources.find((r) => r.id === altId);
      if (!booking || !altResource) return;
      
      const oldResId = booking.resourceId;
      const oldRes = state.resources.find((r) => r.id === oldResId);
      booking.resourceId = altId;
      booking.status = "RESOLVED";
      
      // Dynamic feed resolution logging
      const timeStr = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      state.alerts.push({
        time: timeStr,
        text: `Resolved: ${oldRes ? oldRes.name : "Resource"} conflict cleared. "${booking.tripName}" reassigned to ${altResource.name}.`
      });
      saveState(state);
      
      renderAll();
      closeInspectModal();
      showToast(`✓ Reassigned "${booking.tripName}" to ${altResource.name}. Conflict cleared.`, "success");
    });
  });

  els.inspectModal.classList.remove("hidden");
}

function closeInspectModal() {
  els.inspectModal.classList.add("hidden");
}

/* ---------------------------------------------------------------------- */
/* Keyboard Shortcuts Controller                                          */
/* ---------------------------------------------------------------------- */

function handleKeyboardShortcuts(e) {
  // Esc = Close Modals
  if (e.key === "Escape" || e.key === "Esc") {
    closeConflictModal();
    closeInspectModal();
  }

  // Prevent keyboard actions running when writing in inputs
  const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "select" || tag === "textarea") return;

  // N = Focus booking form
  if (e.key === "n" || e.key === "N") {
    e.preventDefault();
    els.formTrip.focus();
    showToast("Focused New Booking Form", "neutral");
  }

  // / = Focus search
  if (e.key === "/") {
    e.preventDefault();
    if (els.searchInput) {
      els.searchInput.focus();
      els.searchInput.select();
    }
  }

  // Arrow Left = Previous Week
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    if (!els.prevWeekBtn.disabled) shiftBoard(-BOARD_DAYS);
  }

  // Arrow Right = Next Week
  if (e.key === "ArrowRight") {
    e.preventDefault();
    shiftBoard(BOARD_DAYS);
  }

  // T = Toggle View Grid / Timeline
  if (e.key === "t" || e.key === "T") {
    e.preventDefault();
    if (currentView === "grid") {
      currentView = "timeline";
      if (els.viewTimelineBtn) els.viewTimelineBtn.click();
    } else {
      currentView = "grid";
      if (els.viewGridBtn) els.viewGridBtn.click();
    }
    showToast(`Switched view to ${currentView.toUpperCase()}`, "neutral");
  }

  // R = Reset
  if (e.key === "r" || e.key === "R") {
    e.preventDefault();
    onResetDemo();
  }

  // D = Watch Demo
  if (e.key === "d" || e.key === "D") {
    e.preventDefault();
    runDemoTour();
  }

  // Ctrl + Z = Undo Canceled Booking
  if (e.ctrlKey && (e.key === "z" || e.key === "Z")) {
    e.preventDefault();
    undoLastCancel();
  }
}

/* ---------------------------------------------------------------------- */
/* Toast Notification System                                              */
/* ---------------------------------------------------------------------- */

function showToast(message, type = "neutral") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ---------------------------------------------------------------------- */
/* Automated Watch Demo Tour                                              */
/* ---------------------------------------------------------------------- */

function runDemoTour() {
  clearDemoTimeouts();
  
  currentView = "grid";
  if (els.viewGridBtn) {
    els.viewGridBtn.classList.add("active");
    els.viewTimelineBtn.classList.remove("active");
  }
  
  state = freshState();
  saveState(state);
  boardStartDate = dayOffset(0);
  populateBookingFormOptions();
  renderAll();

  showToast("Demo tour started: Step-by-step conflict detection & resolution.", "success");

  // Step 1: Current resource schedule board overview
  let id = setTimeout(() => {
    if (els.board) {
      els.board.style.outline = "2px solid var(--accent)";
      els.board.style.boxShadow = "0 0 15px rgba(0, 212, 255, 0.4)";
      setTimeout(() => {
        els.board.style.outline = "";
        els.board.style.boxShadow = "";
      }, 2000);
    }
    showToast("STEP 1: Current resource schedule board loaded.", "neutral");
  }, 1500);
  demoTimeoutIds.push(id);

  // Step 2: Staff creates booking for Driver Ramesh Yadav on an overlapping date
  id = setTimeout(() => {
    els.formType.value = "driver";
    populateResourceOptionsForType("driver");
    els.formResource.value = "drv-ramesh";
    els.formTrip.value = "Lonavala Weekend";
    els.formCustomer.value = "Mehta Group";
    els.formStart.value = dayOffset(1);
    els.formEnd.value = dayOffset(1);

    const card = els.bookingForm.parentElement;
    if (card) {
      card.style.outline = "2px solid var(--accent)";
      card.style.boxShadow = "0 0 15px rgba(0, 212, 255, 0.4)";
      setTimeout(() => {
        card.style.outline = "";
        card.style.boxShadow = "";
      }, 2000);
    }
    showToast("STEP 2: Staff creates booking for Driver Ramesh Yadav on an overlapping date.", "neutral");
  }, 4500);
  demoTimeoutIds.push(id);

  // Step 3: Overlapping booking submitted -> conflict detected
  id = setTimeout(() => {
    onSubmitBooking();
    showToast("STEP 3: Requested resource is already assigned — Conflict detected!", "error");
  }, 7500);
  demoTimeoutIds.push(id);

  // Step 4: System evaluates severity & impact
  id = setTimeout(() => {
    showToast("STEP 4: System evaluates severity (HIGH) & operational impact.", "neutral");
  }, 10500);
  demoTimeoutIds.push(id);

  // Step 5: Showcase suggested alternative (Suresh Patil)
  id = setTimeout(() => {
    const modal = document.querySelector("#conflict-modal .modal");
    if (modal) {
      modal.style.outline = "2px solid var(--guide)";
      modal.style.boxShadow = "0 0 20px rgba(0, 230, 118, 0.5)";
      setTimeout(() => {
        modal.style.outline = "";
        modal.style.boxShadow = "";
      }, 2500);
    }
    showToast("STEP 5: Available alternative resource suggested: Suresh Patil.", "neutral");
  }, 13500);
  demoTimeoutIds.push(id);

  // Step 6: One-click switch
  id = setTimeout(() => {
    if (els.conflictSwitchBtn && !els.conflictSwitchBtn.disabled) {
      els.conflictSwitchBtn.click();
      showToast("STEP 6: Staff clicks 'Switch Automatically'.", "success");
    }
  }, 16500);
  demoTimeoutIds.push(id);

  // Steps 7 & 8: Conflict resolved & Dashboard updated
  id = setTimeout(() => {
    showToast("STEPS 7 & 8: Conflict resolved (RESOLVED status). Board & Dashboard updated!", "success");
  }, 19000);
  demoTimeoutIds.push(id);
}

function clearDemoTimeouts() {
  demoTimeoutIds.forEach(id => clearTimeout(id));
  demoTimeoutIds = [];
}

/* ---------------------------------------------------------------------- */
/* Demoreset & Slugify                                                    */
/* ---------------------------------------------------------------------- */

function onResetDemo() {
  if (!confirm("Reset the board back to the seeded demo data? This clears anything you've added.")) return;
  clearDemoTimeouts();
  state = freshState();
  saveState(state);
  boardStartDate = dayOffset(0);
  
  // Reset forms
  populateBookingFormOptions();
  els.newResourceName.value = "";
  
  renderAll();
  showToast("✓ Demo data reset complete.", "success");
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function clearDemoTimeouts() {
  demoTimeoutIds.forEach(id => clearTimeout(id));
  demoTimeoutIds = [];
}

/* ---------------------------------------------------------------------- */
/* Demoreset & Slugify                                                    */
/* ---------------------------------------------------------------------- */

function onResetDemo() {
  if (!confirm("Reset the board back to the seeded demo data? This clears anything you've added.")) return;
  clearDemoTimeouts();
  state = freshState();
  saveState(state);
  boardStartDate = dayOffset(0);
  
  // Reset forms
  populateBookingFormOptions();
  els.newResourceName.value = "";
  
  renderAll();
  showToast("✓ Demo data reset complete.", "success");
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}