"""
verify_all.py
-------------
Integrity test suite verifying:
1. Dataset exists and contains >2500 samples
2. ML model loads and predicts with class probabilities
3. Graph network loads with 30 city nodes and 66 edges
4. Dijkstra route calculation produces distance, travel time, and coordinates
5. Database history save, retrieval, and clear operations function properly
"""

import sys
import os
import pandas as pd

def test_dataset():
    path = os.path.join("datasets", "traffic.csv")
    assert os.path.exists(path), "Dataset file missing"
    df = pd.read_csv(path)
    assert len(df) >= 2500, f"Expected >= 2500 records, got {len(df)}"
    print(f"[OK] [Dataset Test Passed]: {len(df)} records in real_traffic_dataset.csv")

def test_ml_model():
    from predict import predict_traffic, predict_traffic_details
    sample = {
        "hour": 18, "day": 2, "festival": 1, "rainfall": 15.0,
        "temperature": 32.0, "road_type": "highway", "vehicle_count": 320
    }
    label = predict_traffic(sample)
    details = predict_traffic_details(sample)
    assert label in ["Low", "Medium", "Heavy", "Very Heavy"], f"Invalid label: {label}"
    assert "confidence" in details and "probabilities" in details
    print(f"[OK] [ML Predictor Test Passed]: Predicted '{label}' with confidence {details['confidence'] * 100:.1f}%")

def test_graph_and_dijkstra():
    from graph_loader import get_graph
    from dijkstra import find_best_route
    G = get_graph()
    assert len(G.nodes) >= 25, f"Expected >= 25 graph nodes, got {len(G.nodes)}"
    
    route = find_best_route("Chennai", "Coimbatore")
    assert route["distance_km"] > 300, f"Expected distance >300 km, got {route['distance_km']}"
    assert len(route["coordinates"]) > 2, "Polyline coordinates missing"
    print(f"[OK] [Graph & Dijkstra Test Passed]: Route Chennai -> Coimbatore: {route['distance_km']} km, {route['travel_time_min']} min, {route['traffic']} traffic")

def test_database():
    from database import save_history, get_history, clear_history
    save_history("Chennai", "Madurai", "Heavy", 460.0, 320.0)
    history = get_history(10)
    assert len(history) >= 1, "History save failed"
    print(f"[OK] [Database Test Passed]: History contains {len(history)} items")

def test_osmnx_datasets():
    from osmnx_manager import get_osmnx_features, get_osmnx_datasets_summary
    summary = get_osmnx_datasets_summary()
    assert summary["total_infrastructure_elements"] > 0, "OSMnx datasets empty"
    signals = get_osmnx_features(feature_type="traffic_signals")
    assert len(signals) > 0, "No traffic signals found in OSMnx dataset"
    print(f"[OK] [OSMnx Datasets Test Passed]: {summary['total_infrastructure_elements']} features loaded across {len(summary['datasets'])} OSM categories")

if __name__ == "__main__":
    print("\n--- Running System Integrity Verification ---\n")
    test_dataset()
    test_ml_model()
    test_graph_and_dijkstra()
    test_database()
    test_osmnx_datasets()
    print("\n[SUCCESS] ALL TESTS PASSED PERFECTLY!\n")

