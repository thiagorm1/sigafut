from flask import Flask
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app)

    # Configuracao de upload
    app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500 MB max

    # Register Blueprints
    from .blueprints.camera_bp import camera_bp
    app.register_blueprint(camera_bp, url_prefix='/api/cameras')

    @app.route('/')
    def index():
        return {"status": "SIGAFUT Python CV API is running"}

    return app
