# Risora — AI/ML Thunderstorm & Lightning Nowcasting

Risora is a full-stack SIH prototype for **SIH26072: AI/ML based nowcasting of thunderstorm and lightning using atmospheric observations including multiple radars, satellite, lightning and model data.**

The project is deliberately built as an **operational decision-support prototype** rather than a static weather page:

- Multi-sensor GIS map with radar, satellite IR, lightning, alert zones, risk surface and motion vectors
- 15-minute timeline from -60 to +180 minutes
- City/region risk explorer with search and severity filters
- Live WebSocket alert dispatcher with Watch / Warning / Severe levels
- CAP v1.2 XML generation, copy/download and dispatch logging
- Operational JSON report + alert CSV export
- Feed health/latency monitor
- Model skill panel: POD, FAR, CSI
- Vertical profile / cross-section interaction
- Ask Risora assistant
- Responsive mobile navigation and adaptive layout
- Explicit model provenance and synthetic-demo disclosure
- **SatQuery-ready model adapter** so an external predictor can be connected without changing the frontend

## Important submission note

The bundled project is fully runnable offline except for OpenStreetMap tiles and web fonts. **The included atmospheric fields are synthetic demo data.** This is intentional so the submission has deterministic data and never fails because a live feed is unavailable.

For a real deployment, replace the source adapters with authenticated IMD/INSAT/radar/lightning/NWP ingestion and retrain/calibrate on historical observations. Do not present the synthetic skill scores as operational accuracy.

---

## Architecture

```text
             Radar / INSAT / Lightning / NWP
                         │
                  source adapters
                         │
                    regridding
                         │
                feature construction
                         │
              ┌──────────┴──────────┐
              │  SatQuery adapter   │  optional external model
              │        OR           │
              │ bundled GB classifier│  runnable fallback
              └──────────┬──────────┘
                         │
                  risk + lead time
                         │
                 alert / CAP layer
                         │
             React + Leaflet command center
```

## Quick start

### Windows

Run `start.bat` from the project root. It creates the Python environment, installs backend requirements and starts both services.

### Manual

Backend:

```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## SatQuery integration

The boundary is in `backend/app/model_adapter.py`.

Set:

```text
SATQUERY_MODULE=your_module_name
```

The module should expose either:

```python
def predict_proba(features):
    ...
```

or:

```python
def predict(features):
    ...
```

The adapter tries the external model and automatically falls back to the bundled GradientBoosting model if the external module is unavailable. This means the UI remains demo-ready while the actual research model can be swapped in later.

For a serious operational integration, map SatQuery inputs to the same canonical feature contract used by `model.features()` and version the model plus feature schema together.

## Key API

| Endpoint | Purpose |
|---|---|
| `/api/health` | System and model status |
| `/api/meta` | Forecast domain and frame metadata |
| `/api/frame/{i}` | One radar/satellite/lightning forecast frame |
| `/api/feeds` | Data-source freshness/health |
| `/api/alerts` | Forecast alert zones |
| `/api/dispatch/{city}` | Queue a CAP-ready dispatch event |
| `/api/dispatches` | Recent dispatches |
| `/api/skill` | POD/FAR/CSI skill scores |
| `/api/export.csv` | Alert CSV export |
| `/ws/alerts` | Live alert stream |

## Project structure

```text
risora/
├── backend/
│   ├── requirements.txt
│   ├── train.py
│   └── app/
│       ├── main.py
│       ├── model.py
│       ├── model_adapter.py
│       ├── sim.py
│       ├── model.joblib
│       └── skill.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── MapView.jsx
│   │   ├── panels.jsx
│   │   ├── Chat.jsx
│   │   ├── CapModal.jsx
│   │   ├── CrossSection.jsx
│   │   ├── Sections.jsx
│   │   └── index.css
│   └── ...
├── start.bat
└── start.sh
```
