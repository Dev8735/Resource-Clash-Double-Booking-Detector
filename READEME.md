# Resource Clash & Double-Booking Detector

A live scheduling board for travel agencies — drivers, vehicles, guides, and
hotel rooms — that detects double-bookings the moment they're created and
suggests a free alternative.

**Zero backend, zero build step.** Pure HTML/CSS/JS with `localStorage`
persistence — open `index.html` directly, or deploy to GitHub Pages in one
click. No `npm install`, no server, nothing to configure.

## Run it

Just open `index.html` in a browser. That's the entire setup.

To deploy: push this repo to GitHub, then in **Settings → Pages**, set
Source to "Deploy from a branch", branch `main`, folder `/ (root)`. Live in
under two minutes.

## Status: Completed vs Planned

Per the hackathon rules, here's an honest split — everything under
**Completed** is implemented and testable right now; nothing under
**Planned** is claimed as done.

### Completed
- Live resource board (Grid and Timeline views) across a 7-day window
- Automatic conflict detection on every new booking, with the conflicting
  trip named explicitly
- Conflict resolution modal: **Switch Resource** (auto-picks a free
  alternative), **Book Anyway** (forces it, shown as a visible conflict),
  or **Cancel**
- **Past-date validation** — a booking cannot start before today, both via
  the date picker's `min` attribute and a hard server-side-equivalent check
  in `core.js` (belt and suspenders — see Testing below)
- Search resources by name, filter by type, navigate week-to-week
- Cancel an existing booking
- Add new resources on the fly
- Reset to seed demo data at any time
- "Booking Pressure" panel — an explicit **rule-based heuristic** (not
  machine learning) flagging upcoming high-demand days, described as such
  in its own UI copy
- Conflict feed — a running list of every current conflict across the
  board
- Keyboard shortcuts: `N` new booking, `/` search, `T` toggle view, `R`
  reset, `Ctrl+Z` undo, `Ctrl+P` print, `Esc` close dialog
- Undo for the last add/cancel action
- Print-friendly board export
- `localStorage` persistence — your changes survive a page reload
- **Resource Utilization panel** — percentage of the visible week each resource is booked, sorted busiest-first
- **CSV export** — download all bookings as a spreadsheet-ready file
- **Guided tour** ("▶ Watch Demo" button) — a real, working walkthrough that highlights each part of the interface in sequence, not a static screenshot

### Planned / Not Yet Implemented
- Multi-user / multi-agency accounts
- Real booking-system integration (currently seeded sample data)
- A learned (rather than rule-based) demand-forecasting model
- Mobile-optimized layout (currently desktop/tablet-first)

## How the core logic works

All scheduling logic — conflict detection, alternative suggestion, past-date
validation, the demand-pressure heuristic — lives in `core.js`, kept
deliberately free of any DOM dependency. That means it's the exact same code
that runs in the browser and the code covered by the automated tests below —
not a simulated or re-implemented version.

Two bookings on the same resource conflict if their date ranges overlap:

```
startA <= endB   AND   startB <= endA
```

## Testing

```
node core.test.js
```

26 unit tests covering overlap detection, conflict finding, alternative
suggestion, the past-date validation rule, schedule building, the
demand-pressure heuristic, resource utilization calculations, and CSV
export formatting — all passing. This is the same `core.js` file loaded by
`index.html`, so these tests exercise the real logic, not a copy.

## Project structure

```
index.html      Page structure and layout
style.css        Dark theme styling
core.js          Pure scheduling logic — no DOM dependency, fully unit tested
core.test.js     Unit tests for core.js (run with plain Node)
data.js          Seed/demo data, dates generated relative to "today"
app.js           DOM wiring: rendering, event handlers, state, localStorage
```

## Known limitation, stated plainly

Data is stored in the browser's `localStorage`, scoped to one browser on one
device — it is not shared across users or devices. For a hackathon prototype
demonstrating the core conflict-detection concept, this is an intentional
simplification; a production version would sync through a real backend,
which is listed under Planned above.
