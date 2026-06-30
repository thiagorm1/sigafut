import cv2
import json
import redis
import os
import uuid
from .detector import ObjectDetector
from .tracker import CentroidTracker, BallPossessionTracker
from .field_zones import FieldZones
from .event_analyzer import EventAnalyzer

# Status global dos processamentos
processing_tasks = {}


class VideoProcessor:
    """Orquestra o pipeline completo de analise de video.

    Pipeline: Le video -> Detecta objetos -> Rastreia -> Analisa eventos -> Publica no Redis
    """

    def __init__(self, match_id=1, zones_config=None, redis_host=None,
                 skip_frames=2, model_path='yolov8n.pt'):
        """Inicializa o processador de video.

        Args:
            match_id: ID da partida
            zones_config: Configuracao customizada de zonas do campo
            redis_host: Host do Redis
            skip_frames: Processar 1 a cada N frames (performance)
            model_path: Caminho do modelo YOLO
        """
        self.match_id = match_id
        self.zones_config = zones_config
        self.skip_frames = skip_frames
        self.model_path = model_path

        # Redis
        redis_host = redis_host or os.getenv('REDIS_HOST', 'localhost')
        self.redis = redis.Redis(host=redis_host, port=6379, db=0)

        # Componentes (inicializados no processo)
        self.detector = None
        self.player_tracker = None
        self.ball_possession = None
        self.field_zones = None
        self.event_analyzer = None

    def _init_components(self, frame_width, frame_height, fps):
        """Inicializa os componentes de CV com dimensoes do video."""
        self.detector = ObjectDetector(model_path=self.model_path, confidence=0.3)
        self.player_tracker = CentroidTracker(max_disappeared=30, max_distance=80)
        self.ball_possession = BallPossessionTracker(possession_distance=100, min_frames=3)
        self.field_zones = FieldZones(frame_width, frame_height, self.zones_config)
        self.event_analyzer = EventAnalyzer(self.field_zones, cooldown_seconds=3)
        self.event_analyzer.set_fps(fps)

    def _publish_event(self, event):
        """Publica evento no Redis para o Node.js capturar."""
        event_data = {
            'match_id': event['match_id'],
            'player_id': event['player_id'],
            'type': event['type'],
            'timestamp_match': event['timestamp_match'],
            'details': event.get('details', {}),
            'video_highlight_url': f"http://storage.sigafut.com/highlights/match_{event['match_id']}_frame_{event.get('frame', 0)}.mp4"
        }
        self.redis.publish('match:live_events', json.dumps(event_data))
        print(f"[CV] Event published: {event['type']} at {event['timestamp_match']}")

    def process_video(self, video_path, task_id=None):
        """Processa um video completo e detecta eventos.

        Args:
            video_path: Caminho do arquivo de video
            task_id: ID da task para tracking de progresso

        Returns:
            dict com estatisticas e eventos detectados
        """
        if task_id is None:
            task_id = str(uuid.uuid4())

        # Atualizar status
        processing_tasks[task_id] = {
            'status': 'initializing',
            'progress': 0,
            'events_detected': 0,
            'stats': {}
        }

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            processing_tasks[task_id]['status'] = 'error'
            processing_tasks[task_id]['error'] = 'Could not open video file'
            return processing_tasks[task_id]

        # Propriedades do video
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # Inicializar componentes
        self._init_components(width, height, fps)

        processing_tasks[task_id]['status'] = 'processing'
        processing_tasks[task_id]['total_frames'] = total_frames
        processing_tasks[task_id]['fps'] = fps

        frame_idx = 0
        all_events = []

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                frame_idx += 1

                # Pular frames para performance
                if frame_idx % self.skip_frames != 0:
                    self.event_analyzer.frame_count += 1
                    continue

                # 1. Detectar objetos
                detections = self.detector.detect(frame)

                # 2. Rastrear jogadores
                player_positions = self.player_tracker.update(detections['players'])

                # 3. Determinar posse de bola
                ball_pos = detections['ball']['center'] if detections['ball'] else None
                possession_change = self.ball_possession.get_possession_change(
                    player_positions, ball_pos
                )
                possessor = self.ball_possession.current_possessor

                # 4. Analisar eventos
                events = self.event_analyzer.analyze_frame(
                    ball_pos, player_positions, possession_change,
                    possessor, self.match_id
                )

                # 5. Publicar eventos detectados
                for event in events:
                    self._publish_event(event)
                    all_events.append(event)

                # Atualizar progresso
                progress = int((frame_idx / total_frames) * 100) if total_frames > 0 else 0
                processing_tasks[task_id].update({
                    'progress': min(progress, 100),
                    'events_detected': len(all_events),
                    'current_frame': frame_idx,
                    'stats': self.event_analyzer.get_stats()
                })

        except Exception as e:
            processing_tasks[task_id]['status'] = 'error'
            processing_tasks[task_id]['error'] = str(e)
            print(f"[CV] Error processing video: {e}")
            import traceback
            traceback.print_exc()
        finally:
            cap.release()

        # Finalizar
        final_stats = self.event_analyzer.get_stats()
        processing_tasks[task_id].update({
            'status': 'completed',
            'progress': 100,
            'events_detected': len(all_events),
            'stats': final_stats,
            'events': all_events
        })

        # Publicar resumo final
        summary = {
            'match_id': self.match_id,
            'type': 'analysis_complete',
            'player_id': -1,
            'timestamp_match': self.event_analyzer.get_match_time(),
            'details': final_stats
        }
        self.redis.publish('match:live_events', json.dumps(summary))

        print(f"[CV] Video processing complete. Stats: {final_stats}")
        return processing_tasks[task_id]
