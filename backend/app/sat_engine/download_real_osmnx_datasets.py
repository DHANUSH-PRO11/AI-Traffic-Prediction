"""
download_real_osmnx_datasets.py
--------------------------------
Downloads real OpenStreetMap road networks and traffic infrastructure datasets
directly via the OSMnx Python library for Tamil Nadu hubs (Chennai, Coimbatore, Madurai, Salem, Trichy)
and saves clean, structured CSV & JSON datasets into the datasets/ folder.
"""

import os
import json
import time
from typing import Any
import pandas as pd
import geopandas as gpd
try:
    import osmnx as _ox
    ox: Any = _ox
except ImportError:
    ox = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASETS_DIR = os.path.join(BASE_DIR, "datasets")
OSMNX_DIR = os.path.join(DATASETS_DIR, "osmnx")

# Target cities for live OSMnx spatial data extraction
TARGET_CITIES = [
    "Chennai, Tamil Nadu, India",
    "Coimbatore, Tamil Nadu, India",
    "Madurai, Tamil Nadu, India",
    "Tiruchirappalli, Tamil Nadu, India",
    "Salem, Tamil Nadu, India",
]

# OSM Feature tags to query via OSMnx
FEATURE_TAGS: dict[str, Any] = {
    "traffic_signals": {"highway": "traffic_signals"},
    "fuel_stations":   {"amenity": "fuel"},
    "toll_booths":     {"barrier": "toll_booth"},
    "bus_stops":       {"highway": "bus_stop"},
    "hospitals":       {"amenity": "hospital"},
    "speed_cameras":   {"highway": "speed_camera"},
    "parking":         {"amenity": "parking"},
}


def setup_directories():
    os.makedirs(DATASETS_DIR, exist_ok=True)
    os.makedirs(OSMNX_DIR, exist_ok=True)


def download_osmnx_road_network():
    """
    Downloads real spatial road network graph via OSMnx for major cities,
    extracts node and edge GeoDataFrames, and saves them to CSV datasets.
    """
    if ox is None:
        print("[OSMnx] Library not installed. Skipping live OSMnx download.")
        return None, None

    print("\n[1/3] Downloading real OSMnx spatial road networks...")
    all_nodes = []
    all_edges = []

    for city_query in TARGET_CITIES:
        city_name = city_query.split(",")[0].strip()
        print(f" -> Downloading OSMnx road graph for '{city_name}'...")
        try:
            # Query OSMnx for drive network
            G = ox.graph_from_place(city_query, network_type="drive", simplify=True)
            nodes_gdf, edges_gdf = ox.graph_to_gdfs(G)

            # Process Nodes
            for node_id, row in nodes_gdf.iterrows():
                all_nodes.append({
                    "node_id": int(str(node_id)),
                    "city": city_name,
                    "lat": round(float(str(row.get("y", 0.0))), 6),
                    "lon": round(float(str(row.get("x", 0.0))), 6),
                    "street_count": int(str(row.get("street_count", 0))),
                })

            # Process Edges
            for edge_idx, row in edges_gdf.iterrows():
                u = edge_idx[0] if isinstance(edge_idx, (tuple, list)) else row.get("u", 0)
                v = edge_idx[1] if isinstance(edge_idx, (tuple, list)) and len(edge_idx) > 1 else row.get("v", 0)
                hw = row.get("highway", "unclassified")
                if isinstance(hw, list):
                    hw = hw[0]
                
                length_m = round(float(str(row.get("length", 0.0))), 2)
                maxspeed = row.get("maxspeed", "50")
                if isinstance(maxspeed, list):
                    maxspeed = maxspeed[0]

                all_edges.append({
                    "source_node": int(str(u)),
                    "target_node": int(str(v)),
                    "city": city_name,
                    "highway": str(hw),
                    "length_m": length_m,
                    "length_km": round(length_m / 1000.0, 3),
                    "maxspeed": str(maxspeed),
                    "oneway": bool(row.get("oneway", False)),
                    "lanes": str(row.get("lanes", "1")),
                })

            print(f"    [OK] '{city_name}': Extracted {len(nodes_gdf)} nodes & {len(edges_gdf)} edges from OSMnx.")
        except Exception as exc:
            print(f"    [!] Failed live fetch for '{city_name}': {exc}")

    # Save Nodes dataset
    if all_nodes:
        nodes_df = pd.DataFrame(all_nodes).drop_duplicates(subset=["node_id", "city"])
        nodes_csv_main = os.path.join(DATASETS_DIR, "osmnx_road_network_nodes.csv")
        nodes_csv_sub  = os.path.join(OSMNX_DIR, "road_nodes.csv")
        nodes_df.to_csv(nodes_csv_main, index=False)
        nodes_df.to_csv(nodes_csv_sub, index=False)
        print(f" -> Saved {len(nodes_df)} road network nodes to {nodes_csv_main}")

    # Save Edges dataset
    if all_edges:
        edges_df = pd.DataFrame(all_edges)
        edges_csv_main = os.path.join(DATASETS_DIR, "osmnx_road_network_edges.csv")
        edges_csv_sub  = os.path.join(OSMNX_DIR, "road_edges.csv")
        edges_df.to_csv(edges_csv_main, index=False)
        edges_df.to_csv(edges_csv_sub, index=False)
        print(f" -> Saved {len(edges_df)} road network edges to {edges_csv_main}")


