@echo off
start cmd /k "cd backend && python -m venv .venv && .venv\Scripts\activate && pip install -r requirements.txt && uvicorn app.main:app --port 8000"
start cmd /k "cd frontend && npm install && npm run dev"
