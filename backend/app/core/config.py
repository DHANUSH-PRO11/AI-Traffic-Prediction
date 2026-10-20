import os

class Settings:
    PROJECT_NAME: str = "AI Traffic Prediction & Dynamic Route Optimization"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "smart_traffic_ai_super_secret_jwt_key_2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Database URL: Supports PostgreSQL (with PostGIS) or SQLite fallback
    # In Vercel serverless functions where root filesystem is read-only, default SQLite to /tmp
    _default_db = "sqlite:////tmp/traffic_system.db" if (os.getenv("VERCEL") and not os.getenv("DATABASE_URL")) else "sqlite:///./traffic_system.db"
    DATABASE_URL: str = os.getenv("DATABASE_URL", _default_db)
    
    # Model Artifact Path: resolves from env, local backend/ml/models, or repo-level ml/models
    @staticmethod
    def _resolve_model_dir() -> str:
        env_dir = os.getenv("MODEL_DIR")
        if env_dir and os.path.exists(env_dir):
            return os.path.abspath(env_dir)
        local_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../ml/models"))
        if os.path.exists(local_dir):
            return local_dir
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ml/models"))
        if os.path.exists(root_dir):
            return root_dir
        return env_dir or local_dir

    MODEL_DIR: str = _resolve_model_dir()

settings = Settings()
