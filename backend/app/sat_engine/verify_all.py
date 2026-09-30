"""
verify_all.py
-------------
Integrity test suite verifying:
1. Dataset exists and contains >2500 samples with ML feature columns
2. ML model loads and predicts with class probabilities
3. Graph network loads with 30 city nodes and 66 edges
4. Dijkstra route calculation produces distance, travel time, and coordinates
5. Database history save, retrieval, and clear operations function properly
6. OSMnx infrastructure datasets load
"""

import os
import sys
import traceback

_ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
if _ENGINE_DIR not in sys.path:
    sys.path.insert(0, _ENGINE_DIR)

import pandas as pd

try:
    from app.sat_engine.config import DATASETS_DIR
except ImportError:
    from config import DATASETS_DIR  # type: ignore

REQUIRED_DATASET_COLUMNS = [
    "hour", "day", "festival", "rainfall", "temperature",
    "road_type", "vehicle_count", "label",
]


def test_dataset():
    path = os.path.join(DATASETS_DIR, "real_traffic_dataset.csv")
    if not os.path.exists(path):
        from generate_real_dataset import generate_samples
        generate_samples(3000)
    assert os.path.exists(path), "Dataset file missing: real_traffic_dataset.csv"
    df = pd.read_csv(path)
    assert len(df) >= 2500, f"Expected >= 2500 records, got {len(df)}"
    missing = [c for c in REQUIRED_DATASET_COLUMNS if c not in df.columns]
    assert not missing, f"Dataset missing required columns: {missing}"
    print(f"[OK] [Dataset Test Passed]: {len(df)} records in real_traffic_dataset.csv")


def test_ml_model():
    from predict import predict_traffic, predict_traffic_details, _load_model, LABEL_MAP

    model = _load_model()
    assert model is not None, "Trained model failed to load from models/traffic_model.pkl"

    sample = {
        "hour": 18, "day": 2, "festival": 1, "rainfall": 15.0,
        "temperature": 32.0, "road_type": "highway", "vehicle_count": 320
    }
    label = predict_traffic(sample)
    details = predict_traffic_details(sample)
    assert label in LABEL_MAP.values(), f"Invalid label: {label}"
    assert details.get("traffic") == label, (
        f"predict_traffic ({label}) disagrees with predict_traffic_details ({details.get('traffic')})"
    )
    assert "confidence" in details and "probabilities" in details
    probs = details["probabilities"]
    for class_name in LABEL_MAP.values():
        assert class_name in probs, f"Missing class probability for {class_name}"
    assert 0.0 < float(details["confidence"]) <= 1.0
    # Hardcoded fallback uses confidence 0.75 and these exact probabilities
    fallback_probs = {"Low": 0.1, "Medium": 0.75, "Heavy": 0.1, "Very Heavy": 0.05}
    assert probs != fallback_probs, "Predictor returned the unloaded-model fallback instead of the trained model"
    print(f"[OK] [ML Predictor Test Passed]: Predicted '{label}' with confidence {details['confidence'] * 100:.1f}%")


def test_graph_and_dijkstra():
    from graph_loader import get_graph
    from dijkstra import find_best_route

    G = get_graph()
    assert len(G.nodes) >= 30, f"Expected >= 30 graph nodes, got {len(G.nodes)}"
    assert len(G.edges) >= 66, f"Expected >= 66 graph edges, got {len(G.edges)}"

    route = find_best_route("Chennai", "Coimbatore")
    assert route["distance_km"] > 300, f"Expected distance >300 km, got {route['distance_km']}"
    assert route["travel_time_min"] > 0, f"Travel time missing or zero: {route['travel_time_min']}"
    assert len(route["coordinates"]) > 2, "Polyline coordinates missing"
    assert route.get("traffic") in ["Low", "Medium", "Heavy", "Very Heavy"]
    print(
        f"[OK] [Graph & Dijkstra Test Passed]: Route Chennai -> Coimbatore: "
        f"{route['distance_km']} km, {route['travel_time_min']} min, {route['traffic']} traffic "
        f"({len(G.nodes)} nodes, {len(G.edges)} edges)"
    )


def test_database():
    from database import save_history, get_history, clear_history, get_db

    save_history("Chennai", "Madurai", "Heavy", 460.0, 320.0)
    history = get_history(10)
    assert len(history) >= 1, "History save failed"
    match = [h for h in history if h.get("source") == "Chennai" and h.get("destination") == "Madurai"]
    assert match, "Saved history record was not retrieved"

    db = get_db()
    if type(db).__name__ == "_StubDB":
        deleted = clear_history()
        assert deleted >= 1, "History clear failed"
        assert get_history(10) == [], "History was not empty after clear"
        print(f"[OK] [Database Test Passed]: Save/retrieve/clear OK ({len(history)} items before clear)")
    else:
        print(f"[OK] [Database Test Passed]: History save/retrieve OK ({len(history)} items; skip full clear on live MongoDB)")


def test_osmnx_datasets():
    from osmnx_manager import get_osmnx_features, get_osmnx_datasets_summary

    summary = get_osmnx_datasets_summary()
    assert summary["total_infrastructure_elements"] > 0, "OSMnx datasets empty"
    signals = get_osmnx_features(feature_type="traffic_signals")
    assert len(signals) > 0, "No traffic signals found in OSMnx dataset"
    graph_stats = summary.get("graph_stats") or {}
    if graph_stats:
        assert graph_stats.get("nodes_count", 0) >= 30, f"OSMnx graph nodes too low: {graph_stats}"
        assert graph_stats.get("edges_count", 0) >= 66, f"OSMnx graph edges too low: {graph_stats}"
    print(
        f"[OK] [OSMnx Datasets Test Passed]: {summary['total_infrastructure_elements']} features "
        f"loaded across {len(summary['datasets'])} OSM categories"
    )


if __name__ == "__main__":
    tests = [
        test_dataset,
        test_ml_model,
        test_graph_and_dijkstra,
        test_database,
        test_osmnx_datasets,
    ]
    print("\n--- Running System Integrity Verification ---\n")
    failed = []
    for test in tests:
        try:
            test()
        except Exception as exc:
            failed.append((test.__name__, exc))
            print(f"[FAIL] [{test.__name__}]: {exc}")
            traceback.print_exc()
    if failed:
        print(f"\n[ERROR] {len(failed)} TEST(S) FAILED\n")
        sys.exit(1)
    print("\n[SUCCESS] ALL TESTS PASSED PERFECTLY!\n")
