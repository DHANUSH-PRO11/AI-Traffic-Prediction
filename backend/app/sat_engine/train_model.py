"""
train_model.py
--------------
Trains a Random Forest classifier using datasets/real_traffic_dataset.csv
and saves the trained model to models/traffic_model.pkl along with
model metadata and classification metrics.

Features : hour, day, festival, rainfall, temperature, road_type, vehicle_count
Labels   : 0=Low  1=Medium  2=Heavy  3=Very Heavy
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

from config import DATASETS_DIR, MODEL_PATH, MODELS_DIR

REAL_DATASET_CSV = os.path.join(DATASETS_DIR, "real_traffic_dataset.csv")
METADATA_PATH = os.path.join(MODELS_DIR, "model_metadata.json")

LABEL_MAP = {0: "Low", 1: "Medium", 2: "Heavy", 3: "Very Heavy"}
FEATURE_NAMES = [
    "hour", "day", "festival", "rainfall", "temperature",
    "road_type", "vehicle_count"
]


def load_dataset() -> pd.DataFrame:
    """Load the dataset, generating it first if missing."""
    if not os.path.exists(REAL_DATASET_CSV):
        print("[Train] Dataset missing. Generating real dataset...")
        from generate_real_dataset import generate_samples
        return generate_samples(3000)
    
    print(f"[Train] Loading dataset from {REAL_DATASET_CSV}...")
    return pd.read_csv(REAL_DATASET_CSV)


def train():
    df = load_dataset()

    # Ensure road_type is encoded integer
    if "road_type_enc" in df.columns:
        df["road_type"] = df["road_type_enc"]
    elif df["road_type"].dtype == object:
        enc = {"highway": 2, "main": 1, "secondary": 0}
        df["road_type"] = df["road_type"].map(lambda x: enc.get(str(x).lower(), 1))

    X = df[FEATURE_NAMES]
    y = df["label"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    print(f"[Train] Training Random Forest on {len(X_train)} samples...")
    model = RandomForestClassifier(
        n_estimators=150,
        max_depth=14,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    accuracy = accuracy_score(y_test, preds)
    target_names = [LABEL_MAP[i] for i in sorted(y.unique())]
    
    report_dict = classification_report(y_test, preds, target_names=target_names, output_dict=True)
    report_text = classification_report(y_test, preds, target_names=target_names, zero_division="warn")
    print("\n--- Model Evaluation ---")
    print(report_text)
    print(f"Overall Accuracy: {accuracy * 100:.2f}%\n")

    # Feature Importance
    importances = dict(zip(FEATURE_NAMES, [round(float(v), 4) for v in model.feature_importances_]))
    print("[Feature Importances]:", importances)

    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"[Train] Model saved -> {MODEL_PATH}")

    # Metadata for analytics API
    metadata = {
        "accuracy": round(float(accuracy), 4),
        "total_samples": len(df),
        "feature_importances": importances,
        "class_distribution": df["traffic_level"].value_counts().to_dict(),
        "feature_names": FEATURE_NAMES,
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"[Train] Metadata saved -> {METADATA_PATH}")

    return model, metadata


if __name__ == "__main__":
    train()
