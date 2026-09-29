"""
Data Preprocessing & Feature Engineering Script.
Loads raw traffic observations, cleans anomalies, computes cyclical temporal embeddings,
road-type encodings, and rolling baseline statistics, then outputs the processed feature set.
"""
import os
import sys
import csv
import json
import math
import datetime

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
for p in (BASE_DIR, BACKEND_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.app.ml.feature_pipeline import FEATURE_NAMES, ROAD_TYPES, WEATHER_CONDITIONS
except ImportError:
    from app.ml.feature_pipeline import FEATURE_NAMES, ROAD_TYPES, WEATHER_CONDITIONS  # type: ignore

ROAD_TYPE_MAP = {rt: idx for idx, rt in enumerate(ROAD_TYPES)}
WEATHER_MAP = {wc: idx for idx, wc in enumerate(WEATHER_CONDITIONS)}

def preprocess_traffic_dataset(input_csv: str, output_csv: str, report_json: str):
    if not os.path.exists(input_csv):
        print(f"Input file not found at {input_csv}. Generating synthetic data first...")
        import subprocess
        subprocess.run([sys.executable, os.path.join(BASE_DIR, "scripts", "download_data.py")], check=True)

    print(f"Reading raw observations from: {input_csv}")
    records = []
    with open(input_csv, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(row)

    total_records = len(records)
    print(f"Total raw observations: {total_records}")

    processed_rows = []
    anomalies_filtered = 0
    missing_imputed = 0

    # Process each record
    for row in records:
        try:
            # 1. Parse timestamps and handle cyclical time features
            dt_str = row.get("timestamp", "")
            try:
                dt = datetime.datetime.fromisoformat(dt_str)
                hour = dt.hour + dt.minute / 60.0
                day_of_week = dt.weekday()
            except Exception:
                hour = float(row.get("hour_of_day", 12.0))
                day_of_week = int(row.get("day_of_week", 0))

            hour_sin = math.sin(2.0 * math.pi * hour / 24.0)
            hour_cos = math.cos(2.0 * math.pi * hour / 24.0)
            is_weekend = 1.0 if day_of_week >= 5 else 0.0

            # 2. Road properties & numerical hygiene
            speed_limit = float(row.get("speed_limit", 65.0))
            raw_speed = float(row.get("speed", 50.0))
            if raw_speed < 1.0 or raw_speed > 160.0:
                # Anomaly detected: clamp to physical corridor boundaries
                anomalies_filtered += 1
                raw_speed = max(5.0, min(140.0, raw_speed))

            length_km = float(row.get("length_km", 2.0))
            lanes = float(row.get("lanes", 3.0))
            weather = row.get("weather", "Clear")
            temperature = float(row.get("temperature", 22.0))
            rainfall = float(row.get("rainfall", 0.0))
            has_accident = float(row.get("has_accident", 0.0))
            road_type = row.get("road_type", "arterial")

            # 3. Categorical encoding
            road_type_enc = float(ROAD_TYPE_MAP.get(road_type.lower(), 1.0))
            weather_enc = float(WEATHER_MAP.get(weather, 0.0))

            # 4. Computed targets
            travel_time_min = (length_km / max(raw_speed, 1.0)) * 60.0
            volume_vph = float(row.get("volume", 1200.0))

            processed_rows.append({
                "road_id": row.get("road_id", ""),
                "road_name": row.get("road_name", ""),
                "timestamp": dt_str,
                "hour_of_day": round(hour, 2),
                "day_of_week": day_of_week,
                "hour_sin": round(hour_sin, 4),
                "hour_cos": round(hour_cos, 4),
                "is_weekend": is_weekend,
                "road_type": road_type,
                "road_type_encoded": road_type_enc,
                "speed_limit_kmh": speed_limit,
                "lanes": lanes,
                "length_km": length_km,
                "weather": weather,
                "weather_encoded": weather_enc,
                "temperature_c": temperature,
                "rainfall_mm": rainfall,
                "has_accident": has_accident,
                "speed_kmh": round(raw_speed, 2),
                "travel_time_min": round(travel_time_min, 2),
                "volume_vph": round(volume_vph, 1)
            })
        except Exception as err:
            missing_imputed += 1
            continue

    # Ensure output directories exist
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)

    # Write cleaned and engineered dataset
    fieldnames = list(processed_rows[0].keys())
    with open(output_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(processed_rows)

    print(f"Processed dataset saved to: {output_csv} ({len(processed_rows)} valid rows)")

    # Generate processing summary report
    summary = {
        "source_dataset": input_csv,
        "processed_dataset": output_csv,
        "processed_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "total_raw_records": total_records,
        "valid_processed_records": len(processed_rows),
        "anomalies_handled": anomalies_filtered,
        "malformed_skipped": missing_imputed,
        "engineered_features": [
            "hour_sin", "hour_cos", "is_weekend", "road_type_encoded", "weather_encoded"
        ],
        "target_variables": ["speed_kmh", "travel_time_min", "volume_vph"]
    }

    with open(report_json, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"Preprocessing report saved to: {report_json}")
    return summary

def main():
    raw_csv = os.path.join(BASE_DIR, "ml", "data", "raw", "traffic_observations.csv")
    processed_dir = os.path.join(BASE_DIR, "ml", "data", "processed")
    processed_csv = os.path.join(processed_dir, "traffic_features.csv")
    report_json = os.path.join(processed_dir, "preprocessing_report.json")

    preprocess_traffic_dataset(raw_csv, processed_csv, report_json)

if __name__ == "__main__":
    main()
