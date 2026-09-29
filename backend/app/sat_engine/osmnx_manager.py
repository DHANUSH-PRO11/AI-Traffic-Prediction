"""
osmnx_manager.py
----------------
Core manager for OpenStreetMap (OSMnx) datasets in Smart Traffic Finder.
Handles:
- Downloading and caching real spatial road network graphs (drive, bike, walk, all).
- Fetching & extracting spatial traffic infrastructure features (Traffic Signals, Speed Cameras, Toll Booths, Gas Stations, Bus Stops, Hospitals, Parking).
- Exporting datasets into CSV, JSON, and GraphML formats.
- Aggregating network statistics and infrastructure metrics.
"""

import os
import sys
_ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
if _ENGINE_DIR not in sys.path:
    sys.path.insert(0, _ENGINE_DIR)

import json
from typing import Any
import pandas as pd
import networkx as nx
try:
    from app.sat_engine.config import OSMNX_DATASETS_DIR, OSMNX_REGION, MODELS_DIR
except ImportError:
    from config import OSMNX_DATASETS_DIR, OSMNX_REGION, MODELS_DIR  # type: ignore
try:
    import osmnx as ox
    if ox is not None:
        ox.settings.use_cache = True
        ox.settings.log_console = False
except Exception:
    ox = None

# OSM Tags dictionary for feature extraction
FEATURE_TAGS = {
    "traffic_signals": {"highway": "traffic_signals"},
    "fuel_stations":   {"amenity": "fuel"},
    "toll_booths":     {"barrier": "toll_booth"},
    "speed_cameras":   {"highway": "speed_camera"},
    "bus_stops":       {"highway": "bus_stop"},
    "hospitals":       {"amenity": "hospital"},
    "parking":         {"amenity": "parking"},
}

