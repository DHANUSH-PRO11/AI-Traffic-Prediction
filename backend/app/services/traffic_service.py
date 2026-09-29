import os
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
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        self.load_network_graph()
        self.update_all_predictions()

    def load_network_graph(self):
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
        dep_time = departure_time or datetime.datetime.utcnow()
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
            "timestamp": datetime.datetime.utcnow().isoformat(),
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
