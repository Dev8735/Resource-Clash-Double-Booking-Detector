/**
 * app.js
 * Resource Clash & Double-Booking Detector — client-side prototype logic.
 *
 * Everything runs in the browser against an in-memory + localStorage store.
 * This is intentional for the hackathon prototype stage (see README "Prototype
 * scope" section) — a production version would move `state` behind a real API.
 *
 * Features: real-time conflict detection, alternative suggestion, timeline view,
 * auto-demo walkthrough, toast notifications, keyboard shortcuts, animated
 * counters, conflict severity scoring, undo, CSV export, search/filter.
 */

let state = loadState() || freshState();
let boardStartDate = dayOffset(0);
const BOARD_DAYS = 7;
let currentView = "grid"; // "grid" | "timeline"
let undoStack = [];
let searchQuery = "";

const els = {};

/* ---------------------------------------------------------------------- */
/* Init                                                                   */
/* ---------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  cacheEls();
  bindEvents();
  populateResourceTypeFilter();
  populateBookingFormOptions();
  renderAll();
  animateStatsOnLoad();
});

function cacheEls() {
  els.board = document.getElementById("board");
  els.timeline = document.getElementById("timeline");
  els.boardRangeLabel = document.getElementById("board-range-label");
  els.statBookings = document.getElementById("stat-bookings");
  els.statConflicts = document.getElementById("stat-conflicts");
  els.statResources = document.getElementById("stat-resources");
  els.statUtilization = document.getElementById("stat-utilization");
  els.alertFeed = document.getElementById("alert-feed");
  els.forecastList = document.getElementById("forecast-list");
  els.donutCharts = document.getElementById("donut-charts");
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
  els.conflictProceedBtn = document.getElementById("conflict-proceed-btn");
  els.conflictSwitchBtn = document.getElementById("conflict-switch-btn");
  els.conflictCancelBtn = document.getElementById("conflict-cancel-btn");
  els.resetBtn = document.getElementById("reset-demo-btn");
  els.printBtn = document.getElementById("print-btn");
  els.prevWeekBtn = document.getElementById("prev-week-btn");
  els.nextWeekBtn = document.getElementById("next-week-btn");
  els.typeFilter = document.getElementById("type-filter");
  els.clock = document.getElementById("live-clock");
  els.searchInput = document.getElementById("search-input");
  els.toastContainer = document.getElementById("toast-container");
  els.shortcutsModal = document.getElementById("shortcuts-modal");
  els.shortcutsCloseBtn = document.getElementById("shortcuts-close-btn");
  els.demoBtn = document.getElementById("demo-btn");
  els.demoOverlay = document.getElementById("demo-overlay");
  els.demoStepNum = document.getElementById("demo-step-num");
  els.demoStepText = document.getElementById("demo-step-text");
  els.demoStopBtn = document.getElementById("demo-stop-btn");
}

function bindEvents() {
  els.formType.addEventListener("change", () => {
    populateResourceOptionsForType(els.formType.value);
    toggleNewResourceField();
  });
  els.formResource.addEventListener("change", toggleNewResourceField);
  els.bookingForm.addEventListener("submit", onSubmitBooking);
  els.resetBtn.addEventListener("click", onResetDemo);
  els.printBtn.addEventListener("click", () => window.print());
  els.prevWeekBtn.addEventListener("click", () => shiftBoard(-BOARD_DAYS));
  els.nextWeekBtn.addEventListener("click", () => shiftBoard(BOARD_DAYS));
  els.typeFilter.addEventListener("change", renderBoardView);

  // View toggle
  document.querySelectorAll(".view-toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-toggle-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentView = btn.dataset.view;
      renderBoardView();
    });
  });

  // Search
  els.searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderBoardView();
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", onKeyDown);

  // Shortcuts modal
  els.shortcutsCloseBtn.addEventListener("click", () => els.shortcutsModal.classList.add("hidden"));

  // Demo button
  els.demoBtn.addEventListener("click", startAutoDemo);
  els.demoStopBtn.addEventListener("click", stopAutoDemo);

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
/* Keyboard Shortcuts                                                     */
/* ---------------------------------------------------------------------- */

