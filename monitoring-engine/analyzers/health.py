def calculate_health_score(metrics, alerts, ai_result):
    score = 100
    score -= min(metrics["cpu_percent"] * 0.18, 18)
    score -= min(metrics["ram_percent"] * 0.16, 16)
    score -= min(metrics["disk_percent"] * 0.08, 8)
    if metrics["temperature_c"]:
        score -= max(metrics["temperature_c"] - 65, 0) * 0.7
    for alert in alerts:
        score -= 14 if alert["level"] == "critical" else 7
    if ai_result.get("anomaly"):
        score -= 10
    return max(0, min(100, round(score)))
