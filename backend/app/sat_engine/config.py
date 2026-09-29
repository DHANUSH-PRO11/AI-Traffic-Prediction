"""
config.py
---------
Central configuration for Smart Traffic Finder.
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ── Flask ─────────────────────────────────────────────────────────────────────
DEBUG = True
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")

# ── MongoDB ───────────────────────────────────────────────────────────────────
MONGO_URI = os.environ.get("MONGODB_URI", os.environ.get("MONGO_URI", "mongodb://localhost:27017/"))
DB_NAME   = os.environ.get("DB_NAME",   "smart_traffic_finder")

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR         = os.path.dirname(os.path.abspath(__file__))
DATASETS_DIR     = os.path.join(BASE_DIR, "datasets")
MODELS_DIR       = os.path.join(BASE_DIR, "models")
FESTIVAL_CSV     = os.path.join(DATASETS_DIR, "festival.csv")
VEHICLE_CSV      = os.path.join(DATASETS_DIR, "vehicle_count.csv")
MODEL_PATH       = os.path.join(MODELS_DIR,   "traffic_model.pkl")

# ── OSMnx / Graph ─────────────────────────────────────────────────────────────
# Region used for road-network queries
OSMNX_REGION       = "Tamil Nadu, India"
GRAPH_CACHE        = os.path.join(BASE_DIR, "models", "road_graph.graphml")
OSMNX_DATASETS_DIR = os.path.join(DATASETS_DIR, "osmnx")

