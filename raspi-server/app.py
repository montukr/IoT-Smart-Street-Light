from flask import Flask
from flask_cors import CORS
from routes.api import api_bp

app = Flask(__name__)
CORS(app)   # Enable CORS for all routes
app.register_blueprint(api_bp, url_prefix="/api")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
