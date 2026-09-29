import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    trips = relationship("UserTrip", back_populates="user")


class RoadSegment(Base):
    __tablename__ = "road_segments"

    id = Column(Integer, primary_key=True, index=True)
    road_id = Column(String(50), unique=True, index=True, nullable=False)
    road_name = Column(String(150), nullable=False)
    road_type = Column(String(50), nullable=False)  # highway, arterial, secondary, residential
    length = Column(Float, nullable=False)  # in kilometers
    geometry = Column(JSON, nullable=False)  # GeoJSON LineString coordinates [[lon, lat], ...]
    max_speed = Column(Float, nullable=False)  # speed limit km/h
    start_node = Column(String(50), index=True, nullable=False)
    end_node = Column(String(50), index=True, nullable=False)
    base_lanes = Column(Integer, default=2)

    observations = relationship("TrafficObservation", back_populates="segment")
    accidents = relationship("Accident", back_populates="segment")
    predictions = relationship("Prediction", back_populates="segment")


class TrafficObservation(Base):
    __tablename__ = "traffic_observations"

    id = Column(Integer, primary_key=True, index=True)
    road_id = Column(String(50), ForeignKey("road_segments.road_id"), index=True, nullable=False)
    timestamp = Column(DateTime, index=True, default=datetime.datetime.utcnow)
    traffic_volume = Column(Float, nullable=False)  # vehicles per hour
    average_speed = Column(Float, nullable=False)  # km/h
    vehicle_count = Column(Integer, nullable=False)
    source = Column(String(50), default="sensor")

    segment = relationship("RoadSegment", back_populates="observations")


class WeatherObservation(Base):
    __tablename__ = "weather_observations"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, index=True, default=datetime.datetime.utcnow)
    temperature = Column(Float, nullable=False)  # Celsius
    rainfall = Column(Float, default=0.0)  # mm/h
    humidity = Column(Float, default=50.0)  # %
    weather_condition = Column(String(50), default="Clear")  # Clear, Rain, Fog, Storm, Overcast
    wind_speed = Column(Float, default=10.0)  # km/h


class Accident(Base):
    __tablename__ = "accidents"

    id = Column(Integer, primary_key=True, index=True)
    road_id = Column(String(50), ForeignKey("road_segments.road_id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    severity = Column(String(50), default="MEDIUM")  # LOW, MEDIUM, HIGH, SEVERE
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    description = Column(String(255), nullable=True)
    active = Column(Boolean, default=True)

    segment = relationship("RoadSegment", back_populates="accidents")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    road_id = Column(String(50), ForeignKey("road_segments.road_id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    predicted_speed = Column(Float, nullable=False)  # km/h
    predicted_travel_time = Column(Float, nullable=False)  # minutes
    traffic_level = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, SEVERE
    model_version = Column(String(50), default="v1.0")

    segment = relationship("RoadSegment", back_populates="predictions")


class UserTrip(Base):
    __tablename__ = "user_trips"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    source = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)
    route_geometry = Column(JSON, nullable=False)  # GeoJSON path
    predicted_time = Column(Float, nullable=False)  # minutes
    actual_time = Column(Float, nullable=True)  # minutes (updated when trip is finished)
    distance = Column(Float, nullable=False)  # km
    algorithm = Column(String(50), default="A*")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="trips")


class ModelVersion(Base):
    __tablename__ = "model_versions"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), nullable=False)
    version = Column(String(50), unique=True, nullable=False)
    training_dataset = Column(String(150), nullable=False)
    training_date = Column(DateTime, default=datetime.datetime.utcnow)
    metrics = Column(JSON, nullable=False)  # {"MAE": 2.14, "RMSE": 4.12, "R2": 0.91, "MAPE": 8.3}
    model_path = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=False)
