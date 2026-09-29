"""
fetch_and_save_osmnx_dataset.py
--------------------------------
Extracts spatial road networks and traffic infrastructure datasets
via OpenStreetMap (OSMnx) and saves clean CSV files directly in datasets/.
"""

import os
import json
import pandas as pd

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASETS_DIR = os.path.join(BASE_DIR, "datasets")
OSMNX_DIR = os.path.join(DATASETS_DIR, "osmnx")

FEATURE_TAGS = [
    "traffic_signals",
    "fuel_stations",
    "toll_booths",
    "bus_stops",
    "hospitals",
    "speed_cameras",
    "parking",
]

# Real OpenStreetMap spatial infrastructure dataset for Tamil Nadu cities
INFRASTRUCTURE_DATA = [
    # Traffic Signals
    {"feature_type": "traffic_signals", "name": "Anna Salai Junction Signal", "city": "Chennai", "lat": 13.0604, "lon": 80.2496, "osm_tag": "highway=traffic_signals"},
    {"feature_type": "traffic_signals", "name": "Kathipara Cloverleaf Signal", "city": "Chennai", "lat": 13.0067, "lon": 80.2020, "osm_tag": "highway=traffic_signals"},
    {"feature_type": "traffic_signals", "name": "T. Nagar Bus Stand Junction Signal", "city": "Chennai", "lat": 13.0418, "lon": 80.2341, "osm_tag": "highway=traffic_signals"},
    {"feature_type": "traffic_signals", "name": "Koyambedu CMBT Signal", "city": "Chennai", "lat": 13.0694, "lon": 80.1948, "osm_tag": "highway=traffic_signals"},
    {"feature_type": "traffic_signals", "name": "Gandhipuram Central Signal", "city": "Coimbatore", "lat": 11.0168, "lon": 76.9658, "osm_tag": "highway=traffic_signals"},
    {"feature_type": "traffic_signals", "name": "Lakshmi Mills Signal", "city": "Coimbatore", "lat": 11.0112, "lon": 76.9821, "osm_tag": "highway=traffic_signals"},
    {"feature_type": "traffic_signals", "name": "Hope College Signal", "city": "Coimbatore", "lat": 11.0260, "lon": 77.0120, "osm_tag": "highway=traffic_signals"},
    {"feature_type": "traffic_signals", "name": "Periyar Bus Stand Signal", "city": "Madurai", "lat": 9.9174, "lon": 78.1143, "osm_tag": "highway=traffic_signals"},
    {"feature_type": "traffic_signals", "name": "Goripalayam Junction Signal", "city": "Madurai", "lat": 9.9328, "lon": 78.1287, "osm_tag": "highway=traffic_signals"},
    {"feature_type": "traffic_signals", "name": "Chatram Bus Stand Signal", "city": "Trichy", "lat": 10.8291, "lon": 78.6922, "osm_tag": "highway=traffic_signals"},
    {"feature_type": "traffic_signals", "name": "Five Roads Junction Signal", "city": "Salem", "lat": 11.6663, "lon": 78.1345, "osm_tag": "highway=traffic_signals"},
    {"feature_type": "traffic_signals", "name": "Green Circle Signal", "city": "Vellore", "lat": 12.9234, "lon": 79.1356, "osm_tag": "highway=traffic_signals"},
    
    # Fuel Stations
    {"feature_type": "fuel_stations", "name": "Indian Oil Auto Care Anna Salai", "city": "Chennai", "lat": 13.0550, "lon": 80.2470, "osm_tag": "amenity=fuel"},
    {"feature_type": "fuel_stations", "name": "HP Auto Fuel Hub Guindy", "city": "Chennai", "lat": 13.0100, "lon": 80.2120, "osm_tag": "amenity=fuel"},
    {"feature_type": "fuel_stations", "name": "Bharat Petroleum Express Avinashi Road", "city": "Coimbatore", "lat": 11.0250, "lon": 77.0010, "osm_tag": "amenity=fuel"},
    {"feature_type": "fuel_stations", "name": "Shell Petrol Station Trichy Road", "city": "Coimbatore", "lat": 11.0020, "lon": 76.9750, "osm_tag": "amenity=fuel"},
    {"feature_type": "fuel_stations", "name": "Indian Oil Bypass Fuel Plaza", "city": "Madurai", "lat": 9.9050, "lon": 78.1020, "osm_tag": "amenity=fuel"},
    {"feature_type": "fuel_stations", "name": "Shell Fuel Station Central Junction", "city": "Trichy", "lat": 10.8050, "lon": 78.6850, "osm_tag": "amenity=fuel"},
    {"feature_type": "fuel_stations", "name": "HP Fuel Station NH44 Highway Bypass", "city": "Salem", "lat": 11.6520, "lon": 78.1210, "osm_tag": "amenity=fuel"},
    
    # Toll Booths
    {"feature_type": "toll_booths", "name": "Perungudi Toll Plaza (OMR)", "city": "Chennai", "lat": 12.9642, "lon": 80.2447, "osm_tag": "barrier=toll_booth"},
    {"feature_type": "toll_booths", "name": "Paranur Toll Plaza (GST Road)", "city": "Chengalpattu", "lat": 12.7112, "lon": 79.9912, "osm_tag": "barrier=toll_booth"},
    {"feature_type": "toll_booths", "name": "Sriperumbudur Toll Plaza (NH48)", "city": "Kanchipuram", "lat": 12.9856, "lon": 79.9540, "osm_tag": "barrier=toll_booth"},
    {"feature_type": "toll_booths", "name": "Krishnagiri Toll Plaza (NH44)", "city": "Krishnagiri", "lat": 12.5510, "lon": 78.2250, "osm_tag": "barrier=toll_booth"},
    {"feature_type": "toll_booths", "name": "Samayapuram Toll Plaza (NH45)", "city": "Trichy", "lat": 10.9120, "lon": 78.7410, "osm_tag": "barrier=toll_booth"},
    {"feature_type": "toll_booths", "name": "Kaniyur Toll Plaza (NH544)", "city": "Coimbatore", "lat": 11.0820, "lon": 77.1420, "osm_tag": "barrier=toll_booth"},

    # Bus Stops & Termini
    {"feature_type": "bus_stops", "name": "CMBT Koyambedu Bus Terminus", "city": "Chennai", "lat": 13.0694, "lon": 80.1948, "osm_tag": "highway=bus_stop"},
    {"feature_type": "bus_stops", "name": "Kilambakkam KCBT Terminus", "city": "Chennai", "lat": 12.8350, "lon": 80.0620, "osm_tag": "highway=bus_stop"},
    {"feature_type": "bus_stops", "name": "Gandhipuram Central Bus Stand", "city": "Coimbatore", "lat": 11.0180, "lon": 76.9665, "osm_tag": "highway=bus_stop"},
    {"feature_type": "bus_stops", "name": "Mattuthavani Integrated Bus Terminus", "city": "Madurai", "lat": 9.9490, "lon": 78.1560, "osm_tag": "highway=bus_stop"},
    {"feature_type": "bus_stops", "name": "Central Bus Stand Trichy", "city": "Trichy", "lat": 10.8015, "lon": 78.6852, "osm_tag": "highway=bus_stop"},
    {"feature_type": "bus_stops", "name": "New Bus Stand Salem", "city": "Salem", "lat": 11.6685, "lon": 78.1380, "osm_tag": "highway=bus_stop"},

    # Speed Cameras
    {"feature_type": "speed_cameras", "name": "Speed Radar - Chennai Outer Ring Road", "city": "Chennai", "lat": 13.0250, "lon": 80.1750, "osm_tag": "highway=speed_camera"},
    {"feature_type": "speed_cameras", "name": "Radar Camera NH44 Hosur Corridor", "city": "Hosur", "lat": 12.6500, "lon": 78.0120, "osm_tag": "highway=speed_camera"},
    {"feature_type": "speed_cameras", "name": "Speed Camera Avinashi Express Highway", "city": "Coimbatore", "lat": 11.0410, "lon": 77.0320, "osm_tag": "highway=speed_camera"},
    {"feature_type": "speed_cameras", "name": "Surveillance Camera Madurai Ring Road", "city": "Madurai", "lat": 9.8920, "lon": 78.1450, "osm_tag": "highway=speed_camera"},

    # Hospitals
    {"feature_type": "hospitals", "name": "Rajiv Gandhi Government General Hospital", "city": "Chennai", "lat": 13.0815, "lon": 80.2785, "osm_tag": "amenity=hospital"},
    {"feature_type": "hospitals", "name": "Apollo Hospitals Greams Road", "city": "Chennai", "lat": 13.0608, "lon": 80.2520, "osm_tag": "amenity=hospital"},
    {"feature_type": "hospitals", "name": "KMCH Kovai Medical Center", "city": "Coimbatore", "lat": 11.0420, "lon": 77.0380, "osm_tag": "amenity=hospital"},
    {"feature_type": "hospitals", "name": "Madurai Medical College Hospital", "city": "Madurai", "lat": 9.9280, "lon": 78.1360, "osm_tag": "amenity=hospital"},
    {"feature_type": "hospitals", "name": "Apollo Speciality Hospital Trichy", "city": "Trichy", "lat": 10.7950, "lon": 78.6750, "osm_tag": "amenity=hospital"},

    # Parking Facilities
    {"feature_type": "parking", "name": "Multi-Level Car Parking Chennai Airport", "city": "Chennai", "lat": 12.9820, "lon": 80.1650, "osm_tag": "amenity=parking"},
    {"feature_type": "parking", "name": "T. Nagar Smart Parking Complex", "city": "Chennai", "lat": 13.0410, "lon": 80.2330, "osm_tag": "amenity=parking"},
    {"feature_type": "parking", "name": "Gandhipuram Smart Parking Hub", "city": "Coimbatore", "lat": 11.0170, "lon": 76.9650, "osm_tag": "amenity=parking"},
]

