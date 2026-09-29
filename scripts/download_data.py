"""
Data generation & ingestion script.
Simulates a large-scale real-world road network inspired by the METR-LA / PEMS-BAY corridor,
generating road segments, nodes, geometry, weather, accidents, and realistic time-series traffic observations.
Uses Python standard libraries for maximum speed and zero binary dependency issues.
"""
import os
import csv
import json
import math
import random
import datetime

# Define road network nodes with realistic geographic coordinates (Los Angeles / Santa Monica / Century City / Downtown corridor)
NETWORK_NODES = {
    "NODE_SANTA_MONICA": {"name": "Santa Monica Pier", "lat": 34.0102, "lng": -118.4965},
    "NODE_WESTWOOD": {"name": "Westwood / UCLA", "lat": 34.0635, "lng": -118.4455},
    "NODE_CENTURY_CITY": {"name": "Century City Hub", "lat": 34.0558, "lng": -118.4135},
    "NODE_BEVERLY_HILLS": {"name": "Beverly Hills Junction", "lat": 34.0736, "lng": -118.4004},
    "NODE_HOLLYWOOD": {"name": "Hollywood Highland", "lat": 34.1016, "lng": -118.3415},
    "NODE_MID_WILSHIRE": {"name": "Mid-Wilshire Center", "lat": 34.0620, "lng": -118.3580},
    "NODE_CULVER_CITY": {"name": "Culver City Arts", "lat": 34.0259, "lng": -118.3965},
    "NODE_LAX_AIRPORT": {"name": "LAX Airport North", "lat": 33.9535, "lng": -118.4055},
    "NODE_INGLEWOOD": {"name": "Inglewood Arena", "lat": 33.9582, "lng": -118.3429},
    "NODE_USC_CAMPUS": {"name": "USC / Exposition Park", "lat": 34.0180, "lng": -118.2855},
    "NODE_DOWNTOWN_LA": {"name": "Downtown LA Grand", "lat": 34.0488, "lng": -118.2518},
    "NODE_CHINATOWN": {"name": "Chinatown North", "lat": 34.0630, "lng": -118.2370},
    "NODE_SILVER_LAKE": {"name": "Silver Lake Junction", "lat": 34.0865, "lng": -118.2702},
    "NODE_GLENDALE": {"name": "Glendale South", "lat": 34.1205, "lng": -118.2550},
    "NODE_PASADENA": {"name": "Pasadena Gateway", "lat": 34.1478, "lng": -118.1445},
    "NODE_EAST_LA": {"name": "East LA Interchange", "lat": 34.0325, "lng": -118.1750},
}

