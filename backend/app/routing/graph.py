import math
from typing import Dict, List, Any, Optional

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return float(R * c)

class RoadNetworkGraph:
    def __init__(self):
        # Nodes: {node_id: {"name": str, "lat": float, "lng": float}}
        self.nodes: Dict[str, Dict[str, Any]] = {}
        # Edges (adjacency list): {from_node: [Edge, ...]}
        self.adjacency: Dict[str, List[Dict[str, Any]]] = {}
        # Map of road_id to edge definition
        self.edges_by_id: Dict[str, Dict[str, Any]] = {}
        self.max_system_speed: float = 105.0 # Max possible speed in km/h for A* admissible heuristic

    def add_node(self, node_id: str, name: str, lat: float, lng: float):
        self.nodes[node_id] = {
            "node_id": node_id,
            "name": name,
            "lat": lat,
            "lng": lng
        }
        if node_id not in self.adjacency:
            self.adjacency[node_id] = []

    def add_edge(
        self,
        road_id: str,
        road_name: str,
        start_node: str,
        end_node: str,
        road_type: str,
        length: float,
        max_speed: float,
        geometry: List[List[float]],
        base_lanes: int = 2
    ):
        if max_speed > self.max_system_speed:
            self.max_system_speed = max_speed

        edge = {
            "road_id": road_id,
            "road_name": road_name,
            "start_node": start_node,
            "end_node": end_node,
            "road_type": road_type,
            "length": length,
            "max_speed": max_speed,
            "geometry": geometry,
            "base_lanes": base_lanes,
            # Dynamic attributes updated by ML predictor or incidents
            "predicted_speed": max_speed * 0.8,
            "predicted_travel_time": (length / (max_speed * 0.8)) * 60.0,
            "traffic_level": "LOW",
            "has_incident": False,
            "incident_severity": None,
            "incident_description": None,
            "incident_delay_penalty": 1.0
        }
        self.adjacency.setdefault(start_node, []).append(edge)
        self.edges_by_id[road_id] = edge

    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        return self.nodes.get(node_id)

    def get_neighbors(self, node_id: str) -> List[Dict[str, Any]]:
        return self.adjacency.get(node_id, [])

    def update_edge_prediction(
        self,
        road_id: str,
        predicted_speed: float,
        predicted_travel_time: float,
        traffic_level: str,
        has_incident: bool = False,
        incident_description: Optional[str] = None,
        incident_severity: Optional[str] = None
    ):
        if road_id in self.edges_by_id:
            edge = self.edges_by_id[road_id]
            edge["predicted_speed"] = predicted_speed
            edge["predicted_travel_time"] = predicted_travel_time
            edge["traffic_level"] = traffic_level
            edge["has_incident"] = has_incident
            edge["incident_description"] = incident_description
            edge["incident_severity"] = incident_severity

    def clear_incidents(self):
        for edge in self.edges_by_id.values():
            edge["has_incident"] = False
            edge["incident_severity"] = None
            edge["incident_description"] = None
