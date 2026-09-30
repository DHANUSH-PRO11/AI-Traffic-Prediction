"""
Unified Single-Command Launcher for AI Traffic Prediction & Route Optimization Platform.
Runs both FastAPI backend and React Vite frontend concurrently.
Usage:
    python run.py
"""
import os
import sys
import time
import signal
import subprocess

# Ensure UTF-8 output on Windows terminals
if sys.platform == "win32":
    try:
        if sys.stdout.encoding.lower() != "utf-8":
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

def init_db_if_needed():
    db_file = os.path.join(ROOT_DIR, "traffic_system.db")
    if not os.path.exists(db_file):
        print("[Init] Initializing traffic_system.db...")
        sys.path.insert(0, BACKEND_DIR)
        from app.database.init_db import init_database
        init_database()

def main():
    print("=" * 65)
    print("  [*] Starting AI Traffic Prediction & Route Optimization System")
    print("=" * 65)

    init_db_if_needed()

    backend_cmd = [
        sys.executable, "-m", "uvicorn", "app.main:app",
        "--app-dir", "backend",
        "--host", "127.0.0.1",
        "--port", "8000",
        "--reload"
    ]

    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_cmd = [npm_cmd, "--prefix", "frontend", "run", "dev"]

    print("\n[1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...")
    backend_proc = subprocess.Popen(backend_cmd, cwd=ROOT_DIR)

    print("[2/2] Starting Vite Frontend on http://localhost:5173 ...")
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=ROOT_DIR)

    print("\n" + "=" * 65)
    print("  [+] Both Services Are Running Concurrently!")
    print("  --> Frontend App:  http://localhost:5173/")
    print("  --> Backend API:   http://127.0.0.1:8000/")
    print("  --> Swagger Docs:  http://127.0.0.1:8000/docs")
    print("=" * 65)
    print("  Press Ctrl+C to stop all services.\n")

    def shutdown(signum=None, frame=None):
        print("\n[Shutdown] Stopping services...")
        try:
            frontend_proc.terminate()
        except Exception:
            pass
        try:
            backend_proc.terminate()
        except Exception:
            pass
        time.sleep(0.5)
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        while True:
            if backend_proc.poll() is not None:
                print("\n[Warning] Backend process exited.")
                break
            if frontend_proc.poll() is not None:
                print("\n[Warning] Frontend process exited.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        shutdown()

if __name__ == "__main__":
    main()