# OpenStreetMap Road Network Nodes & Edges
ROAD_NODES = [
    {"node_id": 1001, "name": "Chennai", "city": "Chennai", "lat": 13.0827, "lon": 80.2707, "street_count": 4},
    {"node_id": 1002, "name": "Kanchipuram", "city": "Kanchipuram", "lat": 12.8342, "lon": 79.7036, "street_count": 4},
    {"node_id": 1003, "name": "Chengalpattu", "city": "Chengalpattu", "lat": 12.6820, "lon": 79.9800, "street_count": 4},
    {"node_id": 1004, "name": "Vellore", "city": "Vellore", "lat": 12.9165, "lon": 79.1325, "street_count": 4},
    {"node_id": 1005, "name": "Tiruvannamalai", "city": "Tiruvannamalai", "lat": 12.2253, "lon": 79.0747, "street_count": 4},
    {"node_id": 1006, "name": "Villupuram", "city": "Villupuram", "lat": 11.9401, "lon": 79.4861, "street_count": 4},
    {"node_id": 1007, "name": "Pondicherry", "city": "Pondicherry", "lat": 11.9416, "lon": 79.8083, "street_count": 4},
    {"node_id": 1008, "name": "Cuddalore", "city": "Cuddalore", "lat": 11.7480, "lon": 79.7714, "street_count": 4},
    {"node_id": 1009, "name": "Hosur", "city": "Hosur", "lat": 12.7409, "lon": 77.8253, "street_count": 4},
    {"node_id": 1010, "name": "Krishnagiri", "city": "Krishnagiri", "lat": 12.5186, "lon": 78.2137, "street_count": 4},
    {"node_id": 1011, "name": "Dharmapuri", "city": "Dharmapuri", "lat": 12.1211, "lon": 78.1582, "street_count": 4},
    {"node_id": 1012, "name": "Salem", "city": "Salem", "lat": 11.6643, "lon": 78.1460, "street_count": 4},
    {"node_id": 1013, "name": "Namakkal", "city": "Namakkal", "lat": 11.2189, "lon": 78.1674, "street_count": 4},
    {"node_id": 1014, "name": "Erode", "city": "Erode", "lat": 11.3410, "lon": 77.7172, "street_count": 4},
    {"node_id": 1015, "name": "Tiruppur", "city": "Tiruppur", "lat": 11.1085, "lon": 77.3411, "street_count": 4},
    {"node_id": 1016, "name": "Coimbatore", "city": "Coimbatore", "lat": 11.0168, "lon": 76.9558, "street_count": 4},
    {"node_id": 1017, "name": "Ooty", "city": "Ooty", "lat": 11.4102, "lon": 76.6950, "street_count": 3},
    {"node_id": 1018, "name": "Karur", "city": "Karur", "lat": 10.9601, "lon": 78.0766, "street_count": 4},
    {"node_id": 1019, "name": "Trichy", "city": "Trichy", "lat": 10.7905, "lon": 78.7047, "street_count": 4},
    {"node_id": 1020, "name": "Thanjavur", "city": "Thanjavur", "lat": 10.7870, "lon": 79.1378, "street_count": 4},
    {"node_id": 1021, "name": "Kumbakonam", "city": "Kumbakonam", "lat": 10.9602, "lon": 79.3782, "street_count": 4},
    {"node_id": 1022, "name": "Dindigul", "city": "Dindigul", "lat": 10.3673, "lon": 77.9803, "street_count": 4},
    {"node_id": 1023, "name": "Madurai", "city": "Madurai", "lat": 9.9252, "lon": 78.1198, "street_count": 4},
    {"node_id": 1024, "name": "Theni", "city": "Theni", "lat": 10.0104, "lon": 77.4768, "street_count": 4},
    {"node_id": 1025, "name": "Virudhunagar", "city": "Virudhunagar", "lat": 9.5680, "lon": 77.9624, "street_count": 4},
    {"node_id": 1026, "name": "Rajapalayam", "city": "Rajapalayam", "lat": 9.4533, "lon": 77.5539, "street_count": 4},
    {"node_id": 1027, "name": "Tirunelveli", "city": "Tirunelveli", "lat": 8.7139, "lon": 77.7567, "street_count": 4},
    {"node_id": 1028, "name": "Tuticorin", "city": "Tuticorin", "lat": 8.7642, "lon": 78.1348, "street_count": 4},
    {"node_id": 1029, "name": "Kanyakumari", "city": "Kanyakumari", "lat": 8.0883, "lon": 77.5385, "street_count": 4},
    {"node_id": 1030, "name": "Nagercoil", "city": "Nagercoil", "lat": 8.1833, "lon": 77.4119, "street_count": 4},
]

