// data.js - Data management and local storage

const INITIAL_STATE = {
  resources: [
    { id: 'Driver: Ramesh Yadav', type: 'Driver', name: 'Ramesh Yadav', createdAt: new Date().toISOString() },
    { id: 'Driver: Suresh Patil', type: 'Driver', name: 'Suresh Patil', createdAt: new Date().toISOString() },
    { id: 'Driver: Amit Kumar', type: 'Driver', name: 'Amit Kumar', createdAt: new Date().toISOString() },
    { id: 'Vehicle: MH-04-1121', type: 'Vehicle', name: 'MH-04-1121', createdAt: new Date().toISOString() },
    { id: 'Vehicle: MH-02-5678', type: 'Vehicle', name: 'MH-02-5678', createdAt: new Date().toISOString() },
    { id: 'Guide: Priya Singh', type: 'Guide', name: 'Priya Singh', createdAt: new Date().toISOString() },
    { id: 'Guide: Vikram Desai', type: 'Guide', name: 'Vikram Desai', createdAt: new Date().toISOString() },
    { id: 'Room: 301 - Deluxe', type: 'Room', name: '301', hotelName: 'Coastal Resort', roomType: 'Deluxe', createdAt: new Date().toISOString() },
    { id: 'Room: 402 - Suite', type: 'Room', name: '402', hotelName: 'Coastal Resort', roomType: 'Suite', createdAt: new Date().toISOString() }
  ],
  bookings: [
    {
      id: 'booking_demo_1',
      type: 'Driver',
      resource: 'Driver: Ramesh Yadav',
      trip: 'Goa Beach Circuit',
      customer: 'John Doe',
      start: formatDateForInput(new Date()),
      end: formatDateForInput(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    },
    {
      id: 'booking_demo_2',
      type: 'Vehicle',
      resource: 'Vehicle: MH-04-1121',
      trip: 'Goa Beach Circuit',
      customer: 'John Doe',
      start: formatDateForInput(new Date()),
      end: formatDateForInput(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    },
    {
      id: 'booking_demo_3',
      type: 'Guide',
      resource: 'Guide: Priya Singh',
      trip: 'Goa Beach Circuit',
      customer: 'John Doe',
      start: formatDateForInput(new Date()),
      end: formatDateForInput(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)),
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    },
    {
      id: 'booking_demo_4',
      type: 'Driver',
      resource: 'Driver: Suresh Patil',
      trip: 'Mountain Trek Expedition',
      customer: 'Jane Smith',
      start: formatDateForInput(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000)),
      end: formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      status: 'CONFIRMED',
      createdAt: new Date().toISOString()
    }
  ]
};

let state = structuredClone(INITIAL_STATE);

function saveState() {
  localStorage.setItem('resourceClashState', JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem('resourceClashState');
  if (saved) {
    state = JSON.parse(saved);
  } else {
    state = structuredClone(INITIAL_STATE);
    saveState();
  }
}

function resetState() {
  state = structuredClone(INITIAL_STATE);
  saveState();
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}