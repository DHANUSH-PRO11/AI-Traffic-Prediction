import os
import sys
import json
import datetime
from typing import Dict, Any, List, Optional
from app.routing.graph import RoadNetworkGraph
from app.routing.algorithms import astar_shortest_path, dijkstra_shortest_path, find_primary_and_alternative_routes
from app.ml.predictor import predictor
from app.core.config import settings

class TrafficService:
    def __init__(self):
        self.graph = RoadNetworkGraph()
        self.nodes_dict: Dict[str, Dict[str, Any]] = {}
        self.segments_dict: Dict[str, Dict[str, Any]] = {}
        self.active_incidents: Dict[str, Dict[str, Any]] = {}
        self.current_weather = {
            "condition": "Clear",
            "temperature": 23.5,
            "rainfall": 0.0,
            "humidity": 45.0,
            "wind_speed": 12.0,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        self.load_network_graph()
        self.update_all_predictions()

    def load_network_graph(self):
        # 1. Prefer real Tamil Nadu dataset from sat_engine
        sat_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../sat_engine"))
        sat_nodes_file = os.path.join(sat_dir, "datasets", "osmnx_road_network_nodes.csv")
        sat_edges_file = os.path.join(sat_dir, "datasets", "osmnx_road_network_edges.csv")

        if os.path.exists(sat_nodes_file) and os.path.exists(sat_edges_file):
            import pandas as pd
            df_nodes = pd.read_csv(sat_nodes_file)
            df_edges = pd.read_csv(sat_edges_file)

            for _, row in df_nodes.iterrows():
                city = str(row["name"]).strip()
                node_id = f"NODE_{city.upper()}"
                lat_f = float(str(row["lat"]))
                lng_f = float(str(row["lon"]))
                node_obj = {
                    "node_id": node_id,
                    "name": city,
                    "lat": lat_f,
                    "lng": lng_f
                }
                self.nodes_dict[node_id] = node_obj
                self.nodes_dict[city] = node_obj
                self.nodes_dict[str(row["node_id"])] = node_obj
                self.graph.add_node(node_id, city, lat_f, lng_f)

            for idx, row in df_edges.iterrows():
                src = str(row["source"]).strip()
                dst = str(row["destination"]).strip()
                src_id = f"NODE_{src.upper()}"
                dst_id = f"NODE_{dst.upper()}"
                road_id = f"ROAD_TN_{int(str(idx))+1}"
                dist_km = float(str(row.get("distance_km", 50.0)))
                speed_kph = float(str(row.get("speed_kph", 80.0)))
                road_type = str(row.get("highway", "highway"))
                
                src_match = df_nodes[df_nodes["name"] == src]
                dst_match = df_nodes[df_nodes["name"] == dst]
                src_lat = float(str(src_match.iloc[0]["lat"])) if not src_match.empty else 13.0
                src_lon = float(str(src_match.iloc[0]["lon"])) if not src_match.empty else 80.0
                dst_lat = float(str(dst_match.iloc[0]["lat"])) if not dst_match.empty else 11.0
                dst_lon = float(str(dst_match.iloc[0]["lon"])) if not dst_match.empty else 77.0

                seg_obj = {
                    "road_id": road_id,
                    "road_name": f"{src} - {dst} Highway",
                    "road_type": road_type,
                    "start_node": src_id,
                    "end_node": dst_id,
                    "length": dist_km,
                    "max_speed": speed_kph,
                    "geometry": [[src_lon, src_lat], [dst_lon, dst_lat]],
                    "base_lanes": 4 if road_type == "highway" else 2
                }
                self.segments_dict[road_id] = seg_obj
                self.graph.add_edge(
                    road_id=road_id,
                    road_name=seg_obj["road_name"],
                    start_node=src_id,
                    end_node=dst_id,
                    road_type=road_type,
                    length=dist_km,
                    max_speed=speed_kph,
                    geometry=seg_obj["geometry"],
                    base_lanes=seg_obj["base_lanes"]
                )
            print(f"[TrafficService] Loaded {len(df_nodes)} Tamil Nadu hubs and {len(df_edges)} corridors from sat datasets.")
            return

        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ml/data/raw"))
        nodes_file = os.path.join(base_dir, "network_nodes.json")
        segments_file = os.path.join(base_dir, "road_segments.json")

        if os.path.exists(nodes_file) and os.path.exists(segments_file):
            with open(nodes_file, "r", encoding="utf-8") as f:
                self.nodes_dict = json.load(f)
            with open(segments_file, "r", encoding="utf-8") as f:
                segments_list = json.load(f)

            for nid, n in self.nodes_dict.items():
                self.graph.add_node(nid, n["name"], n["lat"], n["lng"])

            for s in segments_list:
                self.segments_dict[s["road_id"]] = s
                self.graph.add_edge(
                    road_id=s["road_id"],
                    road_name=s["road_name"],
                    start_node=s["start_node"],
                    end_node=s["end_node"],
                    road_type=s["road_type"],
                    length=s["length"],
                    max_speed=s["max_speed"],
                    geometry=s["geometry"],
                    base_lanes=s.get("base_lanes", 2)
                )
            print(f"[TrafficService] Loaded {len(self.nodes_dict)} nodes and {len(self.segments_dict)} segments into graph.")
        else:
            print("[TrafficService] Network topology files not found in raw data directory.")

    def update_all_predictions(self, departure_time: Optional[datetime.datetime] = None):
        """
        Runs ML prediction across all road segments in the network and updates graph edge weights.
        """
        dep_time = departure_time or datetime.datetime.now(datetime.timezone.utc)
        for road_id, seg in self.segments_dict.items():
            incident = self.active_incidents.get(road_id)
            has_incident = incident is not None
            incident_desc = incident["description"] if incident else None
            incident_sev = incident["severity"] if incident else None

            pred = predictor.predict_segment(
                road_id=road_id,
                road_type=seg["road_type"],
                road_length=seg["length"],
                max_speed=seg["max_speed"],
                departure_time=dep_time,
                weather=self.current_weather["condition"],
                temperature=self.current_weather["temperature"],
                rainfall=self.current_weather["rainfall"],
                has_accident=has_incident
            )

            self.graph.update_edge_prediction(
                road_id=road_id,
                predicted_speed=pred["predicted_speed_kmh"],
                predicted_travel_time=pred["predicted_travel_time_min"],
                traffic_level=pred["traffic_level"],
                has_incident=has_incident,
                incident_description=incident_desc,
                incident_severity=incident_sev
            )

    def calculate_route(
        self,
        source_node: str,
        dest_node: str,
        algorithm: str = "A*",
        departure_time: Optional[datetime.datetime] = None
    ) -> Dict[str, Any]:
        """
        Calculates optimal primary and alternative routes.
        """
        # Resolve clean city names
        src_info = self.nodes_dict.get(source_node, {})
        dst_info = self.nodes_dict.get(dest_node, {})
        src_name = src_info.get("name", source_node)
        dst_name = dst_info.get("name", dest_node)

        # Try sat_engine routing with high-res real road OSRM geometry
        try:
            from app.sat_engine.dijkstra import find_best_route
            sat_res = find_best_route(src_name, dst_name, vehicle_type="car")
            if sat_res and sat_res.get("routes"):
                routes_list = sat_res["routes"]
                primary_raw = routes_list[0]
                
                # Convert coordinates [lat, lon] -> GeoJSON [lon, lat]
                raw_coords = primary_raw.get("coordinates", [])
                geojson_geom = [[round(pt[1], 5), round(pt[0], 5)] for pt in raw_coords]
                
                # Build detailed segments along the path
                via_summary = primary_raw.get("via_summary", "Highway Corridor")
                seg_detail = {
                    "road_id": f"SEG_{src_name}_{dst_name}",
                    "road_name": f"{src_name} to {dst_name} ({via_summary})",
                    "road_type": primary_raw.get("road_type", "Highway"),
                    "length_km": primary_raw.get("distance_km", 0.0),
                    "predicted_speed_kmh": round(primary_raw.get("distance_km", 50.0) / max(0.1, primary_raw.get("travel_time_min", 60.0) / 60.0), 1),
                    "travel_time_min": primary_raw.get("travel_time_min", 0.0),
                    "traffic_level": primary_raw.get("traffic", "Medium").upper(),
                    "geometry": geojson_geom,
                    "has_incident": False,
                    "incident_description": None
                }

                time_saved = 0.0
                if len(routes_list) > 1:
                    time_saved = max(0.0, round(routes_list[1]["travel_time_min"] - primary_raw["travel_time_min"], 1))

                primary_result = {
                    "algorithm": f"{algorithm} (OSRM Traffic-Aware)",
                    "total_distance_km": primary_raw["distance_km"],
                    "total_travel_time_min": primary_raw["travel_time_min"],
                    "free_flow_travel_time_min": max(1.0, round(primary_raw["travel_time_min"] / 1.3, 1)),
                    "time_saved_min": time_saved,
                    "overall_traffic_level": primary_raw["traffic"].upper(),
                    "segments": [seg_detail],
                    "path_nodes": [src_name, dst_name],
                    "geometry": geojson_geom,
                    "node_coordinates": [
                        {"name": src_name, "lat": src_info.get("lat", raw_coords[0][0] if raw_coords else 0.0), "lng": src_info.get("lng", raw_coords[0][1] if raw_coords else 0.0)},
                        {"name": dst_name, "lat": dst_info.get("lat", raw_coords[-1][0] if raw_coords else 0.0), "lng": dst_info.get("lng", raw_coords[-1][1] if raw_coords else 0.0)}
                    ]
                }

                # Alternative routes
                alt_results = []
                for alt_raw in routes_list[1:3]:
                    alt_coords = alt_raw.get("coordinates", [])
                    alt_geojson = [[round(pt[1], 5), round(pt[0], 5)] for pt in alt_coords]
                    alt_results.append({
                        "algorithm": "Alternative Highway Route",
                        "total_distance_km": alt_raw["distance_km"],
                        "total_travel_time_min": alt_raw["travel_time_min"],
                        "free_flow_travel_time_min": max(1.0, round(alt_raw["travel_time_min"] / 1.2, 1)),
                        "time_saved_min": 0.0,
                        "overall_traffic_level": alt_raw["traffic"].upper(),
                        "segments": [{
                            "road_id": f"SEG_ALT_{alt_raw.get('id', 'alt')}",
                            "road_name": alt_raw.get("name", "Alternative Route"),
                            "road_type": alt_raw.get("road_type", "Highway"),
                            "length_km": alt_raw.get("distance_km", 0.0),
                            "predicted_speed_kmh": round(alt_raw.get("distance_km", 50.0) / max(0.1, alt_raw.get("travel_time_min", 60.0) / 60.0), 1),
                            "travel_time_min": alt_raw.get("travel_time_min", 0.0),
                            "traffic_level": alt_raw.get("traffic", "Medium").upper(),
                            "geometry": alt_geojson,
                            "has_incident": False,
                            "incident_description": None
                        }],
                        "path_nodes": [src_name, dst_name],
                        "geometry": alt_geojson,
                        "node_coordinates": primary_result["node_coordinates"]
                    })

                return {
                    "primary": primary_result,
                    "alternatives": alt_results
                }
        except Exception as exc:
            print(f"[TrafficService] Sat routing fallback error: {exc}. Using standard graph router.")

        self.update_all_predictions(departure_time)
        return find_primary_and_alternative_routes(
            self.graph,
            start_node=source_node,
            dest_node=dest_node,
            preferred_algo=algorithm
        )

    def simulate_incident(
        self,
        road_id: str,
        severity: str = "HIGH",
        description: str = "Multi-vehicle collision reported"
    ) -> Dict[str, Any]:
        """
        Adds or updates an accident on a specific road segment.
        """
        seg = self.segments_dict.get(road_id)
        if not seg:
            return {"success": False, "message": f"Road {road_id} not found."}

        mid_geom = seg["geometry"][len(seg["geometry"]) // 2]
        incident = {
            "road_id": road_id,
            "road_name": seg["road_name"],
            "severity": severity,
            "description": description,
            "latitude": mid_geom[1],
            "longitude": mid_geom[0],
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "active": True
        }
        self.active_incidents[road_id] = incident
        self.update_all_predictions()
        return {"success": True, "incident": incident}

    def clear_incident(self, road_id: str) -> bool:
        if road_id in self.active_incidents:
            del self.active_incidents[road_id]
            self.update_all_predictions()
            return True
        return False

    def clear_all_incidents(self):
        self.active_incidents.clear()
        self.graph.clear_incidents()
        self.update_all_predictions()

    def get_network_overview(self) -> Dict[str, Any]:
        """
        Returns full graph nodes, edges with live traffic colors, and active incidents for the map.
        """
        edges_out = []
        speed_sum = 0.0
        traffic_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "SEVERE": 0}

        for road_id, edge in self.graph.edges_by_id.items():
            spd = edge.get("predicted_speed", edge["max_speed"] * 0.8)
            lvl = edge.get("traffic_level", "LOW")
            traffic_counts[lvl] = traffic_counts.get(lvl, 0) + 1
            speed_sum += spd

            edges_out.append({
                "road_id": road_id,
                "road_name": edge["road_name"],
                "road_type": edge["road_type"],
                "length": edge["length"],
                "max_speed": edge["max_speed"],
                "predicted_speed": round(spd, 1),
                "predicted_travel_time": round(edge.get("predicted_travel_time", 0.0), 2),
                "traffic_level": lvl,
                "has_incident": edge.get("has_incident", False),
                "incident_severity": edge.get("incident_severity"),
                "incident_description": edge.get("incident_description"),
                "geometry": edge.get("geometry", [])
            })

        total_segments = len(edges_out)
        avg_speed = round(speed_sum / total_segments, 1) if total_segments else 0.0

        if traffic_counts["SEVERE"] > 2 or traffic_counts["HIGH"] > 8:
            system_level = "HIGH"
        elif traffic_counts["MEDIUM"] > 10:
            system_level = "MEDIUM"
        else:
            system_level = "LOW"

        return {
            "total_segments": total_segments,
            "active_incidents_count": len(self.active_incidents),
            "system_average_speed": avg_speed,
            "system_traffic_level": system_level,
            "traffic_breakdown": traffic_counts,
            "nodes": list(self.nodes_dict.values()),
            "segments": edges_out,
            "incidents": list(self.active_incidents.values()),
            "weather": self.current_weather
        }

traffic_service = TrafficService()
