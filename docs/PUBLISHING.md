# Publishing Checklist

Use this checklist before pushing IntelliWatch to GitHub.

## Repository Setup

1. Create a GitHub repository named `intelliwatch`.
2. Commit the source code.
3. Confirm generated files are not committed:

```text
node_modules/
.venv/
__pycache__/
*.sqlite
installer/dist/
```

## Recommended First Commit

```powershell
git init
git add .
git commit -m "Initial IntelliWatch application scaffold"
git branch -M main
git remote add origin <repository-url>
git push -u origin main
```

## Release Build

For a clean local release build, run setup through the same Windows entrypoint normal contributors use:

```text
install.bat
```

Then build:

```powershell
npm run build
```

The Windows installer is generated in `installer/dist/`.

GitHub Actions also builds on pushes to `main` and on published GitHub releases. Release builds upload installer files from `installer/dist/` as release assets.

## Production Note

The current packaged app starts the Python engine by calling `python`. For a polished public release, choose one of these paths:

- Require Python 3.11+ as an installer prerequisite.
- Bundle a Python runtime with the app.
- Compile the monitoring engine with PyInstaller and spawn the executable from Electron.
