from flask import Blueprint, request, jsonify
import redis
import json
import os
import threading
import time
import random

camera_bp = Blueprint('camera_bp', __name__)

# Redis setup
redis_host = os.getenv('REDIS_HOST', 'localhost')
r = redis.Redis(host=redis_host, port=6379, db=0)

def simulate_events(match_id):
    """Gera eventos aleatórios para simular o processamento da câmera."""
    event_types = ['goal', 'assist', 'save']
    players = [1, 2, 3, 4, 5, 10, 11] # IDs mockados
    
    while True:
        time.sleep(random.randint(10, 30)) # Espera entre 10 e 30 segundos
        
        event = {
            "match_id": match_id,
            "player_id": random.choice(players),
            "type": random.choice(event_types),
            "timestamp_match": time.strftime("%H:%M:%S", time.gmtime(random.randint(0, 3600))),
            "video_highlight_url": f"http://storage.sigafut.com/highlights/match_{match_id}_event_{random.randint(100, 999)}.mp4"
        }
        
        # Publica no Redis para o Node.js capturar
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
    
    # Inicia a simulação em uma thread separada para não bloquear o Flask
    thread = threading.Thread(target=simulate_events, args=(match_id,))
    thread.daemon = True
    thread.start()
    
    return jsonify({
        "status": "simulation_started", 
        "camera_id": camera_id,
        "message": "Mock events will be generated periodically"
    })
