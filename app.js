// app.js - Main application controller

let currentFilter = '';
let currentView = 'grid';
let currentDateRange = { start: new Date(), end: new Date(new Date().getTime() + 6 * 24 * 60 * 60 * 1000) };
let currentBooking = null;
let currentConflict = null;
let demoStep = 0;
let demoMode = false;

const DEMO_STEPS = [
  {
    text: "Welcome to the Resource Clash Detector. Let's take a quick tour of how it prevents double-bookings.",
    action: () => renderBoard()
  },
  {
    text: "The schedule board shows all your resources across 7 days. You can see drivers, vehicles, guides, and rooms with their current bookings.",
    action: () => { }
  },
  {
    text: "Let's create a new booking for Driver Ramesh on dates when he's already scheduled.",
    action: () => {
      document.getElementById('bookingType').value = 'Driver';
      document.getElementById('bookingResource').value = 'Ramesh Yadav';
      document.getElementById('bookingTrip').value = 'Demo Trip';
      document.getElementById('bookingCustomer').value = 'Demo Customer';
      const tomorrow = new Date(Date.now() + 86400000);
      document.getElementById('bookingStart').value = tomorrow.toISOString().split('T')[0];
      const nextDay = new Date(Date.now() + 172800000);
      document.getElementById('bookingEnd').value = nextDay.toISOString().split('T')[0];
    }
  },
  {
    text: "When we submit this booking, the system instantly detects the conflict with Ramesh's existing schedule.",
    action: () => { }
  },
  {
    text: "A conflict alert appears showing the severity and suggesting available alternatives from the same resource type.",
    action: () => { }
  },
  {
    text: "Staff can instantly switch to an available resource with one click instead of searching manually.",
    action: () => { }
  },
  {
    text: "The booking status changes to RESOLVED and the dashboard updates in real-time.",
    action: () => { }
  },
  {
    text: "That's how the Clash Detector works: detect, assess, suggest, resolve. No more last-minute scrambling.",
    action: () => { }
  }
];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  loadInitialData();
  renderBoard();
  updateStats();
});

function initializeEventListeners() {
  // Booking form
  document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);

  // Resource form
  document.getElementById('resourceForm').addEventListener('submit', handleResourceSubmit);
  document.getElementById('resourceType').addEventListener('change', (e) => {
    document.getElementById('roomFields').style.display = e.target.value === 'Room' ? 'block' : 'none';
  });

  // Filter and view
  document.getElementById('filterType').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderBoard();
  });

  document.getElementById('gridViewBtn').addEventListener('click', () => {
    currentView = 'grid';
    document.getElementById('gridViewBtn').classList.add('active');
    document.getElementById('timelineViewBtn').classList.remove('active');
    renderBoard();
  });

  document.getElementById('timelineViewBtn').addEventListener('click', () => {
    currentView = 'timeline';
    document.getElementById('timelineViewBtn').classList.add('active');
    document.getElementById('gridViewBtn').classList.remove('active');
    renderBoard();
  });

  // Navigation
  document.getElementById('prevBtn').addEventListener('click', () => {
    currentDateRange.start.setDate(currentDateRange.start.getDate() - 7);
    currentDateRange.end.setDate(currentDateRange.end.getDate() - 7);
    renderBoard();
  });

  document.getElementById('nextBtn').addEventListener('click', () => {
    currentDateRange.start.setDate(currentDateRange.start.getDate() + 7);
    currentDateRange.end.setDate(currentDateRange.end.getDate() + 7);
    renderBoard();
  });

  document.getElementById('todayBtn').addEventListener('click', () => {
    currentDateRange.start = new Date();
    currentDateRange.end = new Date(new Date().getTime() + 6 * 24 * 60 * 60 * 1000);
    renderBoard();
  });

  // Reset button
  document.getElementById('resetBtn').addEventListener('click', resetDemoData);

  // Demo & Print
  document.getElementById('watchDemoBtn').addEventListener('click', startDemo);
  document.getElementById('printBtn').addEventListener('click', () => window.print());

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'n' || e.key === 'N') handleNewBooking();
    if (e.key === '/' && !demoMode) document.getElementById('filterType').focus();
    if (e.key === 't' || e.key === 'T') toggleView();
    if (e.key === 'r' || e.key === 'R') resetDemoData();
    if (e.key === 'd' || e.key === 'D') startDemo();
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') undoLastAction();
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
      e.preventDefault();
      window.print();
    }
    if (e.key === 'Escape') {
      closeConflictModal();
      closeDemoModal();
    }
  });
}

