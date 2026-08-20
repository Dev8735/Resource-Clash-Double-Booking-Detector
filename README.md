# Resource Clash & Double-Booking Detector

**Travel & Hospitality Hackathon — Solo project by Dev Chokhawala**

A scheduling dashboard for travel agencies that automatically detects double-bookings
across drivers, vehicles, guides, and hotel rooms — the moment a new booking is entered
— and suggests an available alternative instead of leaving staff to discover the clash
the day of the trip.

> Live demo (GitHub Pages): **`https://dev8735.github.io/Resource-Clash-Double-Booking-Detector/`**
> *(enable Pages once the repo is pushed — steps below)*

---

## 1. The problem

Travel agency operations staff track driver, vehicle, guide, and hotel-room schedules
manually in spreadsheets or registers. During peak season, when many trips overlap,
it's easy to double-book the same driver or vehicle for two trips on the same day.
The clash is usually discovered right before the trip starts, causing last-minute
scrambling, cancellations, and damaged customer trust.

## 2. The solution

Every booking is checked against existing bookings for the same resource, on the same
dates, the instant it's entered:

- **No clash** → the booking is confirmed instantly.
- **Clash found** → an alert is raised immediately, showing exactly which existing
  booking(s) it collides with, and the system suggests an available alternative
  resource of the same type for that exact date range — so staff can re-route the
  booking in one click instead of manually re-checking the whole register.

A live schedule board shows every tracked resource against the coming week, with
**Open / Booked / Conflict** states colour-coded at a glance, plus a rolling conflict
feed and a booking-pressure panel that flags resource types running hot.

## 3. How it works

```
New booking entered  →  Automatic conflict check  →  Conflict?
                                                        ├─ No  → Booking confirmed instantly
                                                        └─ Yes → Alert raised
                                                                  → Alternative resource suggested
                                                                  → Staff chooses: switch / book anyway / cancel
```

The core check is a date-range overlap comparison
(`startA <= endB && startB <= endA`) run per resource — see `findOverlaps()` in
`app.js`. Alternative resources are found by filtering resources of the same type
that have **zero** overlapping bookings for the requested range
(`findAvailableAlternatives()`).

## 4. Features implemented in this prototype

| Feature | Status |
|---|---|
| Add a booking (resource type, resource, trip, customer, dates) | ✅ Implemented |
| Real-time overlap/clash detection per resource | ✅ Implemented |
| Conflict alert with the specific colliding booking(s) shown | ✅ Implemented |
| Automatic alternative-resource suggestion | ✅ Implemented |
| "Book anyway" override (clash stays visible on the board) | ✅ Implemented |
| Weekly schedule board, colour-coded, filterable by resource type | ✅ Implemented |
| Add a brand-new resource on the fly from the booking form | ✅ Implemented |
| Conflict feed / activity log | ✅ Implemented |
| Utilization stats (active bookings, open conflicts, utilization %) | ✅ Implemented |
| Booking-pressure panel (rule-based utilization heuristic per resource type) | ✅ Implemented — **heuristic, not ML** |
| Export / print the current board | ✅ Implemented |
| Data persistence | ✅ Browser `localStorage` (see note below) |
| Multi-user / real backend / database | 🔜 Future scope |
| Trained ML demand-forecasting model | 🔜 Future scope (see §7) |
| SMS / email alerts to drivers & guides | 🔜 Future scope |
| Native mobile app (APK) | 🔜 Future scope — this prototype ships as a responsive web app |

We're calling this out explicitly, per the hackathon's own rule that a team must not
claim a feature is completed if it isn't implemented or demonstrated: **the "Booking
Pressure" panel is a transparent, rule-based utilization percentage, not a trained
machine-learning model.** The pitch deck lists a real ML forecasting layer as
optional/future work, and that's exactly how it's presented here.

## 5. Prototype scope (why it's built this way)

This is a hackathon prototype, not a production system, by design:

