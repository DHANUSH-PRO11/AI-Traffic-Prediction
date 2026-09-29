"""
weather.py
----------
Provides weather conditions from the local real traffic dataset.
"""

import os
import sys
_ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
if _ENGINE_DIR not in sys.path:
    sys.path.insert(0, _ENGINE_DIR)

import pandas as pd
try:
    from app.sat_engine.config import DATASETS_DIR
except ImportError:
    from config import DATASETS_DIR  # type: ignore

_DATASET_PATH = os.path.join(DATASETS_DIR, "real_traffic_dataset.csv")
_weather_dataset = None


def get_weather(lat: float, lon: float) -> dict:
    """
    Return a weather profile for the given location using Open-Meteo live API,
    or dataset/default fallback.
    """
    try:
        import requests
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code"
        res = requests.get(url, timeout=3)
        if res.status_code == 200:
            data = res.json().get("current", {})
            temp = float(data.get("temperature_2m", 30.0))
            rain = float(data.get("precipitation", 0.0))
            hum = int(data.get("relative_humidity_2m", 60))
            wcode = int(data.get("weather_code", 0))
            cond = "Rain" if (rain > 0 or wcode in [51, 53, 55, 61, 63, 65, 80, 81, 82]) else ("Cloudy" if wcode in [1, 2, 3] else "Clear")
            return {
                "temperature": round(temp, 1),
                "rainfall": round(rain, 2),
                "humidity": hum,
                "condition": cond,
                "description": f"{cond} skies ({round(temp, 1)}°C)",
            }
    except Exception:
        pass

    try:
        global _weather_dataset
        if _weather_dataset is None and os.path.exists(_DATASET_PATH):
            _weather_dataset = pd.read_csv(_DATASET_PATH)

        if _weather_dataset is not None:
            now = pd.Timestamp.now()
            matches = _weather_dataset[
                (_weather_dataset["hour"] == now.hour)
                & (_weather_dataset["day"] == now.weekday())
            ]
            if matches.empty:
                matches = _weather_dataset[_weather_dataset["hour"] == now.hour]
            if matches.empty:
                matches = _weather_dataset

            temp_val = float(str(matches["temperature"].mean())) if "temperature" in matches else 32.0
            rain_val = float(str(matches["rainfall"].mean())) if "rainfall" in matches else 0.0
            hum_val = float(str(matches["humidity"].mean())) if "humidity" in matches else 60.0
            cond_val = "Clear"
            if "weather_condition" in matches and not matches.empty:
                cond_val = str(list(matches["weather_condition"])[0])

            return {
                "temperature": round(temp_val, 1),
                "rainfall":    round(rain_val, 2),
                "humidity":    round(hum_val),
                "condition":   cond_val,
                "description": "dataset-derived conditions",
            }
    except Exception:
        pass

    return _default_weather()


def _default_weather() -> dict:
    """Safe defaults used when the API key is missing or the call fails."""
    return {
        "temperature": 32.0,
        "rainfall":    0.0,
        "humidity":    60,
        "condition":   "Clear",
        "description": "clear sky",
    }
