SUSPICIOUS_NAMES = {"miner.exe", "xmrig.exe", "unknown.exe"}
DEFAULT_THRESHOLDS = {"cpu": 90, "ram": 85, "temperature": 80}


def evaluate_alerts(metrics, processes=None, persistent_counts=None, thresholds=None):
    alerts = []
    processes = processes or []
    persistent_counts = persistent_counts or {}
    thresholds = {**DEFAULT_THRESHOLDS, **(thresholds or {})}

    if persistent_counts.get("cpu", 0) >= 3 and metrics["cpu_percent"] > thresholds["cpu"]:
        level = "critical" if metrics["cpu_percent"] >= 95 else "warning"
        code = "CPU_CRITICAL" if level == "critical" else "CPU_HIGH"
        alerts.append({"level": level, "code": code, "message": f"CPU usage is above {thresholds['cpu']}%."})

    if persistent_counts.get("ram", 0) >= 3 and metrics["ram_percent"] > thresholds["ram"]:
        level = "critical" if metrics["ram_percent"] >= 90 else "warning"
        code = "RAM_CRITICAL" if level == "critical" else "RAM_HIGH"
        alerts.append({"level": level, "code": code, "message": f"RAM usage is above {thresholds['ram']}%."})

    if persistent_counts.get("temperature", 0) >= 3 and metrics["temperature_c"] and metrics["temperature_c"] > thresholds["temperature"]:
        level = "critical" if metrics["temperature_c"] >= 90 else "warning"
        code = "TEMP_CRITICAL" if level == "critical" else "TEMP_HIGH"
        alerts.append({"level": level, "code": code, "message": f"Temperature is above {thresholds['temperature']}C."})

    if metrics["disk_percent"] >= 95:
        alerts.append({"level": "critical", "code": "DISK_CRITICAL", "message": "Primary disk has less than 5% free space."})
    elif metrics["disk_percent"] >= 90:
        alerts.append({"level": "warning", "code": "DISK_LOW", "message": "Primary disk has less than 10% free space."})

    battery_percent = metrics.get("battery_percent")
    if battery_percent is not None and battery_percent <= 15 and not metrics.get("battery_plugged"):
        alerts.append({"level": "warning", "code": "BATTERY_LOW", "message": "Battery level is low and the device is not charging."})

    suspicious = [
        process["name"] for process in processes
        if process["name"].lower() in SUSPICIOUS_NAMES
    ]
    if suspicious:
        alerts.append({
            "level": "critical",
            "code": "SUSPICIOUS_PROCESS",
            "message": f"Suspicious process detected: {', '.join(suspicious[:3])}."
        })

    return alerts
