"""Optional adapter for an external SatQuery model.

Set SATQUERY_MODULE to a Python module that exposes predict(features) or
predict_proba(features). If unavailable/incompatible, Risora falls back to the
built-in gradient-boosted model. This keeps the demo runnable while making the
model boundary explicit for SIH integration.
"""
import importlib
import os
from typing import Any

class SatQueryAdapter:
    def __init__(self):
        self.module_name = os.getenv("SATQUERY_MODULE", "").strip()
        self.module = None
        self.status = "fallback"
        self.detail = "Built-in gradient-boosted nowcast model"
        if self.module_name:
            try:
                self.module = importlib.import_module(self.module_name)
                if hasattr(self.module, "predict") or hasattr(self.module, "predict_proba"):
                    self.status = "satquery"
                    self.detail = f"External adapter: {self.module_name}"
                else:
                    self.detail = f"{self.module_name} has no predict/predict_proba; fallback active"
            except Exception as exc:
                self.detail = f"SatQuery adapter unavailable: {exc.__class__.__name__}; fallback active"

    def predict_probability(self, features: list[float], fallback) -> float:
        if self.module is None:
            return float(fallback(features))
        try:
            if hasattr(self.module, "predict_proba"):
                out = self.module.predict_proba([features])
                if hasattr(out, "__getitem__"):
                    return float(out[0][-1])
            if hasattr(self.module, "predict"):
                out = self.module.predict([features])
                value = out[0] if hasattr(out, "__getitem__") else out
                value = float(value)
                return value / 100 if value > 1 else value
        except Exception:
            return float(fallback(features))
        return float(fallback(features))

ADAPTER = SatQueryAdapter()
