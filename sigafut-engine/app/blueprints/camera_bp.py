from flask import Blueprint, request, jsonify
import redis
import json
import os
import threading
import time
import random
import uuid

camera_bp = Blueprint('camera_bp', __name__)

# Redis setup
redis_host = os.getenv('REDIS_HOST', 'localhost')
r = redis.Redis(host=redis_host, port=6379, db=0)

# Upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)


def simulate_events(match_id):
    """Gera eventos aleatorios para simular o processamento da camera."""
    event_types = ['goal', 'assist', 'save', 'pass']
    players = [1, 2, 3, 4, 5, 10, 11]  # IDs mockados

    while True:
        time.sleep(random.randint(10, 30))

        event = {
            "match_id": match_id,
            "player_id": random.choice(players),
            "type": random.choice(event_types),
            "timestamp_match": time.strftime("%H:%M:%S", time.gmtime(random.randint(0, 3600))),
            "video_highlight_url": f"http://storage.sigafut.com/highlights/match_{match_id}_event_{random.randint(100, 999)}.mp4",
            "details": {}
        }

        r.publish('match:live_events', json.dumps(event))
        print(f"Simulated event published: {event['type']}")


@camera_bp.route('/', methods=['GET'])
def get_cameras():
    return jsonify({"cameras": []})


@camera_bp.route('/start', methods=['POST'])
def start_camera():
    data = request.json
    camera_id = data.get('camera_id')
    match_id = data.get('match_id', 1)

    thread = threading.Thread(target=simulate_events, args=(match_id,))
    thread.daemon = True
    thread.start()

    return jsonify({
        "status": "simulation_started",
        "camera_id": camera_id,
        "message": "Mock events will be generated periodically"
    })


@camera_bp.route('/upload', methods=['POST'])
def upload_video():
    """Upload de video para analise por visao computacional."""
    if 'video' not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    video_file = request.files['video']
    if video_file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    # Validar extensao
    allowed_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.webm'}
    ext = os.path.splitext(video_file.filename)[1].lower()
    if ext not in allowed_extensions:
        return jsonify({"error": f"File type {ext} not allowed. Allowed: {list(allowed_extensions)}"}), 400

    # Salvar arquivo
    task_id = str(uuid.uuid4())
    filename = f"{task_id}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    video_file.save(filepath)

    # Pegar parametros
    match_id = request.form.get('match_id', 1, type=int)
    skip_frames = request.form.get('skip_frames', 3, type=int)

    # Configuracao de zonas customizadas (opcional)
    zones_config = None
    zones_json = request.form.get('zones_config')
    if zones_json:
        try:
            zones_config = json.loads(zones_json)
        except json.JSONDecodeError:
            pass

    # Iniciar processamento em thread separada
    def run_analysis():
        from ..cv.video_processor import VideoProcessor, processing_tasks
        processor = VideoProcessor(
            match_id=match_id,
            zones_config=zones_config,
            skip_frames=skip_frames
        )
        processor.process_video(filepath, task_id)

    thread = threading.Thread(target=run_analysis)
    thread.daemon = True
    thread.start()

    return jsonify({
        "status": "processing_started",
        "task_id": task_id,
        "message": "Video uploaded and analysis started"
    })


@camera_bp.route('/analysis/<task_id>', methods=['GET'])
def get_analysis_status(task_id):
    """Retorna o status do processamento de um video."""
    from ..cv.video_processor import processing_tasks

    if task_id not in processing_tasks:
        return jsonify({"error": "Task not found"}), 404

    task = processing_tasks[task_id]
    response = {
        "task_id": task_id,
        "status": task.get('status'),
        "progress": task.get('progress', 0),
        "events_detected": task.get('events_detected', 0),
        "stats": task.get('stats', {})
    }

    if task.get('status') == 'error':
        response['error'] = task.get('error')

    if task.get('status') == 'completed':
        response['events'] = task.get('events', [])

    return jsonify(response)


@camera_bp.route('/configure-zones', methods=['POST'])
def configure_zones():
    """Configura zonas do campo para deteccao de eventos."""
    data = request.json
    if not data or 'zones' not in data:
        return jsonify({"error": "No zones configuration provided"}), 400

    zones = data['zones']
    for name, coords in zones.items():
        if not isinstance(coords, list) or len(coords) != 4:
            return jsonify({"error": f"Zone '{name}' must have 4 coordinates [x1, y1, x2, y2]"}), 400
        if not all(0 <= c <= 1 for c in coords):
            return jsonify({"error": f"Zone '{name}' coordinates must be normalized (0-1)"}), 400

    return jsonify({
        "status": "zones_configured",
        "zones": zones,
        "message": "Zones will be applied to next video analysis"
    })
