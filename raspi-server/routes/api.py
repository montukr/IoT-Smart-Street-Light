from flask import Blueprint, jsonify, request
from lights.controller import StreetlightController

api_bp = Blueprint("api", __name__)
controller = StreetlightController()

@api_bp.route("/lights/status")
def status():
    return jsonify(controller.get_status())

@api_bp.route("/lights/<light_name>/<action>", methods=["POST"])
def manual_control(light_name, action):
    print("manual_control", light_name, action, "mode=", controller.mode)  # debug
    if light_name not in controller.lights:
        return jsonify({"error": "Invalid light"}), 400
    if action not in ["on", "off", "dim"]:
        return jsonify({"error": "Invalid action"}), 400
    if controller.mode != "manual":
        return jsonify({"error": "Not in manual mode"}), 409
    result = controller.control_light(light_name, override=action)
    ok = ("ok" in result and result["ok"]) or ("status" in result)
    return jsonify(result), (200 if ok else 400)

@api_bp.route("/mode", methods=["GET", "POST"])
def mode():
    if request.method == "GET":
        return jsonify({"mode": controller.mode})
    data = request.get_json(silent=True) or {}
    m = data.get("mode")
    res = controller.set_mode(m)
    return jsonify(res), (200 if "ok" in res else 400)

@api_bp.route("/brightness", methods=["POST"])
def brightness():
    data = request.get_json(silent=True) or {}
    dim = data.get("dim")
    bright = data.get("bright")
    res = controller.set_brightness(dim, bright)
    return jsonify(res)

@api_bp.route("/reset", methods=["POST"])
def reset():
    return jsonify(controller.reset())
