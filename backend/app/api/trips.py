import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.database import get_db
from app.models.models import UserTrip, User
from app.schemas.schemas import UserTripCreate, UserTripResponse

router = APIRouter(prefix="/trips", tags=["User Trips & Continuous Learning"])

@router.post("/", response_model=UserTripResponse)
def record_user_trip(trip_in: UserTripCreate, db: Session = Depends(get_db)):
    """
    Records a completed user trip into the database for continuous ML feedback loop.
    """
    trip = UserTrip(
        user_id=trip_in.user_id,
        source=trip_in.source,
        destination=trip_in.destination,
        route_geometry=trip_in.route_geometry,
        predicted_time=trip_in.predicted_time,
        actual_time=trip_in.actual_time or round(trip_in.predicted_time * 1.05, 1),
        distance=trip_in.distance,
        algorithm=trip_in.algorithm or "A*",
        created_at=datetime.datetime.utcnow()
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip

@router.get("/", response_model=List[UserTripResponse])
def get_user_trips(limit: int = 50, db: Session = Depends(get_db)):
    """
    Retrieves recent user trip history.
    """
    trips = db.query(UserTrip).order_by(UserTrip.created_at.desc()).limit(limit).all()
    return trips
