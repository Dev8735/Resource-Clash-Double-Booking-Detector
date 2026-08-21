# Resource Clash & Double-Booking Detector

**Travel & Hospitality Operations Control Center**

A browser-based operations control system for travel agencies that automatically detects double-bookings across drivers, vehicles, guides, and hotel rooms — evaluates conflict risk severity, suggests available alternatives, enforces strict date validation, and enables one-click automated resolution.

> Live Demo (GitHub Pages): **`https://dev8735.github.io/Resource-Clash-Double-Booking-Detector/`**

---

## 1. Problem

Travel and hospitality operators manage multiple resources such as drivers, vehicles, guides, and hotel rooms across overlapping itineraries. Manual scheduling using spreadsheets or registers frequently causes double-booking, resulting in last-minute cancellations, emergency driver replacement scrambling, customer dissatisfaction, and operational disruption.

## 2. Solution

A live operations control center that automatically validates and checks every booking request against existing resource schedules in real time:

- **Strict Date Validation**: Blocks past dates (`"Enter a valid date. Bookings cannot be made for past dates."`) and invalid date ranges.
- **Automatic Overlap Detection**: Instant date-range comparison for every resource type.
- **Rule-Based Conflict Severity**: Assesses operational risk (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) and details affected trip dependencies.
- **One-Click Conflict Resolution**: Suggests available alternatives of the same resource type and reassigns bookings in one click (`CONFIRMED → CONFLICT → RESOLVED`).
- **Operations Dashboard**: Real-time stats, Today's Operational Summary metrics, conflict feed, utilization forecasting, and before/after problem-solving impact analysis.

## 3. Operations Workflow Story

```
TRAVEL AGENCY OPERATIONAL PROBLEM
        ↓
Staff Member Creates a Booking
        ↓
Date Validation (Past-date prevention)
        ↓
Resource Availability Check
        ↓
Overlapping Booking Detected
        ↓
Conflict Details & Severity Assessed (LOW / MEDIUM / HIGH / CRITICAL)
        ↓
Available Alternative Resource Suggested
        ↓
One-Click Automated Switch ("Switch Automatically")
        ↓
Booking Status Updated to RESOLVED
        ↓
Schedule Board + Dashboard + Activity Feed Updated Immediately
```

## 4. Implemented Features

| Feature | Status |
|---|---|
| Resource Schedule Board (Grid & Timeline views) | ✅ Implemented |
| Search & Resource Type Filter | ✅ Implemented |
| Previous / Next Week Navigation | ✅ Implemented |
| Booking Creation & Form Controls | ✅ Implemented |
| Strict Date Validation & Past Date Prevention | ✅ Implemented |
| Real-time Conflict & Double-Booking Detection | ✅ Implemented |
| Booking Status Lifecycle (`CONFIRMED`, `CONFLICT`, `RESOLVED`, `CANCELLED`) | ✅ Implemented |
| Rule-Based Conflict Severity Assessment (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) | ✅ Implemented |
| Operational Risk & Impact Analysis Breakdown | ✅ Implemented |
| Available Alternative Resource Suggestions | ✅ Implemented |
| One-Click Automated Conflict Resolution | ✅ Implemented |
| Dynamic "Today's Operational Summary" Metrics | ✅ Implemented |
| Dashboard Statistics & Booking Pressure Forecasting (Rule-Based Heuristic) | ✅ Implemented |
| Activity / Conflict Feed with Resolution Logging | ✅ Implemented |
| Add New Resource Functionality with Duplicate Validation | ✅ Implemented |
| "How This Solves The Problem" Before vs. After Impact Section | ✅ Implemented |
| 8-Step Interactive Automated Watch Demo Tour | ✅ Implemented |
| Browser LocalStorage State Persistence & Demo Reset | ✅ Implemented |
| Export / Print Schedule Board | ✅ Implemented |
| Global Keyboard Shortcuts (`N`, `/`, `T`, `R`, `D`, `Ctrl+Z`, `Ctrl+P`, `Esc`) | ✅ Implemented |
| Automated Unit Test Suite (`node tests.js`) | ✅ Implemented |
| Multi-user WebSocket / Real Backend / Database | 🔜 Future scope |
| Real Machine Learning Demand Forecasting Model | 🔜 Future scope (clearly identified as rule-based heuristic) |
| SMS / Email Alerts to Drivers & Guides | 🔜 Future scope |

## 5. Technology Stack

- **HTML5**: Semantic UI layout and accessible modal dialogs
- **CSS3**: Custom Dark Theme design system (Space Grotesk, IBM Plex Mono, Inter fonts)
- **Vanilla JavaScript (ES6+)**: Modular client-side controller & pure math conflict engine
- **LocalStorage**: Browser state persistence
- **Node.js**: Zero-dependency automated unit test runner (`tests.js`)

## 6. Project Structure

```
.
├── index.html          # Main HTML structure & dashboard layout
├── style.css           # Dark theme design system & component styles
├── app.js              # UI controller, event handling, rendering & demo tour
├── data.js             # Resource catalog, seed bookings & LocalStorage state
├── conflict-engine.js  # Pure math date-overlap logic & rule-based severity engine
├── date-validation.js  # Date validation guard & past date prevention
├── tests.js            # Automated unit test runner
├── README.md           # Project documentation
└── LICENSE             # Open-source license
```

## 7. How to Run Locally

No external build tools or `npm install` required.

```bash
# Clone the repository
git clone https://github.com/Dev8735/Resource-Clash-Double-Booking-Detector.git
cd Resource-Clash-Double-Booking-Detector

# Serve locally with Python (recommended)
py -m http.server 8000

# Or with Python 3
python3 -m http.server 8000
```

Open your browser and visit:
`http://localhost:8000`

### Running Automated Tests

Run the unit test suite with Node.js:

```bash
node tests.js
```

## 8. Live Demo Deployment

To deploy on GitHub Pages:
1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Branch: main**, folder `/ (root)`.
4. Save. The live site will be active at:
   `https://dev8735.github.io/Resource-Clash-Double-Booking-Detector/`
