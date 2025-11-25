import threading
import time
import socket
import random
from .iot_client import publish_json, IoTClientSingleton

TOPIC_HEARTBEAT = "iot/streetlights/heartbeat"

class HeartbeatThread:
    def __init__(self, device_id: str = "pi-1", interval_sec: float = 1.0, jitter_pct: float = 0.0):
        self.device_id = device_id
        self.interval = max(0.2, float(interval_sec))
        self.jitter = max(0.0, min(0.5, float(jitter_pct)))
        self._thr = None
        self._stop = threading.Event()

    def _hostname(self):
        try:
            return socket.gethostname()
        except:
            return self.device_id

    def _next_delay(self) -> float:
        if self.jitter <= 0:
            return self.interval
        delta = self.interval * self.jitter
        return self.interval + random.uniform(-delta, +delta)

    def _sleep_stop(self, secs: float):
        end = time.time() + secs
        while not self._stop.is_set() and time.time() < end:
            time.sleep(min(0.05, end - time.time()))

    def _publish_once(self):
        publish_json(TOPIC_HEARTBEAT, {
            "device": self.device_id,
            "host": self._hostname(),
            "ts": int(time.time()),
            "ok": True
        }, qos=0, retain=False)

    def _run(self):
        # First publish immediately
        try:
            self._publish_once()
        except Exception as e:
            print(f"[HB] first publish error: {e}")
        # Then steady loop
        while not self._stop.is_set():
            self._sleep_stop(self._next_delay())
            if self._stop.is_set():
                break
            try:
                self._publish_once()
            except Exception as e:
                print(f"[HB] publish error: {e}")

    def start(self, daemon: bool = True):
        if self._thr and self._thr.is_alive():
            return
        IoTClientSingleton.get_client()  # ensure connect + loop_start
        self._stop.clear()
        self._thr = threading.Thread(target=self._run, daemon=daemon)
        self._thr.start()
        print(f"[HB] started: {self.device_id} interval={self.interval}s jitter={self.jitter*100:.0f}%")

    def stop(self, join_timeout: float = 1.0):
        self._stop.set()
        if self._thr:
            self._thr.join(timeout=join_timeout)
            self._thr = None
        print("[HB] stopped")