# Pre-packaged dataset fallbacks for Tamil Nadu cities to guarantee offline functionality
FALLBACK_FEATURES = {
    "traffic_signals": [
        {"name": "Anna Salai Junction Signal", "city": "Chennai", "lat": 13.0604, "lon": 80.2496, "highway": "traffic_signals"},
        {"name": "Kathipara Junction Signal", "city": "Chennai", "lat": 13.0067, "lon": 80.2020, "highway": "traffic_signals"},
        {"name": "T. Nagar Bus Terminus Signal", "city": "Chennai", "lat": 13.0418, "lon": 80.2341, "highway": "traffic_signals"},
        {"name": "Gandhipuram Signal", "city": "Coimbatore", "lat": 11.0168, "lon": 76.9658, "highway": "traffic_signals"},
        {"name": "Lakshmi Mills Signal", "city": "Coimbatore", "lat": 11.0112, "lon": 76.9821, "highway": "traffic_signals"},
        {"name": "Periyar Bus Stand Signal", "city": "Madurai", "lat": 9.9174, "lon": 78.1143, "highway": "traffic_signals"},
        {"name": "Goripalayam Junction Signal", "city": "Madurai", "lat": 9.9328, "lon": 78.1287, "highway": "traffic_signals"},
        {"name": "Chatram Bus Stand Signal", "city": "Trichy", "lat": 10.8291, "lon": 78.6922, "highway": "traffic_signals"},
        {"name": "Five Roads Junction Signal", "city": "Salem", "lat": 11.6663, "lon": 78.1345, "highway": "traffic_signals"},
        {"name": "Green Circle Signal", "city": "Vellore", "lat": 12.9234, "lon": 79.1356, "highway": "traffic_signals"},
    ],
    "fuel_stations": [
        {"name": "Indian Oil Petrol Bunk Anna Salai", "city": "Chennai", "lat": 13.0550, "lon": 80.2470, "amenity": "fuel"},
        {"name": "HP Auto Care Guindy", "city": "Chennai", "lat": 13.0100, "lon": 80.2120, "amenity": "fuel"},
        {"name": "Bharat Petroleum Avinashi Road", "city": "Coimbatore", "lat": 11.0250, "lon": 77.0010, "amenity": "fuel"},
        {"name": "Indian Oil Bypass Fuel Hub", "city": "Madurai", "lat": 9.9050, "lon": 78.1020, "amenity": "fuel"},
        {"name": "Shell Petrol Station Junction", "city": "Trichy", "lat": 10.8050, "lon": 78.6850, "amenity": "fuel"},
        {"name": "HP Fuel Station NH44 Bypass", "city": "Salem", "lat": 11.6520, "lon": 78.1210, "amenity": "fuel"},
    ],
    "toll_booths": [
        {"name": "Perungudi Toll Plaza (OMR)", "city": "Chennai", "lat": 12.9642, "lon": 80.2447, "barrier": "toll_booth"},
        {"name": "Chengalpattu Paranur Toll Plaza", "city": "Chengalpattu", "lat": 12.7112, "lon": 79.9912, "barrier": "toll_booth"},
        {"name": "Sriperumbudur Toll Plaza (NH48)", "city": "Kanchipuram", "lat": 12.9856, "lon": 79.9540, "barrier": "toll_booth"},
        {"name": "Krishnagiri Toll Plaza (NH44)", "city": "Krishnagiri", "lat": 12.5510, "lon": 78.2250, "barrier": "toll_booth"},
        {"name": "Samayapuram Toll Plaza", "city": "Trichy", "lat": 10.9120, "lon": 78.7410, "barrier": "toll_booth"},
        {"name": "Kaniyur Toll Plaza (NH544)", "city": "Coimbatore", "lat": 11.0820, "lon": 77.1420, "barrier": "toll_booth"},
    ],
    "speed_cameras": [
        {"name": "Speed Enforcement Radar - Chennai Bypass", "city": "Chennai", "lat": 13.0250, "lon": 80.1750, "highway": "speed_camera"},
        {"name": "Radar Camera NH44 Hosur-Krishnagiri", "city": "Hosur", "lat": 12.6500, "lon": 78.0120, "highway": "speed_camera"},
        {"name": "Speed Camera Avinashi Express Corridor", "city": "Coimbatore", "lat": 11.0410, "lon": 77.0320, "highway": "speed_camera"},
        {"name": "Surveillance Camera Madurai Ring Road", "city": "Madurai", "lat": 9.8920, "lon": 78.1450, "highway": "speed_camera"},
    ],
    "bus_stops": [
        {"name": "CMBT Koyambedu Bus Terminus", "city": "Chennai", "lat": 13.0694, "lon": 80.1948, "highway": "bus_stop"},
        {"name": "Kilambakkam Bus Terminus (KCBT)", "city": "Chennai", "lat": 12.8350, "lon": 80.0620, "highway": "bus_stop"},
        {"name": "Gandhipuram Central Bus Stand", "city": "Coimbatore", "lat": 11.0180, "lon": 76.9665, "highway": "bus_stop"},
        {"name": "Mattuthavani Integrated Bus Terminus", "city": "Madurai", "lat": 9.9490, "lon": 78.1560, "highway": "bus_stop"},
        {"name": "Central Bus Stand Trichy", "city": "Trichy", "lat": 10.8015, "lon": 78.6852, "highway": "bus_stop"},
        {"name": "New Bus Stand Salem", "city": "Salem", "lat": 11.6685, "lon": 78.1380, "highway": "bus_stop"},
    ],
    "hospitals": [
        {"name": "Rajiv Gandhi Government General Hospital", "city": "Chennai", "lat": 13.0815, "lon": 80.2785, "amenity": "hospital"},
        {"name": "Apollo Hospitals Greams Road", "city": "Chennai", "lat": 13.0608, "lon": 80.2520, "amenity": "hospital"},
        {"name": "KMCH Kovai Medical Center", "city": "Coimbatore", "lat": 11.0420, "lon": 77.0380, "amenity": "hospital"},
        {"name": "Madurai Medical College & Hospital", "city": "Madurai", "lat": 9.9280, "lon": 78.1360, "amenity": "hospital"},
        {"name": "Apollo Speciality Hospital Trichy", "city": "Trichy", "lat": 10.7950, "lon": 78.6750, "amenity": "hospital"},
    ],
    "parking": [
        {"name": "Multi-Level Car Parking Chennai Airport", "city": "Chennai", "lat": 12.9820, "lon": 80.1650, "amenity": "parking"},
        {"name": "T. Nagar Multi-Level Parking", "city": "Chennai", "lat": 13.0410, "lon": 80.2330, "amenity": "parking"},
        {"name": "Gandhipuram Smart Parking Complex", "city": "Coimbatore", "lat": 11.0170, "lon": 76.9650, "amenity": "parking"},
    ]
}