# Road segments definitions connecting nodes
SEGMENT_DEFINITIONS = [
    # Interstate 10 Freeway (Highway)
    {"road_id": "I10_SM_CC", "road_name": "I-10 E (Santa Monica to Century City)", "start": "NODE_SANTA_MONICA", "end": "NODE_CENTURY_CITY", "road_type": "highway", "max_speed": 105.0, "lanes": 4},
    {"road_id": "I10_CC_SM", "road_name": "I-10 W (Century City to Santa Monica)", "start": "NODE_CENTURY_CITY", "end": "NODE_SANTA_MONICA", "road_type": "highway", "max_speed": 105.0, "lanes": 4},
    {"road_id": "I10_CC_MW", "road_name": "I-10 E (Century City to Mid-Wilshire)", "start": "NODE_CENTURY_CITY", "end": "NODE_MID_WILSHIRE", "road_type": "highway", "max_speed": 105.0, "lanes": 4},
    {"road_id": "I10_MW_CC", "road_name": "I-10 W (Mid-Wilshire to Century City)", "start": "NODE_MID_WILSHIRE", "end": "NODE_CENTURY_CITY", "road_type": "highway", "max_speed": 105.0, "lanes": 4},
    {"road_id": "I10_MW_DTLA", "road_name": "I-10 E (Mid-Wilshire to Downtown LA)", "start": "NODE_MID_WILSHIRE", "end": "NODE_DOWNTOWN_LA", "road_type": "highway", "max_speed": 105.0, "lanes": 4},
    {"road_id": "I10_DTLA_MW", "road_name": "I-10 W (Downtown LA to Mid-Wilshire)", "start": "NODE_DOWNTOWN_LA", "end": "NODE_MID_WILSHIRE", "road_type": "highway", "max_speed": 105.0, "lanes": 4},
    
    # I-405 Freeway (Highway)
    {"road_id": "I405_LAX_CC", "road_name": "I-405 N (LAX to Culver City)", "start": "NODE_LAX_AIRPORT", "end": "NODE_CULVER_CITY", "road_type": "highway", "max_speed": 105.0, "lanes": 5},
    {"road_id": "I405_CC_LAX", "road_name": "I-405 S (Culver City to LAX)", "start": "NODE_CULVER_CITY", "end": "NODE_LAX_AIRPORT", "road_type": "highway", "max_speed": 105.0, "lanes": 5},
    {"road_id": "I405_CC_WW", "road_name": "I-405 N (Culver City to Westwood)", "start": "NODE_CULVER_CITY", "end": "NODE_WESTWOOD", "road_type": "highway", "max_speed": 105.0, "lanes": 5},
    {"road_id": "I405_WW_CC", "road_name": "I-405 S (Westwood to Culver City)", "start": "NODE_WESTWOOD", "end": "NODE_CULVER_CITY", "road_type": "highway", "max_speed": 105.0, "lanes": 5},
    
    # Santa Monica Blvd (Arterial)
    {"road_id": "SMB_SM_WW", "road_name": "Santa Monica Blvd (SM to Westwood)", "start": "NODE_SANTA_MONICA", "end": "NODE_WESTWOOD", "road_type": "arterial", "max_speed": 65.0, "lanes": 3},
    {"road_id": "SMB_WW_SM", "road_name": "Santa Monica Blvd (Westwood to SM)", "start": "NODE_WESTWOOD", "end": "NODE_SANTA_MONICA", "road_type": "arterial", "max_speed": 65.0, "lanes": 3},
    {"road_id": "SMB_WW_BH", "road_name": "Santa Monica Blvd (Westwood to Beverly Hills)", "start": "NODE_WESTWOOD", "end": "NODE_BEVERLY_HILLS", "road_type": "arterial", "max_speed": 65.0, "lanes": 3},
    {"road_id": "SMB_BH_WW", "road_name": "Santa Monica Blvd (Beverly Hills to Westwood)", "start": "NODE_BEVERLY_HILLS", "end": "NODE_WESTWOOD", "road_type": "arterial", "max_speed": 65.0, "lanes": 3},
    {"road_id": "SMB_BH_HW", "road_name": "Santa Monica Blvd (Beverly Hills to Hollywood)", "start": "NODE_BEVERLY_HILLS", "end": "NODE_HOLLYWOOD", "road_type": "arterial", "max_speed": 65.0, "lanes": 3},
    {"road_id": "SMB_HW_BH", "road_name": "Santa Monica Blvd (Hollywood to Beverly Hills)", "start": "NODE_HOLLYWOOD", "end": "NODE_BEVERLY_HILLS", "road_type": "arterial", "max_speed": 65.0, "lanes": 3},
    
    # Wilshire Blvd (Arterial)
    {"road_id": "WLS_WW_CC", "road_name": "Wilshire Blvd (Westwood to Century City)", "start": "NODE_WESTWOOD", "end": "NODE_CENTURY_CITY", "road_type": "arterial", "max_speed": 60.0, "lanes": 3},
    {"road_id": "WLS_CC_WW", "road_name": "Wilshire Blvd (Century City to Westwood)", "start": "NODE_CENTURY_CITY", "end": "NODE_WESTWOOD", "road_type": "arterial", "max_speed": 60.0, "lanes": 3},
    {"road_id": "WLS_CC_BH", "road_name": "Wilshire Blvd (Century City to Beverly Hills)", "start": "NODE_CENTURY_CITY", "end": "NODE_BEVERLY_HILLS", "road_type": "arterial", "max_speed": 60.0, "lanes": 3},
    {"road_id": "WLS_BH_CC", "road_name": "Wilshire Blvd (Beverly Hills to Century City)", "start": "NODE_BEVERLY_HILLS", "end": "NODE_CENTURY_CITY", "road_type": "arterial", "max_speed": 60.0, "lanes": 3},
    {"road_id": "WLS_BH_MW", "road_name": "Wilshire Blvd (Beverly Hills to Mid-Wilshire)", "start": "NODE_BEVERLY_HILLS", "end": "NODE_MID_WILSHIRE", "road_type": "arterial", "max_speed": 60.0, "lanes": 3},
    {"road_id": "WLS_MW_BH", "road_name": "Wilshire Blvd (Mid-Wilshire to Beverly Hills)", "start": "NODE_MID_WILSHIRE", "end": "NODE_BEVERLY_HILLS", "road_type": "arterial", "max_speed": 60.0, "lanes": 3},
    {"road_id": "WLS_MW_DTLA", "road_name": "Wilshire Blvd (Mid-Wilshire to Downtown LA)", "start": "NODE_MID_WILSHIRE", "end": "NODE_DOWNTOWN_LA", "road_type": "arterial", "max_speed": 60.0, "lanes": 3},
    {"road_id": "WLS_DTLA_MW", "road_name": "Wilshire Blvd (Downtown LA to Mid-Wilshire)", "start": "NODE_DOWNTOWN_LA", "end": "NODE_MID_WILSHIRE", "road_type": "arterial", "max_speed": 60.0, "lanes": 3},
    
    # Sunset Blvd (Arterial / Secondary)
    {"road_id": "SST_HW_SL", "road_name": "Sunset Blvd (Hollywood to Silver Lake)", "start": "NODE_HOLLYWOOD", "end": "NODE_SILVER_LAKE", "road_type": "arterial", "max_speed": 55.0, "lanes": 2},
    {"road_id": "SST_SL_HW", "road_name": "Sunset Blvd (Silver Lake to Hollywood)", "start": "NODE_SILVER_LAKE", "end": "NODE_HOLLYWOOD", "road_type": "arterial", "max_speed": 55.0, "lanes": 2},
    {"road_id": "SST_SL_DTLA", "road_name": "Sunset Blvd (Silver Lake to Downtown LA)", "start": "NODE_SILVER_LAKE", "end": "NODE_DOWNTOWN_LA", "road_type": "secondary", "max_speed": 50.0, "lanes": 2},
    {"road_id": "SST_DTLA_SL", "road_name": "Sunset Blvd (Downtown LA to Silver Lake)", "start": "NODE_DOWNTOWN_LA", "end": "NODE_SILVER_LAKE", "road_type": "secondary", "max_speed": 50.0, "lanes": 2},

    # US-101 / I-110 Corridor (Highway)
    {"road_id": "US101_HW_DTLA", "road_name": "US-101 S (Hollywood to Downtown LA)", "start": "NODE_HOLLYWOOD", "end": "NODE_DOWNTOWN_LA", "road_type": "highway", "max_speed": 100.0, "lanes": 4},
    {"road_id": "US101_DTLA_HW", "road_name": "US-101 N (Downtown LA to Hollywood)", "start": "NODE_DOWNTOWN_LA", "end": "NODE_HOLLYWOOD", "road_type": "highway", "max_speed": 100.0, "lanes": 4},
    {"road_id": "I110_DTLA_USC", "road_name": "I-110 S (Downtown LA to USC)", "start": "NODE_DOWNTOWN_LA", "end": "NODE_USC_CAMPUS", "road_type": "highway", "max_speed": 100.0, "lanes": 4},
    {"road_id": "I110_USC_DTLA", "road_name": "I-110 N (USC to Downtown LA)", "start": "NODE_USC_CAMPUS", "end": "NODE_DOWNTOWN_LA", "road_type": "highway", "max_speed": 100.0, "lanes": 4},
    
    # South Arterials connecting Airport / Inglewood / USC
    {"road_id": "EXP_CC_USC", "road_name": "Exposition Blvd (Culver City to USC)", "start": "NODE_CULVER_CITY", "end": "NODE_USC_CAMPUS", "road_type": "arterial", "max_speed": 60.0, "lanes": 2},
    {"road_id": "EXP_USC_CC", "road_name": "Exposition Blvd (USC to Culver City)", "start": "NODE_USC_CAMPUS", "end": "NODE_CULVER_CITY", "road_type": "arterial", "max_speed": 60.0, "lanes": 2},
    {"road_id": "CNV_LAX_ING", "road_name": "Century Blvd (LAX to Inglewood)", "start": "NODE_LAX_AIRPORT", "end": "NODE_INGLEWOOD", "road_type": "arterial", "max_speed": 60.0, "lanes": 3},
    {"road_id": "CNV_ING_LAX", "road_name": "Century Blvd (Inglewood to LAX)", "start": "NODE_INGLEWOOD", "end": "NODE_LAX_AIRPORT", "road_type": "arterial", "max_speed": 60.0, "lanes": 3},
    {"road_id": "FIG_ING_USC", "road_name": "Figueroa St (Inglewood to USC)", "start": "NODE_INGLEWOOD", "end": "NODE_USC_CAMPUS", "road_type": "secondary", "max_speed": 50.0, "lanes": 2},
    {"road_id": "FIG_USC_ING", "road_name": "Figueroa St (USC to Inglewood)", "start": "NODE_USC_CAMPUS", "end": "NODE_INGLEWOOD", "road_type": "secondary", "max_speed": 50.0, "lanes": 2},

    # North-East Connectors (Pasadena / Glendale / East LA)
    {"road_id": "SR2_GLN_SL", "road_name": "Glendale Fwy (Glendale to Silver Lake)", "start": "NODE_GLENDALE", "end": "NODE_SILVER_LAKE", "road_type": "highway", "max_speed": 95.0, "lanes": 3},
    {"road_id": "SR2_SL_GLN", "road_name": "Glendale Fwy (Silver Lake to Glendale)", "start": "NODE_SILVER_LAKE", "end": "NODE_GLENDALE", "road_type": "highway", "max_speed": 95.0, "lanes": 3},
    {"road_id": "SR110_PAS_DTLA", "road_name": "Arroyo Seco Pkwy (Pasadena to Downtown LA)", "start": "NODE_PASADENA", "end": "NODE_DOWNTOWN_LA", "road_type": "highway", "max_speed": 90.0, "lanes": 3},
    {"road_id": "SR110_DTLA_PAS", "road_name": "Arroyo Seco Pkwy (Downtown LA to Pasadena)", "start": "NODE_DOWNTOWN_LA", "end": "NODE_PASADENA", "road_type": "highway", "max_speed": 90.0, "lanes": 3},
    {"road_id": "I5_CN_DTLA", "road_name": "I-5 S (Chinatown to Downtown LA)", "start": "NODE_CHINATOWN", "end": "NODE_DOWNTOWN_LA", "road_type": "highway", "max_speed": 105.0, "lanes": 4},
    {"road_id": "I5_DTLA_CN", "road_name": "I-5 N (Downtown LA to Chinatown)", "start": "NODE_DOWNTOWN_LA", "end": "NODE_CHINATOWN", "road_type": "highway", "max_speed": 105.0, "lanes": 4},
    {"road_id": "I10_DTLA_ELA", "road_name": "I-10 E (Downtown LA to East LA)", "start": "NODE_DOWNTOWN_LA", "end": "NODE_EAST_LA", "road_type": "highway", "max_speed": 105.0, "lanes": 4},
    {"road_id": "I10_ELA_DTLA", "road_name": "I-10 W (East LA to Downtown LA)", "start": "NODE_EAST_LA", "end": "NODE_DOWNTOWN_LA", "road_type": "highway", "max_speed": 105.0, "lanes": 4},
    {"road_id": "RES_SL_CN", "road_name": "Reservoir St (Silver Lake to Chinatown)", "start": "NODE_SILVER_LAKE", "end": "NODE_CHINATOWN", "road_type": "residential", "max_speed": 40.0, "lanes": 1},
    {"road_id": "RES_CN_SL", "road_name": "Reservoir St (Chinatown to Silver Lake)", "start": "NODE_CHINATOWN", "end": "NODE_SILVER_LAKE", "road_type": "residential", "max_speed": 40.0, "lanes": 1},
]

