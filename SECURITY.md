# Security Policy

IntelliWatch is a local desktop monitoring application. It reads local system telemetry and stores local history in SQLite.

## Reporting Issues

Please open a private security advisory on GitHub or contact the project maintainer before publicly disclosing vulnerabilities.

## Data Handling

- Metrics are collected locally.
- SQLite history is stored under `backend/database/intelliwatch.sqlite`.
- Cloud sync is not implemented in this version.
- No telemetry is sent to external services by default.

## Local API Token

The optional FastAPI backend supports a static local token through `INTELLIWATCH_API_TOKEN`.
If the variable is set, requests must include `X-API-Token` with the same value. If it is unset, auth is skipped to preserve the default local development workflow.
