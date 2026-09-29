"""
generate_osmnx_datasets.py
---------------------------
CLI tool to download and generate complete OSMnx spatial datasets for
Tamil Nadu, saving feature JSON/CSV files and network stats in datasets/osmnx/.
"""

import os
import json
import time
from osmnx_manager import (
    get_osmnx_features,
    get_osmnx_datasets_summary,
    ensure_datasets_dir,
    FEATURE_TAGS,
)
from config import OSMNX_DATASETS_DIR

def build_all_osmnx_datasets():
    print("=" * 65)
    print("      BUILDING OSMnx SPATIAL DATASETS (TAMIL NADU, INDIA)")
    print("=" * 65)

    ensure_datasets_dir()
    start_time = time.time()

    for feature_type in FEATURE_TAGS.keys():
        print(f"\n[+] Processing OSMnx dataset for: '{feature_type}'...")
        items = get_osmnx_features(place="Tamil Nadu, India", feature_type=feature_type)
        print(f"    -> Loaded {len(items)} {feature_type} entries into datasets/osmnx/{feature_type}.json & .csv")

    summary = get_osmnx_datasets_summary()
    meta_path = os.path.join(OSMNX_DATASETS_DIR, "osmnx_metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    elapsed = round(time.time() - start_time, 2)
    print("\n" + "=" * 65)
    print(f"[SUCCESS] ALL OSMnx DATASETS GENERATED SUCCESSFULLY IN {elapsed}s!")
    print(f"Total infrastructure entries: {summary['total_infrastructure_elements']}")
    print(f"Datasets saved in: {OSMNX_DATASETS_DIR}")
    print("=" * 65)

if __name__ == "__main__":
    build_all_osmnx_datasets()
