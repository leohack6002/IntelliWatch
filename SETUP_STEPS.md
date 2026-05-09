# IntelliWatch Setup Steps

Follow these steps to set up and launch IntelliWatch on a Windows computer.

## 1. Install Required Software

Install these three tools first:

1. Git  
   Download: https://git-scm.com/

2. Node.js LTS  
   Download: https://nodejs.org/

3. Python 3.11 or newer  
   Download: https://www.python.org/downloads/

Important: While installing Python, select:

```text
Add Python to PATH
```

## 2. Open PowerShell

Open PowerShell or the terminal inside VS Code.

Check that everything is installed:

```powershell
git --version
node --version
npm --version
python --version
```

If any command is not found, reinstall that tool and reopen PowerShell.

## 3. Download the Project

Clone the project from GitHub:

```powershell
git clone <repository-url>
cd intelliwatch
```

If you already downloaded the project, just open the project folder:

```powershell
cd path\to\intelliwatch
```

## 4. Run Setup

Recommended method for Windows:

```text
Double-click start.bat
```

`start.bat` is the unified entry point. It checks if the application is set up; if not, it runs `install.bat` automatically.

When all requirements are present, it runs:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-windows.ps1
```

Setup installs:

1. Python virtual environment
2. Python monitoring packages
3. Electron desktop app packages
4. React UI packages
5. A final self-check for `.venv`, root `node_modules`, and React `node_modules`.

When setup succeeds, the terminal prints:

```text
Setup complete! Run launch.bat to start IntelliWatch.
```

## 5. Launch IntelliWatch

After installation succeeds, you can always use the same file to start the app:

```text
Double-click start.bat
```

`launch.bat` checks for npm first. If npm is missing, it prints:

```text
Please run install.bat first
```

Contributor alternative:

```powershell
npm run launch
```

This starts:

1. Python monitoring engine
2. React frontend
3. Electron desktop application

## 6. Wait for the Overlay

The floating IntelliWatch overlay appears after around 30 seconds at the bottom-right of your screen.

This delay is normal. The app waits so the computer can become stable after startup. During the wait, the tray tooltip cycles through startup messages.

The overlay shows live:
- CPU, RAM, Disk, Battery, Uptime
- WiFi signal strength
- Download and upload speeds

## 7. Open the Dashboard

Click the floating overlay to open the full dashboard.

The overlay shows:

1. CPU usage
2. RAM usage
3. Disk usage
4. Battery percentage
5. System uptime
6. WiFi signal strength
7. Download speed
8. Upload speed

The full dashboard shows:

1. CPU usage with live graph
2. RAM usage with live graph
3. GPU usage (hardware dependent)
4. Temperature (hardware dependent)
5. Disk usage
6. Battery health
7. Network speed
8. Active processes
9. AI insights and anomaly detection
10. System health score
11. Alerts and warnings

## 8. Stop the Application

To stop development mode, go to the PowerShell window and press:

```text
Ctrl + C
```

## 9. Optional: Start the Backend API

If you want to test the FastAPI backend, run:

```powershell
npm run backend
```

Then open this in your browser:

```text
http://127.0.0.1:8787/health
```

## 10. Optional: Build the Installer

To create a Windows installer:

```powershell
npm run build
```

The installer will be created inside:

```text
installer/dist/
```

## 11. Optional: Auto-Start on Windows Boot

IntelliWatch has official auto-start support in the Electron desktop app.

In packaged builds, the app uses Electron's Windows login startup setting:

```text
app.setLoginItemSettings({
  openAtLogin: true,
  openAsHidden: true,
  name: "IntelliWatch"
})
```

This means the installed desktop app can start automatically after Windows login.

Important notes:

1. Auto-start is meant for the packaged installer version.
2. Development mode with `npm run launch` does not permanently register itself as a startup app.
3. The overlay waits around 30 seconds before appearing so the system can become stable.

If auto-start does not work on your system, you can manually add IntelliWatch using one of these Windows methods:

1. Add the installed app shortcut to the Windows Startup folder.
2. Create a Windows Task Scheduler task that launches IntelliWatch after login.

Recommended method:

Use the packaged installer version when you want normal app-like startup behavior.

## Common Problems

### node is not recognized

Install Node.js LTS and reopen PowerShell.

### npm is not recognized

Reinstall Node.js LTS and reopen PowerShell.

### python is not recognized

Reinstall Python and enable `Add Python to PATH`.

### PowerShell Script Errors (UnauthorizedAccess)

If you see an error about scripts being disabled (Execution Policy), run this command in an **Administrator PowerShell** window:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### The overlay does not appear immediately

Wait around 30 seconds. This is expected.

### GPU monitoring is unavailable

Some systems do not expose GPU data to `GPUtil`. IntelliWatch shows "GPU monitoring not supported on this system" on the dashboard, and other monitoring features will still work.

### Temperature shows 0C

Some systems do not expose temperature sensors.
Try running IntelliWatch as administrator.
If it still shows 0C, your hardware does not support temperature reading via software.

### WiFi shows incorrect label

If your WiFi adapter name is not standard,
IntelliWatch may show ETH or NET instead of WiFi.
The speed values are still correct.

### System is slow after launching

IntelliWatch uses system resources for monitoring.
If your system slows down, try closing other heavy applications first.
The monitoring engine is set to low priority to minimize impact.

### Backend API returns 401 Unauthorized

If `INTELLIWATCH_API_TOKEN` is set, every FastAPI request must include this header:

```text
X-API-Token: <token value>
```

If `INTELLIWATCH_API_TOKEN` is not set, the backend stays open for local development.
