"""
ML Training Pipeline Script.
Trains a Gradient Boosted Traffic Speed & Travel Time Regressor using time-aware splitting.
Evaluates on unseen future test set with MAE, RMSE, R2, and MAPE metrics, and saves model version.
"""
import os
import sys
import csv
import json
import datetime
import numpy as np

# Ensure backend and project root are on sys.path
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


def load_dataset(csv_path: str):
    records = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(row)
    return records

def main():
    raw_csv = os.path.join(BASE_DIR, "ml", "data", "raw", "traffic_observations.csv")
    if not os.path.exists(raw_csv):
        print("Raw dataset not found. Running scripts/download_data.py first...")
        import subprocess
        subprocess.run([sys.executable, os.path.join(BASE_DIR, "scripts", "download_data.py")], check=True)

    print(f"Loading traffic records from {raw_csv}...")
    records = load_dataset(raw_csv)
    print(f"Loaded {len(records)} records.")

    # Time-series aware split: preserve chronological order!
    split_idx = int(len(records) * 0.8)
    train_records = records[:split_idx]
    test_records = records[split_idx:]
    print(f"Time-aware split: {len(train_records)} training samples, {len(test_records)} evaluation samples.")

    X_train, y_train = extract_features_from_records(train_records)
    X_test, y_test = extract_features_from_records(test_records)

    print("Training Gradient Boosted Regressor on speed targets...")
    model = GradientBoostedTrafficRegressor(n_estimators=30, learning_rate=0.15, max_depth=4)
    model.fit(X_train, y_train, feature_names=FEATURE_NAMES)

    print("Evaluating model performance on unseen time-series test set...")
    metrics = model.evaluate(X_test, y_test)
    metrics["training_samples"] = len(train_records)
    metrics["evaluation_samples"] = len(test_records)

    print("\n--- MODEL EVALUATION REPORT ---")
    print(f"Model Architecture: Gradient Boosted Trees (GBDT Regressor)")
    print(f"Target:             Continuous Average Speed (km/h) & Travel Time (min)")
    print(f"MAE:                {metrics['MAE']} km/h")
    print(f"RMSE:               {metrics['RMSE']} km/h")
    print(f"R² Score:           {metrics['R2']}")
    print(f"MAPE:               {metrics['MAPE']}%")
    print("---------------------------------")
    print("\nTop 7 Feature Importances:")
    sorted_features = sorted(model.feature_importances_.items(), key=lambda x: x[1], reverse=True)
    for feat, imp in sorted_features[:7]:
        print(f"  {feat:<22}: {imp * 100:.1f}%")

    # Save model and metadata
    models_dir = os.path.join(BASE_DIR, "ml", "models")
    os.makedirs(models_dir, exist_ok=True)
    model_version = "v1.0"
    model_file = os.path.join(models_dir, f"traffic_model_{model_version}.json")
    model.save(model_file)
    print(f"\nTrained model weights saved to {model_file}")

    meta = {
        "model_name": "Gradient Boosted Regressor",
        "version": model_version,
        "training_dataset": "METR-LA Synthetic Corridor (14-day loop detectors)",
        "training_date": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "metrics": metrics,
        "feature_importances": model.feature_importances_,
        "model_path": model_file,
        "is_active": True
    }
    meta_file = os.path.join(models_dir, f"traffic_model_{model_version}_meta.json")
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    # Also save an active symlink / copy as active model
    active_meta = os.path.join(models_dir, "active_model_meta.json")
    with open(active_meta, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"Active model metadata registered at {active_meta}")

if __name__ == "__main__":
    main()
