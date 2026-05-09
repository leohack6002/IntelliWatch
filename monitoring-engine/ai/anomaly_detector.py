from collections import deque

import numpy as np
from sklearn.ensemble import IsolationForest


class AnomalyDetector:
    def __init__(self, window_size=90, warmup=30):
        self.window_size = window_size
        self.warmup = warmup
        self.samples = deque(maxlen=window_size)
        self.model = IsolationForest(contamination=0.08, random_state=42)
        self.ready = False

    def evaluate(self, metrics):
        vector = self._vector(metrics)
        self.samples.append(vector)

        if len(self.samples) >= self.warmup:
            matrix = np.array(self.samples)
            self.model.fit(matrix)
            self.ready = True

        if not self.ready:
            return {
                "anomaly": False,
                "confidence": 0.5,
                "insights": ["Learning normal system behavior. AI baseline is warming up."]
            }

        prediction = self.model.predict([vector])[0]
        score = self.model.decision_function([vector])[0]
        anomaly = prediction == -1
        insights = self._insights(metrics, anomaly)
        return {
            "anomaly": anomaly,
            "confidence": round(float(min(max(abs(score) * 10, 0.55), 0.99)), 2),
            "score": round(float(score), 4),
            "insights": insights
        }

    @staticmethod
    def _vector(metrics):
        return [
            metrics["cpu_percent"],
            metrics["ram_percent"],
            metrics["gpu_percent"],
            metrics["temperature_c"],
            metrics["disk_percent"],
            metrics["network_down_bps"] / 1024 / 1024,
            metrics["network_up_bps"] / 1024 / 1024,
        ]

    @staticmethod
    def _insights(metrics, anomaly):
        if anomaly:
            tips = ["Current behavior differs from the learned baseline."]
            if metrics["cpu_percent"] > 80:
                tips.append("CPU spike detected. Review top processes for runaway workloads.")
            if metrics["ram_percent"] > 80:
                tips.append("Memory pressure is rising. Watch for possible memory leaks.")
            if metrics["temperature_c"] > 75:
                tips.append("Thermal trend suggests possible overheating under sustained load.")
            return tips
        if metrics["temperature_c"] > 70:
            return ["System is stable, but thermal headroom is narrowing."]
        return ["System behavior is within the learned baseline.", "No immediate optimization required."]
