import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)

# Configuration for each street light
lights = {
    "LED1": {
        "led_pin": 12,
        "pir_pin": 9,
        "ldr1_pin": 4,
        "ldr2_pin": 17,
        "prox_pin": 27,
        "pwm": None,
        "pwm_started": False,
        "no_motion_start": None
    },
    "LED2": {
        "led_pin": 13,
        "pir_pin": 9,              # You can assign different motion sensor pins if available
        "ldr1_pin": 23,
        "ldr2_pin": 24,
        "prox_pin": 22,
        "pwm": None,
        "pwm_started": False,
        "no_motion_start": None
    },
    # Add more lights here as needed
}

PWM_FREQ = 10000

def setup_pins(light):
    GPIO.setup(light["led_pin"], GPIO.OUT)
    GPIO.setup(light["pir_pin"], GPIO.IN)
    GPIO.setup(light["ldr1_pin"], GPIO.IN)
    GPIO.setup(light["ldr2_pin"], GPIO.IN)
    GPIO.setup(light["prox_pin"], GPIO.IN)
    light["pwm"] = GPIO.PWM(light["led_pin"], PWM_FREQ)

def read_inputs(light):
    is_dark = GPIO.input(light["ldr1_pin"]) == GPIO.HIGH
    is_fault = GPIO.input(light["ldr2_pin"]) == GPIO.HIGH   # Later change this from low to high
    is_motion = GPIO.input(light["pir_pin"]) == GPIO.HIGH
    is_proximity = GPIO.input(light["prox_pin"]) == GPIO.LOW
    return is_dark, is_fault, is_motion, is_proximity

def control_light(light_name, light, is_dark, is_fault, is_motion, is_proximity):
    if is_dark:
        if not light["pwm_started"]:
            light["pwm"].start(0.5)
            light["pwm_started"] = True

        if is_fault:
            print(f"{light_name} Fault Detected")
            time.sleep(1)
            return

        if is_motion or is_proximity:
            light["pwm"].ChangeDutyCycle(100)
            light["no_motion_start"] = None
            print(f"{light_name} Motion Detected")
        else:
            if light["no_motion_start"] is None:
                light["pwm"].ChangeDutyCycle(100)
                light["no_motion_start"] = time.time()
                print(f"{light_name} No Motion detected, starting timer")
            elif time.time() - light["no_motion_start"] >= 10:
                light["pwm"].ChangeDutyCycle(1)
                print(f"{light_name} No Motion for 10 seconds, dim LED")
    else:
        if light["pwm_started"]:
            light["pwm"].stop()
            light["pwm_started"] = False
        print(f"{light_name} Daytime - LED off")

try:
    # Setup all pins and PWM
    for light_name, light in lights.items():
        setup_pins(light)

    while True:
        for light_name, light in lights.items():
            is_dark, is_fault, is_motion, is_proximity = read_inputs(light)
            control_light(light_name, light, is_dark, is_fault, is_motion, is_proximity)
        time.sleep(1)

except KeyboardInterrupt:
    for light in lights.values():
        if light["pwm_started"]:
            light["pwm"].stop()
    GPIO.cleanup()