def ensure_datasets_dir():
    """Ensure OSMnx datasets directory exists."""
    os.makedirs(OSMNX_DATASETS_DIR, exist_ok=True)


def get_osmnx_features(place: str = OSMNX_REGION, feature_type: str = "traffic_signals", fetch_live: bool = False) -> list[dict]:
    """
    Fetch spatial features from OpenStreetMap using OSMnx or local cached dataset.
    Supported types: traffic_signals, fuel_stations, toll_booths, speed_cameras, bus_stops, hospitals, parking
    """
    ensure_datasets_dir()
    feature_type = feature_type.lower().strip()
    json_path = os.path.join(OSMNX_DATASETS_DIR, f"{feature_type}.json")
    csv_path  = os.path.join(OSMNX_DATASETS_DIR, f"{feature_type}.csv")

    # 1. Return cached JSON/CSV dataset if exists
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    return data
        except Exception:
            pass

    if os.path.exists(csv_path):
        try:
            df = pd.read_csv(csv_path)
            if not df.empty:
                return df.to_dict(orient="records")
        except Exception:
            pass

    # Check root datasets/osmnx_traffic_infrastructure.csv
    root_infra_csv = os.path.join(os.path.dirname(OSMNX_DATASETS_DIR), "osmnx_traffic_infrastructure.csv")
    if os.path.exists(root_infra_csv):
        try:
            df = pd.read_csv(root_infra_csv)
            filtered = df[df["feature_type"] == feature_type]
            if not filtered.empty:
                return [dict(row) for _, row in filtered.iterrows()]
        except Exception:
            pass

    # 2. Try fetching from live OpenStreetMap Overpass via OSMnx if requested
    if fetch_live and ox is not None and hasattr(ox, "features_from_place"):
        tags: Any = FEATURE_TAGS.get(feature_type, {"highway": "traffic_signals"})
        try:
            print(f"[OSMnx] Querying OSM for '{feature_type}' in '{place}'...")
            gdf = ox.features_from_place(place, tags=tags)
            
            results = []
            if not gdf.empty:
                for idx, row in gdf.iterrows():
                    geom = row.geometry
                    lat, lon = None, None
                    if hasattr(geom, "y") and hasattr(geom, "x"):
                        lat, lon = float(geom.y), float(geom.x)
                    elif hasattr(geom, "centroid"):
                        lat, lon = float(geom.centroid.y), float(geom.centroid.x)

                    if lat is not None and lon is not None:
                        item = {
                            "name": str(row.get("name") or row.get("ref") or f"{feature_type.title()} #{len(results)+1}"),
                            "city": str(row.get("addr:city") or "Tamil Nadu"),
                            "lat": round(lat, 5),
                            "lon": round(lon, 5),
                            "type": feature_type,
                        }
                        results.append(item)

            if len(results) > 0:
                save_feature_dataset(feature_type, results)
                return results
        except Exception as exc:
            print(f"[OSMnx] Live OSM fetch for '{feature_type}' failed/timed out: {exc}. Using fallback dataset.")

    # 3. Fallback to high quality pre-packaged dataset
    fallback = FALLBACK_FEATURES.get(feature_type, FALLBACK_FEATURES["traffic_signals"])
    save_feature_dataset(feature_type, fallback)
    return fallback


