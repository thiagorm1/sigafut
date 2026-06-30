import time
from collections import deque


class EventAnalyzer:
    """Analisa dados de rastreamento para detectar eventos de partida.

    Eventos detectados:
    - Gol: bola entra em zona de gol
    - Passe: posse de bola muda entre jogadores
    - Assistencia: ultimo passe antes de um gol
    """

    def __init__(self, field_zones, cooldown_seconds=5):
        """Inicializa o analisador de eventos.

        Args:
            field_zones: instancia de FieldZones
            cooldown_seconds: Tempo minimo entre eventos do mesmo tipo
        """
        self.field_zones = field_zones
        self.cooldown_seconds = cooldown_seconds

        # Estado interno
        self.events = []
        self.last_event_time = {}
        self.ball_in_goal = False
        self.recent_passes = deque(maxlen=5)
        self.frame_count = 0
        self.fps = 30

        # Contadores
        self.stats = {
            'goals': 0,
            'passes': 0,
            'assists': 0
        }

    def set_fps(self, fps):
        """Define o FPS do video para calculo de timestamps."""
        self.fps = fps if fps > 0 else 30

    def get_match_time(self):
        """Retorna o tempo de partida baseado no frame atual."""
        total_seconds = int(self.frame_count / self.fps)
        minutes = total_seconds // 60
        seconds = total_seconds % 60
        return f"{minutes:02d}:{seconds:02d}"

    def _can_emit_event(self, event_type):
        """Verifica se o cooldown permite emitir evento."""
        now = time.time()
        last = self.last_event_time.get(event_type, 0)
        if now - last < self.cooldown_seconds:
            return False
        self.last_event_time[event_type] = now
        return True

    def _create_event(self, event_type, player_id, match_id, details=None):
        """Cria um objeto de evento padronizado."""
        event = {
            'match_id': match_id,
            'player_id': player_id,
            'type': event_type,
            'timestamp_match': self.get_match_time(),
            'frame': self.frame_count,
            'details': details or {}
        }
        self.events.append(event)
        return event

    def check_goal(self, ball_position, possessor_id, match_id):
        """Verifica se ocorreu um gol."""
        if ball_position is None:
            self.ball_in_goal = False
            return None

        in_goal_left = self.field_zones.is_in_zone(ball_position, 'goal_left')
        in_goal_right = self.field_zones.is_in_zone(ball_position, 'goal_right')

        if (in_goal_left or in_goal_right) and not self.ball_in_goal:
            if self._can_emit_event('goal'):
                self.ball_in_goal = True
                self.stats['goals'] += 1

                goal_side = 'left' if in_goal_left else 'right'
                scorer = possessor_id if possessor_id is not None else -1

                event = self._create_event(
                    'goal', scorer, match_id,
                    {'goal_side': goal_side}
                )

                # Verificar assistencia
                self._check_assist(scorer, match_id)

                return event
        elif not in_goal_left and not in_goal_right:
            self.ball_in_goal = False

        return None

    def check_pass(self, possession_change, match_id):
        """Verifica se ocorreu um passe."""
        if possession_change is None:
            return None

        prev_player, new_player = possession_change

        if self._can_emit_event('pass'):
            self.stats['passes'] += 1

            pass_event = self._create_event(
                'pass', prev_player, match_id,
                {'from_player': prev_player, 'to_player': new_player}
            )

            self.recent_passes.append({
                'from_player': prev_player,
                'to_player': new_player,
                'frame': self.frame_count,
                'time': self.get_match_time()
            })

            return pass_event

        return None

    def _check_assist(self, scorer_id, match_id):
        """Verifica se o gol teve assistencia."""
        for pass_data in reversed(self.recent_passes):
            if pass_data['to_player'] == scorer_id:
                frames_diff = self.frame_count - pass_data['frame']
                seconds_diff = frames_diff / self.fps

                if seconds_diff <= 10:
                    self.stats['assists'] += 1
                    assist_event = self._create_event(
                        'assist', pass_data['from_player'], match_id,
                        {'assisted_player': scorer_id, 'pass_time': pass_data['time']}
                    )
                    return assist_event

        return None

    def analyze_frame(self, ball_position, player_positions, possession_change,
                      possessor_id, match_id):
        """Analisa um frame completo para todos os tipos de evento."""
        self.frame_count += 1
        detected_events = []

        pass_event = self.check_pass(possession_change, match_id)
        if pass_event:
            detected_events.append(pass_event)

        goal_event = self.check_goal(ball_position, possessor_id, match_id)
        if goal_event:
            detected_events.append(goal_event)

        return detected_events

    def get_stats(self):
        """Retorna estatisticas acumuladas."""
        return self.stats.copy()

    def get_all_events(self):
        """Retorna todos os eventos detectados."""
        return self.events.copy()
