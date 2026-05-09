SUSPICIOUS_NAMES = {"miner.exe", "xmrig.exe", "unknown.exe"}


def evaluate_alerts(metrics, processes=None):
    alerts = []
    processes = processes or []

    if metrics["cpu_percent"] >= 95:
        alerts.append({"level": "critical", "code": "CPU_CRITICAL", "message": "CPU usage is above 95%."})
    elif metrics["cpu_percent"] >= 90:
        alerts.append({"level": "warning", "code": "CPU_HIGH", "message": "CPU usage is above 90%."})

    if metrics["ram_percent"] >= 90:
        alerts.append({"level": "critical", "code": "RAM_CRITICAL", "message": "Memory pressure is above 90%."})
    elif metrics["ram_percent"] >= 85:
        alerts.append({"level": "warning", "code": "RAM_HIGH", "message": "RAM usage is above 85%."})

    if metrics["temperature_c"] and metrics["temperature_c"] >= 90:
        alerts.append({"level": "critical", "code": "TEMP_CRITICAL", "message": "Temperature is above 90C."})
    elif metrics["temperature_c"] and metrics["temperature_c"] >= 80:
        alerts.append({"level": "warning", "code": "TEMP_HIGH", "message": "Temperature is above 80C."})

    if metrics["disk_percent"] >= 95:
        alerts.append({"level": "critical", "code": "DISK_CRITICAL", "message": "Primary disk has less than 5% free space."})
    elif metrics["disk_percent"] >= 90:
        alerts.append({"level": "warning", "code": "DISK_LOW", "message": "Primary disk has less than 10% free space."})

    if metrics["battery_percent"] <= 15 and not metrics["battery_plugged"]:
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
