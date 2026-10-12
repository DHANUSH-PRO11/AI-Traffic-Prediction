import os
import sys
import pytest

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database.init_db import init_database

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    """Ensure database tables and initial fixtures exist for all test runs."""
    init_database()
