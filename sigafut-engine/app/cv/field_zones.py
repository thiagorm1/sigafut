import numpy as np


class FieldZones:
    """Define zonas do campo de futsal para deteccao contextual de eventos.

    As zonas sao definidas como retangulos normalizados (0-1) relativos
    ao tamanho do frame, permitindo funcionar com qualquer resolucao.
    """

    def __init__(self, frame_width, frame_height, zones_config=None):
        """Inicializa as zonas do campo.

        Args:
            frame_width: Largura do frame em pixels
            frame_height: Altura do frame em pixels
            zones_config: dict opcional com zonas customizadas.
                          Formato: {'goal_left': [x1,y1,x2,y2], ...}
                          Valores normalizados 0-1.
        """
        self.width = frame_width
        self.height = frame_height

        if zones_config:
            self.zones = zones_config
        else:
            # Zonas padrao para camera fixa com visao lateral do campo
            self.zones = {
                'goal_left': [0.0, 0.25, 0.08, 0.75],
                'goal_right': [0.92, 0.25, 1.0, 0.75],
                'midfield': [0.40, 0.0, 0.60, 1.0],
                'left_half': [0.0, 0.0, 0.50, 1.0],
                'right_half': [0.50, 0.0, 1.0, 1.0],
            }

    def get_zone_pixels(self, zone_name):
        """Retorna a zona em coordenadas de pixel."""
        zone = self.zones[zone_name]
        return (
            int(zone[0] * self.width),
            int(zone[1] * self.height),
            int(zone[2] * self.width),
            int(zone[3] * self.height)
        )

    def is_in_zone(self, point, zone_name):
        """Verifica se um ponto esta dentro de uma zona."""
        if zone_name not in self.zones:
            return False
        x1, y1, x2, y2 = self.get_zone_pixels(zone_name)
        return x1 <= point[0] <= x2 and y1 <= point[1] <= y2

    def get_zone_for_point(self, point):
        """Retorna em quais zonas um ponto se encontra."""
        zones = []
        for zone_name in self.zones:
            if self.is_in_zone(point, zone_name):
                zones.append(zone_name)
        return zones

    def update_zones(self, zones_config):
        """Atualiza as zonas com nova configuracao."""
        self.zones.update(zones_config)

    def draw_zones(self, frame):
        """Desenha as zonas no frame para debug/visualizacao."""
        import cv2

        colors = {
            'goal_left': (0, 0, 255),
            'goal_right': (0, 0, 255),
            'midfield': (0, 255, 255),
        }

        for zone_name, zone in self.zones.items():
            if zone_name in ('left_half', 'right_half'):
                continue
            x1, y1, x2, y2 = self.get_zone_pixels(zone_name)
            color = colors.get(zone_name, (0, 255, 0))
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, zone_name, (x1 + 5, y1 + 20),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

        return frame