function onKeyDown(e) {
  // Don't trigger shortcuts when typing in inputs
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") {
    if (e.key === "Escape") e.target.blur();
    return;
  }

  // Ctrl+Z: Undo
  if ((e.ctrlKey || e.metaKey) && e.key === "z") {
    e.preventDefault();
    undoLastBooking();
    return;
  }

  switch (e.key) {
    case "n":
    case "N":
      e.preventDefault();
      els.formTrip.focus();
      break;
    case "/":
      e.preventDefault();
      els.searchInput.focus();
      break;
    case "ArrowLeft":
      shiftBoard(-BOARD_DAYS);
      break;
    case "ArrowRight":
      shiftBoard(BOARD_DAYS);
      break;
    case "t":
    case "T":
      e.preventDefault();
      toggleView();
      break;
    case "r":
    case "R":
      onResetDemo();
      break;
    case "d":
    case "D":
      e.preventDefault();
      startAutoDemo();
      break;
    case "?":
      e.preventDefault();
      els.shortcutsModal.classList.toggle("hidden");
      break;
    case "Escape":
      closeConflictModal();
      els.shortcutsModal.classList.add("hidden");
      break;
  }
}

function toggleView() {
  currentView = currentView === "grid" ? "timeline" : "grid";
  document.querySelectorAll(".view-toggle-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === currentView);
  });
  renderBoardView();
}

/* ---------------------------------------------------------------------- */
/* Date helpers (board-relative)                                          */
/* ---------------------------------------------------------------------- */

function shiftBoard(days) {
  const d = new Date(boardStartDate + "T00:00:00");
  d.setDate(d.getDate() + days);
  boardStartDate = fmtDate(d);
  renderBoardView();
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

function rangesOverlap(startA, endA, startB, endB) {
  return startA <= endB && startB <= endA;
}

/* ---------------------------------------------------------------------- */
/* Core conflict-detection logic                                          */
/* ---------------------------------------------------------------------- */

/** All bookings for a resource that overlap [start, end], optionally excluding one booking id. */
function findOverlaps(resourceId, start, end, excludeBookingId) {
  return state.bookings.filter(
    (b) =>
      b.resourceId === resourceId &&
      b.id !== excludeBookingId &&
      rangesOverlap(b.startDate, b.endDate, start, end)
  );
}

/** Resources of a given type that have NO booking overlapping [start, end]. */
function findAvailableAlternatives(type, start, end, excludeResourceId) {
  return state.resources
    .filter((r) => {
      if (r.type !== type || r.id === excludeResourceId) return false;
      return findOverlaps(r.id, start, end).length === 0;
    })
    .map((r) => {
      // Smart ranking: score by workload balance (fewer existing bookings = better)
      const totalBookings = state.bookings.filter((b) => b.resourceId === r.id).length;
      return { ...r, score: totalBookings };
    })
    .sort((a, b) => a.score - b.score); // Least loaded first
}

/** Every (resourceId, date) pair that currently has 2+ overlapping bookings. */
function computeConflictMap() {
  const map = {}; // `${resourceId}|${date}` -> count
  for (const b of state.bookings) {
    let d = new Date(b.startDate + "T00:00:00");
    const end = new Date(b.endDate + "T00:00:00");
    while (d <= end) {
      const key = `${b.resourceId}|${fmtDate(d)}`;
      map[key] = (map[key] || 0) + 1;
      d.setDate(d.getDate() + 1);
    }
  }
  return map;
}

function countOpenConflicts() {
  const map = computeConflictMap();
  return Object.values(map).filter((c) => c > 1).length;
}

/** Conflict severity: higher = worse. Based on overlap count and days affected. */
function computeConflictSeverity(resourceId, start, end) {
  const overlaps = findOverlaps(resourceId, start, end);
  if (overlaps.length === 0) return { level: "none", score: 0 };

  const daysAffected = Math.max(1, Math.ceil(
    (new Date(end + "T00:00:00") - new Date(start + "T00:00:00")) / (1000 * 60 * 60 * 24) + 1
  ));
  const score = overlaps.length * daysAffected;

  if (score >= 6) return { level: "high", score, label: "High Severity" };
  if (score >= 3) return { level: "medium", score, label: "Medium Severity" };
  return { level: "low", score, label: "Low Severity" };
}

/** Detect if switching to an alternative would create a chain conflict. */
function detectConflictChain(alternativeId, start, end) {
  const chainOverlaps = findOverlaps(alternativeId, start, end);
  return chainOverlaps.length > 0;
}

/* ---------------------------------------------------------------------- */
/* Toast Notifications                                                    */
/* ---------------------------------------------------------------------- */

function showToast(message, type = "info", duration = 3500) {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  els.toastContainer.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add("show");
    });
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

