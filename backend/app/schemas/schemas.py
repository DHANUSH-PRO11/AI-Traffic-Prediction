from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr
from datetime import datetime

# --- Auth Schemas ---
class UserBase(BaseModel):
    name: str
    email: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(UserBase):
    id: int
    is_admin: bool
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Road Segment Schemas ---
class RoadSegmentBase(BaseModel):
    road_id: str
    road_name: str
    road_type: str
    length: float
    geometry: List[List[float]]  # [[lng, lat], ...]
    max_speed: float
    start_node: str
    end_node: str
    base_lanes: Optional[int] = 2

class RoadSegmentCreate(RoadSegmentBase):
    pass

class RoadSegmentResponse(RoadSegmentBase):
    id: int
    current_speed: Optional[float] = None
    current_volume: Optional[float] = None
    traffic_level: Optional[str] = "LOW"
    predicted_travel_time: Optional[float] = None
    has_incident: Optional[bool] = False
    incident_severity: Optional[str] = None
    class Config:
        from_attributes = True


# --- Traffic Observation Schemas ---
class TrafficObservationBase(BaseModel):
    road_id: str
    traffic_volume: float
    average_speed: float
    vehicle_count: int
    source: Optional[str] = "sensor"

class TrafficObservationResponse(TrafficObservationBase):
    id: int
    timestamp: datetime
    class Config:
        from_attributes = True


# --- Weather Schemas ---
class WeatherObservationBase(BaseModel):
    temperature: float
    rainfall: float
    humidity: float
    weather_condition: str
    wind_speed: float

class WeatherObservationResponse(WeatherObservationBase):
    id: int
    timestamp: datetime
    class Config:
        from_attributes = True


# --- Accident Schemas ---
class AccidentBase(BaseModel):
    road_id: str
    severity: str
    latitude: float
    longitude: float
    description: Optional[str] = None
    active: Optional[bool] = True

class AccidentCreate(AccidentBase):
    pass

class AccidentResponse(AccidentBase):
    id: int
    timestamp: datetime
    road_name: Optional[str] = None
    class Config:
        from_attributes = True


# --- Prediction Schemas ---
class SegmentPredictionInput(BaseModel):
    road_id: str
    departure_time: Optional[datetime] = None
    temperature: Optional[float] = 25.0
    rainfall: Optional[float] = 0.0
    weather_condition: Optional[str] = "Clear"
    historical_speed: Optional[float] = None
    historical_volume: Optional[float] = None
    has_accident: Optional[bool] = False

class SegmentPredictionOutput(BaseModel):
    road_id: str
    road_name: str
    road_type: str
    length_km: float
    speed_limit_kmh: float
    predicted_speed_kmh: float
    predicted_travel_time_min: float
    predicted_volume_vph: float
    traffic_level: str  # LOW, MEDIUM, HIGH, SEVERE
    confidence_score: float
    model_version: str
    timestamp: datetime

class PredictionInteractiveRequest(BaseModel):
    road_id: str
    date_str: Optional[str] = None
    time_str: Optional[str] = None
    weather: Optional[str] = "Clear"
    temperature: Optional[float] = 25.0
    rainfall: Optional[float] = 0.0
    accident_reported: Optional[bool] = False


# --- Routing Schemas ---
class RouteCalculationRequest(BaseModel):
    source_node: str
    destination_node: str
    departure_time: Optional[datetime] = None
    algorithm: Optional[str] = "A*"  # "A*" or "Dijkstra"
    weather_condition: Optional[str] = "Clear"
    temperature: Optional[float] = 25.0
    rainfall: Optional[float] = 0.0

class RouteSegmentDetail(BaseModel):
    road_id: str
    road_name: str
    road_type: str
    length_km: float
    predicted_speed_kmh: float
    travel_time_min: float
    traffic_level: str
    geometry: List[List[float]]
    has_incident: bool
    incident_description: Optional[str] = None

class RoutePathResult(BaseModel):
    algorithm: str
    total_distance_km: float
    total_travel_time_min: float
    free_flow_travel_time_min: float
    time_saved_min: float
    overall_traffic_level: str
    segments: List[RouteSegmentDetail]
    path_nodes: List[str]
    geometry: List[List[float]]
    node_coordinates: List[Dict[str, Any]]

class DynamicRerouteResponse(BaseModel):
    status: str
    message: str
    rerouted: bool
    recommended_route: RoutePathResult
    alternative_routes: List[RoutePathResult]
    incident_alert: Optional[str] = None
    time_difference_min: Optional[float] = None


# --- User Trip Schemas ---
class UserTripCreate(BaseModel):
    user_id: Optional[int] = None
    source: str
    destination: str
    route_geometry: List[List[float]]
    predicted_time: float
    actual_time: Optional[float] = None
    distance: float
    algorithm: Optional[str] = "A*"

class UserTripResponse(BaseModel):
    id: int
    user_id: Optional[int]
    source: str
    destination: str
    route_geometry: List[List[float]]
    predicted_time: float
    actual_time: Optional[float]
    distance: float
    algorithm: str
    created_at: datetime
    class Config:
        from_attributes = True


# --- Model Management & Retraining ---
class ModelMetrics(BaseModel):
    MAE: float
    RMSE: float
    R2: float
    MAPE: float
    training_samples: int
    evaluation_samples: int

class ModelVersionResponse(BaseModel):
    id: int
    model_name: str
    version: str
    training_dataset: str
    training_date: datetime
    metrics: Dict[str, Any]
    feature_importance: Optional[Dict[str, float]] = None
    is_active: bool
    class Config:
        from_attributes = True

class RetrainRequest(BaseModel):
    dataset_name: Optional[str] = "augmented_trip_observations"
    epochs: Optional[int] = 100
    validation_split: Optional[float] = 0.2
    auto_deploy_if_better: Optional[bool] = True

class RetrainResponse(BaseModel):
    status: str
    message: str
    previous_version: str
    candidate_version: str
    previous_metrics: Dict[str, Any]
    candidate_metrics: Dict[str, Any]
    deployed: bool
    improvement_percent: float


# --- Analytics Schemas ---
class CongestionDistribution(BaseModel):
    level: str
    percentage: float
    segment_count: int

class HourlyTrafficPoint(BaseModel):
    hour: int
    actual_volume: float
    predicted_volume: float
    average_speed: float
    congestion_index: float

class TrafficAnalyticsResponse(BaseModel):
    total_segments: int
    active_incidents: int
    system_average_speed: float
    system_traffic_level: str
    congestion_distribution: List[CongestionDistribution]
    hourly_trends: List[HourlyTrafficPoint]
    busiest_roads: List[Dict[str, Any]]
    fastest_roads: List[Dict[str, Any]]


# --- Sat Smart Traffic Schemas ---
class RouteRequest(BaseModel):
    source: str
    destination: str
    vehicle_type: Optional[str] = "car"

class PredictRequest(BaseModel):
    hour: Optional[int] = None
    day: Optional[int] = None
    festival: Optional[int] = 0
    rainfall: Optional[float] = 0.0
    temperature: Optional[float] = 30.0
    road_type: Optional[str] = "highway"
    vehicle_count: Optional[int] = 180

class OsmndDownloadRequest(BaseModel):
    place: Optional[str] = "Tamil Nadu, India"
    feature_type: Optional[str] = "traffic_signals"
    network_type: Optional[str] = "drive"