def save_feature_dataset(feature_type: str, items: list[dict]):
    """Save dataset into JSON and CSV files inside datasets/osmnx/."""
    ensure_datasets_dir()
    json_path = os.path.join(OSMNX_DATASETS_DIR, f"{feature_type}.json")
    csv_path  = os.path.join(OSMNX_DATASETS_DIR, f"{feature_type}.csv")

    try:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(items, f, indent=2)

        df = pd.DataFrame(items)
        df.to_csv(csv_path, index=False)
        print(f"[OSMnx] Saved {len(items)} records to {json_path} & {csv_path}")
    except Exception as exc:
        print(f"[OSMnx] Error saving feature dataset '{feature_type}': {exc}")


def get_osmnx_graph(place: str = "Chennai, Tamil Nadu, India", network_type: str = "drive") -> nx.MultiDiGraph:
    """
    Download or load cached OSMnx MultiDiGraph spatial street network.
    Network types: drive, walk, bike, all
    """
    ensure_datasets_dir()
    safe_place = place.lower().replace(" ", "_").replace(",", "").replace("/", "_")
    filename = f"osmnx_{safe_place}_{network_type}.graphml"
    filepath = os.path.join(OSMNX_DATASETS_DIR, filename)

    if os.path.exists(filepath):
        print(f"[OSMnx] Loading cached spatial graph from {filepath}")
        try:
            return nx.read_graphml(filepath)
        except Exception:
            pass

    try:
        if ox is not None and hasattr(ox, "graph_from_place"):
            print(f"[OSMnx] Downloading live spatial road network graph for '{place}' (type={network_type})...")
            G = ox.graph_from_place(place, network_type=network_type)
            if hasattr(ox, "save_graphml"):
                ox.save_graphml(G, filepath)
            else:
                nx.write_graphml(G, filepath)
            print(f"[OSMnx] Successfully saved spatial graph -> {filepath}")
            return G
    except Exception as exc:
        print(f"[OSMnx] Live graph fetch failed: {exc}. Loading main road_graph cache.")

    try:
        from app.sat_engine.graph_loader import get_graph
    except ImportError:
        from graph_loader import get_graph  # type: ignore
    return get_graph()


def get_osmnx_datasets_summary() -> dict:
    """
    Returns summary metrics of all available OSMnx datasets, files, and OSM statistics.
    """
    ensure_datasets_dir()
    summary = {
        "status": "active",
        "region": OSMNX_REGION,
        "supported_features": list(FEATURE_TAGS.keys()),
        "datasets": {},
        "total_infrastructure_elements": 0,
        "files_count": 0,
    }

    total_count = 0
    file_list = os.listdir(OSMNX_DATASETS_DIR) if os.path.exists(OSMNX_DATASETS_DIR) else []
    summary["files_count"] = len(file_list)

    for feature_type in FEATURE_TAGS.keys():
        items = get_osmnx_features(feature_type=feature_type)
        count = len(items)
        total_count += count
        summary["datasets"][feature_type] = {
            "count": count,
            "sample": items[0] if items else None,
            "tag": FEATURE_TAGS[feature_type],
        }

    summary["total_infrastructure_elements"] = total_count

    # Check for road network nodes dataset count
    nodes_csv = os.path.join(os.path.dirname(OSMNX_DATASETS_DIR), "osmnx_road_network_nodes.csv")
    edges_csv = os.path.join(os.path.dirname(OSMNX_DATASETS_DIR), "osmnx_road_network_edges.csv")
    
    nodes_cnt, edges_cnt = 30, 66
    if os.path.exists(nodes_csv):
        try:
            nodes_cnt = len(pd.read_csv(nodes_csv))
        except Exception:
            pass
    if os.path.exists(edges_csv):
        try:
            edges_cnt = len(pd.read_csv(edges_csv))
        except Exception:
            pass

    summary["graph_stats"] = {
        "nodes_count": nodes_cnt,
        "edges_count": edges_cnt,
        "crs": "epsg:4326",
        "name": "Tamil Nadu OSMnx Road Network",
    }

    return summary