- **Client-side only, in-memory + `localStorage` state.** There is no backend or
  database. This keeps the demo self-contained, deployable as a static site (GitHub
  Pages), and removes hosting risk before judging. A production version would move
  `state` in `app.js` behind a real API + database (see §7).
- **Seed/demo data** recreates the exact double-booking scenario from the pitch deck
  (Driver Ramesh and Vehicle MH-04-1121 both double-booked on the same day, with
  Driver Suresh free as the alternative) so judges can see a live conflict on load —
  see `data.js`. Dates are generated relative to *today* so the board always looks
  live, regardless of when it's demoed.
- **Single agency, single browser session.** Multi-branch / multi-user sync is future
  scope, not simulated here.

## 6. Tech stack

| Layer | Technology | Why |
|---|---|---|
| UI | HTML5 + CSS3 (no framework) | Zero build step, deploys as a static site, loads instantly for judges |
| Logic | Vanilla JavaScript (ES6+) | Conflict-detection is plain date-range comparison — no framework overhead needed |
| Persistence | Browser `localStorage` | Lightweight, no server required for the prototype stage |
| Fonts | Space Grotesk / IBM Plex Mono / Inter (Google Fonts) | Dispatch-board look and legible tabular data |
| Hosting | GitHub Pages | Free, matches the "public repo + working website link" submission requirement |

No external runtime dependencies — open `index.html` and it runs.

## 7. Future scope

- Real backend (Node/Express + Postgres) so multiple staff can see the same live board.
- Trained ML forecasting model for genuine demand prediction (the current panel is a
  rule-based stand-in, clearly labelled as such).
- SMS/email/WhatsApp alerts to drivers, guides, and hotel partners on clash or reassignment.
- Native Android/iOS apps.
- Calendar (Google Calendar / Outlook) two-way sync per driver/guide.
- Role-based access for multi-branch agencies.

## 8. Running it locally

No install, no build step.

```bash
git clone https://github.com/Dev8735/Resource-Clash-Double-Booking-Detector.git
cd Resource-Clash-Double-Booking-Detector
```

Then just open `index.html` in a browser, **or** serve it locally (recommended, so
`localStorage` and relative paths behave the same as on GitHub Pages):

```bash
# Python 3
python3 -m http.server 8000
# then visit http://localhost:8000
```

```bash
# or with Node
npx serve .
```

### Deploying the live website link (GitHub Pages)

1. Push this repo to GitHub (public).
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source: Deploy from a branch**, branch
   `main`, folder `/ (root)`.
4. Save. GitHub publishes at
   `https://dev8735.github.io/Resource-Clash-Double-Booking-Detector/` within a
   minute or two.
5. Put that URL in the final submission's website-link field.

## 9. Using the demo

1. The board loads with two live clashes already on it (Driver Ramesh, Vehicle
   MH-04-1121) so the core feature is visible with zero clicks.
2. Try booking **Driver Suresh** or any other resource for dates that don't clash —
   it confirms instantly.
3. Try booking **Driver Ramesh** again for an overlapping date — the conflict modal
   opens, shows exactly what it collides with, and suggests a free driver.
4. Click **Switch resource** to accept the suggestion, **Book anyway** to force the
   double-booking (it'll show red on the board), or **Cancel**.
5. Use **Reset demo data** to put the board back to its seeded state at any time.

## 10. Project structure

```
.
├── index.html      # page shell / layout
├── style.css       # design system + board styling
├── app.js          # state, conflict-detection logic, rendering, form handling
├── data.js         # resource catalog + seed bookings + localStorage helpers
├── README.md
└── LICENSE
```

## 11. Problem → Solution → Impact

**Problem:** manual, spreadsheet-based scheduling misses resource clashes until the
day of the trip.
**Solution:** automatic overlap detection on every booking, with an instant
alternative-resource suggestion.
**Impact:** fewer last-minute cancellations, less emergency scrambling for
replacement drivers/vehicles/rooms, and more reliable scheduling for partners and
travelers alike.

---

*No passwords, credentials, or API keys are used anywhere in this project — all data
is simulated demo data, per the hackathon's GitHub submission rules.*
