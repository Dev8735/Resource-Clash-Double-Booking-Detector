(function () {
  'use strict';

  const STORAGE_KEY = 'rcbd_v2_state';
  const core = window.RCBDCore;

  let state = loadState();
  let undoStack = [];
  let viewMode = 'grid';
  let weekOffset = 0;
  let searchQuery = '';
  let typeFilter = 'all';
  let pendingBooking = null; // holds the in-flight booking while the conflict modal is open

  /* ---------------- State persistence ---------------- */

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Could not read saved state, starting fresh.', e);
    }
    return buildSeedData();
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save state to localStorage.', e);
    }
  }

  /* ---------------- Helpers ---------------- */

  function formatDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  function generateId(prefix) {
    return prefix + Date.now() + Math.floor(Math.random() * 1000);
  }

  function toast(message, type) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' toast-' + type : '');
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3800);
  }

  function currentWeekStart() {
    return core.isoDate(core.addDays(new Date(), weekOffset * 7));
  }

  /* ---------------- Rendering ---------------- */

  function fullSchedule() {
    // Always relative to *today*, independent of week navigation, so stats
    // and the pressure/conflict panels stay stable while browsing weeks.
    return core.buildSchedule(state.resources, state.bookings, core.todayIso(), 7);
  }

  function visibleResources() {
    return state.resources.filter((r) => {
      const matchesType = typeFilter === 'all' || r.type === typeFilter;
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }

  function renderAll() {
    renderClock();
    renderWeekLabel();
    renderStats();
    renderBoard();
    renderConflictFeed();
    renderBookingsList();
    renderPressurePanel();
    renderUtilization();
    populateResourceDropdown();
  }

  function renderClock() {
    const el = document.getElementById('live-clock');
    const now = new Date();
    el.textContent = now.toLocaleString('en-IN', {
      weekday: 'short', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function renderWeekLabel() {
    const start = currentWeekStart();
    const end = core.isoDate(core.addDays(new Date(start + 'T00:00:00'), 6));
    document.getElementById('week-label').textContent =
      weekOffset === 0 ? 'This Week' : `${formatDate(start)} – ${formatDate(end)}`;
  }

  function renderStats() {
    const schedule = fullSchedule();
    const conflictedResourceIds = new Set();
    schedule.grid.forEach((row) => {
      if (row.cells.some((c) => c.status === 'conflict')) conflictedResourceIds.add(row.resourceId);
    });
    const availableToday = schedule.grid.filter((row) => row.cells[0] && row.cells[0].status === 'available').length;

    const stats = [
      { label: 'Total Resources', value: state.resources.length, tone: 'neutral' },
      { label: 'Total Bookings', value: state.bookings.length, tone: 'neutral' },
      { label: 'Active Conflicts', value: conflictedResourceIds.size, tone: 'conflict' },
      { label: 'Available Today', value: availableToday, tone: 'ok' },
    ];

    const bar = document.getElementById('stats-bar');
    bar.innerHTML = stats
      .map(
        (s) => `
      <div class="stat-box">
        <div class="stat-value tone-${s.tone}">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>`
      )
      .join('');
  }

  function typeBadge(type) {
    const labels = { driver: 'Driver', vehicle: 'Vehicle', guide: 'Guide', room: 'Room' };
    return `<span class="type-badge ${type}">${labels[type] || type}</span>`;
  }

  function renderBoard() {
    const container = document.getElementById('board-container');
    const resources = visibleResources();
    const schedule = core.buildSchedule(resources, state.bookings, currentWeekStart(), 7);

    if (resources.length === 0) {
      container.innerHTML = '<p class="feed-empty">No resources match the current search/filter.</p>';
      return;
    }

    if (viewMode === 'grid') {
      let html = '<table class="board-table"><thead><tr><th>Resource</th>';
      schedule.dates.forEach((d) => (html += `<th>${formatDate(d)}</th>`));
      html += '</tr></thead><tbody>';

      schedule.grid.forEach((row) => {
        html += `<tr><td class="resource-cell">${typeBadge(row.resourceType)} ${row.resourceName}</td>`;
        row.cells.forEach((cell) => {
          const label = cell.status === 'conflict' ? 'CONFLICT!' : cell.status === 'booked' ? 'BOOKED' : 'OPEN';
          const tooltip = cell.bookings.map((b) => b.tripName).join(' | ');
          const cellClass = cell.status === 'conflict' ? ' cell-conflict' : '';
          html += `<td class="${cellClass}" title="${tooltip}"><span class="status-pill ${cell.status}">${label}</span></td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      container.innerHTML = html;
    } else {
      // Timeline view: one row per resource, 7 day-segments per track.
      let html = '';
      schedule.grid.forEach((row) => {
        html += `<div class="timeline-row">
          <div class="timeline-label">${typeBadge(row.resourceType)} ${row.resourceName}</div>
          <div class="timeline-track">`;
        row.cells.forEach((cell, i) => {
          if (cell.status === 'available') return;
          const widthPct = 100 / row.cells.length;
          const leftPct = widthPct * i;
          const cls = cell.status === 'conflict' ? 'timeline-bar conflict' : 'timeline-bar';
          const label = cell.bookings[0] ? cell.bookings[0].tripName : '';
          html += `<div class="${cls}" style="left:${leftPct}%;width:${widthPct}%" title="${label}">${label}</div>`;
        });
        html += `</div></div>`;
      });
      container.innerHTML = html || '<p class="feed-empty">No bookings to show in timeline view.</p>';
    }
  }

  function renderConflictFeed() {
    const schedule = fullSchedule();
    const feed = document.getElementById('conflict-feed');
    const items = [];

    schedule.grid.forEach((row) => {
      row.cells.forEach((cell) => {
        if (cell.status === 'conflict') {
          const names = cell.bookings.map((b) => b.tripName).join(' vs. ');
          items.push(`${formatDate(cell.date)} — ${row.resourceName}: ${names}`);
        }
      });
    });

    feed.innerHTML =
      items.length === 0
        ? '<p class="feed-empty">No conflicts detected in the next 7 days.</p>'
        : items.map((t) => `<div class="feed-item">${t}</div>`).join('');
  }

  function renderBookingsList() {
    const list = document.getElementById('bookings-list');
    const sorted = [...state.bookings].sort((a, b) => a.startDate.localeCompare(b.startDate));

    if (sorted.length === 0) {
      list.innerHTML = '<p class="feed-empty">No bookings yet.</p>';
      return;
    }

    list.innerHTML = sorted
      .map((b) => {
        const resource = state.resources.find((r) => r.id === b.resourceId);
        const resourceName = resource ? resource.name : 'Unknown resource';
        return `
        <div class="booking-row">
          <span><strong>${b.tripName}</strong> — ${resourceName} · ${formatDate(b.startDate)} to ${formatDate(b.endDate)}</span>
          <button type="button" class="cancel-btn" data-booking-id="${b.id}">Cancel</button>
        </div>`;
      })
      .join('');

    list.querySelectorAll('.cancel-btn').forEach((btn) => {
      btn.addEventListener('click', () => cancelBooking(btn.getAttribute('data-booking-id')));
    });
  }

  function renderPressurePanel() {
    const schedule = fullSchedule();
    const days = core.computePressureDays(schedule);
    const panel = document.getElementById('pressure-panel');

    if (days.length === 0) {
      panel.innerHTML = '<p class="pressure-empty">No high-demand days detected in the next 7 days.</p>';
      return;
    }

    panel.innerHTML = days
      .map(
        (d) => `
      <div class="pressure-day ${d.hasConflict ? 'conflict' : 'high'}">
        <strong>${formatDate(d.date)}</strong> — ${d.bookedCount}/${d.total} resources booked
        ${d.hasConflict ? ' · conflict present' : ''}
      </div>`
      )
      .join('');
  }

  function populateResourceDropdown() {
    const type = document.getElementById('form-type').value;
    const select = document.getElementById('form-resource');
    const matching = state.resources.filter((r) => r.type === type);
    select.innerHTML = matching.map((r) => `<option value="${r.id}">${r.name}</option>`).join('');
  }

  function renderUtilization() {
    const schedule = fullSchedule();
    const util = core.computeUtilization(schedule);
    const panel = document.getElementById('utilization-panel');

    if (util.length === 0) {
      panel.innerHTML = '<p class="feed-empty">No resources yet.</p>';
      return;
    }

    panel.innerHTML = util
      .map((u) => {
        const fillClass = u.conflictDays > 0 ? 'util-fill high' : 'util-fill';
        return `
        <div class="util-row">
          <span class="util-label">${typeBadge(u.resourceType)} ${u.resourceName}</span>
          <span class="util-track"><span class="${fillClass}" style="width:${u.utilizationPct}%"></span></span>
          <span class="util-pct">${u.utilizationPct}%</span>
        </div>`;
      })
      .join('');
  }

  function handleExportCsv() {
    if (state.bookings.length === 0) {
      toast('No bookings to export yet.', 'error');
      return;
    }
    const csv = core.bookingsToCsv(state.bookings, state.resources);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${core.todayIso()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Bookings exported as CSV.', 'success');
  }

  /* ---------------- Guided tour ---------------- */

  const TOUR_STEPS = [
    { target: '[data-tour="stats"]', text: 'This shows a live count of total resources, total bookings, active conflicts, and what\u2019s available today.' },
    { target: '[data-tour="toolbar"]', text: 'Search resources by name, filter by type, switch between Grid and Timeline views, and navigate week to week.' },
    { target: '[data-tour="board"]', text: 'This is the live schedule board. Green means booked, white means available, red means a conflict was detected.' },
    { target: '[data-tour="booking-form"]', text: 'Create a new booking here. If it clashes with an existing one, a conflict dialog opens automatically with a suggested alternative.' },
    { target: '[data-tour="pressure"]', text: 'This panel flags upcoming high-demand days using a simple rule-based heuristic \u2014 not machine learning.' },
    { target: '[data-tour="utilization"]', text: 'And here\u2019s how busy each resource is over the visible week, so you can spot under- or over-used resources at a glance.' },
  ];
  let tourStepIndex = 0;

  function startTour() {
    tourStepIndex = 0;
    document.getElementById('tour-overlay').classList.remove('hidden');
    showTourStep();
  }

  function endTour() {
    document.getElementById('tour-overlay').classList.add('hidden');
  }

  function showTourStep() {
    const step = TOUR_STEPS[tourStepIndex];
    if (!step) {
      endTour();
      return;
    }

    const el = document.querySelector(step.target);
    const spotlight = document.getElementById('tour-spotlight');
    const tooltip = document.getElementById('tour-tooltip');
    const text = document.getElementById('tour-text');
    const nextBtn = document.getElementById('tour-next-btn');

    text.textContent = step.text;
    nextBtn.textContent = tourStepIndex === TOUR_STEPS.length - 1 ? 'Finish' : 'Next';

    if (!el) {
      // Target not present (e.g. filtered out) — skip to next step safely.
      tourStepIndex++;
      showTourStep();
      return;
    }

    el.scrollIntoView({ block: 'center', behavior: 'smooth' });

    // Give the smooth-scroll a moment to settle before measuring position.
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const pad = 6;
      spotlight.style.top = `${rect.top - pad}px`;
      spotlight.style.left = `${rect.left - pad}px`;
      spotlight.style.width = `${rect.width + pad * 2}px`;
      spotlight.style.height = `${rect.height + pad * 2}px`;

      let tooltipTop = rect.bottom + 14;
      let tooltipLeft = rect.left;
      if (tooltipLeft + 260 > window.innerWidth) tooltipLeft = window.innerWidth - 280;
      if (tooltipTop + 140 > window.innerHeight) tooltipTop = rect.top - 150;

      tooltip.style.top = `${tooltipTop}px`;
      tooltip.style.left = `${tooltipLeft}px`;
    }, 200);
  }

  function wireTour() {
    document.getElementById('watch-demo-btn').addEventListener('click', startTour);
    document.getElementById('tour-skip-btn').addEventListener('click', endTour);
    document.getElementById('tour-next-btn').addEventListener('click', () => {
      tourStepIndex++;
      showTourStep();
    });
  }



  function handleBookingSubmit(e) {
    e.preventDefault();
    const feedback = document.getElementById('form-feedback');
    feedback.textContent = '';
    feedback.className = 'form-feedback';

    const resourceId = document.getElementById('form-resource').value;
    const tripName = document.getElementById('form-trip').value.trim();
    const customer = document.getElementById('form-customer').value.trim();
    const startDate = document.getElementById('form-start').value;
    const endDate = document.getElementById('form-end').value;

    if (!resourceId) {
      showFormError('Add a resource of this type first.');
      return;
    }
    if (!tripName || !customer) {
      showFormError('Trip name and customer are required.');
      return;
    }

    const dateCheck = core.validateBookingDates(startDate, endDate);
    if (!dateCheck.valid) {
      showFormError(dateCheck.message);
      return;
    }

    const conflicts = core.findConflicts(state.bookings, resourceId, startDate, endDate, null);

    if (conflicts.length === 0) {
      commitBooking({ resourceId, tripName, customer, startDate, endDate });
      showFormSuccess('Booking confirmed — no clash detected.');
      return;
    }

    // Conflict path: open modal, let the user choose how to resolve it.
    const resource = state.resources.find((r) => r.id === resourceId);
    pendingBooking = { resourceId, tripName, customer, startDate, endDate, resourceType: resource.type };
    openConflictModal(conflicts, resource);
  }

  function showFormError(message) {
    const feedback = document.getElementById('form-feedback');
    feedback.textContent = message;
    feedback.className = 'form-feedback form-feedback-error';
    toast(message, 'error');
  }

  function showFormSuccess(message) {
    const feedback = document.getElementById('form-feedback');
    feedback.textContent = message;
    feedback.className = 'form-feedback form-feedback-success';
    toast(message, 'success');
  }

  function commitBooking(data) {
    const booking = {
      id: generateId('b'),
      resourceId: data.resourceId,
      tripName: data.tripName,
      customer: data.customer,
      startDate: data.startDate,
      endDate: data.endDate,
    };
    state.bookings.push(booking);
    undoStack.push({ action: 'add-booking', bookingId: booking.id });
    saveState();
    renderAll();

    document.getElementById('form-trip').value = '';
    document.getElementById('form-customer').value = '';
  }

  function cancelBooking(id) {
    const idx = state.bookings.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const [removed] = state.bookings.splice(idx, 1);
    undoStack.push({ action: 'delete-booking', booking: removed });
    saveState();
    renderAll();
    toast('Booking cancelled.', 'success');
  }

  /* ---------------- Conflict modal ---------------- */

  function openConflictModal(conflicts, resource) {
    const modal = document.getElementById('conflict-modal');
    const message = document.getElementById('modal-message');
    const suggestionEl = document.getElementById('modal-suggestion');
    const switchBtn = document.getElementById('modal-switch-btn');

    const conflictNames = conflicts.map((c) => c.tripName).join(', ');
    message.textContent = `${resource.name} is already booked for: ${conflictNames}.`;

    const suggestions = core.suggestAlternatives(
      state.resources,
      state.bookings,
      pendingBooking.resourceType,
      pendingBooking.startDate,
      pendingBooking.endDate,
      pendingBooking.resourceId
    );

    if (suggestions.length > 0) {
      suggestionEl.textContent = `Suggested alternative: ${suggestions[0].name}${
        suggestions.length > 1 ? ` (+${suggestions.length - 1} more available)` : ''
      }`;
      switchBtn.disabled = false;
      switchBtn.dataset.suggestedId = suggestions[0].id;
    } else {
      suggestionEl.textContent = 'No alternative resource is currently free for these dates.';
      switchBtn.disabled = true;
      delete switchBtn.dataset.suggestedId;
    }

    modal.classList.remove('hidden');
  }

  function closeConflictModal() {
    document.getElementById('conflict-modal').classList.add('hidden');
    pendingBooking = null;
  }

  function handleModalSwitch() {
    const switchBtn = document.getElementById('modal-switch-btn');
    const suggestedId = switchBtn.dataset.suggestedId;
    if (!suggestedId || !pendingBooking) return;
    commitBooking({ ...pendingBooking, resourceId: suggestedId });
    showFormSuccess('Booked with the suggested alternative resource.');
    closeConflictModal();
  }

  function handleModalForce() {
    if (!pendingBooking) return;
    commitBooking(pendingBooking);
    showFormError('Booked anyway — this resource now has a conflict.');
    closeConflictModal();
  }

  /* ---------------- Add resource ---------------- */

  function handleResourceSubmit(e) {
    e.preventDefault();
    const type = document.getElementById('new-resource-type').value;
    const name = document.getElementById('new-resource-name').value.trim();
    if (!name) return;

    const resource = { id: generateId('r'), type, name };
    state.resources.push(resource);
    undoStack.push({ action: 'add-resource', resourceId: resource.id });
    saveState();
    renderAll();
    document.getElementById('new-resource-name').value = '';
    toast(`Added resource: ${name}`, 'success');
  }

  /* ---------------- Reset ---------------- */

  function handleReset() {
    if (!confirm('Reset all data back to the seeded demo state? This cannot be undone.')) return;
    state = buildSeedData();
    undoStack = [];
    saveState();
    renderAll();
    toast('Demo data reset.', 'success');
  }

  /* ---------------- Undo ---------------- */

  function undo() {
    const last = undoStack.pop();
    if (!last) {
      toast('Nothing to undo.', 'error');
      return;
    }

    if (last.action === 'add-booking') {
      state.bookings = state.bookings.filter((b) => b.id !== last.bookingId);
    } else if (last.action === 'delete-booking') {
      state.bookings.push(last.booking);
    } else if (last.action === 'add-resource') {
      state.resources = state.resources.filter((r) => r.id !== last.resourceId);
    }

    saveState();
    renderAll();
    toast('Undone.', 'success');
  }

  /* ---------------- Search / filter / view / week nav ---------------- */

  function wireToolbar() {
    document.getElementById('search-input').addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderBoard();
    });

    document.getElementById('type-filter').addEventListener('change', (e) => {
      typeFilter = e.target.value;
      renderBoard();
    });

    document.getElementById('view-grid-btn').addEventListener('click', () => setView('grid'));
    document.getElementById('view-timeline-btn').addEventListener('click', () => setView('timeline'));

    document.getElementById('prev-week-btn').addEventListener('click', () => {
      weekOffset -= 1;
      renderWeekLabel();
      renderBoard();
    });
    document.getElementById('next-week-btn').addEventListener('click', () => {
      weekOffset += 1;
      renderWeekLabel();
      renderBoard();
    });

    document.getElementById('print-btn').addEventListener('click', () => window.print());
  }

  function setView(mode) {
    viewMode = mode;
    document.getElementById('view-grid-btn').classList.toggle('active', mode === 'grid');
    document.getElementById('view-timeline-btn').classList.toggle('active', mode === 'timeline');
    renderBoard();
  }

  /* ---------------- Keyboard shortcuts ---------------- */

  function handleKeydown(e) {
    const isTyping = ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName);

    if (e.key === 'Escape') {
      closeConflictModal();
      endTour();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
      return;
    }
    if (isTyping) return; // let the browser handle normal typing/select otherwise

    if (e.key === '/') {
      e.preventDefault();
      document.getElementById('search-input').focus();
    } else if (e.key.toLowerCase() === 'n') {
      e.preventDefault();
      document.getElementById('form-trip').focus();
    } else if (e.key.toLowerCase() === 't') {
      e.preventDefault();
      setView(viewMode === 'grid' ? 'timeline' : 'grid');
    } else if (e.key.toLowerCase() === 'r') {
      e.preventDefault();
      handleReset();
    }
  }

  /* ---------------- Init ---------------- */

  function setDefaultDates() {
    const today = core.todayIso();
    document.getElementById('form-start').min = today;
    document.getElementById('form-end').min = today;
    document.getElementById('form-start').value = today;
    document.getElementById('form-end').value = today;
  }

  function init() {
    document.getElementById('booking-form').addEventListener('submit', handleBookingSubmit);
    document.getElementById('resource-form').addEventListener('submit', handleResourceSubmit);
    document.getElementById('form-type').addEventListener('change', populateResourceDropdown);
    document.getElementById('reset-btn').addEventListener('click', handleReset);

    document.getElementById('modal-switch-btn').addEventListener('click', handleModalSwitch);
    document.getElementById('modal-force-btn').addEventListener('click', handleModalForce);
    document.getElementById('modal-cancel-btn').addEventListener('click', closeConflictModal);

    document.getElementById('form-start').addEventListener('change', () => {
      const start = document.getElementById('form-start').value;
      const endInput = document.getElementById('form-end');
      const today = core.todayIso();
      endInput.min = start && start > today ? start : today;
    });

    wireToolbar();
    wireTour();
    document.getElementById('export-csv-btn').addEventListener('click', handleExportCsv);
    document.addEventListener('keydown', handleKeydown);

    setDefaultDates();
    renderAll();
    setInterval(renderClock, 30000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
