import os
import json
import datetime
from sqlalchemy.orm import Session
from app.database.database import engine, Base, SessionLocal
from app.models.models import User, RoadSegment, TrafficObservation, WeatherObservation, Accident, ModelVersion, UserTrip
from app.core.config import settings
import hashlib

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def init_database():
    print("[DB Init] Creating database tables...")
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if users exist
        if db.query(User).count() == 0:
            print("[DB Init] Seeding default users...")
            admin_user = User(
                name="Admin Engineer",
                email="admin@traffic.ai",
                password_hash=hash_password("admin123"),
                is_admin=True,
                created_at=datetime.datetime.now(datetime.timezone.utc)
            )
            demo_user = User(
                name="Commuter Demo",
                email="user@traffic.ai",
                password_hash=hash_password("user123"),
                is_admin=False,
                created_at=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add_all([admin_user, demo_user])
            db.commit()

        # Check if road segments exist
        raw_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ml/data/raw"))
        segments_file = os.path.join(raw_dir, "road_segments.json")
        if os.path.exists(segments_file) and db.query(RoadSegment).count() == 0:
            print("[DB Init] Seeding road segments from raw dataset...")
            with open(segments_file, "r", encoding="utf-8") as f:
                segments_data = json.load(f)

            for s in segments_data:
                db_seg = RoadSegment(
                    road_id=s["road_id"],
                    road_name=s["road_name"],
                    road_type=s["road_type"],
                    length=s["length"],
                    geometry=s["geometry"],
                    max_speed=s["max_speed"],
                    start_node=s["start_node"],
                    end_node=s["end_node"],
                    base_lanes=s.get("base_lanes", 2)
                )
                db.add(db_seg)
            db.commit()

        # Check if active model exists
        if db.query(ModelVersion).count() == 0:
            print("[DB Init] Registering initial ML model version...")
            meta_path = os.path.join(settings.MODEL_DIR, "active_model_meta.json")
            if os.path.exists(meta_path):
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)
            else:
                meta = {
                    "model_name": "Gradient Boosted Regressor",
                    "version": "v1.0",
                    "training_dataset": "METR-LA Synthetic Corridor (14-day loop detectors)",
                    "metrics": {"MAE": 4.07, "RMSE": 5.45, "R2": 0.957, "MAPE": 7.43},
                    "model_path": os.path.join(settings.MODEL_DIR, "traffic_model_v1.0.json")
                }

            mv = ModelVersion(
                model_name=meta.get("model_name", "Gradient Boosted Regressor"),
                version=meta.get("version", "v1.0"),
                training_dataset=meta.get("training_dataset", "METR-LA Synthetic"),
                metrics=meta.get("metrics", {}),
                model_path=meta.get("model_path", ""),
                is_active=True,
                training_date=datetime.datetime.now(datetime.timezone.utc)
            )
            db.add(mv)
            db.commit()

        # Seed sample recent trips if empty
        if db.query(UserTrip).count() == 0:
            print("[DB Init] Seeding initial sample trips...")
            sample_trip = UserTrip(
                user_id=2,
                source="Santa Monica Pier",
                destination="Downtown LA Grand",
                route_geometry=[[-118.4965, 34.0102], [-118.4135, 34.0558], [-118.2518, 34.0488]],
                predicted_time=24.5,
                actual_time=26.2,
                distance=24.8,
                algorithm="A*",
                created_at=datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=2)
            )
            db.add(sample_trip)
            db.commit()

        print("[DB Init] Database initialization complete.")
    except Exception as e:
        db.rollback()
        print(f"[DB Init] Error initializing database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
