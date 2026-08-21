# Resource Clash & Double-Booking Detector

**Travel & Hospitality Operations Dashboard — Hackathon Prototype**

A browser-based operations control system for travel agencies that automatically detects double-bookings across drivers, vehicles, guides, and hotel rooms — evaluates conflict risk severity, suggests available alternatives, and enables one-click automated resolution.

> **Live Demo:** [https://dev8735.github.io/Resource-Clash-Double-Booking-Detector/](https://dev8735.github.io/Resource-Clash-Double-Booking-Detector/)
>
> **GitHub:** [https://github.com/Dev8735/Resource-Clash-Double-Booking-Detector](https://github.com/Dev8735/Resource-Clash-Double-Booking-Detector)

---

## The Problem

Travel and hospitality operators manage multiple resources — drivers, vehicles, guides, and hotel rooms — across overlapping itineraries. Manual scheduling using spreadsheets, registers, or WhatsApp frequently causes:

- **Double-booking** of drivers, vehicles, guides, or rooms
- **Last-minute conflict discovery** disrupting customer trips
- **Manual searching** for replacement resources
- **Operational delays** and customer dissatisfaction

## The Solution

An automated operations dashboard that **detects overlapping bookings instantly** and **suggests available alternatives** with one-click reassignment:

```
Staff Creates a Booking
        ↓
Date Validation (past-date prevention enforced)
        ↓
Resource Availability Check (date-range overlap detection)
        ↓
   ┌─────────────┐          ┌──────────────────────────────┐
   │ No Conflict  │          │ Conflict Detected            │
   │ → CONFIRMED  │          │ → Severity assessed          │
   └─────────────┘          │ → Alternative suggested      │
                             │ → One-click switch available │
                             └──────────────────────────────┘
        ↓
Schedule Board + Dashboard + Conflict Feed Updated Immediately
```

## How Conflict Detection Works

The system uses **pure date-range overlap mathematics** (no AI/ML):

1. When a booking is submitted, the engine checks all existing bookings for the **same resource**.
2. Two bookings conflict if their date ranges overlap: `startA ≤ endB AND startB ≤ endA`.
3. If a conflict is found, the system calculates severity (`MEDIUM`, `HIGH`, `CRITICAL`) based on resource type and number of overlapping bookings.
4. It then searches all resources of the **same type** for one with **zero overlapping bookings** in the requested date range.
5. The user can **switch to the alternative with one click**, setting the booking status to `RESOLVED`.

All logic lives in `conflict-engine.js` — the same code that runs in the browser is the same code `tests.js` exercises.

---

## Implemented Features (Working Now)

| Feature | Status |
|---|---|
| Resource Schedule Board (Grid & Timeline views) | ✅ Implemented |
| Search & Resource Type Filter | ✅ Implemented |
| Board Navigation (Previous / Next / Today) | ✅ Implemented |
| Board starts from today — past dates never shown | ✅ Implemented |
| Booking Creation with form controls | ✅ Implemented |
| Strict Date Validation & Past Date Prevention | ✅ Implemented |
| Real-time Conflict & Double-Booking Detection | ✅ Implemented |
| Booking Status Lifecycle (`CONFIRMED`, `CONFLICT`, `RESOLVED`, `CANCELLED`) | ✅ Implemented |
| Rule-Based Conflict Severity Assessment (`MEDIUM`, `HIGH`, `CRITICAL`) | ✅ Implemented |
| Available Alternative Resource Suggestions | ✅ Implemented |
| One-Click Automated Conflict Resolution | ✅ Implemented |
| Today's Operational Summary Metrics | ✅ Implemented |
| Dashboard Statistics (bookings, conflicts, resolved, resources, utilization) | ✅ Implemented |
| Booking Pressure (rule-based utilization heuristic with Low/Moderate/High/Critical) | ✅ Implemented |
| Activity / Conflict Feed with timestamps | ✅ Implemented |
| Add New Resource (Generic or Hotel Room with Hotel Name, Room No, Room Type) | ✅ Implemented |
| Duplicate resource prevention (case-insensitive & ID check) | ✅ Implemented |
| Room-level conflict isolation (different rooms in same hotel do NOT clash) | ✅ Implemented |
| "How This Solves The Problem" before/after comparison | ✅ Implemented |
| 8-Step Interactive Watch Demo Tour | ✅ Implemented |
| LocalStorage persistence (bookings + resources survive refresh) | ✅ Implemented |
| Reset Demo Data | ✅ Implemented |
| Print/Export Schedule Board | ✅ Implemented |
| Keyboard Shortcuts (`N`, `/`, `T`, `R`, `D`, `Ctrl+Z`, `Ctrl+P`, `Esc`) | ✅ Implemented |
| Responsive layout (desktop, tablet, mobile) | ✅ Implemented |
| Automated Unit Test Suite (`node tests.js`) | ✅ Implemented (42 tests) |

## Prototype Limitations

This is a **static frontend prototype** — the following are **not implemented**:

- No backend server, database, or API
- No multi-user real-time synchronization (WebSocket)
- No trained machine learning model (booking pressure uses a rule-based heuristic)
- No SMS, email, or WhatsApp notifications
- No user authentication or role-based access control
- Data is stored in browser localStorage only (not shared across devices)

## Future Scope

- Multi-user backend with database (PostgreSQL/MongoDB)
- WebSocket-based real-time sync across devices
- ML-based demand forecasting model
- SMS/WhatsApp alerts to drivers and guides
- Calendar integration (Google Calendar, Outlook)
- Mobile native app
- Role-based access control for operators and managers

---

## Technology Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 (semantic layout, accessible modals) |
| Styling | CSS3 (custom dark theme, Space Grotesk / IBM Plex Mono / Inter) |
| Logic | Vanilla JavaScript ES6+ (modular, no frameworks) |
| Persistence | Browser LocalStorage |
| Testing | Node.js (zero-dependency test runner) |
| Deployment | GitHub Pages / any static hosting |

## Project Structure

```
├── index.html          # Main HTML structure & dashboard layout
├── style.css           # Dark theme design system & responsive styles
├── app.js              # UI controller, event handling, rendering & demo tour
├── data.js             # Resource catalog, seed bookings & LocalStorage state
├── conflict-engine.js  # Pure date-overlap logic & rule-based severity engine
├── date-validation.js  # Date validation guard & past date prevention
├── tests.js            # Automated unit test runner (37+ tests)
├── README.md           # This file
└── LICENSE             # Open-source license
```

## How to Run Locally

No build tools or `npm install` required.

```bash
# Clone the repository
git clone https://github.com/Dev8735/Resource-Clash-Double-Booking-Detector.git
cd Resource-Clash-Double-Booking-Detector

# Serve with Python
python -m http.server 8000
# Or: py -m http.server 8000

# Open in browser
# http://localhost:8000
```

## Testing Instructions

Run the automated test suite:

```bash
node tests.js
```

Expected output: All tests pass (0 failures).

Tests cover:
1. No overlap detection
2. Partial date overlap
3. Full date overlap
4. Same start date conflicts
5. Same end date / boundary sharing
6. One booking fully inside another
7. Past-date booking rejection (exact error message verified)
8. End date before start date rejection
9. Alternative resource availability
10. Duplicate resource prevention (case-insensitive)
11. New resource creation and count verification
12. Dashboard conflict count update after booking

## Demo Flow

Click **Watch Demo** (or press `D`) to see the automated demonstration:

1. **Resource schedule board** loads with seed bookings
2. **Staff creates booking** for Driver Ramesh Yadav on an overlapping date
3. **Conflict detected** — overlap with existing "Goa Beach Circuit" booking
4. **Severity assessed** — system evaluates operational risk
5. **Alternative suggested** — Suresh Patil is available for the same dates
6. **One-click switch** — staff clicks "Switch Automatically"
7. **Conflict resolved** — booking status set to RESOLVED
8. **Dashboard updated** — board, stats, and conflict feed reflect the change

---

## Impact

| Without Clash Detector | With Clash Detector |
|---|---|
| Manual schedule checking | Automatic overlap detection |
| Double-bookings discovered late | Conflicts identified immediately |
| Staff manually search for replacements | Available alternatives suggested |
| Higher risk of trip disruption | One-click resource reassignment |
| Poor visibility of resource availability | Real-time operational dashboard |

---

*Built for the Travel & Hospitality hackathon track. Static prototype — no backend dependency.*