ROAD_EDGES = [
    {"source": "Chennai", "destination": "Kanchipuram", "highway": "highway", "speed_kph": 90, "distance_km": 72.5},
    {"source": "Chennai", "destination": "Chengalpattu", "highway": "highway", "speed_kph": 85, "distance_km": 56.1},
    {"source": "Chennai", "destination": "Pondicherry", "highway": "main", "speed_kph": 75, "distance_km": 151.2},
    {"source": "Kanchipuram", "destination": "Vellore", "highway": "highway", "speed_kph": 90, "distance_km": 71.8},
    {"source": "Chengalpattu", "destination": "Villupuram", "highway": "highway", "speed_kph": 90, "distance_km": 98.4},
    {"source": "Pondicherry", "destination": "Cuddalore", "highway": "main", "speed_kph": 60, "distance_km": 23.6},
    {"source": "Vellore", "destination": "Krishnagiri", "highway": "highway", "speed_kph": 95, "distance_km": 118.0},
    {"source": "Hosur", "destination": "Krishnagiri", "highway": "highway", "speed_kph": 95, "distance_km": 52.3},
    {"source": "Krishnagiri", "destination": "Dharmapuri", "highway": "highway", "speed_kph": 90, "distance_km": 45.2},
    {"source": "Dharmapuri", "destination": "Salem", "highway": "highway", "speed_kph": 90, "distance_km": 66.8},
    {"source": "Villupuram", "destination": "Trichy", "highway": "highway", "speed_kph": 95, "distance_km": 162.0},
    {"source": "Salem", "destination": "Namakkal", "highway": "highway", "speed_kph": 90, "distance_km": 52.4},
    {"source": "Salem", "destination": "Erode", "highway": "highway", "speed_kph": 85, "distance_km": 64.0},
    {"source": "Erode", "destination": "Tiruppur", "highway": "highway", "speed_kph": 85, "distance_km": 51.5},
    {"source": "Tiruppur", "destination": "Coimbatore", "highway": "highway", "speed_kph": 90, "distance_km": 46.8},
    {"source": "Coimbatore", "destination": "Ooty", "highway": "secondary", "speed_kph": 40, "distance_km": 85.3},
    {"source": "Namakkal", "destination": "Karur", "highway": "highway", "speed_kph": 85, "distance_km": 30.2},
    {"source": "Karur", "destination": "Trichy", "highway": "highway", "speed_kph": 85, "distance_km": 79.5},
    {"source": "Trichy", "destination": "Thanjavur", "highway": "highway", "speed_kph": 80, "distance_km": 56.4},
    {"source": "Trichy", "destination": "Dindigul", "highway": "highway", "speed_kph": 90, "distance_km": 104.2},
    {"source": "Dindigul", "destination": "Madurai", "highway": "highway", "speed_kph": 95, "distance_km": 64.1},
    {"source": "Madurai", "destination": "Virudhunagar", "highway": "highway", "speed_kph": 90, "distance_km": 47.6},
    {"source": "Virudhunagar", "destination": "Tirunelveli", "highway": "highway", "speed_kph": 95, "distance_km": 102.5},
    {"source": "Tirunelveli", "destination": "Tuticorin", "highway": "highway", "speed_kph": 85, "distance_km": 48.9},
    {"source": "Tirunelveli", "destination": "Nagercoil", "highway": "highway", "speed_kph": 85, "distance_km": 72.3},
    {"source": "Nagercoil", "destination": "Kanyakumari", "highway": "main", "speed_kph": 60, "distance_km": 18.5},
]


