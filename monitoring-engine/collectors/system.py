import logging
import os
import platform
import socket
import subprocess
import time

import psutil

try:
    import GPUtil
except ImportError:  # pragma: no cover - optional dependency
    GPUtil = None


class SystemCollector:
    def __init__(self):
        self._last_net = psutil.net_io_counters()
        self._last_net_pernic = psutil.net_io_counters(pernic=True)
        self._last_net_time = time.monotonic()
        self._retry_after = {}
        self._last_metrics = {
            "cpu_percent": 0,
            "ram_percent": 0,
            "gpu_percent": 0,
            "temperature_c": 0,
            "network_down_bps": 0,
            "network_up_bps": 0,
            "network_adapter_type": "NET",
            "network_adapter_name": "",
            "wifi_signal_percent": None,
            "disk_percent": 0,
            "battery_percent": None,
            "battery_plugged": None,
            "uptime_seconds": 0,
            "platform": platform.platform(),
        }

    def snapshot(self):
        metrics = dict(self._last_metrics)

        # Collector priority: CPU/RAM first, then network, disk, GPU/thermal last.
        metrics.update(self._safe_collect("cpu", self._cpu_metrics, ["cpu_percent"]))
        metrics.update(self._safe_collect("ram", self._ram_metrics, ["ram_percent"]))
        metrics.update(self._safe_collect("battery", self._battery_metrics, ["battery_percent", "battery_plugged"]))
        metrics.update(self._safe_collect("uptime", self._uptime_metrics, ["uptime_seconds"]))
        metrics.update(self._safe_collect("network", self._network_metrics, [
            "network_down_bps",
            "network_up_bps",
            "network_adapter_type",
            "network_adapter_name",
            "wifi_signal_percent",
        ]))
        metrics.update(self._safe_collect("disk", self._disk_metrics, ["disk_percent"]))
        metrics.update(self._safe_collect("gpu", self._gpu_metrics, ["gpu_percent", "temperature_c"]))
        metrics["platform"] = platform.platform()

        self._last_metrics = metrics
        return metrics

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

    def _safe_collect(self, name, collector, keys):
        if time.monotonic() < self._retry_after.get(name, 0):
            return {key: self._last_metrics[key] for key in keys}
        try:
            return collector()
        except Exception as error:
            self._retry_after[name] = time.monotonic() + 30
            logging.exception("Collector %s failed; retrying in 30 seconds: %s", name, error)
            return {key: self._last_metrics[key] for key in keys}

    def _cpu_metrics(self):
        return {"cpu_percent": round(psutil.cpu_percent(interval=None), 1)}

    def _ram_metrics(self):
        ram = psutil.virtual_memory()
        return {
            "ram_percent": round(ram.percent, 1),
        }

    def _battery_metrics(self):
        # Desktops often have no battery sensor; emit nulls so the overlay can hide the row.
        try:
            battery = psutil.sensors_battery()
            if not battery:
                return {"battery_percent": None, "battery_plugged": None}
            return {
                "battery_percent": round(battery.percent, 1),
                "battery_plugged": bool(battery.power_plugged),
            }
        except Exception:
            return {"battery_percent": None, "battery_plugged": None}

    @staticmethod
    def _uptime_metrics():
        # Keep uptime as seconds in the packet; the UI formats it for the compact overlay.
        try:
            return {"uptime_seconds": max(time.time() - psutil.boot_time(), 0)}
        except Exception:
            return {"uptime_seconds": 0}

    def _network_metrics(self):
        net = self._network_speed()
        return {
            "network_down_bps": round(net["down_bps"], 1),
            "network_up_bps": round(net["up_bps"], 1),
            "network_adapter_type": net["adapter_type"],
            "network_adapter_name": net["adapter_name"],
            "wifi_signal_percent": net["wifi_signal_percent"],
        }

    def _disk_metrics(self):
        disk_path = os.getenv("SystemDrive", "C:") + "\\" if platform.system() == "Windows" else "/"
        disk = psutil.disk_usage(disk_path)
        return {"disk_percent": round(disk.percent, 1)}

    def _gpu_metrics(self):
        gpu_percent, gpu_temp = self._gpu()
        temp = self._temperature(gpu_temp)
        return {
            "gpu_percent": round(gpu_percent, 1),
            "temperature_c": round(temp, 1),
        }

    def _network_speed(self):
        now = time.monotonic()
        current = psutil.net_io_counters()
        current_pernic = psutil.net_io_counters(pernic=True)
        elapsed = max(now - self._last_net_time, 0.001)
        adapter = self._active_network_adapter()

        if adapter and adapter["name"] in current_pernic and adapter["name"] in self._last_net_pernic:
            previous = self._last_net_pernic[adapter["name"]]
            selected = current_pernic[adapter["name"]]
            down_bps = (selected.bytes_recv - previous.bytes_recv) / elapsed
            up_bps = (selected.bytes_sent - previous.bytes_sent) / elapsed
            adapter_type = adapter["type"]
            adapter_name = adapter["name"]
        else:
            down_bps = (current.bytes_recv - self._last_net.bytes_recv) / elapsed
            up_bps = (current.bytes_sent - self._last_net.bytes_sent) / elapsed
            adapter_type = "NET"
            adapter_name = ""

        self._last_net = current
        self._last_net_pernic = current_pernic
        self._last_net_time = now
        return {
            "down_bps": max(down_bps, 0),
            "up_bps": max(up_bps, 0),
            "adapter_type": adapter_type,
            "adapter_name": adapter_name,
            "wifi_signal_percent": self._wifi_signal_percent() if adapter_type == "WiFi" else None,
        }

    def _active_network_adapter(self):
        try:
            stats = psutil.net_if_stats()
            addrs = psutil.net_if_addrs()
        except Exception:
            return None

        wifi = []
        ethernet = []
        for name, stat in stats.items():
            try:
                if not stat.isup or not self._has_ip_address(addrs.get(name, [])):
                    continue
                lowered = name.lower()
                if any(token in lowered for token in ("wi-fi", "wifi", "wlan", "wireless")):
                    wifi.append(name)
                elif not any(token in lowered for token in ("loopback", "virtual", "bluetooth", "vmware", "hyper-v", "vethernet")):
                    ethernet.append(name)
            except Exception:
                continue

        if wifi:
            return {"name": wifi[0], "type": "WiFi"}
        if ethernet:
            return {"name": ethernet[0], "type": "ETH"}
        return None

    @staticmethod
    def _has_ip_address(addresses):
        try:
            return any(address.family == socket.AF_INET for address in addresses)
        except Exception:
            return False

    @staticmethod
    def _wifi_signal_percent():
        if platform.system() != "Windows":
            return None
        try:
            output = subprocess.check_output(
                ["netsh", "wlan", "show", "interfaces"],
                stderr=subprocess.DEVNULL,
                text=True,
                timeout=2,
            )
            for line in output.splitlines():
                if "Signal" in line and ":" in line:
                    value = line.split(":", 1)[1].strip().replace("%", "")
                    return int(value)
        except Exception:
            return None
        return None

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
