"""
Model Evaluation & Diagnostic Script.
Runs comprehensive testing on the active Gradient Boosted Regressor.
Reports global metrics (MAE, RMSE, R2, MAPE) and slice diagnostics
(Peak vs Off-peak, Weather impact, and Highway vs Arterial reliability).
"""
import os
import sys
import csv
import json
import math
import numpy as np

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
for p in (BASE_DIR, BACKEND_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.app.ml.gbdt_model import GradientBoostedTrafficRegressor
    from backend.app.ml.feature_pipeline import FEATURE_NAMES, extract_features_from_records
except ImportError:
    from app.ml.gbdt_model import GradientBoostedTrafficRegressor  # type: ignore
    from app.ml.feature_pipeline import FEATURE_NAMES, extract_features_from_records  # type: ignore

def evaluate_active_model():
    models_dir = os.path.join(BASE_DIR, "ml", "models")
    model_json = os.path.join(models_dir, "traffic_model_v1.0.json")
    if not os.path.exists(model_json):
        print(f"Model file not found at {model_json}. Please run scripts/train_model.py first.")
        return

    print(f"Loading trained model from {model_json}...")
    model = GradientBoostedTrafficRegressor.load(model_json)

    # Load dataset
    data_csv = os.path.join(BASE_DIR, "ml", "data", "raw", "traffic_observations.csv")
    if not os.path.exists(data_csv):
        print(f"Dataset not found at {data_csv}.")
        return

    print("Loading evaluation records...")
    records = []
    with open(data_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(row)

    # Use out-of-time evaluation split (last 20%)
    split_idx = int(len(records) * 0.8)
    test_records = records[split_idx:]
    print(f"Evaluating across {len(test_records)} chronological holdout test samples...")

    X_test, y_test = extract_features_from_records(test_records)
    preds = model.predict(X_test)

    # Overall metrics
    overall_metrics = model.evaluate(X_test, y_test)

    # Segment slices for in-depth diagnostics
    # 1. Peak vs Off-Peak
    peak_indices = [
        i for i, r in enumerate(test_records)
        if (7.0 <= float(r.get("hour", r.get("hour_of_day", 12))) <= 9.5) or (16.5 <= float(r.get("hour", r.get("hour_of_day", 12))) <= 19.0)
    ]
    offpeak_indices = [
        i for i, r in enumerate(test_records)
        if i not in set(peak_indices)
    ]

    def slice_metrics(indices):
        if not indices:
            return {"MAE": 0.0, "RMSE": 0.0, "MAPE": 0.0, "count": 0}
        y_true_s = y_test[indices]
        y_pred_s = preds[indices]
        diff = y_true_s - y_pred_s
        mae = float(np.mean(np.abs(diff)))
        rmse = float(np.sqrt(np.mean(diff ** 2)))
        mape = float(np.mean(np.abs(diff) / np.maximum(y_true_s, 1.0)) * 100.0)
        return {
            "MAE": round(mae, 2),
            "RMSE": round(rmse, 2),
            "MAPE": round(mape, 2),
            "count": len(indices)
        }

    peak_metrics = slice_metrics(peak_indices)
    offpeak_metrics = slice_metrics(offpeak_indices)

    # 2. Highway vs Arterial
    hw_indices = [i for i, r in enumerate(test_records) if r.get("road_type") == "highway"]
    art_indices = [i for i, r in enumerate(test_records) if r.get("road_type") != "highway"]

    hw_metrics = slice_metrics(hw_indices)
    art_metrics = slice_metrics(art_indices)

    # 3. Weather impact (Rain vs Clear)
    rain_indices = [i for i, r in enumerate(test_records) if r.get("weather_condition", r.get("weather")) == "Rain"]
    clear_indices = [i for i, r in enumerate(test_records) if r.get("weather_condition", r.get("weather")) == "Clear"]

    rain_metrics = slice_metrics(rain_indices)
    clear_metrics = slice_metrics(clear_indices)

    report = {
        "model_version": "v1.0",
        "eval_samples": len(test_records),
        "overall": overall_metrics,
        "slices": {
            "rush_hour_peak": peak_metrics,
            "off_peak": offpeak_metrics,
            "highways": hw_metrics,
            "arterials": art_metrics,
            "rainy_conditions": rain_metrics,
            "clear_conditions": clear_metrics
        },
        "feature_importances": model.feature_importances_
    }

    report_path = os.path.join(models_dir, "evaluation_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n=======================================================")
    print("      AI TRAFFIC PREDICTOR - EVALUATION REPORT         ")
    print("=======================================================")
    print(f"Overall MAE:      {overall_metrics['MAE']} km/h")
    print(f"Overall RMSE:     {overall_metrics['RMSE']} km/h")
    print(f"Overall R²:       {overall_metrics['R2']}")
    print(f"Overall MAPE:     {overall_metrics['MAPE']}%")
    print("-------------------------------------------------------")
    print("Slice Diagnostics:")
    print(f"  • Rush Hour Peak:   MAE {peak_metrics['MAE']} km/h (n={peak_metrics['count']})")
    print(f"  • Off-Peak Flow:    MAE {offpeak_metrics['MAE']} km/h (n={offpeak_metrics['count']})")
    print(f"  • Highway Corridors: MAE {hw_metrics['MAE']} km/h (n={hw_metrics['count']})")
    print(f"  • Arterial Streets: MAE {art_metrics['MAE']} km/h (n={art_metrics['count']})")
    print(f"  • Adverse Weather:  MAE {rain_metrics['MAE']} km/h (n={rain_metrics['count']})")
    print("=======================================================")
    print(f"Evaluation report successfully written to: {report_path}\n")

if __name__ == "__main__":
    evaluate_active_model()
