/**
 * app.js
 * Resource Clash & Double-Booking Detector — client-side prototype logic.
 *
 * Everything runs in the browser against an in-memory + localStorage store.
 * This is intentional for the hackathon prototype stage (see README "Prototype
 * scope" section) — a production version would move `state` behind a real API.
 */

let state = loadState() || freshState();
let boardStartDate = dayOffset(0);
const BOARD_DAYS = 7;

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheEls();
  bindEvents();
  populateResourceTypeFilter();
  populateBookingFormOptions();
  renderAll();
});

function cacheEls() {
  els.board = document.getElementById("board");
  els.boardRangeLabel = document.getElementById("board-range-label");
  els.statBookings = document.getElementById("stat-bookings");
  els.statConflicts = document.getElementById("stat-conflicts");
  els.statResources = document.getElementById("stat-resources");
  els.statUtilization = document.getElementById("stat-utilization");
  els.alertFeed = document.getElementById("alert-feed");
  els.forecastList = document.getElementById("forecast-list");
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
  els.inspectModal = document.getElementById("inspect-modal");
  els.inspectModalBody = document.getElementById("inspect-modal-body");
  els.inspectCloseBtn = document.getElementById("inspect-close-btn");
  els.resetBtn = document.getElementById("reset-demo-btn");
  els.printBtn = document.getElementById("print-btn");
  els.prevWeekBtn = document.getElementById("prev-week-btn");
  els.todayBtn = document.getElementById("today-btn");
  els.nextWeekBtn = document.getElementById("next-week-btn");
  els.typeFilter = document.getElementById("type-filter");
  els.clock = document.getElementById("live-clock");
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
  els.todayBtn.addEventListener("click", () => {
    boardStartDate = dayOffset(0);
    renderBoard();
  });
  els.typeFilter.addEventListener("change", renderBoard);

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
  boardStartDate = fmtDate(d);
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
/* Core conflict-detection logic                                          */
/* Delegates to conflict-engine.js — the exact same module the automated  */
/* test suite (tests.js) runs against, so the UI can never silently drift */
/* from what's proven correct. See README "Validation" section.          */
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

function countOpenConflicts() {
  return ConflictEngine.countOpenConflicts(state.bookings);
}

/* ---------------------------------------------------------------------- */
/* Rendering                                                              */
/* ---------------------------------------------------------------------- */

function renderAll() {
  renderBoard();
  renderStats();
  renderAlerts();
  renderForecast();
}

function renderBoard() {
  const dates = boardDates();
  const first = new Date(dates[0] + "T00:00:00");
  const last = new Date(dates[dates.length - 1] + "T00:00:00");
  els.boardRangeLabel.textContent = `${first.toLocaleDateString(undefined, { month: "short", day: "numeric" })} — ${last.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  const typeFilterVal = els.typeFilter.value;
  const conflictMap = computeConflictMap();

  let resources = state.resources;
  if (typeFilterVal !== "all") {
    resources = resources.filter((r) => r.type === typeFilterVal);
  }

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
    td.textContent = "No resources of this type yet. Add a booking to register one.";
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
        const tripNames = bookingsForCell.map((b) => b.tripName).join(" + ");
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

function renderStats() {
  const dates = boardDates();
  const conflictMap = computeConflictMap();
  const openConflicts = Object.values(conflictMap).filter((c) => c > 1).length;

  els.statBookings.textContent = state.bookings.length;
  els.statConflicts.textContent = openConflicts;
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
 * ML model. The pitch deck lists a real ML forecasting layer as optional /
 * future scope, and we are not claiming it here per the "don't claim
 * unfinished features" submission rule.
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
      <div class="forecast-bar"><div class="forecast-bar-fill ${high ? "forecast-bar-fill--high" : ""}" style="width:${pct}%"></div></div>
      ${high ? `<div class="forecast-note">High demand this week — consider adding ${type.toLowerCase()} capacity.</div>` : ""}
    `;
    els.forecastList.appendChild(li);
  }
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
    const existing = state.resources.find(
      (r) => r.type === type && r.name.toLowerCase() === newName.toLowerCase()
    );
    if (existing) {
      showFormError(`"${newName}" already exists as a ${type.toLowerCase()} — select it from the dropdown instead of re-adding it.`);
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
  state.bookings.push(booking);
  saveState(state);
  populateResourceOptionsForType(els.formType.value);
  renderAll();
  els.bookingForm.reset();
  els.formStart.value = dayOffset(0);
  els.formEnd.value = dayOffset(0);
}

/* ---------------------------------------------------------------------- */
/* Conflict modal: alert + alternative suggestion                        */
/* ---------------------------------------------------------------------- */

let pendingConflict = null;

function openConflictModal(pendingBooking, overlaps, type) {
  const resource = state.resources.find((r) => r.id === pendingBooking.resourceId);
  const alternatives = findAvailableAlternatives(type, pendingBooking.startDate, pendingBooking.endDate, pendingBooking.resourceId);

  pendingConflict = { pendingBooking, alternatives, resource };

  const overlapLines = overlaps
    .map((b) => `<li><strong>${b.tripName}</strong> (${b.customer}) — ${b.startDate} to ${b.endDate}</li>`)
    .join("");

  els.conflictModalBody.innerHTML = `
    <p class="conflict-summary">
      <strong>${resource.name}</strong> is already booked for dates that overlap
      <strong>${pendingBooking.startDate} to ${pendingBooking.endDate}</strong>:
    </p>
    <ul class="conflict-overlap-list">${overlapLines}</ul>
    ${
      alternatives.length
        ? `<p class="conflict-alt-label">Suggested alternative — free for the whole requested range:</p>
           <ul class="conflict-alt-list">${alternatives.map((a) => `<li>${a.name}</li>`).join("")}</ul>`
        : `<p class="conflict-alt-label conflict-alt-label--none">No other ${type.toLowerCase()} is free for this exact range.</p>`
    }
  `;

  els.conflictSwitchBtn.disabled = alternatives.length === 0;
  els.conflictSwitchBtn.textContent = alternatives.length
    ? `Switch to ${alternatives[0].name}`
    : "No alternative available";

  els.conflictModal.classList.remove("hidden");

  const alertText = `Clash: ${resource.name} double-booked ${pendingBooking.startDate}→${pendingBooking.endDate}.` +
    (alternatives.length ? ` Suggested ${alternatives[0].name} instead.` : " No free alternative found.");
  state.alerts.push({ time: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }), text: alertText });
  saveState(state);
  renderAlerts();
}

