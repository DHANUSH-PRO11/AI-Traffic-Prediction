"""
generate_real_dataset.py
------------------------
Generates a realistic, highly detailed Tamil Nadu traffic dataset
with 3,000 samples incorporating real city road types, rush hours,
monsoon weather impact, festival surges, vehicle density, and speed dynamics.
"""

import os
import random
import pandas as pd
import numpy as np

random.seed(42)
np.random.seed(42)

CITIES = [
    "Chennai", "Coimbatore", "Madurai", "Trichy", "Salem",
    "Tirunelveli", "Erode", "Vellore", "Thanjavur", "Tuticorin", "Ooty"
]

ROAD_TYPES = ["highway", "main", "secondary"]
ROAD_TYPE_ENC = {"highway": 2, "main": 1, "secondary": 0}

LABEL_MAP = {0: "Low", 1: "Medium", 2: "Heavy", 3: "Very Heavy"}


def generate_samples(n=3000):
    rows = []
    for i in range(n):
        city = random.choice(CITIES)
        road = random.choice(ROAD_TYPES)
        road_enc = ROAD_TYPE_ENC[road]

        # Hour distribution: peak morning (8-10), peak evening (17-20), night, daytime
        hour = random.choices(
            list(range(24)),
            weights=[2,1,1,1,1,2,4,7,10,9,7,6,6,6,6,7,9,11,10,8,6,4,3,2]
        )[0]

        day = random.randint(0, 6)
        is_weekend = 1 if day in [5, 6] else 0

        # Festival probability: ~12% overall, higher during holiday periods
        month = random.randint(1, 12)
        dom = random.randint(1, 28)
        is_festival = 1 if (month in [1, 10, 11] and dom in [14, 15, 16, 20, 21, 22]) or random.random() < 0.08 else 0

        # Weather parameters (Tamil Nadu tropical monsoon climate)
        # Monsoon months: Oct-Dec (NE monsoon) & Jun-Aug (SW monsoon)
        if month in [10, 11, 12]:
            rain_prob = 0.45
            temp_range = (23.0, 31.0)
        elif month in [5, 6]:
            rain_prob = 0.25
            temp_range = (30.0, 41.0)
        else:
            rain_prob = 0.15
            temp_range = (26.0, 36.0)

        if random.random() < rain_prob:
            rainfall = round(float(np.random.exponential(scale=12.0)), 1)
            rainfall = min(85.0, rainfall)
            humidity = random.randint(75, 98)
            weather_cond = "Rain" if rainfall > 5 else "Drizzle"
        else:
            rainfall = 0.0
            humidity = random.randint(45, 80)
            weather_cond = "Clear" if random.random() < 0.7 else "Clouds"

        temperature = round(random.uniform(*temp_range), 1)

        # Base vehicle count calculation
        base_vehicles = 120 if road == "highway" else (90 if road == "main" else 50)

        # Time multipliers
        if 8 <= hour <= 10 or 17 <= hour <= 20:
            time_mult = 2.4 if not is_weekend else 1.5
        elif 11 <= hour <= 16:
            time_mult = 1.4
        elif 21 <= hour <= 23:
            time_mult = 1.1
        else:
            time_mult = 0.4

        # City density factor
        city_factor = 1.4 if city in ["Chennai", "Coimbatore"] else (1.15 if city in ["Madurai", "Trichy", "Salem"] else 0.9)

        # Festival surge
        fest_mult = 1.6 if is_festival else 1.0

        # Weather slowdown / vehicle buildup
        weather_mult = 1.35 if rainfall > 15 else (1.15 if rainfall > 5 else 1.0)

        calculated_vehicles = int(base_vehicles * time_mult * city_factor * fest_mult * weather_mult)
        noise = random.randint(-25, 25)
        vehicle_count = max(15, calculated_vehicles + noise)

        # Calculate Congestion Index (0-100)
        capacity = 450 if road == "highway" else (300 if road == "main" else 180)
        congestion_index = min(100.0, round((vehicle_count / capacity) * 100.0 + (rainfall * 0.4) + (20 if is_festival else 0), 1))

        # Average speed (km/h) based on free flow speed and congestion
        free_speed = 80 if road == "highway" else (50 if road == "main" else 35)
        speed = max(8.0, round(free_speed * (1.0 - (congestion_index / 120.0)), 1))

        # Traffic Label Determination
        if congestion_index < 32 and vehicle_count < 120:
            label = 0  # Low
        elif congestion_index < 60 and vehicle_count < 220:
            label = 1  # Medium
        elif congestion_index < 82 or vehicle_count < 340:
            label = 2  # Heavy
        else:
            label = 3  # Very Heavy

        rows.append({
            "hour": hour,
            "day": day,
            "is_weekend": is_weekend,
            "city": city,
            "road_type": road,
            "road_type_enc": road_enc,
            "festival": is_festival,
            "weather_condition": weather_cond,
            "rainfall": rainfall,
            "temperature": temperature,
            "humidity": humidity,
            "vehicle_count": vehicle_count,
            "average_speed_kmh": speed,
            "congestion_index": congestion_index,
            "label": label,
            "traffic_level": LABEL_MAP[label]
        })

    df = pd.DataFrame(rows)
    output_path = os.path.join(os.path.dirname(__file__), "datasets", "real_traffic_dataset.csv")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"[Dataset] Generated {len(df)} records -> {output_path}")
    print("\n[Traffic Level Distribution]:")
    print(df["traffic_level"].value_counts())
    return df


if __name__ == "__main__":
    generate_samples(3000)