/* ---------------------------------------------------------------------- */
/* Animated Counter                                                       */
/* ---------------------------------------------------------------------- */

function animateCounter(el, targetValue, suffix = "") {
  const start = parseInt(el.textContent) || 0;
  const target = typeof targetValue === "number" ? targetValue : parseInt(targetValue) || 0;
  if (start === target) {
    el.textContent = target + suffix;
    return;
  }

  const duration = 600;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * eased);
    el.textContent = current + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

function animateStatsOnLoad() {
  setTimeout(() => renderStats(), 200);
}

/* ---------------------------------------------------------------------- */
/* Rendering                                                              */
/* ---------------------------------------------------------------------- */

function renderAll() {
  renderBoardView();
  renderStats();
  renderAlerts();
  renderForecast();
}

function renderBoardView() {
  if (currentView === "grid") {
    els.board.classList.remove("hidden");
    els.timeline.classList.add("hidden");
    renderBoard();
  } else {
    els.board.classList.add("hidden");
    els.timeline.classList.remove("hidden");
    renderTimeline();
  }
  // Update range label for both views
  const dates = boardDates();
  const first = new Date(dates[0] + "T00:00:00");
  const last = new Date(dates[dates.length - 1] + "T00:00:00");
  els.boardRangeLabel.textContent = `${first.toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${last.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

function getFilteredResources() {
  const typeFilterVal = els.typeFilter.value;
  let resources = state.resources;
  if (typeFilterVal !== "all") {
    resources = resources.filter((r) => r.type === typeFilterVal);
  }
  if (searchQuery) {
    resources = resources.filter((r) =>
      r.name.toLowerCase().includes(searchQuery) ||
      r.type.toLowerCase().includes(searchQuery) ||
      r.id.toLowerCase().includes(searchQuery)
    );
  }
  return resources;
}

function renderBoard() {
  const dates = boardDates();
  const conflictMap = computeConflictMap();
  const resources = getFilteredResources();

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
    td.textContent = searchQuery
      ? `No resources matching "${searchQuery}".`
      : "No resources of this type yet. Add a booking to register one.";
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const resource of resources) {
    const tr = document.createElement("tr");
    const nameTd = document.createElement("td");
    nameTd.className = "resource-cell";
    nameTd.innerHTML = `<span class="resource-type-tag type-${resource.type.toLowerCase()}">${resource.type}</span><span class="resource-name">${resource.name}</span>`;
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
        cellClass = "status-booked";
        label = "Booked";
      }
      td.className = `board-cell ${cellClass}`;
      td.innerHTML = `<span class="cell-label">${label}</span>`;
      if (bookingsForCell.length) {
        const tripNames = bookingsForCell.map((b) => `${b.tripName} (${b.customer})`).join("\n");
        td.title = tripNames;
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  els.board.innerHTML = "";
  els.board.appendChild(table);
}

/* ---------------------------------------------------------------------- */
/* Timeline / Gantt View                                                  */
/* ---------------------------------------------------------------------- */

function renderTimeline() {
  const dates = boardDates();
  const conflictMap = computeConflictMap();
  const resources = getFilteredResources();

  const table = document.createElement("table");
  table.className = "timeline-table";

  // Header
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const cornerTh = document.createElement("th");
  cornerTh.textContent = "Resource";
  headRow.appendChild(cornerTh);
  for (const date of dates) {
    const th = document.createElement("th");
    const d = new Date(date + "T00:00:00");
    const isToday = date === dayOffset(0);
    th.innerHTML = `<span class="day-name">${d.toLocaleDateString(undefined, { weekday: "short" })}</span> <span class="day-num">${d.getDate()}</span>`;
    if (isToday) th.classList.add("is-today");
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement("tbody");

  if (resources.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = dates.length + 1;
    td.className = "empty-row";
    td.textContent = "No resources to display.";
    td.style.textAlign = "center";
    td.style.padding = "40px";
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  for (const resource of resources) {
    const tr = document.createElement("tr");
    const nameTd = document.createElement("td");
    nameTd.innerHTML = `<span class="resource-type-tag type-${resource.type.toLowerCase()}">${resource.type}</span><span class="resource-name">${resource.name}</span>`;
    tr.appendChild(nameTd);

    // Get bookings for this resource that overlap the visible window
    const visibleBookings = state.bookings.filter((b) =>
      b.resourceId === resource.id &&
      rangesOverlap(b.startDate, b.endDate, dates[0], dates[dates.length - 1])
    );

    // Create cells for each day
    const cellMap = {};
    for (let i = 0; i < dates.length; i++) {
      const td = document.createElement("td");
      td.style.position = "relative";
      cellMap[dates[i]] = { td, index: i };
      tr.appendChild(td);
    }

    // Place booking bars
    const placed = new Set();
    for (const booking of visibleBookings) {
      if (placed.has(booking.id)) continue;
      placed.add(booking.id);

      const barStartDate = booking.startDate < dates[0] ? dates[0] : booking.startDate;
      const barEndDate = booking.endDate > dates[dates.length - 1] ? dates[dates.length - 1] : booking.endDate;

      const startIdx = dates.indexOf(barStartDate);
      const endIdx = dates.indexOf(barEndDate);

      if (startIdx === -1) continue;

      // Determine if this booking is in conflict
      const hasConflict = dates.slice(startIdx, endIdx + 1).some((d) => {
        const key = `${resource.id}|${d}`;
        return (conflictMap[key] || 0) > 1;
      });

      const bar = document.createElement("div");
      bar.className = `timeline-bar ${hasConflict ? "bar-conflict" : "bar-booked"}`;
      bar.textContent = booking.tripName;
      bar.title = `${booking.tripName} — ${booking.customer}\n${booking.startDate} → ${booking.endDate}`;

      // Span across cells using absolute positioning
      if (startIdx <= endIdx) {
        const startTd = cellMap[barStartDate].td;
        // We only place it in the start cell and let it span
        const spanCols = endIdx - startIdx + 1;
        bar.style.width = `calc(${spanCols * 100}% - 8px)`;
        bar.style.left = "4px";
        bar.style.right = "auto";
        startTd.appendChild(bar);
      }
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  els.timeline.innerHTML = "";
  els.timeline.appendChild(table);
}

/* ---------------------------------------------------------------------- */
/* Stats rendering with animated counters                                 */
/* ---------------------------------------------------------------------- */

function renderStats() {
  const dates = boardDates();
  const conflictMap = computeConflictMap();
  const openConflicts = Object.values(conflictMap).filter((c) => c > 1).length;

  animateCounter(els.statBookings, state.bookings.length);
  animateCounter(els.statConflicts, openConflicts);
  animateCounter(els.statResources, state.resources.length);

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
  animateCounter(els.statUtilization, utilization, "%");

  els.statConflicts.parentElement.classList.toggle("stat-card--alert", openConflicts > 0);
}

function renderAlerts() {
  els.alertFeed.innerHTML = "";
  if (state.alerts.length === 0) {
    const empty = document.createElement("li");
    empty.className = "alert-empty";
    empty.textContent = "No conflicts raised yet. The feed fills up the moment a clash is detected.";
    els.alertFeed.appendChild(empty);
    return;
  }
  for (const alert of state.alerts.slice().reverse()) {
    const li = document.createElement("li");
    li.className = "alert-item";
    li.innerHTML = `
      <div class="alert-time">${alert.time}</div>
      <div class="alert-text">${alert.text}</div>
    `;
    els.alertFeed.appendChild(li);
  }
}

/**
 * Booking-pressure forecast.
 * NOTE: this is a deliberately simple, transparent RULE-BASED heuristic
 * (utilization % per resource type over the visible window) — not a trained
 * ML model.
 */
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

  // Donut charts
  els.donutCharts.innerHTML = "";
  const overallBooked = Object.values(byType).reduce((a, b) => a + b, 0);
  const overallTotal = Object.keys(byType).length;
  const overallPct = overallTotal ? Math.round(overallBooked / overallTotal) : 0;

  const donut = createDonut(overallPct, overallPct >= 70 ? "var(--amber)" : "var(--cyan)", "Overall", "All resource types");
  els.donutCharts.appendChild(donut);

  // Bar list
  els.forecastList.innerHTML = "";
  const entries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  for (const [type, pct] of entries) {
    const li = document.createElement("li");
    li.className = "forecast-item";
    const high = pct >= 70;
    li.innerHTML = `
      <div class="forecast-row">
        <span class="forecast-type">${type}</span>
        <span class="forecast-pct ${high ? "forecast-pct--high" : ""}">${pct}%</span>
      </div>
      <div class="forecast-bar"><div class="forecast-bar-fill ${high ? "forecast-bar-fill--high" : ""}" style="width:0%"></div></div>
      ${high ? `<div class="forecast-note">⚡ High demand this week — consider adding ${type.toLowerCase()} capacity.</div>` : ""}
    `;
    els.forecastList.appendChild(li);

    // Animate bar fill
    requestAnimationFrame(() => {
      const fill = li.querySelector(".forecast-bar-fill");
      if (fill) fill.style.width = `${pct}%`;
    });
  }
}

/** Create a CSS-only donut chart */
function createDonut(pct, color, label, sub) {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.gap = "12px";

  const donut = document.createElement("div");
  donut.className = "donut";
  donut.style.background = `conic-gradient(${color} ${pct * 3.6}deg, rgba(255,255,255,0.06) ${pct * 3.6}deg)`;

  const inner = document.createElement("div");
  inner.className = "donut-label";
  inner.style.background = "var(--bg-primary)";
  inner.style.width = "36px";
  inner.style.height = "36px";
  inner.style.borderRadius = "50%";
  inner.style.margin = "8px";
  inner.textContent = `${pct}%`;
  donut.appendChild(inner);

  const info = document.createElement("div");
  info.className = "donut-info";
  info.innerHTML = `<span class="donut-info-label">${label}</span><span class="donut-info-sub">${sub}</span>`;

  wrap.appendChild(donut);
  wrap.appendChild(info);
  return wrap;
}

/* ---------------------------------------------------------------------- */
/* Booking form                                                           */
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
  const matching = state.resources.filter((r) => r.type === type);
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
}

function onSubmitBooking(e) {
  e.preventDefault();
  els.formFeedback.textContent = "";
  els.formFeedback.className = "form-feedback";

  const type = els.formType.value;
  const start = els.formStart.value;
  const end = els.formEnd.value;
  const trip = els.formTrip.value.trim();
  const customer = els.formCustomer.value.trim();

  if (!start || !end || start > end) {
    showFormError("Check the dates — the end date can't be before the start date.");
    showToast("Invalid date range", "error");
    return;
  }
  if (!trip || !customer) {
    showFormError("Trip name and customer are both required.");
    showToast("Missing required fields", "error");
    return;
  }

  let resourceId = els.formResource.value;
  if (resourceId === "__new__") {
    const newName = els.formNewResourceName.value.trim();
    if (!newName) {
      showFormError("Name the new resource before adding it.");
      return;
    }
    resourceId = `${type.toLowerCase()}-${slugify(newName)}-${Date.now()}`;
    state.resources.push({ id: resourceId, type, name: newName });
  }

  const pendingBooking = {
    id: `bk-${Date.now()}`,
    resourceId,
    tripName: trip,
    customer,
    startDate: start,
    endDate: end,
  };

  const overlaps = findOverlaps(resourceId, start, end);
  if (overlaps.length > 0) {
    openConflictModal(pendingBooking, overlaps, type);
    return;
  }

  commitBooking(pendingBooking);
  showFormSuccess("Booking confirmed — no clash detected.");
  showToast(`✓ Booked: ${trip} for ${customer}`, "success");
}

function showFormError(msg) {
  els.formFeedback.textContent = msg;
  els.formFeedback.className = "form-feedback form-feedback--error";
}
function showFormSuccess(msg) {
  els.formFeedback.textContent = msg;
  els.formFeedback.className = "form-feedback form-feedback--success";
}

function commitBooking(booking) {
  // Push to undo stack
  undoStack.push({ action: "add", booking: { ...booking } });

  state.bookings.push(booking);
  saveState(state);
  populateResourceOptionsForType(els.formType.value);
  renderAll();
  els.bookingForm.reset();
  els.formStart.value = dayOffset(0);
  els.formEnd.value = dayOffset(0);
}

/* ---------------------------------------------------------------------- */
/* Undo                                                                   */
/* ---------------------------------------------------------------------- */

function undoLastBooking() {
  if (undoStack.length === 0) {
    showToast("Nothing to undo", "info");
    return;
  }
  const last = undoStack.pop();
  if (last.action === "add") {
    state.bookings = state.bookings.filter((b) => b.id !== last.booking.id);
    saveState(state);
    renderAll();
    showToast(`↩ Undid booking: ${last.booking.tripName}`, "info");
  }
}

/* ---------------------------------------------------------------------- */
/* Conflict modal: alert + alternative suggestion + severity              */
/* ---------------------------------------------------------------------- */

let pendingConflict = null;

function openConflictModal(pendingBooking, overlaps, type) {
  const resource = state.resources.find((r) => r.id === pendingBooking.resourceId);
  const alternatives = findAvailableAlternatives(type, pendingBooking.startDate, pendingBooking.endDate, pendingBooking.resourceId);
  const severity = computeConflictSeverity(pendingBooking.resourceId, pendingBooking.startDate, pendingBooking.endDate);

  pendingConflict = { pendingBooking, alternatives, resource };

  const overlapLines = overlaps
    .map((b) => `<li><strong>${b.tripName}</strong> (${b.customer}) — ${b.startDate} to ${b.endDate}</li>`)
    .join("");

  // Check for conflict chains
  let chainWarning = "";
  if (alternatives.length > 0) {
    const topAlt = alternatives[0];
    if (detectConflictChain(topAlt.id, pendingBooking.startDate, pendingBooking.endDate)) {
      chainWarning = `<p style="font-size:11px;color:var(--amber);margin-top:8px;">⚠ Note: ${topAlt.name} has adjacent bookings — verify workload before switching.</p>`;
    }
  }

  els.conflictModalBody.innerHTML = `
    <div style="margin-bottom:10px;">
      <span class="severity-badge severity-${severity.level}">${severity.label || "Conflict"} · Score ${severity.score}</span>
    </div>
    <p class="conflict-summary">
      <strong>${resource.name}</strong> is already booked for dates that overlap
      <strong>${pendingBooking.startDate} to ${pendingBooking.endDate}</strong>:
    </p>
    <ul class="conflict-overlap-list">${overlapLines}</ul>
    ${
      alternatives.length
        ? `<p class="conflict-alt-label">Suggested alternative — ranked by workload balance:</p>
           <ul class="conflict-alt-list">${alternatives.map((a) => `<li>${a.name} <span style="font-size:10px;color:var(--text-muted)">(${a.score} current booking${a.score !== 1 ? "s" : ""})</span></li>`).join("")}</ul>
           ${chainWarning}`
        : `<p class="conflict-alt-label conflict-alt-label--none">No other ${type.toLowerCase()} is free for this exact range.</p>`
    }
  `;

  els.conflictSwitchBtn.disabled = alternatives.length === 0;
  els.conflictSwitchBtn.textContent = alternatives.length
    ? `⚡ Switch to ${alternatives[0].name}`
    : "No alternative available";

  els.conflictModal.classList.remove("hidden");

  // Play a subtle notification sound (Web Audio API)
  playConflictSound();

  const alertText = `Clash: ${resource.name} double-booked ${pendingBooking.startDate}→${pendingBooking.endDate} [${severity.label || "Conflict"}].` +
    (alternatives.length ? ` Suggested ${alternatives[0].name} instead.` : " No free alternative found.");
  state.alerts.push({ time: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }), text: alertText });
  saveState(state);
  renderAlerts();

  showToast("⚠ Clash detected — check the conflict modal", "warning");
}

function closeConflictModal() {
  els.conflictModal.classList.add("hidden");
  pendingConflict = null;
}

document.addEventListener("DOMContentLoaded", () => {
  els.conflictCancelBtn.addEventListener("click", closeConflictModal);
  els.conflictProceedBtn.addEventListener("click", () => {
    if (!pendingConflict) return;
    commitBooking(pendingConflict.pendingBooking);
    showFormError("Booked anyway — this resource now shows a Conflict! on the board.");
    showToast("⚠ Booked with conflict — resource is double-booked", "warning");
    closeConflictModal();
  });
  els.conflictSwitchBtn.addEventListener("click", () => {
    if (!pendingConflict || pendingConflict.alternatives.length === 0) return;
    const alt = pendingConflict.alternatives[0];
    const booking = { ...pendingConflict.pendingBooking, id: `bk-${Date.now()}`, resourceId: alt.id };
    commitBooking(booking);
    showFormSuccess(`Booked with ${alt.name} instead — no clash.`);
    showToast(`✓ Switched to ${alt.name} — conflict resolved!`, "success");
    closeConflictModal();
  });
});

/* ---------------------------------------------------------------------- */
/* Conflict Sound (Web Audio API — subtle)                                */
/* ---------------------------------------------------------------------- */

function playConflictSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    // Audio not supported — ignore silently
  }
}

/* ---------------------------------------------------------------------- */
/* Auto-Demo Walkthrough                                                  */
/* ---------------------------------------------------------------------- */

let demoTimeout = null;
let demoRunning = false;

const DEMO_STEPS = [
  {
    text: "📋 The board loads with live data — 2 clashes are already visible (Driver Ramesh & Vehicle MH-04-1121).",
    action: () => {
      // Reset to seed data
      state = freshState();
      saveState(state);
      boardStartDate = dayOffset(0);
      currentView = "grid";
      document.querySelectorAll(".view-toggle-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === "grid"));
      els.typeFilter.value = "all";
      populateBookingFormOptions();
      renderAll();
    },
    duration: 4000,
  },
  {
    text: "🔍 Let's try booking Driver Ramesh again for overlapping dates — the same flow any dispatcher would use.",
    action: () => {
      els.formType.value = "Driver";
      populateResourceOptionsForType("Driver");
      els.formResource.value = "drv-ramesh";
      els.formTrip.value = "Hill Station Retreat";
      els.formCustomer.value = "Patel Family";
      els.formStart.value = dayOffset(1);
      els.formEnd.value = dayOffset(2);
    },
    duration: 3500,
  },
  {
    text: "⚡ Submitting the booking — watch the clash modal fire with severity scoring and a smart alternative suggestion!",
    action: () => {
      els.bookingForm.dispatchEvent(new Event("submit", { cancelable: true }));
    },
    duration: 5000,
  },
  {
    text: "✅ The system suggests Driver Suresh (least loaded). One click to switch — conflict resolved instantly!",
    action: () => {
      if (pendingConflict && pendingConflict.alternatives.length > 0) {
        els.conflictSwitchBtn.click();
      }
    },
    duration: 4000,
  },
  {
    text: "📊 Now let's see the Timeline view — a Gantt-style visualization showing booking spans at a glance.",
    action: () => {
      currentView = "timeline";
      document.querySelectorAll(".view-toggle-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === "timeline"));
      renderBoardView();
    },
    duration: 4000,
  },
  {
    text: "🎉 Demo complete! The board catches clashes instantly and suggests alternatives — no manual checking needed.",
    action: () => {},
    duration: 3000,
  },
];

function startAutoDemo() {
  if (demoRunning) return;
  demoRunning = true;
  els.demoOverlay.classList.remove("hidden");
  els.demoBtn.disabled = true;
  runDemoStep(0);
}

function runDemoStep(index) {
  if (!demoRunning || index >= DEMO_STEPS.length) {
    stopAutoDemo();
    return;
  }

  const step = DEMO_STEPS[index];
  els.demoStepNum.textContent = `Step ${index + 1}/${DEMO_STEPS.length}`;
  els.demoStepText.textContent = step.text;

  step.action();

  demoTimeout = setTimeout(() => runDemoStep(index + 1), step.duration);
}

function stopAutoDemo() {
  demoRunning = false;
  if (demoTimeout) clearTimeout(demoTimeout);
  demoTimeout = null;
  els.demoOverlay.classList.add("hidden");
  els.demoBtn.disabled = false;
}

/* ---------------------------------------------------------------------- */
/* CSV Export                                                              */
/* ---------------------------------------------------------------------- */

function exportToCSV() {
  const rows = [["Booking ID", "Resource", "Type", "Trip", "Customer", "Start", "End"]];
  for (const b of state.bookings) {
    const r = state.resources.find((res) => res.id === b.resourceId);
    rows.push([b.id, r ? r.name : b.resourceId, r ? r.type : "", b.tripName, b.customer, b.startDate, b.endDate]);
  }
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bookings-${dayOffset(0)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("📁 Bookings exported as CSV", "success");
}

/* ---------------------------------------------------------------------- */
/* Reset / misc                                                           */
/* ---------------------------------------------------------------------- */

function onResetDemo() {
  if (!confirm("Reset the board back to the seeded demo data? This clears anything you've added.")) return;
  state = freshState();
  saveState(state);
  boardStartDate = dayOffset(0);
  undoStack = [];
  populateBookingFormOptions();
  renderAll();
  showToast("↻ Demo data reset", "info");
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