function handleBookingSubmit(e) {
  e.preventDefault();

  const type = document.getElementById('bookingType').value;
  const resource = document.getElementById('bookingResource').value;
  const trip = document.getElementById('bookingTrip').value;
  const customer = document.getElementById('bookingCustomer').value;
  const start = document.getElementById('bookingStart').value;
  const end = document.getElementById('bookingEnd').value;

  // Validate dates
  const validation = validateDates(start, end);
  if (!validation.valid) {
    alert(validation.error);
    return;
  }

  // Check for conflict
  const resourceId = `${type}: ${resource}`;
  const conflict = checkConflict(resourceId, start, end);

  if (conflict.hasConflict) {
    // Show conflict modal
    showConflictModal({
      resourceId,
      trip,
      customer,
      start,
      end,
      type,
      resource,
      conflict: conflict.conflict,
      alternatives: conflict.alternatives
    });
  } else {
    // Create booking
    const booking = {
      id: generateId(),
      type,
      resource: resourceId,
      trip,
      customer,
      start,
      end,
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    };

    state.bookings.push(booking);
    saveState();
    renderBoard();
    updateStats();
    addToFeed(`Booking created: ${trip} with ${resourceId}`, 'booking');
    document.getElementById('bookingForm').reset();
  }
}

function handleResourceSubmit(e) {
  e.preventDefault();

  const type = document.getElementById('resourceType').value;
  const name = document.getElementById('resourceName').value;
  const hotelName = document.getElementById('hotelName').value || '';
  const roomNumber = document.getElementById('roomNumber').value || '';
  const roomType = document.getElementById('roomType').value || '';

  // Check for duplicates
  const resourceId = `${type}: ${name}`;
  if (state.resources.some(r => r.id.toLowerCase() === resourceId.toLowerCase())) {
    alert('Resource already exists');
    return;
  }

  const resource = {
    id: resourceId,
    type,
    name,
    hotelName,
    roomNumber,
    roomType,
    createdAt: new Date().toISOString()
  };

  state.resources.push(resource);
  saveState();
  updateStats();
  addToFeed(`Resource added: ${resourceId}`, 'resource');
  document.getElementById('resourceForm').reset();
  document.getElementById('roomFields').style.display = 'none';
}

function showConflictModal(data) {
  currentBooking = data;
  const modal = document.getElementById('conflictModal');
  const severity = calculateSeverity(data.conflict.length);

  document.getElementById('conflictSeverity').className = `severity-badge severity-${severity.level}`;
  document.getElementById('conflictSeverity').textContent = severity.label;

  let html = `
    <p><strong>Conflict detected for ${data.resourceId}</strong></p>
    <p>Trip: ${data.trip}</p>
    <p>Dates: ${data.start} to ${data.end}</p>
    <p><strong>Overlapping bookings:</strong></p>
    <ul style="margin-left: 20px; margin-top: 10px;">
      ${data.conflict.map(b => `<li>${b.trip} (${b.start} to ${b.end})</li>`).join('')}
    </ul>
    ${data.alternatives.length > 0 ? `
      <p style="margin-top: 12px;"><strong>Available alternatives:</strong></p>
      <ul style="margin-left: 20px;">
        ${data.alternatives.map(a => `<li>${a}</li>`).join('')}
      </ul>
    ` : '<p style="margin-top: 12px; color: #e85d5d;">No alternatives available</p>'}
  `;

  document.getElementById('conflictInfo').innerHTML = html;
  modal.style.display = 'flex';
}

