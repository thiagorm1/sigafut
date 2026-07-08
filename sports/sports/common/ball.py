from collections import deque

import cv2
import numpy as np
import supervision as sv


class BallAnnotator:
    """
    A class to annotate frames with circles of varying radii and colors.

    Attributes:
        radius (int): The maximum radius of the circles to be drawn.
        buffer (deque): A deque buffer to store recent coordinates for annotation.
        color_palette (sv.ColorPalette): A color palette for the circles.
        thickness (int): The thickness of the circle borders.
    """

    def __init__(self, radius: int, buffer_size: int = 5, thickness: int = 2):

        self.color_palette = sv.ColorPalette.from_matplotlib('jet', buffer_size)
        self.buffer = deque(maxlen=buffer_size)
        self.radius = radius
        self.thickness = thickness

    def interpolate_radius(self, i: int, max_i: int) -> int:
        """
        Interpolates the radius between 1 and the maximum radius based on the index.

        Args:
            i (int): The current index in the buffer.
            max_i (int): The maximum index in the buffer.

        Returns:
            int: The interpolated radius.
        """
        if max_i == 1:
            return self.radius
        return int(1 + i * (self.radius - 1) / (max_i - 1))

    def annotate(self, frame: np.ndarray, detections: sv.Detections) -> np.ndarray:
        """
        Annotates the frame with circles based on detections.

        Args:
            frame (np.ndarray): The frame to annotate.
            detections (sv.Detections): The detections containing coordinates.

        Returns:
            np.ndarray: The annotated frame.
        """
        xy = detections.get_anchors_coordinates(sv.Position.BOTTOM_CENTER).astype(int)
        self.buffer.append(xy)
        for i, xy in enumerate(self.buffer):
            color = self.color_palette.by_idx(i)
            interpolated_radius = self.interpolate_radius(i, len(self.buffer))
            for center in xy:
                frame = cv2.circle(
                    img=frame,
                    center=tuple(center),
                    radius=interpolated_radius,
                    color=color.as_bgr(),
                    thickness=self.thickness
                )
        return frame


class BallTracker:
    """
    A class used to track a soccer ball's position using AI detections, gracefully 
    falling back to mathematical Momentum Prediction during motion blur.
    """
    def __init__(self, buffer_size: int = 10):
        self.buffer = deque(maxlen=buffer_size)
        self.last_pos = None
        self.velocity = np.array([0.0, 0.0])
        self.missed_frames = 0

    def update(self, detections: sv.Detections) -> sv.Detections:
        xy = detections.get_anchors_coordinates(sv.Position.CENTER)
        
        index = -1
        if len(detections) > 0:
            if self.last_pos is None:
                self.last_pos = xy[0]
                index = 0
            else:
                # Predict where the ball should be using current velocity
                predicted_pos = self.last_pos + self.velocity
                
                # Find the detection closest to the PREDICTED position, not the old position
                distances = np.linalg.norm(xy - predicted_pos, axis=1)
                best_idx = int(np.argmin(distances))
                new_pos = xy[best_idx]
                
                # Use a stable search radius of 100 pixels to allow sudden kicks/bounces,
                # but prevent snapping to distant background noise like white socks.
                max_distance = 100
                if distances[best_idx] <= max_distance:
                    index = best_idx
                    self.velocity = 0.8 * (new_pos - self.last_pos) + 0.2 * self.velocity
                    self.last_pos = new_pos
                
            if index != -1:
                self.buffer.append(self.last_pos)
                self.missed_frames = 0
                return detections[[index]]

        # If no valid detections were found (or all were rejected as noise)
        self.missed_frames += 1
        if self.missed_frames > 60:
            self.last_pos = None
            self.velocity = np.array([0.0, 0.0])
            return detections

        # Momentum Hallucination
        if self.last_pos is not None:
            self.last_pos += self.velocity
            x, y = self.last_pos
            box = np.array([[x - 10, y - 10, x + 10, y + 10]], dtype=np.float32)
            return sv.Detections(xyxy=box)
            
        return detections
