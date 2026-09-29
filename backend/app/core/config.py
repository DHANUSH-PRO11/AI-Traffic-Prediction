import os

class Settings:
    PROJECT_NAME: str = "AI Traffic Prediction & Dynamic Route Optimization"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "smart_traffic_ai_super_secret_jwt_key_2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Database URL: Supports PostgreSQL (with PostGIS) or SQLite fallback
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./traffic_system.db"
    )
    
    # Model Artifact Path
    MODEL_DIR: str = os.getenv(
        "MODEL_DIR",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ml/models"))
    )

settings = Settings()