function switchResource() {
  if (!currentBooking || currentBooking.alternatives.length === 0) return;

  const alternative = currentBooking.alternatives[0];
  const booking = {
    id: generateId(),
    type: currentBooking.type,
    resource: alternative,
    trip: currentBooking.trip,
    customer: currentBooking.customer,
    start: currentBooking.start,
    end: currentBooking.end,
    status: 'RESOLVED',
    createdAt: new Date().toISOString()
  };

  state.bookings.push(booking);
  saveState();
  renderBoard();
  updateStats();
  addToFeed(`Conflict resolved: ${currentBooking.trip} switched to ${alternative}`, 'resolved');
  closeConflictModal();
  document.getElementById('bookingForm').reset();
}

function closeConflictModal() {
  document.getElementById('conflictModal').style.display = 'none';
  currentBooking = null;
}

function renderBoard() {
  const board = document.getElementById('scheduleBoard');
  const board_class = currentView === 'grid' ? 'grid-view' : 'timeline-view';

  // Update date range display
  const start = currentDateRange.start;
  const end = currentDateRange.end;
  document.getElementById('dateRange').textContent = `${formatDate(start)} - ${formatDate(end)}`;

  // Get filtered resources
  let resources = state.resources;
  if (currentFilter) {
    resources = resources.filter(r => r.type === currentFilter);
  }

  // Generate booking cards
  let html = '';
  resources.forEach(resource => {
    const bookingsForResource = state.bookings.filter(b => b.resource === resource.id);

    bookingsForResource.forEach(booking => {
      const bookingStart = new Date(booking.start);
      const bookingEnd = new Date(booking.end);

      // Check if booking is within range
      if (bookingStart <= end && bookingEnd >= start) {
        const statusClass = `status-${booking.status.toLowerCase()}`;
        const cardClass = `booking-card ${booking.status === 'CONFLICT' ? 'conflict' : booking.status === 'RESOLVED' ? 'resolved' : ''}`;

        html += `
          <div class="${cardClass}">
            <h4>${booking.trip}</h4>
            <p><strong>${resource.id}</strong></p>
            <p>Customer: ${booking.customer}</p>
            <p>${booking.start} to ${booking.end}</p>
            <span class="booking-status ${statusClass}">${booking.status}</span>
          </div>
        `;
      }
    });
  });

  if (!html) {
    html = '<p style="grid-column: 1/-1; text-align: center; color: #666; padding: 40px;">No bookings in this period</p>';
  }

  board.className = `schedule-board ${board_class}`;
  board.innerHTML = html;
}

function updateStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bookings = state.bookings;
  const conflicts = bookings.filter(b => b.status === 'CONFLICT');
  const resolved = bookings.filter(b => b.status === 'RESOLVED');
  const active = bookings.filter(b => {
    const bookingDate = new Date(b.start);
    return b.status === 'CONFIRMED' && bookingDate >= today;
  });

  document.getElementById('statBookings').textContent = bookings.length;
  document.getElementById('statActive').textContent = active.length;
  document.getElementById('statConflicts').textContent = conflicts.length;
  document.getElementById('statResolved').textContent = resolved.length;
  document.getElementById('statResources').textContent = state.resources.length;

  // Utilization
  const totalSlots = state.resources.length * 7;
  const utilization = totalSlots > 0 ? Math.round((bookings.length / totalSlots) * 100) : 0;
  document.getElementById('statUtilization').textContent = utilization + '%';

  // Update feeds
  updateConflictFeed();
  updateBookingsList();
}

