import numpy as np
from ultralytics import YOLO


class ObjectDetector:
    """Detecta jogadores e bola usando YOLOv8."""

    # COCO classes: 0=person, 32=sports ball
    PERSON_CLASS = 0
    BALL_CLASS = 32

    def __init__(self, model_path='yolov8n.pt', confidence=0.3):
        """Inicializa o detector YOLO.

        Args:
            model_path: Caminho do modelo YOLO (baixa automaticamente se nao existir)
            confidence: Limiar de confianca minima para deteccoes
        """
        self.model = YOLO(model_path)
        self.confidence = confidence

    def detect(self, frame):
        """Detecta jogadores e bola em um frame.

        Args:
            frame: numpy array BGR do frame (OpenCV format)

        Returns:
            dict com 'players' e 'ball':
            - players: lista de dicts {bbox: [x1,y1,x2,y2], center: [cx,cy], confidence}
            - ball: dict {bbox, center, confidence} ou None se nao detectada
        """
        results = self.model(frame, conf=self.confidence, verbose=False)[0]

        players = []
        ball = None

        for box in results.boxes:
            cls = int(box.cls[0])
            conf = float(box.conf[0])
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2

            if cls == self.PERSON_CLASS:
                players.append({
                    'bbox': [x1, y1, x2, y2],
                    'center': [cx, cy],
                    'confidence': conf
                })
            elif cls == self.BALL_CLASS:
                if ball is None or conf > ball['confidence']:
                    ball = {
                        'bbox': [x1, y1, x2, y2],
                        'center': [cx, cy],
                        'confidence': conf
                    }

        return {'players': players, 'ball': ball}
