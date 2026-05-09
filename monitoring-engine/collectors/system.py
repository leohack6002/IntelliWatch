import os
import platform
import time

import psutil

try:
    import GPUtil
except ImportError:  # pragma: no cover - optional dependency
    GPUtil = None


class SystemCollector:
    def __init__(self):
        self._last_net = psutil.net_io_counters()
        self._last_net_time = time.monotonic()

    def snapshot(self):
        cpu = psutil.cpu_percent(interval=None)
        ram = psutil.virtual_memory()
        disk_path = os.getenv("SystemDrive", "C:") + "\\" if platform.system() == "Windows" else "/"
        disk = psutil.disk_usage(disk_path)
        net = self._network_speed()
        gpu_percent, gpu_temp = self._gpu()
        temp = self._temperature(gpu_temp)
        battery = psutil.sensors_battery()

        return {
            "cpu_percent": round(cpu, 1),
            "ram_percent": round(ram.percent, 1),
            "gpu_percent": round(gpu_percent, 1),
            "temperature_c": round(temp, 1),
            "network_down_bps": round(net["down_bps"], 1),
            "network_up_bps": round(net["up_bps"], 1),
            "disk_percent": round(disk.percent, 1),
            "battery_percent": round(battery.percent, 1) if battery else 100,
            "battery_plugged": battery.power_plugged if battery else True,
            "platform": platform.platform(),
        }

    def processes(self, limit=10):
        rows = []
        for proc in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent", "username"]):
            try:
                info = proc.info
                rows.append({
                    "pid": info["pid"],
                    "name": info["name"] or "unknown",
                    "cpu_percent": float(info["cpu_percent"] or 0),
                    "memory_percent": float(info["memory_percent"] or 0),
                    "username": info.get("username") or "",
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        rows.sort(key=lambda item: (item["cpu_percent"], item["memory_percent"]), reverse=True)
        return rows[:limit]

    def _network_speed(self):
        now = time.monotonic()
        current = psutil.net_io_counters()
        elapsed = max(now - self._last_net_time, 0.001)
        down_bps = (current.bytes_recv - self._last_net.bytes_recv) / elapsed
        up_bps = (current.bytes_sent - self._last_net.bytes_sent) / elapsed
        self._last_net = current
        self._last_net_time = now
        return {"down_bps": max(down_bps, 0), "up_bps": max(up_bps, 0)}

    def _gpu(self):
        if not GPUtil:
            return 0, None
        try:
            gpus = GPUtil.getGPUs()
        except Exception:
            return 0, None
        if not gpus:
            return 0, None
        gpu = gpus[0]
        return gpu.load * 100, gpu.temperature

    def _temperature(self, gpu_temp):
        if gpu_temp:
            return gpu_temp
        try:
            temps = psutil.sensors_temperatures()
        except (AttributeError, OSError):
            return 0
        readings = []
        for entries in temps.values():
            readings.extend(entry.current for entry in entries if entry.current)
        return max(readings) if readings else 0
