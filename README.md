# Risora: Thunderstorm and Lightning Nowcasting Command Center

Risora is a full-stack prototype for **Smart India Hackathon problem SIH26072**: *AI/ML-based nowcasting of thunderstorm and lightning using atmospheric observations, including multiple radars, satellite, lightning and model data.*

It combines a FastAPI backend that produces 0 to 3 hour storm forecasts with a React, Tailwind and Leaflet frontend that works as an operational command center: a live multi-layer map, a forecast timeline, a data-feed monitor, an alert dispatcher with CAP export, a cross-section tool and a chat assistant.

> **About the data.** All radar, satellite and lightning fields are produced by a built-in storm simulator (`backend/app/sim.py`), and the model is trained on samples from that simulator. No live IMD, INSAT or GFS/WRF feeds are connected yet. Every data source sits behind one small function, so real data can be swapped in without touching the frontend (see [Going to real data](#going-to-real-data)).

---

## Table of contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Quick start](#quick-start)
4. [Project structure](#project-structure)
5. [Backend in detail](#backend-in-detail)
6. [Frontend in detail](#frontend-in-detail)
7. [How the dashboard features work](#how-the-dashboard-features-work)
8. [API reference](#api-reference)
9. [Going to real data](#going-to-real-data)
10. [Troubleshooting](#troubleshooting)
11. [Roadmap](#roadmap)
12. [References](#references)

---

## Features

| Feature | What it does |
|---|---|
| Multi-sensor GIS map | Leaflet map with radar reflectivity, satellite infrared, lightning strikes, city markers and alert zones as toggleable layers |
| 0 to 3 hour forecast timeline | 17 frames at 15-minute steps, from 60 minutes of past observations to 180 minutes ahead, with play, pause and scrubbing |
| Motion vectors | Arrows on the strongest storm cells showing where they will move over the next 120 minutes, with speed and direction |
| Alert dispatcher | Live alert feed with Watch, Warning and Severe levels and one-click dispatch |
| CAP v1.2 export | Any alert can be opened as a Common Alerting Protocol XML message, copied or downloaded |
| Auto-focus threat routing | Clicking an alert jumps the timeline to the alert's frame and flies the map to the predicted storm cell |
| Vertical wind profile | Draw a line on the map to open a cross-section drawer with echo tops, updraft cores, CAPE and a wind profile |
| Data feed monitor | Per-source latency and sync status for radars, INSAT satellites, the lightning network, GFS and WRF |
| Model and skill panel | POD, FAR and CSI for the selected lead time, measured on a held-out test set |
| Ask Risora | Rule-based chat assistant that answers from the same frames, alerts and feed data as the dashboard |
| Optional sign-in and plans | Pop-up sign-in, opened from the navbar or when choosing a pricing plan |
| Marketing pages | Hero, how it works, features, pricing and FAQ, with scroll-triggered animations |

---

## Architecture

```
                 +-------------------------------+
                 |           Frontend            |
                 |  React + Tailwind + Leaflet   |
                 |  (Vite dev server, port 5173) |
                 +---------------+---------------+
                                 |  /api/*  (REST)
                                 |  /ws/alerts (WebSocket)
                                 |  proxied by Vite
                 +---------------v---------------+
                 |            Backend            |
                 |  FastAPI (uvicorn, port 8000) |
                 |                               |
                 |  main.py   API and alerts     |
                 |  model.py  classifier + skill |
                 |  sim.py    storm simulator    |
                 +-------------------------------+
```

Data flow:

1. `sim.py` generates radar reflectivity, satellite brightness temperature and lightning for any time offset.
2. `model.py` turns those fields into features for each city and lead time, and a gradient-boosted classifier returns the storm probability.
3. `main.py` serves frames, alerts, feed status and skill scores, and streams alerts over a WebSocket.
4. The frontend loads all 17 frames once, then plays, scrubs and renders them locally, so the timeline is instant.

---

## Quick start

### Requirements

- Python 3.10 or newer
- Node.js 18 or newer
- Internet access for the map tiles (OpenStreetMap) and web fonts

### Run both servers

**Backend** (port 8000):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The first start trains the model, which takes a few seconds, and writes `app/model.joblib` and `app/skill.json`. Later starts load them instantly.

**Frontend** (port 5173):

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>.

You can also run `start.sh` (Linux and macOS) or `start.bat` (Windows) from the project root to launch both.

### Production build

```bash
cd frontend
npm run build      # output in frontend/dist
npm run preview    # serve the build locally
```

When hosting the build, route `/api` and `/ws` to the FastAPI server (a reverse proxy such as nginx works).

---

## Project structure

```
risora/
├── README.md
├── start.sh / start.bat
├── backend/
│   ├── requirements.txt
│   ├── train.py                 # retrain the model and print skill scores
│   └── app/
│       ├── main.py              # FastAPI app: endpoints, alerts, WebSocket
│       ├── model.py             # features, training, skill, probability
│       ├── sim.py               # synthetic storm generator
│       ├── model.joblib         # generated on first run
│       └── skill.json           # generated on first run
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js           # dev proxy for /api and /ws
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx             # React entry point
        ├── App.jsx              # page layout, state, data loading
        ├── api.js               # fetch helpers, colour ramp, storm-cell finder
        ├── MapView.jsx          # Leaflet map, overlays, arrows, drawing
        ├── panels.jsx           # Timeline, Feeds, Alerts, Skill panels
        ├── Chat.jsx             # Ask Risora assistant
        ├── CapModal.jsx         # CAP v1.2 XML builder and modal
        ├── CrossSection.jsx     # vertical wind profile drawer
        ├── Sections.jsx         # Features, Pricing, How, FAQ, Footer
        ├── Login.jsx            # sign-in pop-up
        └── index.css            # theme tokens, glass styles, animations
```

---

## Backend in detail

### `app/sim.py`: storm simulator

Defines the map domain and produces synthetic weather fields.

| Item | Description |
|---|---|
| `B` | Domain bounds `(lon_min, lon_max, lat_min, lat_max)` = `(66, 99, 5, 38)` |
| `FR` | Frame offsets in minutes: `-60, -45, ..., 180` (17 frames) |
| `NOW` | Index of the "now" frame in `FR` (index 4, offset 0) |
| `CITIES` | Twelve cities with longitude and latitude, used for markers, forecasts and alerts |
| `CELLS` | Nine storm cells, each with start position `x, y`, velocity `vx, vy` in degrees per hour, radius `r`, peak reflectivity `p`, time of peak `t` and life width `w` |
| `cells_at(t)` | Position, radius and intensity of every cell at time `t` minutes. Cells drift with their velocity, widen by 25% per hour of lead time, and follow a Gaussian life cycle in intensity |
| `point(lo, la, t)` | Reflectivity in dBZ at one location and time (maximum over all cells) |
| `sat_point(lo, la, t)` | Satellite brightness temperature in kelvin at one location: colder under strong storms |
| `fields(t, n=64)` | Full `n x n` reflectivity and brightness-temperature grids for time `t`. Row 0 is the northern edge |
| `lightning(t, seed)` | Strike locations around cells stronger than 38 dBZ, seeded so a frame always shows the same strikes |
| `rand_cells(rng)` | Random storm configurations used to generate training data |

### `app/model.py`: features, training and probability

**Features** (`features(...)`), computed for one point, an analysis time `t0` and a lead time:

| # | Feature | Meaning |
|---|---|---|
| 1 | `here` | Radar reflectivity at the point |
| 2 | `up` | Maximum reflectivity 1, 2 and 3 degrees upwind (west) |
| 3 | satellite | Brightness temperature at the point |
| 4 | lightning | Lightning activity proxy from reflectivity |
| 5 | humidity | Relative humidity proxy |
| 6 | CAPE | Convective energy proxy from the model-style guidance |
| 7 | `lead` | Forecast lead time in minutes |
| 8 | `nwp` | Model-style guidance: where cells are expected to be at the lead time |

**Training** (`train()`):

- 9,000 random storm configurations, each with a random point and lead time (0 to 180 minutes)
- About 65% of points are placed near a cell's expected path, so the model sees enough storms
- Label: reflectivity at the point reaches 40 dBZ at the lead time
- `GradientBoostingClassifier` with 120 trees and depth 3
- 75/25 train and test split. On the test set, at a 0.5 threshold, it computes **POD**, **FAR** and **CSI** for leads near 30, 60, 120 and 180 minutes
- Saves the model to `model.joblib` and the scores to `skill.json`

**Metrics:**

- POD (probability of detection) = hits / (hits + misses)
- FAR (false alarm ratio) = false alarms / (hits + false alarms)
- CSI (critical success index) = hits / (hits + misses + false alarms)

**Inference:** `prob(lo, la, t0, lead)` builds the features and returns the storm probability from `predict_proba`.

`load()` reuses saved files when they exist and trains otherwise. To force retraining, delete `model.joblib` and `skill.json`, or run `python train.py`.

### `app/main.py`: API and alerts

- Enables CORS for all origins (tighten this before deploying).
- `build_alerts()` runs once at startup. For every city it evaluates the model at each future frame. The first frame where probability reaches 60% sets the lead time. The highest probability sets the level:
  - **Severe**: 85% or higher
  - **Warning**: 70% to 85%
  - **Watch**: 60% to 70%
- `SRC` lists the nine monitored data feeds with their update cadence and typical latency.
- Endpoints are described in the [API reference](#api-reference).
- `/ws/alerts` sends one alert every 3.5 seconds, cycling through the computed alerts, to simulate a live warning stream.

### `train.py`

Retrains the model and prints the skill dictionary.

---

## Frontend in detail

### `App.jsx`: state and layout

Loads data, holds all shared state, and lays out the page.

- **Loading:** on mount it fetches `/api/meta`, then all 17 frames in parallel. It also loads skill and alerts, polls `/api/feeds` every 2.5 seconds, and opens the alert WebSocket.
- **Playback:** while playing, the selected frame advances every second.
- **Scroll effects:** an `IntersectionObserver` reveals sections as they enter the viewport, and a scroll listener highlights the current navbar link and drives the background blob parallax.
- **`vec` (motion vectors):** takes the strong cells in the selected frame and the frame 120 minutes later, matches each cell to its nearest counterpart, and computes speed (km/h) and compass direction.
- **`focusAlert(alert)`:** finds the alert's forecast frame, locates the predicted storm cell nearest the city, pauses playback, selects that frame, tells the map to fly there and scrolls the map into view.
- **`choosePlan`, `login`, `signOut`:** optional sign-in flow. Picking a plan while signed out opens the sign-in pop-up first, then confirms the plan.

### `api.js`

| Export | Purpose |
|---|---|
| `get(url)` | `fetch` wrapper that returns JSON and throws on errors |
| `wsUrl()` | Builds the WebSocket URL from the page location (`ws` or `wss`) |
| `lab(m)` | Formats a lead time as `Now`, `+45m` or `-30m` |
| `rc(z)` | Reflectivity colour ramp, 15 to 65 dBZ (blue, green, yellow, orange, red, magenta) |
| `peaks(frame, threshold)` | Finds local reflectivity maxima above a threshold and returns `{lon, lat, z}`, removing duplicates within 1.2 degrees |

### `MapView.jsx`

- Creates the Leaflet map with OpenStreetMap tiles, fitted to India.
- `paint(...)` draws the radar and satellite overlay onto an off-screen canvas. It resamples rows in Web Mercator so the image lines up with the tiles, and uses bilinear interpolation for smooth edges. Satellite is a translucent blue cloud layer, and radar is coloured by `rc` with soft edges.
- The canvas becomes a Leaflet `imageOverlay` that updates whenever the frame or layer toggles change.
- Draws lightning as gold circles (hollow rings for predicted strikes), city markers coloured by risk, dashed alert zones, and motion arrows with speed on hover.
- Reacts to a `focus` request by flying to a location with a pulsing ring, or resetting to the full India view.
- In cross-section mode, two clicks on the map define a line, with a live dashed preview, then the line is reported to the app.

### `panels.jsx`

- **`Timeline`:** play or pause, jump to now, peak-intensity bar chart for all 17 frames (click a bar to jump), and a slider.
- **`Feeds`:** the list of data sources with a status dot, cadence and latency, and a summary of how many are in sync. Sources over 1.6 times their typical latency show as lagging.
- **`Alerts`:** scrollable alert cards. Clicking a card triggers fly-to. Each card has **View CAP XML** and **Dispatch alert**. Severe alerts are auto-dispatched.
- **`Skill`:** POD, FAR and CSI bars for the lead time closest to the selected frame.

### `CapModal.jsx`

`buildCap(alert, city)` returns a CAP v1.2 document with the required elements (`identifier`, `sender`, `sent`, `status`, `msgType`, `scope`, and an `info` block with `category`, `event`, `urgency`, `severity`, `certainty`) plus onset, expiry, headline, description, instruction, parameters and a circular `area` of 80 km around the city.

Mappings:

| Risora level | CAP severity |
|---|---|
| Severe | Severe |
| Warning | Moderate |
| Watch | Minor |

Urgency is `Immediate` when the lead time is 30 minutes or less and `Expected` otherwise. Certainty is `Likely` at 70% or above and `Possible` below that. Times use the IST offset `+05:30`. The status is **`Test`**, which is correct for a prototype, so no receiving system treats the message as a real alert. Change it to `Actual` only when connected to a real operational pipeline.

The modal offers Copy and Download, and closes with Escape or a click outside.

### `CrossSection.jsx`

Samples the current frame's reflectivity at 64 points along the drawn line and renders an SVG cross-section: echo-top columns coloured by reflectivity, updraft ellipses where reflectivity is 42 dBZ or higher, the 0 °C and -20 °C levels, height and distance axes, and a wind-arrow column. Summary tiles show peak CAPE, updraft speed, echo top and 0 to 6 km shear. These values are derived from the forecast reflectivity with simple formulas, so treat the profile as an illustration rather than a physical sounding.

### `Chat.jsx`

`reply(question, context)` matches keywords in the question and answers from the loaded frames, alerts, feed status and skill scores:

- a city name: when its probability first crosses 60% and where it peaks
- risk and alerts: the list of cities at risk
- strikes: the observed strike count in the latest frame
- accuracy or model: POD and CSI values
- feeds: which sources are lagging
- safety: lightning safety guidance

It is rule-based, not a language model. Suggested-question chips are included.

### `Sections.jsx`, `Login.jsx`, `index.css`

- `Features`, `How`, `Pricing`, `Faq`, `Footer` render the marketing sections. Pricing has a monthly and yearly toggle. Prices are placeholders and no payments are processed.
- `Login` is a pop-up with sign-in, account creation and a demo account. Authentication is **front-end only**: it stores the user in `localStorage` and does not verify credentials.
- `index.css` defines colour tokens, the frosted-glass card style, buttons, chips, tags, scroll-reveal and reduced-motion handling.

---

## How the dashboard features work

**Timeline and layers.** Every frame contains the reflectivity grid, satellite grid, lightning points and per-city probabilities. Toggling a layer only changes how the current frame is drawn.

**Motion vectors.** For each strong cell (42 dBZ or higher) in the selected frame, the app finds the nearest cell (within 4.5 degrees) in the frame 120 minutes later. The arrow points from the first position to the second. Speed is the distance in kilometres divided by two hours. The feature needs at least 45 minutes of remaining forecast, so arrows disappear near the end of the timeline.

**CAP export.** Click **View CAP XML** on any alert card to open the payload for that alert.

**Threat routing.** Click any alert card. The timeline moves to the alert's frame, the map flies to the storm cell nearest the city, and a pulsing red ring marks it. Use **Reset view** to zoom back out.

**Vertical wind profile.** Turn on the toggle, click one point to start a line and a second point to finish it. The drawer opens at the bottom. Close it or turn the toggle off to remove the line.

---

## API reference

Base URL: `http://localhost:8000`

| Method | Path | Description |
|---|---|---|
| GET | `/api/meta` | `frames` (minute offsets), `now` (index), `bounds`, `cities`, `generated` timestamp |
| GET | `/api/frame/{i}` | One forecast frame (see below). `i` is clamped to a valid index |
| GET | `/api/feeds` | Data-feed status: `name`, `kind`, `cadence`, `latency`, `ok` |
| GET | `/api/alerts` | Computed alerts: `city`, `prob`, `lead`, `peak`, `level` |
| GET | `/api/skill` | Skill scores keyed by lead time (`30`, `60`, `120`, `180`), each with `pod`, `far`, `csi` |
| WS | `/ws/alerts` | Sends one alert JSON every 3.5 seconds (`at` timestamp and `repeat` flag added) |

`/api/frame/{i}` response:

```json
{
  "t": 30,
  "radar": [[8, 9, "... 64 values per row, 64 rows, dBZ as integers"]],
  "sat": [[285, 284, "... same shape, brightness temperature in K"]],
  "lightning": [[77.12, 23.4], [77.3, 23.51]],
  "cities": [{"name": "Bhopal", "lon": 77.4, "lat": 23.26, "prob": 0.42}]
}
```

Grid rows run from north (row 0, latitude 38) to south (latitude 5). Columns run west (longitude 66) to east (99).

Interactive documentation is available at <http://localhost:8000/docs> (FastAPI's built-in Swagger UI).

---

## Going to real data

The backend has three places to change:

1. **Fields.** Replace `sim.fields` and `sim.lightning` with loaders that return the same shapes: a 64 by 64 reflectivity grid, a matching brightness-temperature grid, and a list of strike coordinates. Regrid IMD Doppler radar volumes and INSAT-3DR/3DS imagery to the domain in `sim.B`.
2. **Features.** In `model.features`, compute the same eight inputs from observed fields. Feed GFS or WRF output into the model-guidance feature.
3. **Model.** Retrain on historical storm days with `train.py`. Keep the train and test split by storm day rather than by random sample, so the reported skill is honest.

Longer term, the same interface can host a spatiotemporal network instead of the per-point classifier (see the DDMS repository below), and radar extrapolation can handle the first hour while model guidance covers the rest.

For feeds, replace the static `SRC` list in `main.py` with real ingestion status (last file time per source).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Page shows "Cannot reach the API" | Start the backend on port 8000, then reload |
| Blank page | Open the browser console (F12) and check the first red error. Make sure all files were copied from the same version |
| Map has no background tiles | The machine needs internet access to `tile.openstreetmap.org` |
| Alerts panel is empty | The WebSocket is not connected. Check that the backend is running and that the Vite proxy in `vite.config.js` points to port 8000 |
| No Severe alerts appear | With the default data the highest alerts are Warnings. Lower the Severe threshold in `main.py` (`best>=.85`) to see one |
| Skill scores look different after retraining | Training is seeded, so results repeat, but changing the simulator or model settings changes them |
| Want a fresh model | Delete `backend/app/model.joblib` and `backend/app/skill.json`, then restart the backend |

---

## Roadmap

- Real ingestion for IMD DWR, INSAT and lightning data
- Spatiotemporal deep model and comparison against the current baseline
- Real authentication and role-based dispatch
- Delivery of CAP messages to an alerting gateway
- Verification dashboard using held-out storm days
- Mobile layout refinements and offline map tiles

---

## References

- [Applied-IAS/DDMS](https://github.com/Applied-IAS/DDMS): diffusion-based satellite infrared nowcasting, the upgrade path for a stronger model
- [suryaremanan/Thunderstorm-Prediction-Using-ML](https://github.com/suryaremanan/Thunderstorm-Prediction-Using-ML): SVM lightning-risk baseline for comparison
- [OASIS Common Alerting Protocol v1.2](http://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2.html): the alert format used by the CAP export
- [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors: map tiles

---

## License

Add a license file before publishing (for example MIT) and update this section.
