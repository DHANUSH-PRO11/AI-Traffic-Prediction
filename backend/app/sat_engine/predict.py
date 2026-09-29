"""
predict.py
----------
Loads the trained Random Forest model and predicts traffic levels.
Supports single predictions as well as full class probability breakdowns.

Features : hour, day, festival, rainfall, temperature, road_type, vehicle_count
Labels   : Low | Medium | Heavy | Very Heavy
"""

import os
import sys
_ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
if _ENGINE_DIR not in sys.path:
    sys.path.insert(0, _ENGINE_DIR)

import joblib
import numpy as np
try:
    from app.sat_engine.config import MODEL_PATH
except ImportError:
    from config import MODEL_PATH  # type: ignore

LABEL_MAP     = {0: "Low", 1: "Medium", 2: "Heavy", 3: "Very Heavy"}
ROAD_TYPE_ENC = {"highway": 2, "main": 1, "secondary": 0}

TRAFFIC_MULTIPLIER = {
    "Low":        1.0,
    "Medium":     1.3,
    "Heavy":      1.7,
    "Very Heavy":  2.2,
}

_model = None


def _load_model():
    """Load and cache model from disk."""
    global _model
    if _model is not None:
        return _model
    if os.path.exists(MODEL_PATH):
        try:
            _model = joblib.load(MODEL_PATH)
            return _model
        except Exception as exc:
            print(f"[Predict] Error loading model: {exc}")
    return None


def _encode_road(road_type) -> int:
    if isinstance(road_type, (int, float)):
        return int(road_type)
    return ROAD_TYPE_ENC.get(str(road_type).lower().strip(), 1)


def _extract_features(features: dict) -> np.ndarray:
    return np.array([[
        float(features.get("hour",          12)),
        int(features.get("day",              1)),
        int(features.get("festival",         0)),
        float(features.get("rainfall",       0.0)),
        float(features.get("temperature",   28.0)),
        _encode_road(features.get("road_type", "main")),
        int(features.get("vehicle_count",   150)),
    ]])


def predict_traffic(features: dict) -> str:
    """Predict traffic level label."""
    model = _load_model()
    if model is None:
        return "Medium"

    X = _extract_features(features)
    idx = int(model.predict(X)[0])
    return LABEL_MAP.get(idx, "Medium")


def predict_traffic_details(features: dict) -> dict:
    """Predict traffic level with full class probabilities and confidence score."""
    model = _load_model()
    if model is None:
        return {
            "traffic": "Medium",
            "confidence": 0.75,
            "multiplier": 1.3,
            "probabilities": {"Low": 0.1, "Medium": 0.75, "Heavy": 0.1, "Very Heavy": 0.05}
        }

    X = _extract_features(features)
    idx = int(model.predict(X)[0])
    traffic_label = LABEL_MAP.get(idx, "Medium")

    probs = model.predict_proba(X)[0]
    prob_dict = {}
    for class_idx, prob in enumerate(probs):
        label_name = LABEL_MAP.get(class_idx, f"Class {class_idx}")
        prob_dict[label_name] = round(float(prob), 4)

    # Ensure all labels present in dictionary
    for l in LABEL_MAP.values():
        prob_dict.setdefault(l, 0.0)

    confidence = round(float(np.max(probs)), 4)
    multiplier = get_multiplier(traffic_label)

    return {
        "traffic": traffic_label,
        "confidence": confidence,
        "multiplier": multiplier,
        "probabilities": prob_dict,
    }


def get_multiplier(traffic_label: str) -> float:
    """Return edge-weight multiplier for a given traffic label."""
    return TRAFFIC_MULTIPLIER.get(traffic_label, 1.3)
