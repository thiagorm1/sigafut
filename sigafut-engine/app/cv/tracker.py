import numpy as np
from collections import OrderedDict


class CentroidTracker:
    """Rastreador de objetos baseado em centroides.

    Associa deteccoes entre frames usando distancia euclidiana
    entre centroides. Mantem IDs estaveis para cada objeto rastreado.
    """

    def __init__(self, max_disappeared=30, max_distance=80):
        """Inicializa o tracker.

        Args:
            max_disappeared: Frames sem deteccao antes de remover objeto
            max_distance: Distancia maxima para associar deteccoes
        """
        self.next_id = 0
        self.objects = OrderedDict()  # id -> centroid
        self.disappeared = OrderedDict()  # id -> frames disappeared count
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance

    def register(self, centroid):
        """Registra um novo objeto com centroide."""
        self.objects[self.next_id] = centroid
        self.disappeared[self.next_id] = 0
        self.next_id += 1
        return self.next_id - 1

    def deregister(self, object_id):
        """Remove um objeto rastreado."""
        del self.objects[object_id]
        del self.disappeared[object_id]

    def update(self, detections):
        """Atualiza o tracker com novas deteccoes.

        Args:
            detections: lista de dicts com 'center': [cx, cy]

        Returns:
            dict de id -> centroid para todos os objetos rastreados
        """
        if len(detections) == 0:
            for object_id in list(self.disappeared.keys()):
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)
            return self.objects

        input_centroids = np.array([d['center'] for d in detections])

        if len(self.objects) == 0:
            for centroid in input_centroids:
                self.register(centroid)
        else:
            object_ids = list(self.objects.keys())
            object_centroids = np.array(list(self.objects.values()))

            # Calcular distancias entre centroides existentes e novas deteccoes
            distances = np.linalg.norm(
                object_centroids[:, np.newaxis] - input_centroids[np.newaxis, :],
                axis=2
            )

            # Associar usando menor distancia (greedy)
            rows = distances.min(axis=1).argsort()
            cols = distances.argmin(axis=1)[rows]

            used_rows = set()
            used_cols = set()

            for (row, col) in zip(rows, cols):
                if row in used_rows or col in used_cols:
                    continue
                if distances[row, col] > self.max_distance:
                    continue

                object_id = object_ids[row]
                self.objects[object_id] = input_centroids[col]
                self.disappeared[object_id] = 0
                used_rows.add(row)
                used_cols.add(col)

            # Objetos nao associados: marcar como desaparecidos
            unused_rows = set(range(len(object_ids))) - used_rows
            for row in unused_rows:
                object_id = object_ids[row]
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)

            # Deteccoes nao associadas: registrar novos objetos
            unused_cols = set(range(len(input_centroids))) - used_cols
            for col in unused_cols:
                self.register(input_centroids[col])

        return self.objects


class BallPossessionTracker:
    """Determina qual jogador tem a posse da bola.

    Baseado na proximidade entre bola e jogadores rastreados.
    """

    def __init__(self, possession_distance=100, min_frames=3):
        """Inicializa o tracker de posse.

        Args:
            possession_distance: Distancia maxima (px) para considerar posse
            min_frames: Frames minimos de proximidade para confirmar posse
        """
        self.possession_distance = possession_distance
        self.min_frames = min_frames
        self.current_possessor = None
        self.proximity_counter = {}  # player_id -> frames proximo da bola

    def update(self, player_positions, ball_position):
        """Atualiza a posse de bola.

        Args:
            player_positions: dict de player_id -> centroid [cx, cy]
            ball_position: [cx, cy] da bola ou None

        Returns:
            player_id do jogador com posse, ou None
        """
        if ball_position is None:
            return self.current_possessor

        ball = np.array(ball_position)
        closest_player = None
        closest_distance = float('inf')

        for player_id, centroid in player_positions.items():
            dist = np.linalg.norm(np.array(centroid) - ball)
            if dist < closest_distance:
                closest_distance = dist
                closest_player = player_id

        # Resetar contadores de jogadores longe da bola
        for pid in list(self.proximity_counter.keys()):
            if pid != closest_player:
                self.proximity_counter[pid] = 0

        if closest_player is not None and closest_distance < self.possession_distance:
            self.proximity_counter[closest_player] = self.proximity_counter.get(closest_player, 0) + 1

            if self.proximity_counter[closest_player] >= self.min_frames:
                self.current_possessor = closest_player
                return self.current_possessor

        return self.current_possessor

    def get_possession_change(self, player_positions, ball_position):
        """Detecta mudanca de posse.

        Returns:
            tuple (previous_player_id, new_player_id) se houve mudanca, None caso contrario
        """
        prev = self.current_possessor
        current = self.update(player_positions, ball_position)

        if prev is not None and current is not None and prev != current:
            return (prev, current)
        return None
