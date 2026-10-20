from datetime import date, datetime, timezone
from pathlib import Path
import sqlite3
from uuid import uuid4

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator, model_validator

DB_PATH = Path(__file__).resolve().parent / "expoflow.db"
app = FastAPI(title="ExpoFlow API", description="Backend API for ExpoFlow event planning.", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500", "http://127.0.0.1:5501", "http://localhost:5501"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)


def connect_db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with connect_db() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            event_name TEXT NOT NULL,
            event_type TEXT NOT NULL,
            event_status TEXT NOT NULL DEFAULT 'Planning',
            description TEXT NOT NULL DEFAULT '',
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            venue_name TEXT NOT NULL,
            city TEXT NOT NULL,
            country TEXT NOT NULL,
            length REAL NOT NULL CHECK(length > 0),
            width REAL NOT NULL CHECK(width > 0),
            expected_exhibitors INTEGER NOT NULL DEFAULT 0 CHECK(expected_exhibitors >= 0),
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )""")


@app.on_event("startup")
def on_startup():
    initialize_database()


class EventInput(BaseModel):
    eventName: str = Field(min_length=1, max_length=200)
    eventType: str = Field(min_length=1, max_length=80)
    eventStatus: str = Field(default="Planning", max_length=40)
    description: str = Field(default="", max_length=5000)
    startDate: date
    endDate: date
    venueName: str = Field(min_length=1, max_length=200)
    city: str = Field(min_length=1, max_length=120)
    country: str = Field(min_length=1, max_length=120)
    length: float = Field(gt=0, le=100000)
    width: float = Field(gt=0, le=100000)
    expectedExhibitors: int = Field(default=0, ge=0, le=1000000)

    @field_validator("eventName", "eventType", "venueName", "city", "country")
    @classmethod
    def trim_required_fields(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank.")
        return value

    @model_validator(mode="after")
    def validate_dates(self):
        if self.endDate < self.startDate:
            raise ValueError("End date must be on or after the start date.")
        return self


class EventUpdate(BaseModel):
    eventName: str | None = Field(default=None, min_length=1, max_length=200)
    eventType: str | None = Field(default=None, min_length=1, max_length=80)
    eventStatus: str | None = Field(default=None, max_length=40)
    description: str | None = Field(default=None, max_length=5000)
    startDate: date | None = None
    endDate: date | None = None
    venueName: str | None = Field(default=None, min_length=1, max_length=200)
    city: str | None = Field(default=None, min_length=1, max_length=120)
    country: str | None = Field(default=None, min_length=1, max_length=120)
    length: float | None = Field(default=None, gt=0, le=100000)
    width: float | None = Field(default=None, gt=0, le=100000)
    expectedExhibitors: int | None = Field(default=None, ge=0, le=1000000)


FIELD_MAP = {
    "eventName": "event_name", "eventType": "event_type", "eventStatus": "event_status",
    "description": "description", "startDate": "start_date", "endDate": "end_date",
    "venueName": "venue_name", "city": "city", "country": "country", "length": "length",
    "width": "width", "expectedExhibitors": "expected_exhibitors",
}


def serialize_event(row):
    event = {
        "id": row["id"], "eventName": row["event_name"], "eventType": row["event_type"],
        "eventStatus": row["event_status"], "description": row["description"],
        "startDate": row["start_date"], "endDate": row["end_date"],
        "venueName": row["venue_name"], "city": row["city"], "country": row["country"],
        "length": row["length"], "width": row["width"],
        "expectedExhibitors": row["expected_exhibitors"],
        "createdAt": row["created_at"], "updatedAt": row["updated_at"],
    }
    # Baseline for rectangular venues only; irregular boundary support comes later.
    event["grossArea"] = round(float(event["length"]) * float(event["width"]), 2)
    return event


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "ExpoFlow API"}


@app.post("/api/events", status_code=status.HTTP_201_CREATED)
def create_event(payload: EventInput):
    event_id = "EVT-" + uuid4().hex[:10].upper()
    now = datetime.now(timezone.utc).isoformat()
    data = payload.model_dump()
    with connect_db() as db:
        db.execute("""INSERT INTO events (
            id, event_name, event_type, event_status, description, start_date, end_date,
            venue_name, city, country, length, width, expected_exhibitors, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""", (
            event_id, data["eventName"], data["eventType"], data["eventStatus"], data["description"],
            data["startDate"].isoformat(), data["endDate"].isoformat(), data["venueName"], data["city"],
            data["country"], data["length"], data["width"], data["expectedExhibitors"], now, now,
        ))
        row = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    return serialize_event(row)


@app.get("/api/events")
def list_events():
    with connect_db() as db:
        rows = db.execute("SELECT * FROM events ORDER BY created_at DESC").fetchall()
    return [serialize_event(row) for row in rows]


@app.get("/api/events/{event_id}")
def get_event(event_id: str):
    with connect_db() as db:
        row = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    return serialize_event(row)


@app.put("/api/events/{event_id}")
def update_event(event_id: str, payload: EventUpdate):
    changes = payload.model_dump(exclude_unset=True, exclude_none=True)
    if not changes:
        raise HTTPException(status_code=400, detail="No event fields were provided to update.")
    for key in ("eventName", "eventType", "venueName", "city", "country"):
        if key in changes:
            changes[key] = changes[key].strip()
            if not changes[key]:
                raise HTTPException(status_code=422, detail=f"{key} cannot be blank.")
    for key in ("startDate", "endDate"):
        if key in changes:
            changes[key] = changes[key].isoformat()
    with connect_db() as db:
        current = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
        if current is None:
            raise HTTPException(status_code=404, detail="Event not found.")
        start = changes.get("startDate", current["start_date"])
        end = changes.get("endDate", current["end_date"])
        if end < start:
            raise HTTPException(status_code=422, detail="End date must be on or after the start date.")
        assignments = [f"{FIELD_MAP[key]} = ?" for key in changes]
        values = list(changes.values())
        assignments.append("updated_at = ?")
        values.extend([datetime.now(timezone.utc).isoformat(), event_id])
        db.execute(f"UPDATE events SET {', '.join(assignments)} WHERE id = ?", values)
        row = db.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    return serialize_event(row)


@app.delete("/api/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: str):
    with connect_db() as db:
        cursor = db.execute("DELETE FROM events WHERE id = ?", (event_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Event not found.")
    return None
