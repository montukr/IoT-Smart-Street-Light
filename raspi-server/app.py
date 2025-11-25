from flask import Flask
from flask_cors import CORS
from routes.api import api_bp
from mqtt.heartbeat import HeartbeatThread

app = Flask(__name__)
CORS(app)
app.register_blueprint(api_bp, url_prefix="/api")

# Start heartbeat after app/blueprint import
heartbeat = HeartbeatThread(device_id="pi-1", interval_sec=1.0, jitter_pct=0.0)
heartbeat.start()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
