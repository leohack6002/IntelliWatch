import ast
import importlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FILES = [
    "monitoring-engine/main.py",
    "monitoring-engine/collectors/system.py",
    "monitoring-engine/alerts/rules.py",
    "monitoring-engine/analyzers/health.py",
    "monitoring-engine/ai/anomaly_detector.py",
    "monitoring-engine/storage.py",
    "backend/fastapi/main.py",
    "backend/services/retention.py",
]
MODULES = ["psutil", "websockets", "fastapi", "sklearn", "pandas", "numpy"]


def main():
    for file_name in FILES:
        source_path = ROOT / file_name
        ast.parse(source_path.read_text(encoding="utf-8"), filename=str(source_path))

    missing = []
    for module in MODULES:
        try:
            importlib.import_module(module)
        except ImportError:
            missing.append(module)

    if missing:
        joined = ", ".join(missing)
        raise SystemExit(f"Missing Python dependencies: {joined}. Run scripts/setup-windows.ps1.")

    print("Python checks passed.")


if __name__ == "__main__":
    main()
