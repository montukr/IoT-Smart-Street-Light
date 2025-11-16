from flask import Blueprint, jsonify, request
from lights.controller import StreetlightController

api_bp = Blueprint("api", __name__)
controller = StreetlightController()

@api_bp.route("/lights/status")
def status():
    return jsonify(controller.get_status())

@api_bp.route("/lights/<light_name>/<action>", methods=["POST"])
def manual_control(light_name, action):
    if light_name not in controller.lights:
        return jsonify({"error": "Invalid light"}), 400
    if action not in ["on", "off"]:
        return jsonify({"error": "Invalid action"}), 400
    result = controller.control_light(light_name, override=action)
    return jsonify(result)
