import RPi.GPIO as GPIO
import time
import threading
from mqtt.iot_client import publish_json

GPIO.setmode(GPIO.BCM)
PWM_FREQ = 10000

lights_config = {
    "LED1": {"led_pin": 12, "pir_pin": 9,  "ldr1_pin": 4,  "ldr2_pin": 17, "prox_pin": 27},
    "LED2": {"led_pin": 13, "pir_pin": 9,  "ldr1_pin": 23, "ldr2_pin": 24, "prox_pin": 22},
}

class StreetlightController:
    def __init__(self):
        self.lights = {}
        self.mode = "manual"
        self.dim_duty = 1
        self.bright_duty = 100
        self._stop_event = threading.Event()
        self._loop_thread = None

        for name, cfg in lights_config.items():
            GPIO.setup(cfg["led_pin"], GPIO.OUT)
            GPIO.setup(cfg["pir_pin"], GPIO.IN)
            GPIO.setup(cfg["ldr1_pin"], GPIO.IN)
            GPIO.setup(cfg["ldr2_pin"], GPIO.IN)
            GPIO.setup(cfg["prox_pin"], GPIO.IN)
            pwm = GPIO.PWM(cfg["led_pin"], PWM_FREQ)
            self.lights[name] = {
                "config": cfg,
                "pwm": pwm,
                "pwm_started": False,
                "no_motion_start": None,
                "fault_since": None,      # track start time of fault
                "override": None,         # "on" / "off" in manual mode
                "state": {
                    "dark": False,
                    "fault": False,
                    "motion": False,
                    "proximity": False,
                    "pwm_started": False,
                    "duty": 0,
                },
            }

    def _update_inputs(self, name):
        light = self.lights[name]
        cfg = light["config"]
        st = light["state"]
        st["dark"]       = GPIO.input(cfg["ldr1_pin"]) == GPIO.HIGH
        st["fault"]      = GPIO.input(cfg["ldr2_pin"]) == GPIO.HIGH
        st["motion"]     = GPIO.input(cfg["pir_pin"]) == GPIO.HIGH
        st["proximity"]  = GPIO.input(cfg["prox_pin"]) == GPIO.LOW
        st["pwm_started"]= light["pwm_started"]
        return st["dark"], st["fault"], st["motion"], st["proximity"]

    def _fresh_pwm(self, name):
        light = self.lights[name]
        cfg = light["config"]
        GPIO.setup(cfg["led_pin"], GPIO.OUT)
        try:
            light["pwm"].stop()
        except Exception:
            pass
        light["pwm"] = GPIO.PWM(cfg["led_pin"], PWM_FREQ)

    def _stop_pwm(self, name):
        light = self.lights[name]
        cfg = light["config"]
        try:
            if light["pwm_started"]:
                light["pwm"].stop()
        except Exception:
            pass
        light["pwm_started"] = False
        light["state"]["pwm_started"] = False
        light["state"]["duty"] = 0
        GPIO.setup(cfg["led_pin"], GPIO.OUT)
        GPIO.output(cfg["led_pin"], GPIO.LOW)

    def _emit_fault(self, light_name: str, reason: str):
        try:
            publish_json("iot/streetlights/fault", {
                "device": "pi-1",
                "light": light_name,
                "reason": reason,
                "ts": int(time.time())
            }, qos=1, retain=False)
        except Exception as e:
            print(f"[FAULT-PUB] error: {e}")

    def control_light(self, name, override=None):
        light = self.lights.get(name)
        if not light:
            return {"error": "Invalid light"}

        dark, fault, motion, prox = self._update_inputs(name)

        if override == "on":
            self._fresh_pwm(name)
            light = self.lights[name]
            try:
                light["pwm"].start(self.bright_duty)
                light["pwm_started"] = True
                light["state"]["pwm_started"] = True
                light["state"]["duty"] = self.bright_duty
                light["override"] = "on"
                print(f"[MANUAL] {name} -> ON (fresh PWM)")
                return {"ok": True, "status": "ON"}
            except Exception as e:
                print(f"[MANUAL] {name} ON failed: {e}")
                self._emit_fault(name, "manual_on_failed")
                return {"error": "on_failed"}

        if override == "dim":
            self._fresh_pwm(name)
            light = self.lights[name]
            try:
                light["pwm"].start(self.dim_duty)
                light["pwm_started"] = True
                light["state"]["pwm_started"] = True
                light["state"]["duty"] = self.dim_duty
                light["override"] = "on"
                print(f"[MANUAL] {name} -> DIM (fresh PWM {self.dim_duty}%)")
                return {"ok": True, "status": "DIM", "duty": self.dim_duty}
            except Exception as e:
                print(f"[MANUAL] {name} DIM failed: {e}")
                self._emit_fault(name, "manual_dim_failed")
                return {"error": "dim_failed"}

        if override == "off":
            self._stop_pwm(name)
            self.lights[name]["override"] = "off"
            self.lights[name]["fault_since"] = None  # UPDATED: clear any fault timer
            print(f"[MANUAL] {name} -> OFF (pin LOW)")
            return {"ok": True, "status": "OFF"}

        return {"ok": True}

    def _auto_one(self, name):
        light = self.lights[name]
        dark, fault, motion, prox = self._update_inputs(name)

        # clear fault_since when fault goes away
        if not fault and light.get("fault_since") is not None:
            light["fault_since"] = None

        if not dark:
            self._stop_pwm(name)
            return

        if not light["pwm_started"]:
            self._fresh_pwm(name)
            light = self.lights[name]
            try:
                light["pwm"].start(self.dim_duty)
                light["pwm_started"] = True
                light["state"]["pwm_started"] = True
                light["state"]["duty"] = self.dim_duty
            except Exception as e:
                print(f"[AUTO] {name} start failed: {e}")
                self._emit_fault(name, "auto_start_failed")
                return

        # fault handling with 10s delay before publishing to AWS
        if fault:
            now = time.time()
            if light.get("fault_since") is None:
                light["fault_since"] = now
            elif now - light["fault_since"] >= 10:
                self._emit_fault(name, "ldr2_fault_high_10s")
                light["fault_since"] = now + 1e9  # mark as notified

            light["pwm"].ChangeDutyCycle(self.dim_duty)
            light["state"]["duty"] = self.dim_duty
            return

        # Normal non-fault automatic behaviour
        if motion or prox:
            light["pwm"].ChangeDutyCycle(self.bright_duty)
            light["state"]["duty"] = self.bright_duty
            light["no_motion_start"] = None
        else:
            if light["no_motion_start"] is None:
                light["pwm"].ChangeDutyCycle(self.bright_duty)
                light["state"]["duty"] = self.bright_duty
                light["no_motion_start"] = time.time()
            elif time.time() - light["no_motion_start"] >= 10:
                light["pwm"].ChangeDutyCycle(self.dim_duty)
                light["state"]["duty"] = self.dim_duty

    def _loop(self):
        for name in self.lights:
            self.lights[name]["no_motion_start"] = None
        while not self._stop_event.is_set():
            if self.mode == "auto":
                for name in self.lights:
                    self._auto_one(name)
            time.sleep(1)

    def _start_loop(self):
        if self._loop_thread and self._loop_thread.is_alive():
            return
        self._stop_event.clear()
        self._loop_thread = threading.Thread(target=self._loop, daemon=True)
        self._loop_thread.start()

    def _stop_loop(self):
        self._stop_event.set()
        if self._loop_thread:
            self._loop_thread.join(timeout=1)

    def set_mode(self, mode):
        if mode not in ("auto", "manual"):
            return {"error": "invalid mode"}
        self.mode = mode
        if mode == "auto":
            self._start_loop()
        else:
            self._stop_loop()
        return {"ok": True, "mode": self.mode}

    def set_brightness(self, dim=None, bright=None):
        if dim is not None:
            self.dim_duty = max(0, min(100, int(dim)))
        if bright is not None:
            self.bright_duty = max(0, min(100, int(bright)))
        return {"ok": True, "dim": self.dim_duty, "bright": self.bright_duty}

    def get_status(self):
        for name, info in self.lights.items():
            self._update_inputs(name)
            # UPDATED: if user manually turned this light OFF, hide fault in UI
            if self.mode == "manual" and info.get("override") == "off":
                info["state"]["fault"] = False
        return {
            "mode": self.mode,
            "lights": {name: info["state"] for name, info in self.lights.items()},
        }

    def reset(self):
        for name in self.lights:
            self.control_light(name, override="off")
            self.lights[name]["override"] = None
            self.lights[name]["fault_since"] = None
        return {"ok": True}

    def cleanup(self):
        try:
            for name in self.lights:
                self._stop_pwm(name)
        finally:
            GPIO.cleanup()