function closeConflictModal() {
  els.conflictModal.classList.add("hidden");
  pendingConflict = null;
}

/**
 * Conflict inspector: click any red "Conflict!" cell on the board to see
 * exactly which bookings collide on that resource/date, why, and — for each
 * colliding booking — a one-click reassignment to a free alternative of the
 * same resource type, without needing to submit a new booking first.
 */
function openInspectModal(resourceId, date) {
  const resource = state.resources.find((r) => r.id === resourceId);
  const collidingBookings = state.bookings.filter(
    (b) => b.resourceId === resourceId && b.startDate <= date && date <= b.endDate
  );

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long", month: "short", day: "numeric", year: "numeric",
  });

  const rows = collidingBookings
    .map((b, i) => {
      const alternatives = findAvailableAlternatives(resource.type, b.startDate, b.endDate, resourceId);
      const altBtn = alternatives.length
        ? `<button class="btn btn-primary inspect-reassign-btn" data-booking-id="${b.id}" data-alt-id="${alternatives[0].id}">Reassign to ${alternatives[0].name}</button>`
        : `<span class="inspect-why">No free ${resource.type.toLowerCase()} available for ${b.startDate} → ${b.endDate}</span>`;
      return `
        <div class="inspect-booking-row">
          <div class="inspect-booking-title">${b.tripName}</div>
          <div class="inspect-booking-meta">${b.customer} &middot; ${b.startDate} to ${b.endDate}</div>
          <div class="inspect-booking-actions">${altBtn}</div>
        </div>
      `;
    })
    .join("");

  els.inspectModalBody.innerHTML = `
    <p class="inspect-cell-header">
      <strong>${resource.name}</strong> (${resource.type}) has <strong>${collidingBookings.length} overlapping bookings</strong>
      on <strong>${dateLabel}</strong> — that's why the board flags this cell red.
      Reassign one of them to clear the clash:
    </p>
    ${rows}
  `;

  els.inspectModalBody.querySelectorAll(".inspect-reassign-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const bookingId = btn.getAttribute("data-booking-id");
      const altId = btn.getAttribute("data-alt-id");
      const booking = state.bookings.find((b) => b.id === bookingId);
      const altResource = state.resources.find((r) => r.id === altId);
      if (!booking || !altResource) return;
      booking.resourceId = altId;
      saveState(state);
      renderAll();
      closeInspectModal();
      showFormSuccess(`Reassigned "${booking.tripName}" to ${altResource.name} — conflict cleared.`);
    });
  });

  els.inspectModal.classList.remove("hidden");
}

function closeInspectModal() {
  els.inspectModal.classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  els.conflictCancelBtn.addEventListener("click", closeConflictModal);
  els.inspectCloseBtn.addEventListener("click", closeInspectModal);
  els.conflictProceedBtn.addEventListener("click", () => {
    if (!pendingConflict) return;
    commitBooking(pendingConflict.pendingBooking);
    showFormError("Booked anyway — this resource now shows a Conflict! on the board.");
    closeConflictModal();
  });
  els.conflictSwitchBtn.addEventListener("click", () => {
    if (!pendingConflict || pendingConflict.alternatives.length === 0) return;
    const alt = pendingConflict.alternatives[0];
    const booking = { ...pendingConflict.pendingBooking, id: `bk-${Date.now()}`, resourceId: alt.id };
    commitBooking(booking);
    showFormSuccess(`Booked with ${alt.name} instead — no clash.`);
    closeConflictModal();
  });
});

/* ---------------------------------------------------------------------- */
/* Reset / misc                                                          */
/* ---------------------------------------------------------------------- */

function onResetDemo() {
  if (!confirm("Reset the board back to the seeded demo data? This clears anything you've added.")) return;
  state = freshState();
  saveState(state);
  boardStartDate = dayOffset(0);
  populateBookingFormOptions();
  renderAll();
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}