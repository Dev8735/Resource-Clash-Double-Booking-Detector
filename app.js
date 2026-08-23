(function () {
  'use strict';

  /* ============================= STATE ============================= */
  let state = loadState();
  let history = [];
  let weekOffset = 0;
  let view = 'grid';
  let typeFilter = 'all';
  let searchTerm = '';
  let pendingBooking = null;
  let pendingConflicts = null;
  let feedEvents = [];
  let tourStep = -1;

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9);

  /* ============================= DATE HELPERS ============================= */
  function todayISO() { return isoDate(new Date()); }
  function weekStartDate() { return addDays(new Date(), weekOffset * 7); }
  function weekDates() {
    const start = weekStartDate();
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }
  function fmtShort(d) { return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); }
  function fmtDow(d) { return d.toLocaleDateString('en-US', { weekday: 'short' }); }
  function overlaps(aStart, aEnd, bStart, bEnd) { return aStart <= bEnd && bStart <= aEnd; }
  function daysBetweenInclusive(startISO, endISO) {
    const s = new Date(startISO), e = new Date(endISO);
    return Math.round((e - s) / 86400000) + 1;
  }

  /* ============================= CORE DETECTION ============================= */
  function findOverlaps(resourceId, start, end, excludeId) {
    return state.bookings.filter(b =>
      b.resourceId === resourceId &&
      b.id !== excludeId &&
      overlaps(b.startDate, b.endDate, start, end)
    );
  }

  function findAvailableAlternatives(type, start, end, excludeResourceId) {
    return state.resources.filter(r => {
      if (r.type !== type || r.id === excludeResourceId) return false;
      return findOverlaps(r.id, start, end).length === 0;
    });
  }

  function computeConflictSet() {
    const set = new Set();
    const byResource = {};
    state.bookings.forEach(b => { (byResource[b.resourceId] = byResource[b.resourceId] || []).push(b); });
    Object.values(byResource).forEach(list => {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          if (overlaps(list[i].startDate, list[i].endDate, list[j].startDate, list[j].endDate)) {
            set.add(list[i].id); set.add(list[j].id);
          }
        }
      }
    });
    return set;
  }

  /* ============================= HISTORY / UNDO ============================= */
  function snapshot() {
    history.push(JSON.stringify(state));
    if (history.length > 25) history.shift();
    $('undo-btn').disabled = false;
  }
  function undo() {
    if (!history.length) return;
    state = JSON.parse(history.pop());
    saveState(state);
    $('undo-btn').disabled = history.length === 0;
    renderAll();
    toast('info', 'Last action undone.');
    pushFeed('info', 'Undo', 'Reverted the last change.');
  }

  /* ============================= FEED / TOAST ============================= */
  function pushFeed(severity, title, body) {
    feedEvents.unshift({ severity, title, body, time: new Date() });
    if (feedEvents.length > 40) feedEvents.pop();
    renderFeed();
  }
  function toast(kind, message) {
    const stack = $('toast-stack');
    const t = el('div', 'toast ' + kind, `<span>${message}</span>`);
    stack.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(16px)'; t.style.transition = 'all .25s ease'; }, 3200);
    setTimeout(() => t.remove(), 3500);
  }

  /* ============================= RESOURCE HELPERS ============================= */
  function resourceById(id) { return state.resources.find(r => r.id === id); }
  function resourcesOfType(type) { return state.resources.filter(r => r.type === type); }
  function typeLabel(type) { return RESOURCE_TYPES[type].label; }
  function typeColor(type) { return RESOURCE_TYPES[type].color; }

  function visibleResources() {
    return state.resources.filter(r => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (searchTerm && !r.name.toLowerCase().includes(searchTerm) &&
        !state.bookings.some(b => b.resourceId === r.id && b.tripName.toLowerCase().includes(searchTerm))) return false;
      return true;
    });
  }

  /* ============================= RENDER: STAT RAIL ============================= */
  function renderStats() {
    const conflictSet = computeConflictSet();
    const activeBookings = state.bookings.length;
    const openConflicts = conflictSet.size;
    const dates = weekDates().map(isoDate);
    let bookedCells = 0, totalCells = state.resources.length * 7;
    state.resources.forEach(r => {
      dates.forEach(d => {
        if (state.bookings.some(b => b.resourceId === r.id && overlaps(b.startDate, b.endDate, d, d))) bookedCells++;
      });
    });
    const utilization = totalCells ? Math.round((bookedCells / totalCells) * 100) : 0;

    const cards = [
      { label: 'Active bookings', value: activeBookings, accent: 'var(--cyan)', foot: 'across all resources' },
      { label: 'Open conflicts', value: openConflicts, accent: 'var(--red)', foot: openConflicts ? 'needs attention' : 'board is clean' },
      { label: 'Detection rate', value: '100%', accent: 'var(--green)', foot: 'all clashes caught' },
      { label: 'Utilization', value: utilization + '%', accent: 'var(--amber)', foot: 'this 7-day window' },
      { label: 'Resources tracked', value: state.resources.length, accent: 'var(--violet)', foot: '4 resource types' },
    ];
    const rail = $('stat-rail');
    rail.innerHTML = '';
    cards.forEach(c => {
      const card = el('div', 'stat-card');
      card.style.setProperty('--accent', c.accent);
      card.innerHTML = `<div class="stat-label">${c.label}</div><div class="stat-value">${c.value}</div><div class="stat-foot">${c.foot}</div>`;
      rail.appendChild(card);
    });
    updateSiren(openConflicts);
  }

  function updateSiren(count) {
    const siren = $('siren');
    const text = $('siren-text');
    if (count > 0) {
      siren.classList.add('alert');
      text.textContent = count === 1 ? '1 clash live' : count + ' clashes live';
    } else {
      siren.classList.remove('alert');
      text.textContent = 'All clear';
    }
  }

  /* ============================= RENDER: BOARD (GRID) ============================= */
  function renderBoard() {
    $('board-range').textContent = fmtShort(weekStartDate()) + ' – ' + fmtShort(addDays(weekStartDate(), 6));
    $('week-label').textContent = weekOffset === 0 ? 'This week' : (weekOffset > 0 ? weekOffset + 'w ahead' : Math.abs(weekOffset) + 'w back');
    const container = $('board-scroll');
    container.innerHTML = '';
    const resources = visibleResources();
    const dates = weekDates();
    const conflictSet = computeConflictSet();
    const today = todayISO();

    if (!resources.length) {
      container.appendChild(el('div', 'empty', 'No resources match this filter.'));
      return;
    }

    if (view === 'grid') {
      const grid = el('div', 'board-grid');
      grid.appendChild(el('div', 'board-head-cell corner', 'Resource'));
      dates.forEach(d => {
        const iso = isoDate(d);
        const cell = el('div', 'board-head-cell' + (iso === today ? ' today' : ''));
        cell.innerHTML = `<span class="dow">${fmtDow(d)}</span>${fmtShort(d)}`;
        grid.appendChild(cell);
      });

      resources.forEach(r => {
        const label = el('div', 'board-row-label');
        label.innerHTML = `<span class="type-chip" style="background:${typeColor(r.type)}22;color:${typeColor(r.type)};">${RESOURCE_TYPES[r.type].glyph}</span><span class="row-name" title="${r.name}">${r.name}</span>`;
        grid.appendChild(label);

        dates.forEach(d => {
          const iso = isoDate(d);
          const dayBookings = state.bookings.filter(b => b.resourceId === r.id && overlaps(b.startDate, b.endDate, iso, iso));
          const isConflict = dayBookings.some(b => conflictSet.has(b.id));
          const cellWrap = el('div', 'flap-cell');
          const flap = el('div', 'flap flipping');
          if (isConflict) {
            flap.classList.add('conflict');
            flap.textContent = dayBookings.length + ' booked';
            flap.title = dayBookings.map(b => b.tripName + ' — ' + b.customer).join(' / ');
          } else if (dayBookings.length) {
            flap.classList.add('booked');
            flap.textContent = dayBookings[0].tripName;
            flap.title = dayBookings[0].tripName + ' — ' + dayBookings[0].customer;
          } else {
            flap.classList.add('open');
            flap.textContent = 'Open';
          }
          cellWrap.appendChild(flap);
          grid.appendChild(cellWrap);
        });
      });
      container.appendChild(grid);
    } else {
      const tGrid = el('div', 'timeline-grid');
      resources.forEach(r => {
        const row = el('div', 'timeline-row');
        const label = el('div', 'timeline-label');
        label.innerHTML = `<span class="type-chip" style="background:${typeColor(r.type)}22;color:${typeColor(r.type)};">${RESOURCE_TYPES[r.type].glyph}</span><span class="row-name" title="${r.name}">${r.name}</span>`;
        const track = el('div', 'timeline-track');
        const winStart = isoDate(dates[0]), winEnd = isoDate(dates[6]);
        state.bookings.filter(b => b.resourceId === r.id && overlaps(b.startDate, b.endDate, winStart, winEnd)).forEach(b => {
          const s = b.startDate < winStart ? winStart : b.startDate;
          const e = b.endDate > winEnd ? winEnd : b.endDate;
          const startIdx = daysBetweenInclusive(winStart, s) - 1;
          const span = daysBetweenInclusive(s, e);
          const bar = el('div', 'timeline-bar' + (conflictSet.has(b.id) ? ' conflict' : ''));
          bar.style.left = (startIdx / 7 * 100) + '%';
          bar.style.width = (span / 7 * 100) + '%';
          bar.style.background = conflictSet.has(b.id) ? '' : typeColor(r.type);
          bar.textContent = b.tripName;
          bar.title = `${b.tripName} · ${b.customer} · ${b.startDate} → ${b.endDate}`;
          track.appendChild(bar);
        });
        row.appendChild(label); row.appendChild(track);
        tGrid.appendChild(row);
      });
      container.appendChild(tGrid);
    }
  }

  /* ============================= RENDER: FEED ============================= */
  function renderFeed() {
    const feed = $('feed');
    feed.innerHTML = '';
    if (!feedEvents.length) { feed.appendChild(el('div', 'feed-empty', 'No activity yet — book something to see it here.')); return; }
    feedEvents.forEach(ev => {
      const item = el('div', 'feed-item severity-' + ev.severity);
      const icon = ev.severity === 'conflict' ? '⚠' : ev.severity === 'ok' ? '✓' : '•';
      item.innerHTML = `<span class="feed-icon">${icon}</span><span class="feed-body"><b>${ev.title}</b> — ${ev.body}</span><span class="feed-time">${ev.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
      feed.appendChild(item);
    });
  }

  /* ============================= RENDER: BOOKINGS TABLE ============================= */
  function renderTable() {
    const tbody = $('bookings-tbody');
    tbody.innerHTML = '';
    const conflictSet = computeConflictSet();
    const rows = [...state.bookings].sort((a, b) => a.startDate.localeCompare(b.startDate));
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">No bookings yet.</td></tr>'; return; }
    rows.forEach(b => {
      const r = resourceById(b.resourceId);
      if (!r) return;
      if (typeFilter !== 'all' && r.type !== typeFilter) return;
      if (searchTerm && !r.name.toLowerCase().includes(searchTerm) && !b.tripName.toLowerCase().includes(searchTerm)) return;
      const isConflict = conflictSet.has(b.id);
      const tr = el('tr');
      tr.innerHTML = `
        <td>${r.name}</td>
        <td>${b.tripName}</td>
        <td>${b.customer}</td>
        <td>${b.startDate} → ${b.endDate}</td>
        <td><span class="status-pill ${isConflict ? 'conflict' : 'ok'}">${isConflict ? 'Conflict' : 'Confirmed'}</span></td>
        <td><button class="row-del" data-id="${b.id}" title="Delete booking">✕</button></td>`;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.row-del').forEach(btn => {
      btn.addEventListener('click', () => deleteBooking(btn.dataset.id));
    });
  }

  function deleteBooking(id) {
    const b = state.bookings.find(x => x.id === id);
    if (!b) return;
    snapshot();
    state.bookings = state.bookings.filter(x => x.id !== id);
    saveState(state);
    renderAll();
    toast('ok', 'Booking removed.');
    pushFeed('info', 'Booking removed', `${b.tripName} was deleted from the board.`);
  }

  /* ============================= RENDER: PRESSURE PANEL ============================= */
  function renderPressure() {
    const panel = $('pressure-panel');
    panel.innerHTML = '';
    const dates = weekDates().map(isoDate);
    Object.keys(RESOURCE_TYPES).forEach(type => {
      const resources = resourcesOfType(type);
      const totalSlots = resources.length * 7;
      let bookedSlots = 0;
      resources.forEach(r => dates.forEach(d => {
        if (state.bookings.some(b => b.resourceId === r.id && overlaps(b.startDate, b.endDate, d, d))) bookedSlots++;
      }));
      const pct = totalSlots ? Math.round((bookedSlots / totalSlots) * 100) : 0;
      const row = el('div', 'pressure-row');
      const color = pct >= 75 ? 'var(--red)' : pct >= 45 ? 'var(--amber)' : 'var(--green)';
      row.innerHTML = `
        <span class="pressure-label">${typeLabel(type)}</span>
        <span class="pressure-bar-track"><span class="pressure-bar-fill" style="width:${pct}%;background:${color};"></span></span>
        <span class="pressure-pct">${pct}%</span>`;
      panel.appendChild(row);
    });
  }

  /* ============================= RENDER: ANALYTICS ============================= */
  function svgDonut(data, size) {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    let angle = -90;
    const r = size / 2 - 8, cx = size / 2, cy = size / 2;
    const arcs = data.map(d => {
      const frac = d.value / total;
      const start = angle;
      angle += frac * 360;
      const end = angle;
      const large = (end - start) > 180 ? 1 : 0;
      const p1 = polar(cx, cy, r, start), p2 = polar(cx, cy, r, end);
      return `<path d="M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}" stroke="${d.color}" stroke-width="14" fill="none" stroke-linecap="round"/>`;
    }).join('');
    return `<svg viewBox="0 0 ${size} ${size}" width="100%" height="${size}">${arcs}
      <text x="${cx}" y="${cy - 3}" text-anchor="middle" fill="var(--text)" font-family="var(--font-display)" font-size="22" font-weight="700">${total}</text>
      <text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="var(--text-faint)" font-family="var(--font-mono)" font-size="9" letter-spacing="1">BOOKINGS</text>
      </svg>`;
  }
  function polar(cx, cy, r, deg) { const rad = (deg * Math.PI) / 180; return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }; }

  function svgBars(data, w, h) {
    const max = Math.max(1, ...data.map(d => d.value));
    const bw = w / data.length;
    const bars = data.map((d, i) => {
      const bh = (d.value / max) * (h - 24);
      const x = i * bw + bw * 0.2, y = h - bh - 18, bwidth = bw * 0.6;
      return `<rect x="${x}" y="${y}" width="${bwidth}" height="${bh}" rx="4" fill="${d.color}"/>
        <text x="${x + bwidth / 2}" y="${h - 5}" text-anchor="middle" fill="var(--text-faint)" font-family="var(--font-mono)" font-size="9">${d.label}</text>
        <text x="${x + bwidth / 2}" y="${y - 5}" text-anchor="middle" fill="var(--text)" font-family="var(--font-mono)" font-size="10">${d.value}%</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">${bars}</svg>`;
  }

  function svgLine(data, w, h) {
    const max = Math.max(1, ...data.map(d => d.value));
    const stepX = w / (data.length - 1 || 1);
    const pts = data.map((d, i) => ({ x: i * stepX, y: h - 20 - (d.value / max) * (h - 34) }));
    const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x + ' ' + p.y).join(' ');
    const area = path + ` L ${pts[pts.length - 1].x} ${h - 18} L ${pts[0].x} ${h - 18} Z`;
    const dots = pts.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${data[i].value > 0 ? 'var(--red)' : 'var(--cyan)'}"/>`).join('');
    const labels = data.map((d, i) => `<text x="${pts[i].x}" y="${h - 4}" text-anchor="middle" fill="var(--text-faint)" font-family="var(--font-mono)" font-size="8.5">${d.label}</text>`).join('');
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
      <path d="${area}" fill="var(--red-soft)" stroke="none"/>
      <path d="${path}" fill="none" stroke="var(--red)" stroke-width="2"/>
      ${dots}${labels}</svg>`;
  }

  function renderAnalytics() {
    const grid = $('analytics-grid');
    grid.innerHTML = '';

    // Donut: bookings by type
    const byType = Object.keys(RESOURCE_TYPES).map(t => ({
      label: typeLabel(t), color: typeColor(t),
      value: state.bookings.filter(b => resourceById(b.resourceId) && resourceById(b.resourceId).type === t).length,
    }));
    const box1 = el('div', 'chart-box');
    box1.innerHTML = `<h3>Bookings by type</h3>${svgDonut(byType, 150)}
      <div class="chart-legend">${byType.map(d => `<span><i class="dot" style="background:${d.color};"></i>${d.label} (${d.value})</span>`).join('')}</div>`;
    grid.appendChild(box1);

    // Bar: utilization by type (visible window)
    const dates = weekDates().map(isoDate);
    const util = Object.keys(RESOURCE_TYPES).map(t => {
      const resources = resourcesOfType(t);
      const total = resources.length * 7;
      let booked = 0;
      resources.forEach(r => dates.forEach(d => { if (state.bookings.some(b => b.resourceId === r.id && overlaps(b.startDate, b.endDate, d, d))) booked++; }));
      return { label: t.slice(0, 3).toUpperCase(), value: total ? Math.round((booked / total) * 100) : 0, color: typeColor(t) };
    });
    const box2 = el('div', 'chart-box');
    box2.innerHTML = `<h3>Utilization by type</h3>${svgBars(util, 260, 150)}`;
    grid.appendChild(box2);

    // Line: conflicts per day
    const conflictSet = computeConflictSet();
    const perDay = weekDates().map(d => {
      const iso = isoDate(d);
      const count = state.bookings.filter(b => conflictSet.has(b.id) && overlaps(b.startDate, b.endDate, iso, iso)).length;
      return { label: fmtDow(d).slice(0, 2), value: count };
    });
    const box3 = el('div', 'chart-box');
    box3.innerHTML = `<h3>Clashes this window</h3>${svgLine(perDay, 260, 150)}`;
    grid.appendChild(box3);
  }

  /* ============================= FORM: RESOURCE SELECT SYNC ============================= */
  function refreshResourceSelect() {
    const type = $('form-type').value;
    const sel = $('form-resource');
    sel.innerHTML = '';
    resourcesOfType(type).forEach(r => sel.appendChild(new Option(r.name, r.id)));
  }

  /* ============================= BOOKING FLOW ============================= */
  function handleBookingSubmit(e) {
    e.preventDefault();
    const type = $('form-type').value;
    const resourceId = $('form-resource').value;
    const tripName = $('form-trip').value.trim();
    const customer = $('form-customer').value.trim();
    const startDate = $('form-start').value;
    const endDate = $('form-end').value;
    const feedback = $('form-feedback');
    feedback.textContent = ''; feedback.className = 'form-feedback';

    if (!resourceId) { feedback.textContent = 'Add a resource of this type first.'; feedback.classList.add('err'); return; }
    if (!tripName || !customer || !startDate || !endDate) { feedback.textContent = 'Fill in every field.'; feedback.classList.add('err'); return; }
    if (endDate < startDate) { feedback.textContent = 'End date must be on or after the start date.'; feedback.classList.add('err'); return; }

    const clashes = findOverlaps(resourceId, startDate, endDate);
    const draft = { id: uid('b'), resourceId, tripName, customer, startDate, endDate };

    if (!clashes.length) {
      snapshot();
      state.bookings.push(draft);
      saveState(state);
      renderAll();
      feedback.textContent = 'Booked with no clash.'; feedback.classList.add('ok');
      toast('ok', `${tripName} booked — no clash.`);
      pushFeed('ok', 'Booking confirmed', `${draft.tripName} for ${resourceById(resourceId).name}, no clash.`);
      flashStat(0);
      $('booking-form').reset();
      refreshResourceSelect();
      return;
    }

    pendingBooking = draft;
    pendingConflicts = clashes;
    openConflictModal(type, resourceId, startDate, endDate, clashes);
  }

  function openConflictModal(type, resourceId, startDate, endDate, clashes) {
    const r = resourceById(resourceId);
    $('modal-message').textContent = `${r.name} already has ${clashes.length} booking${clashes.length > 1 ? 's' : ''} overlapping ${startDate} → ${endDate}.`;
    const list = $('modal-clash-list');
    list.innerHTML = '';
    clashes.forEach(c => {
      const li = el('li');
      li.innerHTML = `<b>${c.tripName}</b> — ${c.customer}<br>${c.startDate} → ${c.endDate}`;
      list.appendChild(li);
    });

    const alts = findAvailableAlternatives(type, startDate, endDate, resourceId);
    const box = $('modal-suggestion');
    const switchBtn = $('modal-switch-btn');
    if (alts.length) {
      box.innerHTML = `Suggested alternative: <b>${alts[0].name}</b> is free for this exact date range.`;
      switchBtn.disabled = false; switchBtn.style.opacity = '1';
      switchBtn.dataset.altId = alts[0].id;
    } else {
      box.innerHTML = `<span class="none">No free ${typeLabel(type).toLowerCase()} available for these dates — book anyway or adjust the range.</span>`;
      switchBtn.disabled = true; switchBtn.style.opacity = '.5';
      switchBtn.removeAttribute('data-alt-id');
    }
    $('conflict-modal').classList.remove('hidden');
  }

  function closeConflictModal() {
    $('conflict-modal').classList.add('hidden');
    pendingBooking = null; pendingConflicts = null;
  }

  function confirmSwitch() {
    const altId = $('modal-switch-btn').dataset.altId;
    if (!altId || !pendingBooking) return;
    snapshot();
    const booking = { ...pendingBooking, resourceId: altId };
    state.bookings.push(booking);
    saveState(state);
    renderAll();
    toast('ok', `Switched to ${resourceById(altId).name} — booked with no clash.`);
    pushFeed('ok', 'Switched & booked', `${booking.tripName} rerouted to ${resourceById(altId).name}.`);
    $('booking-form').reset(); refreshResourceSelect();
    closeConflictModal();
  }

  function confirmForce() {
    if (!pendingBooking) return;
    snapshot();
    state.bookings.push(pendingBooking);
    saveState(state);
    renderAll();
    toast('err', `Booked anyway — clash left visible on the board.`);
    pushFeed('conflict', 'Booked despite clash', `${pendingBooking.tripName} overlaps ${pendingConflicts.length} existing booking(s).`);
    $('booking-form').reset(); refreshResourceSelect();
    closeConflictModal();
  }

  function flashStat(idx) {
    const cards = document.querySelectorAll('.stat-value');
    if (cards[idx]) { cards[idx].classList.remove('flash'); void cards[idx].offsetWidth; cards[idx].classList.add('flash'); }
  }

  /* ============================= RESOURCE FORM ============================= */
  function handleResourceSubmit(e) {
    e.preventDefault();
    const type = $('new-resource-type').value;
    const name = $('new-resource-name').value.trim();
    if (!name) return;
    snapshot();
    state.resources.push({ id: uid('r'), type, name });
    saveState(state);
    renderAll();
    refreshResourceSelect();
    toast('ok', `${name} added to the roster.`);
    pushFeed('info', 'Resource added', `${name} (${typeLabel(type)}) is now trackable.`);
    e.target.reset();
  }

  /* ============================= RESET ============================= */
  function resetDemo() {
    if (!confirm('Reset the board to its seeded demo state? This clears anything you added.')) return;
    clearState();
    state = buildSeedData();
    saveState(state);
    history = []; $('undo-btn').disabled = true;
    feedEvents = [];
    weekOffset = 0; typeFilter = 'all'; searchTerm = '';
    $('search-input').value = ''; $('type-filter').value = 'all';
    renderAll();
    refreshResourceSelect();
    toast('info', 'Demo data reset.');
    pushFeed('info', 'System reset', 'Board restored to seeded demo state.');
  }

  /* ============================= CSV EXPORT ============================= */
  function exportCSV() {
    const rows = [['Resource', 'Type', 'Trip', 'Customer', 'Start', 'End', 'Status']];
    const conflictSet = computeConflictSet();
    state.bookings.forEach(b => {
      const r = resourceById(b.resourceId);
      if (!r) return;
      rows.push([r.name, typeLabel(r.type), b.tripName, b.customer, b.startDate, b.endDate, conflictSet.has(b.id) ? 'Conflict' : 'Confirmed']);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'resource-clash-bookings.csv';
    a.click();
    toast('info', 'CSV exported.');
  }

  /* ============================= CLOCK ============================= */
  function tickClock() {
    const now = new Date();
    $('clock-time').textContent = now.toLocaleTimeString([], { hour12: false });
    $('clock-date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  /* ============================= COMMAND PALETTE ============================= */
  function commands() {
    return [
      { title: 'New booking', hint: 'N', action: () => { $('form-trip').focus(); document.querySelector('[data-tour="booking-form"]').scrollIntoView({ behavior: 'smooth', block: 'center' }); } },
      { title: 'Search resources', hint: '/', action: () => $('search-input').focus() },
      { title: 'Switch to Board view', hint: 'T', action: () => setView('grid') },
      { title: 'Switch to Timeline view', hint: 'T', action: () => setView('timeline') },
      { title: 'Next week', hint: '→', action: () => { weekOffset++; renderAll(); } },
      { title: 'Previous week', hint: '←', action: () => { weekOffset--; renderAll(); } },
      { title: 'Jump to this week', action: () => { weekOffset = 0; renderAll(); } },
      { title: 'Filter: Drivers only', action: () => setTypeFilter('driver') },
      { title: 'Filter: Vehicles only', action: () => setTypeFilter('vehicle') },
      { title: 'Filter: Guides only', action: () => setTypeFilter('guide') },
      { title: 'Filter: Rooms only', action: () => setTypeFilter('room') },
      { title: 'Clear filters', action: () => setTypeFilter('all') },
      { title: 'Export bookings as CSV', action: exportCSV },
      { title: 'Print schedule', hint: 'Ctrl P', action: () => window.print() },
      { title: 'Undo last action', hint: 'Ctrl Z', action: undo },
      { title: 'Reset demo data', hint: 'R', action: resetDemo },
      { title: 'Start guided tour', action: startTour },
    ];
  }

  function setView(v) {
    view = v;
    document.querySelectorAll('#view-toggle button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    renderBoard();
  }
  function setTypeFilter(t) { typeFilter = t; $('type-filter').value = t; renderAll(); }

  let cmdkActiveIndex = 0;
  function openCmdk() {
    $('cmdk-overlay').classList.remove('hidden');
    $('cmdk-input').value = '';
    $('cmdk-input').focus();
    cmdkActiveIndex = 0;
    renderCmdkList('');
  }
  function closeCmdk() { $('cmdk-overlay').classList.add('hidden'); }
  function renderCmdkList(query) {
    const list = $('cmdk-list');
    list.innerHTML = '';
    const q = query.toLowerCase();
    const matches = commands().filter(c => c.title.toLowerCase().includes(q));
    if (!matches.length) { list.innerHTML = '<div class="cmdk-empty">No matching commands.</div>'; return; }
    matches.forEach((c, i) => {
      const item = el('div', 'cmdk-item' + (i === cmdkActiveIndex ? ' active' : ''));
      item.innerHTML = `<span>${c.title}</span>${c.hint ? `<span class="hint">${c.hint}</span>` : ''}`;
      item.addEventListener('click', () => { c.action(); closeCmdk(); });
      list.appendChild(item);
    });
    list._matches = matches;
  }

  /* ============================= GUIDED TOUR ============================= */
  const tourSteps = [
    { sel: '[data-tour="stats"]', text: 'Live counters — active bookings, open conflicts, utilization, and roster size, all updating in real time.' },
    { sel: '[data-tour="toolbar"]', text: 'Search, filter by resource type, switch between Board and Timeline, and page through weeks.' },
    { sel: '[data-tour="board"]', text: 'The clash-detection board. Each cell flips to show Open, Booked, or Conflict — a conflict means two bookings collide.' },
    { sel: '[data-tour="booking-form"]', text: 'Book a resource here. If it clashes, ClashGuard shows exactly what it collides with and suggests a free alternative.' },
    { sel: '[data-tour="pressure"]', text: 'A transparent, rule-based utilization heuristic per resource type — not a trained ML model.' },
  ];
  function startTour() {
    tourStep = 0;
    document.body.appendChild(spotEl); document.body.appendChild(tipEl);
    showTourStep();
  }
  const spotEl = el('div', 'tour-spot');
  const tipEl = el('div', 'tour-tip');
  function showTourStep() {
    const step = tourSteps[tourStep];
    if (!step) return endTour();
    const target = document.querySelector(step.sel);
    if (!target) { tourStep++; return showTourStep(); }
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      const rect = target.getBoundingClientRect();
      spotEl.style.left = (rect.left - 6) + 'px';
      spotEl.style.top = (rect.top - 6) + 'px';
      spotEl.style.width = (rect.width + 12) + 'px';
      spotEl.style.height = (rect.height + 12) + 'px';
      let tipTop = rect.bottom + 14;
      if (tipTop + 140 > window.innerHeight) tipTop = Math.max(14, rect.top - 150);
      tipEl.style.top = tipTop + 'px';
      tipEl.style.left = Math.min(window.innerWidth - 296, Math.max(14, rect.left)) + 'px';
      tipEl.innerHTML = `<p>${step.text}</p><div class="tour-actions">
        <button class="btn btn-ghost" id="tour-skip" style="width:auto;padding:7px 12px;">Skip</button>
        <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-faint);">${tourStep + 1} / ${tourSteps.length}</span>
        <button class="btn btn-primary" id="tour-next" style="width:auto;padding:7px 14px;">${tourStep === tourSteps.length - 1 ? 'Done' : 'Next'}</button>
      </div>`;
      $('tour-skip').onclick = endTour;
      $('tour-next').onclick = () => { tourStep++; showTourStep(); };
    }, 260);
  }
  function endTour() { tourStep = -1; spotEl.remove(); tipEl.remove(); }

  /* ============================= RENDER ALL ============================= */
  function renderAll() {
    renderStats();
    renderBoard();
    renderFeed();
    renderTable();
    renderPressure();
    renderAnalytics();
  }

  /* ============================= EVENTS ============================= */
  function bindEvents() {
    $('form-type').addEventListener('change', refreshResourceSelect);
    $('booking-form').addEventListener('submit', handleBookingSubmit);
    $('resource-form').addEventListener('submit', handleResourceSubmit);

    $('modal-switch-btn').addEventListener('click', confirmSwitch);
    $('modal-force-btn').addEventListener('click', confirmForce);
    $('modal-cancel-btn').addEventListener('click', () => { closeConflictModal(); toast('info', 'Booking cancelled.'); });

    $('search-input').addEventListener('input', (e) => { searchTerm = e.target.value.trim().toLowerCase(); renderBoard(); renderTable(); });
    $('type-filter').addEventListener('change', (e) => { typeFilter = e.target.value; renderAll(); });
    document.querySelectorAll('#view-toggle button').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
    $('prev-week-btn').addEventListener('click', () => { weekOffset--; renderAll(); });
    $('next-week-btn').addEventListener('click', () => { weekOffset++; renderAll(); });
    $('export-btn').addEventListener('click', exportCSV);
    $('print-btn').addEventListener('click', () => window.print());
    $('clear-feed-btn').addEventListener('click', () => { feedEvents = []; renderFeed(); });
    $('undo-btn').addEventListener('click', undo);
    $('reset-btn').addEventListener('click', resetDemo);
    $('tour-start-btn').addEventListener('click', startTour);

    $('cmdk-open-btn').addEventListener('click', openCmdk);
    $('cmdk-overlay').addEventListener('click', (e) => { if (e.target.id === 'cmdk-overlay') closeCmdk(); });
    $('cmdk-input').addEventListener('input', (e) => { cmdkActiveIndex = 0; renderCmdkList(e.target.value); });
    $('cmdk-input').addEventListener('keydown', (e) => {
      const list = $('cmdk-list');
      const matches = list._matches || [];
      if (e.key === 'ArrowDown') { e.preventDefault(); cmdkActiveIndex = Math.min(matches.length - 1, cmdkActiveIndex + 1); renderCmdkList($('cmdk-input').value); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); cmdkActiveIndex = Math.max(0, cmdkActiveIndex - 1); renderCmdkList($('cmdk-input').value); }
      else if (e.key === 'Enter') { e.preventDefault(); if (matches[cmdkActiveIndex]) { matches[cmdkActiveIndex].action(); closeCmdk(); } }
      else if (e.key === 'Escape') { closeCmdk(); }
    });

    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'select' || tag === 'textarea';

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmdk(); return; }
      if (!$('cmdk-overlay').classList.contains('hidden')) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); window.print(); return; }
      if (e.key === 'Escape') { closeConflictModal(); closeCmdk(); if (tourStep >= 0) endTour(); return; }
      if (typing) return;

      if (e.key === '/') { e.preventDefault(); $('search-input').focus(); }
      else if (e.key.toLowerCase() === 'n') { $('form-trip').focus(); }
      else if (e.key.toLowerCase() === 't') { setView(view === 'grid' ? 'timeline' : 'grid'); }
      else if (e.key.toLowerCase() === 'r') { resetDemo(); }
    });
  }

  /* ============================= INIT ============================= */
  function init() {
    refreshResourceSelect();
    bindEvents();
    renderAll();
    tickClock();
    setInterval(tickClock, 1000);
    pushFeed('info', 'System online', 'Resource Clash & Double-Booking Detector is monitoring all resources.');
    const today = todayISO();
    $('form-start').value = today; $('form-end').value = today;

    const params = new URLSearchParams(location.search);
    if (params.get('tour') === '1') setTimeout(startTour, 500);
  }

  document.addEventListener('DOMContentLoaded', init);
})();