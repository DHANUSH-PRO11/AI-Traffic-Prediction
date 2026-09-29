"""
database.py
-----------
MongoDB database handler with robust in-memory fallback.
Collections: history, predictions
"""

import os
import sys
_ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
if _ENGINE_DIR not in sys.path:
    sys.path.insert(0, _ENGINE_DIR)

import datetime
from pymongo import MongoClient, DESCENDING
from pymongo.errors import ServerSelectionTimeoutError
try:
    from app.sat_engine.config import MONGO_URI, DB_NAME
except ImportError:
    from config import MONGO_URI, DB_NAME  # type: ignore

_db = None


# ── In-memory stub ────────────────────────────────────────────────────────────

class _StubCursor:
    def __init__(self, data=None):
        self.data = list(data) if data is not None else []

    def sort(self, *args, **kwargs):
        if args and isinstance(args[0], str):
            key = args[0]
            direction = args[1] if len(args) > 1 else DESCENDING
            reverse = (direction == DESCENDING)

            def _sort_key(d):
                val = d.get(key) if isinstance(d, dict) else ""
                if val is None:
                    return ""
                if isinstance(val, datetime.datetime):
                    return val.isoformat()
                return str(val)

            self.data.sort(key=_sort_key, reverse=reverse)
            return self
        return self

    def limit(self, n: int):
        return _StubCursor(self.data[:n])

    def skip(self, n: int):
        return _StubCursor(self.data[n:])

    def __iter__(self):
        return iter(self.data)

    def __len__(self):
        return len(self.data)

    def __getitem__(self, index):
        return self.data[index]


class _StubCollection:
    def __init__(self):
        self._store: list[dict] = []

    def insert_one(self, doc: dict):
        doc = dict(doc)
        doc.setdefault("_id", len(self._store) + 1)
        self._store.append(doc)

    def find(self, query: dict | None = None, projection: dict | None = None):
        return _StubCursor(self._store)

    def find_one(self, query: dict | None = None):
        return self._store[-1] if self._store else None

    def count_documents(self, query: dict | None = None):
        return len(self._store)

    def delete_many(self, query: dict | None = None):
        count = len(self._store)
        self._store.clear()
        return type("DeleteResult", (), {"deleted_count": count})()


class _StubDB:
    def __init__(self):
        self._cols: dict[str, _StubCollection] = {}

    def __getitem__(self, name: str) -> _StubCollection:
        if name not in self._cols:
            self._cols[name] = _StubCollection()
        return self._cols[name]

    def __getattr__(self, name: str) -> _StubCollection:
        if name.startswith("_"):
            raise AttributeError(name)
        return self[name]


# ── Connection ────────────────────────────────────────────────────────────────

def get_db():
    """Return MongoDB db object, or in-memory stub if unreachable."""
    global _db
    if _db is not None:
        return _db
    try:
        # Increase timeout slightly and enable tls/ssl considerations implicitly used by Atlas
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        _db = client[DB_NAME]
        print("MongoDB Atlas connected successfully")
    except (ServerSelectionTimeoutError, Exception) as exc:
        print("MongoDB connection failed. Operating with in-memory store.")
        _db = _StubDB()
    return _db


# ── Database Operations ───────────────────────────────────────────────────────

def save_history(source: str, destination: str, prediction: str,
                 distance_km: float, travel_time_min: float):
    """Insert one route search record into history collection."""
    db = get_db()
    db["history"].insert_one({
        "source":          source,
        "destination":     destination,
        "prediction":      prediction,
        "distance_km":     distance_km,
        "travel_time_min": travel_time_min,
        "timestamp":       datetime.datetime.now(),
    })


def save_prediction(features: dict, result: str):
    """Insert one raw traffic prediction record."""
    db = get_db()
    db["predictions"].insert_one({
        "features":  features,
        "result":    result,
        "timestamp": datetime.datetime.now(),
    })


def get_history(limit: int = 100, prediction: str | None = None) -> list[dict]:
    """Return last `limit` history records, newest first."""
    db = get_db()
    query = {"prediction": prediction} if prediction else {}
    cursor = db["history"].find(query).sort("timestamp", DESCENDING).limit(limit)
    records = []
    for doc in cursor:
        doc_copy = dict(doc)
        doc_copy.pop("_id", None)
        if isinstance(doc_copy.get("timestamp"), datetime.datetime):
            timestamp = doc_copy["timestamp"]
            doc_copy["timestamp"] = timestamp.isoformat()
        records.append(doc_copy)
    return records


def clear_history() -> int:
    """Clear all records from the history collection."""
    db = get_db()
    res = db["history"].delete_many({})
    return getattr(res, "deleted_count", 0)
