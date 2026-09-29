import numpy as np
from typing import Dict, Any, List

ROAD_TYPES = ["highway", "arterial", "secondary", "residential"]
WEATHER_CONDITIONS = ["Clear", "Overcast", "Rain", "Fog", "Storm"]

FEATURE_NAMES = [
    "hour",
    "day_of_week",
    "month",
    "is_weekend",
    "is_holiday",
    "road_length",
    "max_speed",
    "temperature",
    "rainfall",
    "historical_speed",
    "historical_volume",
    "previous_speed",
    "previous_volume",
    "accident",
    # One-hot road types
    "road_type_highway",
    "road_type_arterial",
    "road_type_secondary",
    "road_type_residential",
    # One-hot weather
    "weather_Clear",
    "weather_Overcast",
    "weather_Rain",
    "weather_Fog",
    "weather_Storm"
]

def extract_features_from_dict(data: Dict[str, Any]) -> np.ndarray:
    """
    Transforms a single feature dictionary into a 1 x D numpy array.
    """
    hour = float(data.get("hour", 12))
    day_of_week = float(data.get("day_of_week", 0))
    month = float(data.get("month", 5))
    is_weekend = float(data.get("is_weekend", 1.0 if day_of_week in [5, 6] else 0.0))
    is_holiday = float(data.get("is_holiday", 0.0))
    road_length = float(data.get("road_length", 2.5))
    max_speed = float(data.get("max_speed", 60.0))
    temperature = float(data.get("temperature", 22.0))
    rainfall = float(data.get("rainfall", 0.0))
    historical_speed = float(data.get("historical_speed", max_speed * 0.75))
    historical_volume = float(data.get("historical_volume", 1500.0))
    previous_speed = float(data.get("previous_speed", historical_speed))
    previous_volume = float(data.get("previous_volume", historical_volume))
    accident = float(data.get("accident", 0.0))
    road_type = data.get("road_type", "arterial")
    weather = data.get("weather", data.get("weather_condition", "Clear"))

    features = [
        hour, day_of_week, month, is_weekend, is_holiday,
        road_length, max_speed, temperature, rainfall,
        historical_speed, historical_volume, previous_speed,
        previous_volume, accident
    ]

    for rt in ROAD_TYPES:
        features.append(1.0 if road_type == rt else 0.0)

    for w in WEATHER_CONDITIONS:
        features.append(1.0 if weather == w else 0.0)

    return np.array([features], dtype=float)

def extract_features_from_records(records: List[Dict[str, Any]]) -> TupleMatrix:
    """
    Converts a list of observation dictionaries into X (features matrix) and y (average_speed).
    """
    X_rows = []
    y_rows = []
    
    for r in records:
        hour = float(r.get("hour", 12))
        day_of_week = float(r.get("day_of_week", 0))
        month = float(r.get("month", 5))
        is_weekend = float(r.get("is_weekend", 1 if day_of_week in [5, 6] else 0))
        is_holiday = float(r.get("is_holiday", 0))
        road_length = float(r.get("road_length", 2.0))
        max_speed = float(r.get("max_speed", 60.0))
        temperature = float(r.get("temperature", 20.0))
        rainfall = float(r.get("rainfall", 0.0))
        historical_speed = float(r.get("historical_speed", max_speed * 0.75))
        historical_volume = float(r.get("historical_volume", 1200.0))
        previous_speed = float(r.get("previous_speed", historical_speed))
        previous_volume = float(r.get("previous_volume", historical_volume))
        accident = float(r.get("accident", 0))
        road_type = r.get("road_type", "arterial")
        weather = r.get("weather_condition", "Clear")

        row = [
            hour, day_of_week, month, is_weekend, is_holiday,
            road_length, max_speed, temperature, rainfall,
            historical_speed, historical_volume, previous_speed,
            previous_volume, accident
        ]

        for rt in ROAD_TYPES:
            row.append(1.0 if road_type == rt else 0.0)

        for w in WEATHER_CONDITIONS:
            row.append(1.0 if weather == w else 0.0)

        X_rows.append(row)
        y_rows.append(float(r["average_speed"]))

    return np.array(X_rows, dtype=float), np.array(y_rows, dtype=float)

TupleMatrix = Any
