# Risora SIH Submission — Final Build Guide

## What was added

1. Responsive operational dashboard with mobile navigation.
2. Risk-surface layer on the Leaflet map.
3. Operational snapshot with live risk counts and peak probability.
4. City/region risk explorer with search, severity filters and map focus.
5. Alert filtering by Severe / Warning / Watch.
6. Live dispatch logging through the backend.
7. System health and model provenance panel.
8. Automatic feed-health refresh.
9. Operational JSON report export and alert CSV export.
10. 15-minute timeline controls with previous/next frame buttons.
11. Explicit synthetic-demo disclosure so prototype results are not presented as live weather observations.
12. SatQuery-ready model adapter with safe fallback to the bundled GradientBoosting model.
13. Updated documentation and API reference.

## Demo flow for SIH

Use this order in the 3-minute video:

1. Home → "See the storm before it becomes a crisis."
2. Open Dashboard.
3. Turn on Radar + Satellite IR + Lightning + Risk surface.
4. Play the 15-minute timeline.
5. Click an alert → map automatically focuses the threat frame.
6. Open CAP XML.
7. Open Risk Explorer → search/filter a city.
8. Show Model Skill + Model & Provenance.
9. Ask Risora: "Which cities are at risk?"
10. Finish on the hero/dashboard.

## Run

### Windows

Double-click `start.bat` or run it from a terminal.

### Manual

Backend:

```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Connect the SatQuery model

The integration boundary is `backend/app/model_adapter.py`.

Set `SATQUERY_MODULE` in the environment to a Python module containing either `predict_proba(features)` or `predict(features)`.

Example:

```python
def predict_proba(features):
    # Convert canonical Risora features into your SatQuery tensor/input.
    # Return [[P(no storm), P(storm)]].
    return [[0.2, 0.8]]
```

The dashboard automatically reports the active model in **Model & provenance**.

### Production integration checklist

- Replace `sim.py` source functions with real authenticated feeds.
- Regrid radar/satellite/lightning/NWP to one spatial-temporal grid.
- Match SatQuery training preprocessing exactly at inference time.
- Calibrate probabilities on held-out historical events.
- Validate POD, FAR, CSI and reliability by lead time and region.
- Add district polygons and official warning thresholds.
- Connect CAP/SMS/Sachet-compatible gateways only after operational authorization.

## Important

The bundled fields and model are a deterministic prototype. They are **not** an operational weather service. For the SIH demo, describe the architecture and integration boundary honestly and use real data only where your team has an authorized source.
