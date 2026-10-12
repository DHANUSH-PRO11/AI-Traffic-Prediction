import sys
import os
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Stub factory — returns a realistic fake sat-engine response so that
# test_route_calculation never touches OSRM / Nominatim / Open-Meteo.
# ---------------------------------------------------------------------------
def _fake_find_best_route(src_name: str, dst_name: str, vehicle_type: str = "car") -> dict:
    return {
        "routes": [
            {
                "id": "fastest",
                "name": f"{src_name} → {dst_name} (Fastest)",
                "distance_km": 350.0,
                "travel_time_min": 240.0,
                "traffic": "Medium",
                "road_type": "Highway",
                "via_summary": "NH 44",
                "coordinates": [[13.0827, 80.2707], [11.0168, 76.9558]],
            }
        ]
    }

from app.database.init_db import init_database

class TestAPIEndpoints(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_database()

    def test_root_and_health(self):
        res = client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "operational")

        res_health = client.get("/api/health")
        self.assertEqual(res_health.status_code, 200)
        self.assertEqual(res_health.json()["status"], "healthy")

    def test_traffic_current(self):
        res = client.get("/api/traffic/current")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("total_segments", data)
        self.assertIn("system_average_speed", data)
        self.assertIn("segments", data)
        self.assertGreater(len(data["segments"]), 0)

    @patch("app.sat_engine.dijkstra.find_best_route", side_effect=_fake_find_best_route)
    def test_route_calculation(self, _mock_route):
        from app.services.traffic_service import traffic_service
        src = "NODE_CHENNAI" if "NODE_CHENNAI" in traffic_service.nodes_dict else list(traffic_service.nodes_dict.keys())[0]
        dst = "NODE_COIMBATORE" if "NODE_COIMBATORE" in traffic_service.nodes_dict else list(traffic_service.nodes_dict.keys())[1]
        payload = {
            "source_node": src,
            "destination_node": dst,
            "algorithm": "A*",
            "weather_condition": "Clear"
        }
        res = client.post("/api/routes/calculate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("recommended_route", data)
        primary = data["recommended_route"]
        self.assertGreater(primary["total_distance_km"], 0.0)
        self.assertGreater(primary["total_travel_time_min"], 0.0)

    def test_traffic_predict(self):
        from app.services.traffic_service import traffic_service
        road_id = list(traffic_service.segments_dict.keys())[0]
        payload = {
            "road_id": road_id,
            "weather": "Clear",
            "time_str": "08:30",
            "temperature": 24.0,
            "rainfall": 0.0,
            "accident_reported": False
        }
        res = client.post("/api/traffic/predict", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("predicted_speed_kmh", data)
        self.assertIn("predicted_travel_time_min", data)
        self.assertIn("traffic_level", data)

    def test_ml_model_info_and_metrics(self):
        res = client.get("/api/ml/model")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("version", data)
        self.assertIn("metrics", data)

        res_metrics = client.get("/api/ml/metrics")
        self.assertEqual(res_metrics.status_code, 200)
        metrics_data = res_metrics.json()
        self.assertIn("feature_importances", metrics_data)

    def test_trip_recording(self):
        payload = {
            "source": "Santa Monica Pier",
            "destination": "Century City Hub",
            "route_geometry": [[-118.4965, 34.0102], [-118.4135, 34.0558]],
            "predicted_time": 12.5,
            "actual_time": 13.1,
            "distance": 11.2,
            "algorithm": "A*"
        }
        res = client.post("/api/trips/", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertIn("id", res.json())

    def test_analytics(self):
        res = client.get("/api/analytics/traffic")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("congestion_distribution", data)
        self.assertIn("hourly_trends", data)

    def test_accidents_workflow(self):
        from app.services.traffic_service import traffic_service
        road_id = list(traffic_service.segments_dict.keys())[0]
        # Report
        res_post = client.post("/api/accidents/", json={
            "road_id": road_id,
            "severity": "HIGH",
            "description": "Multi-vehicle incident"
        })
        self.assertEqual(res_post.status_code, 200)

        # Get active
        res_get = client.get("/api/accidents/")
        self.assertEqual(res_get.status_code, 200)
        self.assertTrue(any(a["road_id"] == road_id for a in res_get.json()))

        # Resolve
        res_del = client.delete(f"/api/accidents/{road_id}")
        self.assertEqual(res_del.status_code, 200)

    def test_sat_live_prediction(self):
        res = client.post("/api/predict-live", json={
            "hour": 17,
            "day": 3,
            "festival": 1,
            "rainfall": 20.0,
            "temperature": 29.0,
            "road_type": "highway",
            "vehicle_count": 320
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("prediction", data)
        self.assertIn("confidence", data)
        self.assertIn("probabilities", data)
        self.assertIn("multiplier", data)

    @patch("app.sat_engine.dijkstra.find_best_route", side_effect=_fake_find_best_route)
    def test_sat_route(self, _mock):
        res = client.post("/api/route", json={
            "source": "Chennai",
            "destination": "Coimbatore",
            "vehicle_type": "car"
        })
        self.assertEqual(res.status_code, 200)

    def test_roads_endpoints(self):
        from app.services.traffic_service import traffic_service
        res_roads = client.get("/api/roads/")
        self.assertEqual(res_roads.status_code, 200)
        self.assertGreater(len(res_roads.json()), 0)

        res_nodes = client.get("/api/roads/nodes")
        self.assertEqual(res_nodes.status_code, 200)
        self.assertGreater(len(res_nodes.json()), 0)

        road_id = list(traffic_service.segments_dict.keys())[0]
        res_single = client.get(f"/api/roads/{road_id}")
        self.assertEqual(res_single.status_code, 200)
        self.assertEqual(res_single.json()["road_id"], road_id)

    def test_weather_endpoints(self):
        res_w = client.get("/api/weather/")
        self.assertEqual(res_w.status_code, 200)

        res_up = client.post("/api/weather/update", json={
            "condition": "Rain",
            "temperature": 21.0,
            "rainfall": 15.0
        })
        self.assertEqual(res_up.status_code, 200)

if __name__ == "__main__":
    unittest.main()
