import sys
import os
import unittest

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.routing.graph import RoadNetworkGraph, haversine_distance
from app.routing.algorithms import astar_shortest_path, dijkstra_shortest_path, heuristic_travel_time

class TestRoutingEngine(unittest.TestCase):
    def setUp(self):
        self.graph = RoadNetworkGraph()
        # Add a triangular test graph: A -> B -> D (highway, 100km/h), A -> C -> D (arterial, 50km/h)
        self.graph.add_node("A", "Node A", 34.0, -118.4)
        self.graph.add_node("B", "Node B", 34.05, -118.3)
        self.graph.add_node("C", "Node C", 34.02, -118.35)
        self.graph.add_node("D", "Node D", 34.1, -118.2)

        # Edge A -> B: 10 km, predicted travel time = 6.0 min
        self.graph.add_edge("AB", "Road AB", "A", "B", "highway", 10.0, 100.0, [[-118.4, 34.0], [-118.3, 34.05]])
        self.graph.update_edge_prediction("AB", 100.0, 6.0, "LOW")

        # Edge B -> D: 12 km, predicted travel time = 7.2 min
        self.graph.add_edge("BD", "Road BD", "B", "D", "highway", 12.0, 100.0, [[-118.3, 34.05], [-118.2, 34.1]])
        self.graph.update_edge_prediction("BD", 100.0, 7.2, "LOW")

        # Edge A -> C: 6 km, predicted travel time = 8.0 min
        self.graph.add_edge("AC", "Road AC", "A", "C", "arterial", 6.0, 50.0, [[-118.4, 34.0], [-118.35, 34.02]])
        self.graph.update_edge_prediction("AC", 45.0, 8.0, "LOW")

        # Edge C -> D: 10 km, predicted travel time = 14.0 min
        self.graph.add_edge("CD", "Road CD", "C", "D", "arterial", 10.0, 50.0, [[-118.35, 34.02], [-118.2, 34.1]])
        self.graph.update_edge_prediction("CD", 42.0, 14.0, "LOW")

    def test_dijkstra_finds_fastest_time(self):
        # A -> B -> D = 6.0 + 7.2 = 13.2 min
        # A -> C -> D = 8.0 + 14.0 = 22.0 min
        route = dijkstra_shortest_path(self.graph, "A", "D")
        self.assertIsNotNone(route)
        self.assertEqual(route["path_nodes"], ["A", "B", "D"])
        self.assertAlmostEqual(route["total_travel_time_min"], 13.2, places=1)

    def test_astar_finds_same_optimal_route(self):
        route = astar_shortest_path(self.graph, "A", "D")
        self.assertIsNotNone(route)
        self.assertEqual(route["path_nodes"], ["A", "B", "D"])
        self.assertAlmostEqual(route["total_travel_time_min"], 13.2, places=1)

    def test_admissible_heuristic(self):
        # Heuristic from A to D must never exceed true travel time
        h_val = heuristic_travel_time("A", "D", self.graph)
        self.assertLessEqual(h_val, 13.2)

    def test_dynamic_reroute_on_accident(self):
        # Simulate severe accident on B -> D (travel time spikes from 7.2 min to 35 min)
        self.graph.update_edge_prediction("BD", 15.0, 35.0, "SEVERE", has_incident=True, incident_severity="SEVERE")
        
        # Now A -> B -> D takes 6.0 + 35.0 = 41.0 min
        # A -> C -> D takes 22.0 min, so optimal path changes to A -> C -> D!
        route = astar_shortest_path(self.graph, "A", "D")
        self.assertIsNotNone(route)
        self.assertEqual(route["path_nodes"], ["A", "C", "D"])
        self.assertAlmostEqual(route["total_travel_time_min"], 22.3, places=1)

if __name__ == "__main__":
    unittest.main()
