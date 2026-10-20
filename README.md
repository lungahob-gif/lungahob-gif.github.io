# ExpoFlow Backend — first stage

This backend uses Python, FastAPI, and SQLite.

## Included now
- Create and persist events in `expoflow.db`.
- List all saved events and retrieve one by ID.
- Update and delete an event.
- Validate required fields, positive dimensions, and date order.
- Calculate rectangular gross area (`length × width`) as a temporary baseline.

We have not implemented irregular venue geometry or the floorplan algorithm yet.

## Run on Windows
1. Install Python 3.10 or newer.
2. Run `run_backend.bat` in this folder, or open a terminal here and run:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   python -m uvicorn main:app --reload
   ```

   If PowerShell blocks virtual-environment activation, use Command Prompt or run `run_backend.bat`.
3. Keep the backend terminal running. The API runs at `http://127.0.0.1:8000`.
4. Open `http://127.0.0.1:8000/docs` to test the API.
5. Run the frontend separately with VS Code Live Server.

SQLite creates `expoflow.db` in this folder automatically. Keep that file to preserve local event records.

## Endpoints
- `GET /api/health`
- `POST /api/events`
- `GET /api/events`
- `GET /api/events/{event_id}`
- `PUT /api/events/{event_id}`
- `DELETE /api/events/{event_id}`

This is a local development backend only. Authentication, cloud deployment, backups, and multi-user access are not included yet.