def download_osmnx_features():
    """
    Downloads real spatial infrastructure elements (Traffic Signals, Fuel Stations, Tolls, Bus Stops, Speed Cameras, Hospitals, Parking)
    using OSMnx features_from_place API for target cities.
    """
    if ox is None:
        print("[OSMnx] Library not installed. Skipping live features download.")
        return []

    print("\n[2/3] Downloading real OSMnx traffic & spatial infrastructure features...")
    all_features = []
    categorized = {cat: [] for cat in FEATURE_TAGS.keys()}

    for city_query in TARGET_CITIES:
        city_name = city_query.split(",")[0].strip()
        print(f" -> Querying OSMnx features for '{city_name}'...")

        for feature_type, tags in FEATURE_TAGS.items():
            try:
                gdf = ox.features_from_place(city_query, tags=tags)
                count = 0
                if not gdf.empty:
                    for idx, row in gdf.iterrows():
                        geom = row.geometry
                        lat, lon = None, None
                        if hasattr(geom, "y") and hasattr(geom, "x"):
                            lat, lon = float(geom.y), float(geom.x)
                        elif hasattr(geom, "centroid"):
                            lat, lon = float(geom.centroid.y), float(geom.centroid.x)

                        if lat is not None and lon is not None:
                            name = str(row.get("name") or row.get("ref") or f"{feature_type.replace('_', ' ').title()} #{count+1}")
                            item = {
                                "feature_type": feature_type,
                                "name": name,
                                "city": city_name,
                                "lat": round(lat, 6),
                                "lon": round(lon, 6),
                                "osm_id": str(idx[1]) if isinstance(idx, tuple) and len(idx) > 1 else str(idx),
                            }
                            all_features.append(item)
                            categorized[feature_type].append(item)
                            count += 1
                if count > 0:
                    print(f"    - '{feature_type}' in {city_name}: {count} items found.")
            except Exception as exc:
                print(f"    - Could not fetch '{feature_type}' for {city_name}: {exc}")

    # Save aggregated spatial infrastructure dataset
    if all_features:
        features_df = pd.DataFrame(all_features).drop_duplicates(subset=["name", "lat", "lon"])
        infra_csv_main = os.path.join(DATASETS_DIR, "osmnx_traffic_infrastructure.csv")
        infra_csv_sub  = os.path.join(OSMNX_DIR, "all_infrastructure.csv")
        features_df.to_csv(infra_csv_main, index=False)
        features_df.to_csv(infra_csv_sub, index=False)
        print(f"\n -> Total aggregated OSMnx infrastructure entries saved: {len(features_df)} to {infra_csv_main}")

    # Save per-category files in datasets/osmnx/
    for cat, items in categorized.items():
        if items:
            cat_df = pd.DataFrame(items).drop_duplicates(subset=["name", "lat", "lon"])
            json_p = os.path.join(OSMNX_DIR, f"{cat}.json")
            csv_p  = os.path.join(OSMNX_DIR, f"{cat}.csv")
            cat_df.to_json(json_p, orient="records", indent=2)
            cat_df.to_csv(csv_p, index=False)
            print(f" -> Saved {len(cat_df)} '{cat}' records -> {csv_p}")


def build_metadata_summary():
    """
    Generates metadata statistics JSON file for datasets/osmnx/.
    """
    print("\n[3/3] Generating OSMnx metadata summary...")
    summary = {
        "dataset_name": "OSMnx Real OpenStreetMap Spatial Dataset",
        "region": "Tamil Nadu, India",
        "target_cities": [c.split(",")[0] for c in TARGET_CITIES],
        "generated_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "files": [],
        "counts": {}
    }

    if os.path.exists(OSMNX_DIR):
        for fname in sorted(os.listdir(OSMNX_DIR)):
            fpath = os.path.join(OSMNX_DIR, fname)
            fsize = os.path.getsize(fpath)
            summary["files"].append({
                "filename": fname,
                "size_kb": round(fsize / 1024.0, 2)
            })
            if fname.endswith(".csv"):
                try:
                    df = pd.read_csv(fpath)
                    summary["counts"][fname.replace(".csv", "")] = len(df)
                except Exception:
                    pass

    meta_path = os.path.join(OSMNX_DIR, "osmnx_metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f" -> Metadata saved to {meta_path}")


def main():
    print("=" * 70)
    print("  OSMnx LIBRARY LIVE DATASET DOWNLOADER (OPENSTREETMAP -> DATASETS/)")
    print("=" * 70)

    start_time = time.time()
    setup_directories()
    download_osmnx_road_network()
    download_osmnx_features()
    build_metadata_summary()

    elapsed = round(time.time() - start_time, 2)
    print("\n" + "=" * 70)
    print(f"[SUCCESS] LIVE OSMnx DATASET DOWNLOAD COMPLETED IN {elapsed}s!")
    print(f"Datasets written to: {DATASETS_DIR}")
    print("=" * 70)


if __name__ == "__main__":
    main()