function updateConflictFeed() {
  const feed = document.getElementById('conflictFeed');
  const conflicts = state.bookings.filter(b => b.status === 'CONFLICT');

  if (conflicts.length === 0) {
    feed.innerHTML = '<div class="feed-item">No conflicts detected</div>';
    return;
  }

  feed.innerHTML = conflicts.map(c => `
    <div class="feed-item conflict">
      <strong>${c.trip}</strong>
      <p>${c.resource} - ${c.start} to ${c.end}</p>
      <div class="feed-time">${new Date(c.createdAt).toLocaleTimeString()}</div>
    </div>
  `).join('');
}

function updateBookingsList() {
  const list = document.getElementById('bookingsList');
  const bookings = state.bookings.slice(-10).reverse();

  if (bookings.length === 0) {
    list.innerHTML = '<div class="feed-item">No bookings yet</div>';
    return;
  }

  list.innerHTML = bookings.map(b => `
    <div class="feed-item">
      <strong>${b.trip}</strong>
      <p>${b.resource} - ${b.start} to ${b.end}</p>
      <div class="feed-time">${new Date(b.createdAt).toLocaleTimeString()}</div>
    </div>
  `).join('');
}

function addToFeed(message, type) {
  updateStats();
}

function checkConflict(resourceId, start, end) {
  const conflictingBookings = state.bookings.filter(b => {
    if (b.resource !== resourceId) return false;
    const bStart = new Date(b.start);
    const bEnd = new Date(b.end);
    const newStart = new Date(start);
    const newEnd = new Date(end);
    return !(newEnd <= bStart || newStart >= bEnd);
  });

  if (conflictingBookings.length > 0) {
    const resourceType = resourceId.split(':')[0];
    const alternatives = state.resources
      .filter(r => r.type === resourceType && r.id !== resourceId)
      .filter(r => {
        return !state.bookings.some(b => {
          const bStart = new Date(b.start);
          const bEnd = new Date(b.end);
          const newStart = new Date(start);
          const newEnd = new Date(end);
          return b.resource === r.id && !(newEnd <= bStart || newStart >= bEnd);
        });
      })
      .map(r => r.id);

    return {
      hasConflict: true,
      conflict: conflictingBookings,
      alternatives
    };
  }

  return { hasConflict: false, conflict: [], alternatives: [] };
}

function calculateSeverity(conflictCount) {
  if (conflictCount >= 3) return { level: 'critical', label: 'CRITICAL' };
  if (conflictCount >= 2) return { level: 'high', label: 'HIGH' };
  return { level: 'medium', label: 'MEDIUM' };
}

function resetDemoData() {
  if (!confirm('Reset all demo data?')) return;
  state = structuredClone(INITIAL_STATE);
  saveState();
  renderBoard();
  updateStats();
  document.getElementById('bookingForm').reset();
}

function startDemo() {
  demoMode = true;
  demoStep = 0;
  document.getElementById('demoModal').style.display = 'flex';
  showDemoStep();
}

function showDemoStep() {
  const step = DEMO_STEPS[demoStep];
  if (!step) {
    closeDemoModal();
    return;
  }

  document.getElementById('demoText').textContent = step.text;
  document.getElementById('demoProgressBar').style.width = ((demoStep + 1) / DEMO_STEPS.length * 100) + '%';
  step.action();
}

function nextDemoStep() {
  demoStep++;
  if (demoStep >= DEMO_STEPS.length) {
    closeDemoModal();
    return;
  }
  showDemoStep();
}

function closeDemoModal() {
  document.getElementById('demoModal').style.display = 'none';
  demoMode = false;
  demoStep = 0;
  document.getElementById('bookingForm').reset();
}

function toggleView() {
  currentView = currentView === 'grid' ? 'timeline' : 'grid';
  document.getElementById('gridViewBtn').classList.toggle('active');
  document.getElementById('timelineViewBtn').classList.toggle('active');
  renderBoard();
}

function undoLastAction() {
  console.log('Undo not yet implemented');
}

function handleNewBooking() {
  document.getElementById('bookingForm').focus();
}

function generateId() {
  return 'booking_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function loadInitialData() {
  loadState();
}