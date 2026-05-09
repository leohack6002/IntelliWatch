$ErrorActionPreference = "Stop"

$PythonPath = ".\.venv\Scripts\python.exe"
if (-not (Test-Path $PythonPath)) {
  $PythonPath = "python"
}

& $PythonPath monitoring-engine\main.py
