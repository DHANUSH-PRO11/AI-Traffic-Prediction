import sys
import os
import unittest
from fastapi.testclient import TestClient

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app

client = TestClient(app)

class TestAPIEndpoints(unittest.TestCase):
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

    def test_route_calculation(self):
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
        self.assertEqual(primary["path_nodes"][0], src)
        self.assertEqual(primary["path_nodes"][-1], dst)

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

if __name__ == "__main__":
    unittest.main()
