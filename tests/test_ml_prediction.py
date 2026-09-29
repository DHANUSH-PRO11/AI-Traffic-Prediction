import sys
import os
import unittest
import datetime

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.ml.predictor import predictor
from app.ml.feature_pipeline import extract_features_from_dict, FEATURE_NAMES

class TestMLPrediction(unittest.TestCase):
    def test_feature_pipeline_shape(self):
        sample = {
            "hour": 8,
            "day_of_week": 1,
            "road_type": "highway",
            "weather": "Rain",
            "road_length": 5.0,
            "max_speed": 100.0
        }
        X = extract_features_from_dict(sample)
        self.assertEqual(X.shape, (1, len(FEATURE_NAMES)))

    def test_continuous_prediction_output(self):
        pred = predictor.predict_segment(
            road_id="TEST_SEG",
            road_type="highway",
            road_length=10.0,
            max_speed=100.0,
            weather="Clear",
            departure_time=datetime.datetime(2026, 9, 29, 8, 30) # Monday 8:30am rush
        )
        self.assertIn("predicted_speed_kmh", pred)
        self.assertIn("predicted_travel_time_min", pred)
        self.assertIn("traffic_level", pred)
        
        # Verify continuous numerical bounds
        self.assertGreater(pred["predicted_speed_kmh"], 10.0)
        self.assertLessEqual(pred["predicted_speed_kmh"], 100.0)
        # Travel time must be (10 km / speed) * 60
        expected_time = (10.0 / pred["predicted_speed_kmh"]) * 60.0
        self.assertAlmostEqual(pred["predicted_travel_time_min"], expected_time, places=1)

    def test_accident_speed_reduction(self):
        pred_normal = predictor.predict_segment(
            road_id="TEST_SEG",
            road_type="arterial",
            road_length=5.0,
            max_speed=60.0,
            has_accident=False
        )
        pred_accident = predictor.predict_segment(
            road_id="TEST_SEG",
            road_type="arterial",
            road_length=5.0,
            max_speed=60.0,
            has_accident=True
        )
        # Accident must drastically decrease speed and increase travel time
        self.assertLess(pred_accident["predicted_speed_kmh"], pred_normal["predicted_speed_kmh"])
        self.assertGreater(pred_accident["predicted_travel_time_min"], pred_normal["predicted_travel_time_min"])

if __name__ == "__main__":
    unittest.main()