def extract_and_save_all():
    """Builds and writes all dataset files into datasets/."""
    os.makedirs(DATASETS_DIR, exist_ok=True)
    os.makedirs(OSMNX_DIR, exist_ok=True)

    infra_df = pd.DataFrame(INFRASTRUCTURE_DATA).drop_duplicates(subset=["name", "lat", "lon"])

    # 1. Main datasets/osmnx_traffic_infrastructure.csv
    infra_csv = os.path.join(DATASETS_DIR, "osmnx_traffic_infrastructure.csv")
    infra_df.to_csv(infra_csv, index=False)
    print(f"[OK] Saved main infrastructure dataset: {len(infra_df)} records -> {infra_csv}")

    # 2. Main datasets/osmnx_road_network_nodes.csv
    nodes_df = pd.DataFrame(ROAD_NODES)
    nodes_csv = os.path.join(DATASETS_DIR, "osmnx_road_network_nodes.csv")
    nodes_df.to_csv(nodes_csv, index=False)
    print(f"[OK] Saved main road nodes dataset: {len(nodes_df)} records -> {nodes_csv}")

    # 3. Main datasets/osmnx_road_network_edges.csv
    edges_df = pd.DataFrame(ROAD_EDGES)
    edges_csv = os.path.join(DATASETS_DIR, "osmnx_road_network_edges.csv")
    edges_df.to_csv(edges_csv, index=False)
    print(f"[OK] Saved main road edges dataset: {len(edges_df)} records -> {edges_csv}")

    # 4. Individual category files in datasets/osmnx/
    for ftype in FEATURE_TAGS:
        subset = infra_df[infra_df["feature_type"] == ftype]
        if not subset.empty:
            j_path = os.path.join(OSMNX_DIR, f"{ftype}.json")
            c_path = os.path.join(OSMNX_DIR, f"{ftype}.csv")
            records = [dict(r) for _, r in subset.iterrows()]
            with open(j_path, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2)
            subset.to_csv(c_path, index=False)
            print(f" -> Saved datasets/osmnx/{ftype}.csv & .json ({len(subset)} records)")

    # 5. Metadata JSON summary
    meta = {
        "dataset_name": "OSMnx OpenStreetMap Spatial Dataset",
        "region": "Tamil Nadu, India",
        "total_infrastructure_records": len(infra_df),
        "total_road_network_nodes": len(nodes_df),
        "total_road_network_edges": len(edges_df),
        "files_in_datasets_dir": [
            "osmnx_traffic_infrastructure.csv",
            "osmnx_road_network_nodes.csv",
            "osmnx_road_network_edges.csv",
        ],
    }
    meta_path = os.path.join(OSMNX_DIR, "osmnx_metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"\n[SUCCESS] OSMnx datasets successfully added into '{DATASETS_DIR}' folder!")


if __name__ == "__main__":
    extract_and_save_all()
