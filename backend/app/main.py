import asyncio
import csv
import io
import random
import time
from datetime import datetime, timezone
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from . import sim, model
from .model_adapter import ADAPTER

app = FastAPI(title="Risora Nowcast API", version="2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SRC = [
    ("DWR Delhi", "Doppler radar", 10, 2.1),
    ("DWR Mumbai", "Doppler radar", 10, 2.4),
    ("DWR Kolkata", "Doppler radar", 10, 3.0),
    ("DWR Chennai", "Doppler radar", 10, 2.7),
    ("INSAT-3DR", "IR + water vapour", 15, 4.5),
    ("INSAT-3DS", "Visible + IR", 15, 4.8),
    ("Lightning network", "Strike points", 1, .6),
    ("GFS 0.25°", "NWP fields", 360, 38),
    ("WRF 3 km", "NWP fields", 180, 22),
]


def city_obj(c):
    return {"name": c[0], "lon": c[1], "lat": c[2]}

def smart_prob(lo, la, t0, lead):
    """Use SatQuery adapter when configured, otherwise the bundled model."""
    import numpy as np
    x = model.features(lo, la, t0, lead, sim.CELLS, np.random.default_rng(int(lo*1000+la*10+lead)))
    return ADAPTER.predict_probability(x, lambda features: float(model.MODEL.predict_proba([features])[0][1]))


def build_alerts():
    out = []
    for n, lo, la in sim.CITIES:
        best = 0.0
        peak = 0
        lead = None
        for m in sim.FR[sim.NOW:]:
            p = smart_prob(lo, la, 0, max(0, m))
            if p > best:
                best = p
                peak = round(sim.point(lo, la, m))
            if p >= .60 and lead is None:
                lead = m
        if lead is not None:
            level = "Severe" if best >= .85 else "Warning" if best >= .70 else "Watch"
            out.append({"city": n, "prob": round(best * 100), "lead": lead, "peak": peak, "level": level})
    return sorted(out, key=lambda a: (a["lead"], -a["prob"]))

ALERTS = build_alerts()
DISPATCHED = []


def feed_snapshot():
    out = []
    for n, k, c, l in SRC:
        v = l * (.8 + random.random() * .5) * (2.4 if random.random() < .06 else 1)
        out.append({"name": n, "kind": k, "cadence": c, "latency": round(v, 1), "ok": v <= l * 1.6, "updated": time.time() - v * 60})
    return out


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "time": time.time(),
        "mode": "synthetic-demo",
        "model": ADAPTER.status,
        "model_detail": ADAPTER.detail,
        "frames": len(sim.FR),
        "domain": {"lon": [sim.B[0], sim.B[1]], "lat": [sim.B[2], sim.B[3]]},
    }


@app.get("/api/meta")
def meta():
    return {
        "frames": sim.FR,
        "now": sim.NOW,
        "bounds": sim.B,
        "cities": sim.CITIES,
        "generated": time.time(),
        "model": ADAPTER.status,
        "model_detail": ADAPTER.detail,
        "resolution": "15 min",
        "horizon": 180,
    }


@app.get("/api/frame/{i}")
def frame(i: int):
    i = max(0, min(len(sim.FR) - 1, i))
    t = sim.FR[i]
    radar, sat = sim.fields(t)
    cities = []
    for n, lo, la in sim.CITIES:
        p = smart_prob(lo, la, min(t, 0), max(t, 0))
        cities.append({"name": n, "lon": lo, "lat": la, "prob": round(p, 3), "risk": "Severe" if p >= .85 else "Warning" if p >= .7 else "Watch" if p >= .6 else "Low"})
    return {
        "t": t,
        "radar": radar.round().astype(int).tolist(),
        "sat": sat.round().astype(int).tolist(),
        "lightning": sim.lightning(t, i + 7),
        "cities": cities,
        "observed": t <= 0,
        "source_time": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/feeds")
def feeds():
    return feed_snapshot()


@app.get("/api/alerts")
def alerts():
    return ALERTS


@app.post("/api/dispatch/{city}")
def dispatch(city: str):
    item = next((a for a in ALERTS if a["city"].lower() == city.lower()), None)
    if not item:
        return {"ok": False, "message": "City not found"}
    event = {**item, "dispatched_at": time.time(), "channel": "CAP-ready gateway", "status": "queued"}
    DISPATCHED.append(event)
    return {"ok": True, "event": event}


@app.get("/api/dispatches")
def dispatches():
    return list(reversed(DISPATCHED[-30:]))


@app.get("/api/skill")
def skill():
    return model.SKILL


@app.get("/api/cities")
def cities():
    return [city_obj(c) for c in sim.CITIES]


@app.get("/api/export.csv")
def export_csv():
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["city", "probability_percent", "lead_minutes", "peak_reflectivity_dbz", "level"])
    for a in ALERTS:
        w.writerow([a["city"], a["prob"], a["lead"], a["peak"], a["level"]])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=risora-alerts.csv"})


@app.websocket("/ws/alerts")
async def ws(sock: WebSocket):
    await sock.accept()
    k = 0
    try:
        while True:
            a = dict(ALERTS[k % len(ALERTS)])
            a["at"] = time.time()
            a["repeat"] = k >= len(ALERTS)
            await sock.send_json(a)
            k += 1
            await asyncio.sleep(3.5)
    except Exception:
        pass
