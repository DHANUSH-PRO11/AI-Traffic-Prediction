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
import sys
_ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
if _ENGINE_DIR not in sys.path:
    sys.path.insert(0, _ENGINE_DIR)

import json
import joblib
import pandas as pd
import numpy as np

from config import DATASETS_DIR, MODEL_PATH, MODELS_DIR
from rf_classifier import PureRandomForestClassifier

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


def stratified_split(df: pd.DataFrame, test_ratio: float = 0.2, random_state: int = 42):
    """Clean stratified train-test split without external C-extensions."""
    rng = np.random.default_rng(random_state)
    train_indices = []
    test_indices = []

    for label_val, group in df.groupby("label"):
        idx = group.index.to_numpy().copy()
        rng.shuffle(idx)
        n_test = max(1, int(len(idx) * test_ratio))
        test_indices.extend(idx[:n_test])
        train_indices.extend(idx[n_test:])

    return df.loc[train_indices], df.loc[test_indices]


def train():
    df = load_dataset()

    # Ensure road_type is encoded integer
    if "road_type_enc" in df.columns:
        df["road_type"] = df["road_type_enc"]
    elif df["road_type"].dtype == object:
        enc = {"highway": 2, "main": 1, "secondary": 0}
        df["road_type"] = df["road_type"].map(lambda x: enc.get(str(x).lower(), 1))

    train_df, test_df = stratified_split(df, test_ratio=0.2, random_state=42)

    X_train = train_df[FEATURE_NAMES]
    y_train = train_df["label"]
    X_test = test_df[FEATURE_NAMES]
    y_test = test_df["label"]

    print(f"[Train] Training Random Forest on {len(X_train)} samples across {len(FEATURE_NAMES)} features...")
    model = PureRandomForestClassifier(
        n_estimators=35,
        max_depth=12,
        min_samples_split=4,
        random_state=42,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    accuracy = float(np.mean(preds == y_test.to_numpy()))

    # Build classification metrics summary
    print("\n--- Model Evaluation ---")
    print(f"Overall Accuracy on Unseen Test Set: {accuracy * 100:.2f}%\n")
    for cls_idx in sorted(LABEL_MAP.keys()):
        cls_name = LABEL_MAP[cls_idx]
        mask_true = (y_test.to_numpy() == cls_idx)
        mask_pred = (preds == cls_idx)
        tp = np.sum(mask_true & mask_pred)
        fp = np.sum((~mask_true) & mask_pred)
        fn = np.sum(mask_true & (~mask_pred))
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        print(f"  {cls_name:<12} | Precision: {precision:.3f} | Recall: {recall:.3f} | F1: {f1:.3f} | Support: {np.sum(mask_true)}")

    # Feature Importance
    raw_importances = model.feature_importances_
    importances = {feat: round(float(imp), 4) for feat, imp in zip(FEATURE_NAMES, raw_importances)}
    print("\n[Feature Importances]:", importances)

    os.makedirs(MODELS_DIR, exist_ok=True)
    model.save(MODEL_PATH)
    print(f"[Train] Real ML Model saved -> {MODEL_PATH}")

    # Metadata for analytics API
    metadata = {
        "accuracy": round(float(accuracy), 4),
        "total_samples": len(df),
        "feature_importances": importances,
        "class_distribution": df["traffic_level"].value_counts().to_dict(),
        "feature_names": FEATURE_NAMES,
    }
    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"[Train] Metadata saved -> {METADATA_PATH}")

    return model, metadata


if __name__ == "__main__":
    train()
