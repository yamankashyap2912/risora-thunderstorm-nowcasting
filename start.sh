#!/usr/bin/env bash
(cd backend && python -m venv .venv && . .venv/bin/activate && pip install -q -r requirements.txt && uvicorn app.main:app --port 8000) &
(cd frontend && npm install && npm run dev)