def calculate_haversine(lat1, lon1, lat2, lon2):
    """Calculates geodesic distance between two points in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return float(R * c)

def create_intermediate_geometry(start_coord, end_coord, num_points=5):
    """Creates a smooth polyline between two coordinates [[lng, lat], ...]."""
    coords = []
    for i in range(num_points):
        frac = i / float(num_points - 1)
        lat = start_coord["lat"] + (end_coord["lat"] - start_coord["lat"]) * frac
        lng = start_coord["lng"] + (end_coord["lng"] - start_coord["lng"]) * frac
        # Add slight natural road curvature
        if 0 < i < num_points - 1:
            lat += math.sin(frac * math.pi) * 0.002
            lng += math.cos(frac * math.pi) * 0.002
        coords.append([round(lng, 5), round(lat, 5)])
    return coords

def generate_network_data():
    segments = []
    for s in SEGMENT_DEFINITIONS:
        start_node = NETWORK_NODES[s["start"]]
        end_node = NETWORK_NODES[s["end"]]
        dist_km = calculate_haversine(start_node["lat"], start_node["lng"], end_node["lat"], end_node["lng"])
        actual_length = round(dist_km * 1.15, 2)
        geom = create_intermediate_geometry(start_node, end_node)
        segments.append({
            "road_id": s["road_id"],
            "road_name": s["road_name"],
            "road_type": s["road_type"],
            "length": actual_length,
            "geometry": geom,
            "max_speed": s["max_speed"],
            "start_node": s["start"],
            "end_node": s["end"],
            "base_lanes": s["lanes"]
        })
    return segments

def generate_time_series_observations(segments, days=14):
    start_date = datetime.datetime.now() - datetime.timedelta(days=days)
    records = []
    weather_pool = ["Clear", "Clear", "Clear", "Overcast", "Rain", "Fog"]

    # Pre-calculate hour historical baselines
    for d in range(days * 24):
        current_time = start_date + datetime.timedelta(hours=d)
        hour = current_time.hour
        day_of_week = current_time.weekday()
        is_weekend = 1 if day_of_week in [5, 6] else 0
        month = current_time.month

        weather = random.choice(weather_pool)
        temp = 20.0 + 8.0 * math.sin((hour - 8) / 24.0 * 2 * math.pi) + random.uniform(-2, 2)
        rainfall = random.uniform(1.0, 7.5) if weather == "Rain" else 0.0

        for seg in segments:
            max_spd = seg["max_speed"]
            road_type = seg["road_type"]
            capacity = 4200 if road_type == "highway" else (2400 if road_type == "arterial" else 1200)

            if not is_weekend:
                morning_peak = math.exp(-((hour - 8.2) ** 2) / 2.2)
                evening_peak = math.exp(-((hour - 17.5) ** 2) / 3.0)
                congestion_factor = 0.85 * max(morning_peak, evening_peak)
            else:
                weekend_peak = math.exp(-((hour - 14.0) ** 2) / 5.0)
                congestion_factor = 0.55 * weekend_peak

            volume = (0.2 + 0.8 * congestion_factor) * capacity + random.uniform(-80, 80)
            volume = max(50.0, volume)

            speed_ratio = 1.0 - (0.65 * congestion_factor)
            if weather == "Rain":
                speed_ratio *= 0.82
            elif weather == "Fog":
                speed_ratio *= 0.88

            accident = 1 if random.random() < 0.015 else 0
            if accident:
                speed_ratio *= random.uniform(0.25, 0.45)
                volume *= 0.6

            speed_ratio += random.uniform(-0.04, 0.04)
            speed_ratio = max(0.15, min(1.0, speed_ratio))

            avg_speed = round(max_spd * speed_ratio, 1)
            travel_time_min = round((seg["length"] / avg_speed) * 60.0, 2)

            records.append({
                "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S"),
                "road_id": seg["road_id"],
                "road_name": seg["road_name"],
                "road_type": road_type,
                "road_length": seg["length"],
                "max_speed": max_spd,
                "hour": hour,
                "day_of_week": day_of_week,
                "month": month,
                "is_weekend": is_weekend,
                "is_holiday": 0,
                "temperature": round(temp, 1),
                "rainfall": round(rainfall, 1),
                "weather_condition": weather,
                "traffic_volume": round(volume, 0),
                "vehicle_count": int(volume * 0.9),
                "average_speed": avg_speed,
                "travel_time_min": travel_time_min,
                "accident": accident
            })

    return records

def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    raw_dir = os.path.join(base_dir, "ml", "data", "raw")
    os.makedirs(raw_dir, exist_ok=True)

    print("Generating road network topology and geometry...")
    segments = generate_network_data()

    with open(os.path.join(raw_dir, "road_segments.json"), "w") as f:
        json.dump(segments, f, indent=2)

    with open(os.path.join(raw_dir, "network_nodes.json"), "w") as f:
        json.dump(NETWORK_NODES, f, indent=2)

    print(f"Generated {len(segments)} road segments across {len(NETWORK_NODES)} nodes.")

    print("Generating 14-day time-series traffic observations...")
    records = generate_time_series_observations(segments, days=14)

    # Compute rolling/lag stats
    # Group by road_id
    road_groups = {}
    for r in records:
        road_groups.setdefault(r["road_id"], []).append(r)

    # Sort each group by timestamp and compute lag and historical mean
    enhanced_records = []
    for road_id, group in road_groups.items():
        group.sort(key=lambda x: x["timestamp"])
        hour_speed_sums = {}
        hour_speed_counts = {}
        hour_vol_sums = {}
        hour_vol_counts = {}
        
        for item in group:
            h = item["hour"]
            hour_speed_sums[h] = hour_speed_sums.get(h, 0.0) + item["average_speed"]
            hour_speed_counts[h] = hour_speed_counts.get(h, 0) + 1
            hour_vol_sums[h] = hour_vol_sums.get(h, 0.0) + item["traffic_volume"]
            hour_vol_counts[h] = hour_vol_counts.get(h, 0) + 1

        for idx, item in enumerate(group):
            prev_item = group[idx - 1] if idx > 0 else item
            item["previous_speed"] = prev_item["average_speed"]
            item["previous_volume"] = prev_item["traffic_volume"]
            h = item["hour"]
            item["historical_speed"] = round(hour_speed_sums[h] / hour_speed_counts[h], 1)
            item["historical_volume"] = round(hour_vol_sums[h] / hour_vol_counts[h], 0)
            enhanced_records.append(item)

    csv_path = os.path.join(raw_dir, "traffic_observations.csv")
    fieldnames = list(enhanced_records[0].keys())
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(enhanced_records)

    print(f"Saved {len(enhanced_records)} traffic observation records to {csv_path}.")

if __name__ == "__main__":
    main()
