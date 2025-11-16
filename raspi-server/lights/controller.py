import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)

PWM_FREQ = 10000

# Configuration for each street light
lights_config = {
    "LED1": {
        "led_pin": 12,
        "pir_pin": 9,
        "ldr1_pin": 4,
        "ldr2_pin": 17,
        "prox_pin": 27
    },
    "LED2": {
        "led_pin": 13,
        "pir_pin": 9,
        "ldr1_pin": 23,
        "ldr2_pin": 24,
        "prox_pin": 22
    },
    # Add more lights as needed
}

class StreetlightController:
    def __init__(self):
        self.lights = {}
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
                "state": {}
            }
        self.update_inputs()

    def update_inputs(self):
        for name, light in self.lights.items():
            cfg = light["config"]
            is_dark = GPIO.input(cfg["ldr1_pin"]) == GPIO.HIGH
            is_fault = GPIO.input(cfg["ldr2_pin"]) == GPIO.HIGH
            is_motion = GPIO.input(cfg["pir_pin"]) == GPIO.HIGH
            is_proximity = GPIO.input(cfg["prox_pin"]) == GPIO.LOW
            light["state"] = {
                "dark": is_dark,
                "fault": is_fault,
                "motion": is_motion,
                "proximity": is_proximity,
                "pwm_started": light["pwm_started"]
            }

    def control_light(self, name, override=None):
        # Manual override: "on" or "off", else automatic logic
        light = self.lights.get(name)
        if not light:
            return {"error": "Invalid light"}

        pwm = light["pwm"]
        cfg = light["config"]

        self.update_inputs()
        state = light["state"]

        if override == "on":
            if not light["pwm_started"]:
                pwm.start(100)
                light["pwm_started"] = True
            else:
                pwm.ChangeDutyCycle(100)
            return {"status": "ON manual override"}
        elif override == "off":
            if light["pwm_started"]:
                pwm.stop()
                light["pwm_started"] = False
            return {"status": "OFF manual override"}
        else:
            # Autonomous sensor logic (similar to your script)
            if state["dark"]:
                if not light["pwm_started"]:
                    pwm.start(1)
                    light["pwm_started"] = True

                if state["fault"]:
                    return {"status": "Fault detected"}

                if state["motion"] or state["proximity"]:
                    pwm.ChangeDutyCycle(100)
                    light["no_motion_start"] = None
                else:
                    if light["no_motion_start"] is None:
                        pwm.ChangeDutyCycle(100)
                        light["no_motion_start"] = time.time()
                    elif time.time() - light["no_motion_start"] >= 10:
                        pwm.ChangeDutyCycle(1)
            else:
                if light["pwm_started"]:
                    pwm.stop()
                    light["pwm_started"] = False
            return {"status": "Autonomous control"}

    def get_status(self):
        self.update_inputs()
        return {name: light["state"] for name, light in self.lights.items()}
