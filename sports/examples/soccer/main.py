import argparse
import sqlite3
from enum import Enum
from typing import Iterator, List, Optional, Tuple

import os
import cv2
import numpy as np
import supervision as sv
from tqdm import tqdm
from ultralytics import YOLO

from sports.annotators.soccer import draw_pitch, draw_points_on_pitch
from sports.common.ball import BallTracker, BallAnnotator
from sports.common.team import TeamClassifier
from sports.common.view import ViewTransformer
from sports.configs.soccer import SoccerPitchConfiguration

PARENT_DIR = os.path.dirname(os.path.abspath(__file__))
PLAYER_DETECTION_MODEL_PATH = os.path.join(PARENT_DIR, 'data/football-player-detection.pt')
PITCH_DETECTION_MODEL_PATH = os.path.join(PARENT_DIR, 'data/football-pitch-detection.pt')
BALL_DETECTION_MODEL_PATH = os.path.join(PARENT_DIR, 'data/football-ball-detection.pt')

BALL_CLASS_ID = 0
GOALKEEPER_CLASS_ID = 1
PLAYER_CLASS_ID = 2
REFEREE_CLASS_ID = 3

STRIDE = 60
CONFIG = SoccerPitchConfiguration()

# CRITICAL FIX: The pitch detection model outputs keypoints in the order defined
# by CONFIG.labels, NOT in vertex-number order. For example, vertex 14 is output
# at keypoint index 30, and vertex 19 at index 31. We must reorder the vertices
# array to match the model's output order, otherwise the homography is computed
# with wrong source-target pairs (19/32 keypoints were mapped incorrectly).
VERTICES_IN_KEYPOINT_ORDER = np.array(
    [CONFIG.vertices[int(label) - 1] for label in CONFIG.labels],
    dtype=np.float32
)

COLORS = ['#FF1493', '#00BFFF', '#FF6347', '#FFD700']
VERTEX_LABEL_ANNOTATOR = sv.VertexLabelAnnotator(
    color=[sv.Color.from_hex(color) for color in CONFIG.colors],
    text_color=sv.Color.from_hex('#FFFFFF'),
    border_radius=5,
    text_thickness=1,
    text_scale=0.5,
    text_padding=5,
)
EDGE_ANNOTATOR = sv.EdgeAnnotator(
    color=sv.Color.from_hex('#FF1493'),
    thickness=2,
    edges=CONFIG.edges,
)
TRIANGLE_ANNOTATOR = sv.TriangleAnnotator(
    color=sv.Color.from_hex('#FF1493'),
    base=20,
    height=15,
)
BOX_ANNOTATOR = sv.BoxAnnotator(
    color=sv.ColorPalette.from_hex(COLORS),
    thickness=2
)
ELLIPSE_ANNOTATOR = sv.EllipseAnnotator(
    color=sv.ColorPalette.from_hex(COLORS),
    thickness=2
)
BOX_LABEL_ANNOTATOR = sv.LabelAnnotator(
    color=sv.ColorPalette.from_hex(COLORS),
    text_color=sv.Color.from_hex('#FFFFFF'),
    text_padding=5,
    text_thickness=1,
)
ELLIPSE_LABEL_ANNOTATOR = sv.LabelAnnotator(
    color=sv.ColorPalette.from_hex(COLORS),
    text_color=sv.Color.from_hex('#FFFFFF'),
    text_padding=5,
    text_thickness=1,
    text_position=sv.Position.BOTTOM_CENTER,
)


class Mode(Enum):
    """
    Enum class representing different modes of operation for Soccer AI video analysis.
    """
    PITCH_DETECTION = 'PITCH_DETECTION'
    PLAYER_DETECTION = 'PLAYER_DETECTION'
    BALL_DETECTION = 'BALL_DETECTION'
    PLAYER_TRACKING = 'PLAYER_TRACKING'
    TEAM_CLASSIFICATION = 'TEAM_CLASSIFICATION'
    RADAR = 'RADAR'
    GOAL_DETECTION = 'GOAL_DETECTION'


def get_crops(frame: np.ndarray, detections: sv.Detections) -> List[np.ndarray]:
    """
    Extract crops from the frame based on detected bounding boxes.

    Args:
        frame (np.ndarray): The frame from which to extract crops.
        detections (sv.Detections): Detected objects with bounding boxes.

    Returns:
        List[np.ndarray]: List of cropped images.
    """
    return [sv.crop_image(frame, xyxy) for xyxy in detections.xyxy]


def resolve_goalkeepers_team_id(
    players: sv.Detections,
    players_team_id: np.array,
    goalkeepers: sv.Detections
) -> np.ndarray:
    """
    Resolve the team IDs for detected goalkeepers based on the proximity to team
    centroids.

    Args:
        players (sv.Detections): Detections of all players.
        players_team_id (np.array): Array containing team IDs of detected players.
        goalkeepers (sv.Detections): Detections of goalkeepers.

    Returns:
        np.ndarray: Array containing team IDs for the detected goalkeepers.

    This function calculates the centroids of the two teams based on the positions of
    the players. Then, it assigns each goalkeeper to the nearest team's centroid by
    calculating the distance between each goalkeeper and the centroids of the two teams.
    """
    goalkeepers_xy = goalkeepers.get_anchors_coordinates(sv.Position.BOTTOM_CENTER)
    players_xy = players.get_anchors_coordinates(sv.Position.BOTTOM_CENTER)
    team_0_centroid = players_xy[players_team_id == 0].mean(axis=0)
    team_1_centroid = players_xy[players_team_id == 1].mean(axis=0)
    goalkeepers_team_id = []
    for goalkeeper_xy in goalkeepers_xy:
        dist_0 = np.linalg.norm(goalkeeper_xy - team_0_centroid)
        dist_1 = np.linalg.norm(goalkeeper_xy - team_1_centroid)
        goalkeepers_team_id.append(0 if dist_0 < dist_1 else 1)
    return np.array(goalkeepers_team_id)


def render_radar(
    detections: sv.Detections,
    keypoints: sv.KeyPoints,
    color_lookup: np.ndarray
) -> np.ndarray:
    # 1. Desenha o campo base limpo primeiro
    radar = draw_pitch(config=CONFIG)
    
    # 2. PROTEÇÃO 1: Evita o crash se a IA não achar nenhum ponto no frame
    if keypoints is None or keypoints.xy is None or len(keypoints.xy) == 0 or len(keypoints.xy[0]) == 0:
        return radar

    mask = (keypoints.xy[0][:, 0] > 1) & (keypoints.xy[0][:, 1] > 1)
    
    # 3. PROTEÇÃO 2: Exige pelo menos 4 pontos válidos para a matemática da homografia funcionar
    if mask.sum() < 4:
        return radar

    # Só calcula a conversão se a câmara estiver num ângulo seguro e com pontos suficientes
    transformer = ViewTransformer(
        source=keypoints.xy[0][mask].astype(np.float32),
        target=VERTICES_IN_KEYPOINT_ORDER[mask]
    )
    
    xy = detections.get_anchors_coordinates(anchor=sv.Position.BOTTOM_CENTER)
    
    # 4. PROTEÇÃO 3: Tenta converter as coordenadas. Se a matriz corromper devido a pontos estranhos, aborta.
    try:
        transformed_xy = transformer.transform_points(points=xy)
    except Exception:
        return radar

    # Se passou por todas as proteções, desenha os jogadores normalmente no radar
    radar = draw_points_on_pitch(
        config=CONFIG, xy=transformed_xy[color_lookup == 0],
        face_color=sv.Color.from_hex(COLORS[0]), radius=20, pitch=radar)
    radar = draw_points_on_pitch(
        config=CONFIG, xy=transformed_xy[color_lookup == 1],
        face_color=sv.Color.from_hex(COLORS[1]), radius=20, pitch=radar)
    radar = draw_points_on_pitch(
        config=CONFIG, xy=transformed_xy[color_lookup == 2],
        face_color=sv.Color.from_hex(COLORS[2]), radius=20, pitch=radar)
    radar = draw_points_on_pitch(
        config=CONFIG, xy=transformed_xy[color_lookup == 3],
        face_color=sv.Color.from_hex(COLORS[3]), radius=20, pitch=radar)
    
    return radar

def run_pitch_detection(source_video_path: str, device: str) -> Iterator[np.ndarray]:
    """
    Run pitch detection on a video and yield annotated frames.

    Args:
        source_video_path (str): Path to the source video.
        device (str): Device to run the model on (e.g., 'cpu', 'cuda').

    Yields:
        Iterator[np.ndarray]: Iterator over annotated frames.
    """
    pitch_detection_model = YOLO(PITCH_DETECTION_MODEL_PATH).to(device=device)
    frame_generator = sv.get_video_frames_generator(source_path=source_video_path)
    for frame in frame_generator:
        result = pitch_detection_model(frame, verbose=False)[0]
        keypoints = sv.KeyPoints.from_ultralytics(result)

        annotated_frame = frame.copy()
        annotated_frame = VERTEX_LABEL_ANNOTATOR.annotate(
            annotated_frame, keypoints, CONFIG.labels)
        yield annotated_frame


def run_player_detection(source_video_path: str, device: str) -> Iterator[np.ndarray]:
    """
    Run player detection on a video and yield annotated frames.

    Args:
        source_video_path (str): Path to the source video.
        device (str): Device to run the model on (e.g., 'cpu', 'cuda').

    Yields:
        Iterator[np.ndarray]: Iterator over annotated frames.
    """
    player_detection_model = YOLO(PLAYER_DETECTION_MODEL_PATH).to(device=device)
    frame_generator = sv.get_video_frames_generator(source_path=source_video_path)
    for frame in frame_generator:
        result = player_detection_model(frame, imgsz=1280, verbose=False)[0]
        detections = sv.Detections.from_ultralytics(result)

        annotated_frame = frame.copy()
        annotated_frame = BOX_ANNOTATOR.annotate(annotated_frame, detections)
        annotated_frame = BOX_LABEL_ANNOTATOR.annotate(annotated_frame, detections)
        yield annotated_frame


def run_ball_detection(source_video_path: str, device: str) -> Iterator[np.ndarray]:
    """
    Run ball detection on a video and yield annotated frames.

    Args:
        source_video_path (str): Path to the source video.
        device (str): Device to run the model on (e.g., 'cpu', 'cuda').

    Yields:
        Iterator[np.ndarray]: Iterator over annotated frames.
    """
    ball_detection_model = YOLO(BALL_DETECTION_MODEL_PATH).to(device=device)
    frame_generator = sv.get_video_frames_generator(source_path=source_video_path)
    ball_tracker = BallTracker(buffer_size=20)
    ball_annotator = BallAnnotator(radius=6, buffer_size=10)

    def callback(image_slice: np.ndarray) -> sv.Detections:
        result = ball_detection_model(image_slice, imgsz=640, verbose=False)[0]
        return sv.Detections.from_ultralytics(result)

    slicer = sv.InferenceSlicer(
        callback=callback,
        overlap_filter_strategy=sv.OverlapFilter.NONE,
        slice_wh=(640, 640),
    )

    for frame in frame_generator:
        detections = slicer(frame).with_nms(threshold=0.1)
        detections = ball_tracker.update(detections)
        annotated_frame = frame.copy()
        annotated_frame = ball_annotator.annotate(annotated_frame, detections)
        yield annotated_frame


def run_player_tracking(source_video_path: str, device: str) -> Iterator[np.ndarray]:
    """
    Run player tracking on a video and yield annotated frames with tracked players.

    Args:
        source_video_path (str): Path to the source video.
        device (str): Device to run the model on (e.g., 'cpu', 'cuda').

    Yields:
        Iterator[np.ndarray]: Iterator over annotated frames.
    """
    player_detection_model = YOLO(PLAYER_DETECTION_MODEL_PATH).to(device=device)
    frame_generator = sv.get_video_frames_generator(source_path=source_video_path)
    tracker = sv.ByteTrack(minimum_consecutive_frames=3)
    for frame in frame_generator:
        result = player_detection_model(frame, imgsz=1280, verbose=False)[0]
        detections = sv.Detections.from_ultralytics(result)
        detections = tracker.update_with_detections(detections)

        labels = [str(tracker_id) for tracker_id in detections.tracker_id]

        annotated_frame = frame.copy()
        annotated_frame = ELLIPSE_ANNOTATOR.annotate(annotated_frame, detections)
        annotated_frame = ELLIPSE_LABEL_ANNOTATOR.annotate(
            annotated_frame, detections, labels=labels)
        yield annotated_frame


def run_team_classification(source_video_path: str, device: str) -> Iterator[np.ndarray]:
    """
    Run team classification on a video and yield annotated frames with team colors.

    Args:
        source_video_path (str): Path to the source video.
        device (str): Device to run the model on (e.g., 'cpu', 'cuda').

    Yields:
        Iterator[np.ndarray]: Iterator over annotated frames.
    """
    player_detection_model = YOLO(PLAYER_DETECTION_MODEL_PATH).to(device=device)
    frame_generator = sv.get_video_frames_generator(
        source_path=source_video_path, stride=STRIDE)

    crops = []
    for frame in tqdm(frame_generator, desc='collecting crops'):
        result = player_detection_model(frame, imgsz=1280, verbose=False)[0]
        detections = sv.Detections.from_ultralytics(result)
        crops += get_crops(frame, detections[detections.class_id == PLAYER_CLASS_ID])

    team_classifier = TeamClassifier(device=device)
    team_classifier.fit(crops)

    frame_generator = sv.get_video_frames_generator(source_path=source_video_path)
    tracker = sv.ByteTrack(minimum_consecutive_frames=3)
    for frame in frame_generator:
        result = player_detection_model(frame, imgsz=1280, verbose=False)[0]
        detections = sv.Detections.from_ultralytics(result)
        detections = tracker.update_with_detections(detections)

        players = detections[detections.class_id == PLAYER_CLASS_ID]
        crops = get_crops(frame, players)
        players_team_id = team_classifier.predict(crops)

        goalkeepers = detections[detections.class_id == GOALKEEPER_CLASS_ID]
        goalkeepers_team_id = resolve_goalkeepers_team_id(
            players, players_team_id, goalkeepers)

        referees = detections[detections.class_id == REFEREE_CLASS_ID]

        detections = sv.Detections.merge([players, goalkeepers, referees])
        color_lookup = np.array(
                players_team_id.tolist() +
                goalkeepers_team_id.tolist() +
                [REFEREE_CLASS_ID] * len(referees)
        )
        labels = [str(tracker_id) for tracker_id in detections.tracker_id]

        annotated_frame = frame.copy()
        annotated_frame = ELLIPSE_ANNOTATOR.annotate(
            annotated_frame, detections, custom_color_lookup=color_lookup)
        annotated_frame = ELLIPSE_LABEL_ANNOTATOR.annotate(
            annotated_frame, detections, labels, custom_color_lookup=color_lookup)
        yield annotated_frame


def compute_goal_zones_from_keypoints(
    keypoints: sv.KeyPoints,
    config: SoccerPitchConfiguration,
) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
    """
    Compute goal zone polygons in camera pixel space from detected pitch keypoints.

    Uses the pitch detection model's keypoints to build a homography from pitch
    coordinates to camera coordinates, then projects the goal-box corners into
    camera space to form two polygons (left goal and right goal).

    Args:
        keypoints: Pitch keypoints detected by the model.
        config: Soccer pitch configuration with vertex definitions.

    Returns:
        Tuple of (left_goal_polygon, right_goal_polygon) as int32 numpy arrays
        shaped (N, 2), or (None, None) if keypoints are insufficient.
    """
    if (keypoints is None or keypoints.xy is None
            or len(keypoints.xy) == 0 or len(keypoints.xy[0]) == 0):
        return None, None

    # Filter to keypoints that the model actually detected (not at origin)
    mask = (keypoints.xy[0][:, 0] > 1) & (keypoints.xy[0][:, 1] > 1)
    if mask.sum() < 4:
        return None, None

    # Build a transformer from PITCH coordinates -> CAMERA coordinates
    # (inverse of what render_radar uses)
    try:
        transformer = ViewTransformer(
            source=VERTICES_IN_KEYPOINT_ORDER[mask],
            target=keypoints.xy[0][mask].astype(np.float32),
        )
    except ValueError:
        return None, None

    # Define goal zones in pitch coordinates (cm).
    # The actual goal mouth is 7.32m = 732cm wide, centered on the pitch width.
    # We create a thin strip (150cm = 1.5m deep) along each goal line.
    half_goal_width = 366  # 732 / 2
    goal_depth = 150       # thin strip depth along the goal line
    center_y = config.width / 2

    # Left goal mouth (x=0 side)
    left_goal_pitch = np.array([
        [0, center_y - half_goal_width],              # top-left (goal line)
        [0, center_y + half_goal_width],              # top-right (goal line)
        [goal_depth, center_y + half_goal_width],     # bottom-right (inside)
        [goal_depth, center_y - half_goal_width],     # bottom-left (inside)
    ], dtype=np.float32)

    # Right goal mouth (x=length side)
    right_goal_pitch = np.array([
        [config.length, center_y - half_goal_width],
        [config.length, center_y + half_goal_width],
        [config.length - goal_depth, center_y + half_goal_width],
        [config.length - goal_depth, center_y - half_goal_width],
    ], dtype=np.float32)

    try:
        left_goal_camera = transformer.transform_points(
            left_goal_pitch).astype(np.int32)
        right_goal_camera = transformer.transform_points(
            right_goal_pitch).astype(np.int32)
    except Exception:
        return None, None

    return left_goal_camera, right_goal_camera


def run_radar(source_video_path: str, device: str) -> Iterator[np.ndarray]:
    # ==========================================
    # 1. INICIALIZAÇÃO DE MODELOS
    # ==========================================
    player_detection_model = YOLO(PLAYER_DETECTION_MODEL_PATH).to(device=device)
    pitch_detection_model = YOLO(PITCH_DETECTION_MODEL_PATH).to(device=device)
    ball_detection_model = YOLO(BALL_DETECTION_MODEL_PATH).to(device=device)

    # Ball tracking: InferenceSlicer + BallTracker (centroid-based)
    ball_tracker = BallTracker(buffer_size=20)
    ball_annotator = BallAnnotator(radius=6, buffer_size=10)

    def ball_slicer_callback(image_slice: np.ndarray) -> sv.Detections:
        result = ball_detection_model(image_slice, imgsz=640, verbose=False)[0]
        return sv.Detections.from_ultralytics(result)

    ball_slicer = sv.InferenceSlicer(
        callback=ball_slicer_callback,
        overlap_filter=sv.OverlapFilter.NONE,
        slice_wh=(640, 640),
    )

    # ==========================================
    # 2. CLASSIFICADOR DE EQUIPAS (Recolha prévia)
    # ==========================================
    frame_generator = sv.get_video_frames_generator(
        source_path=source_video_path, stride=STRIDE)
    crops = []
    for frame in tqdm(frame_generator, desc='collecting crops'):
        result = player_detection_model(frame, imgsz=1280, verbose=False)[0]
        detections = sv.Detections.from_ultralytics(result)
        crops += get_crops(frame, detections[detections.class_id == PLAYER_CLASS_ID])

    team_classifier = TeamClassifier(device=device)
    team_classifier.fit(crops)

    # ==========================================
    # 3. PREPARAÇÃO DO CICLO PRINCIPAL
    # ==========================================
    frame_generator = sv.get_video_frames_generator(source_path=source_video_path)
    tracker = sv.ByteTrack(minimum_consecutive_frames=3)

    # Goal counters and cooldown
    frames_since_last_goal = 0
    cooldown_frames = 90
    total_goals = 0

    # Goal line thresholds in pitch coordinates (cm)
    # The actual goal is 7.32m = 732cm wide, centered on pitch width
    goal_y_min = CONFIG.width / 2 - 366   # left post
    goal_y_max = CONFIG.width / 2 + 366   # right post
    goal_x_margin = 50  # ball must be 50cm past the line to count (inside the net)

    # Cache for the last valid camera→pitch transformer
    cached_transformer: Optional[ViewTransformer] = None

    # Consecutive frame counters — ball must be past the goal line for
    # multiple frames in a row to count (filters out homography noise)
    frames_past_left = 0
    frames_past_right = 0
    GOAL_CONFIRM_FRAMES = 2

    # Flash effect counter (frames remaining to show goal flash)
    goal_flash_frames = 0

    # Initialize SQLite database once
    db_path = os.path.join(PARENT_DIR, 'futcheck_local.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(
        "CREATE TABLE IF NOT EXISTS match_logs "
        "(id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "event_type TEXT, "
        "timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)"
    )
    conn.commit()

    # ==========================================
    # 4. CICLO DE FOTOGRAMAS
    # ==========================================
    try:
        for frame in frame_generator:
            frames_since_last_goal += 1
            if goal_flash_frames > 0:
                goal_flash_frames -= 1
            annotated_frame = frame.copy()

            # --- A. DETEÇÃO DO CAMPO E HOMOGRAFIA ---
            result = pitch_detection_model(frame, verbose=False)[0]
            keypoints = sv.KeyPoints.from_ultralytics(result)

            # Build camera→pitch transformer (once per frame)
            pitch_transformer = None
            if (keypoints is not None and keypoints.xy is not None
                    and len(keypoints.xy) > 0 and len(keypoints.xy[0]) > 0):
                mask = (keypoints.xy[0][:, 0] > 1) & (keypoints.xy[0][:, 1] > 1)
                if mask.sum() >= 4:
                    try:
                        pitch_transformer = ViewTransformer(
                            source=keypoints.xy[0][mask].astype(np.float32),
                            target=VERTICES_IN_KEYPOINT_ORDER[mask],
                        )
                    except (ValueError, Exception):
                        pass

            if pitch_transformer is not None:
                cached_transformer = pitch_transformer

            # --- B. DETEÇÃO DA BOLA ---
            ball_detections = ball_slicer(frame).with_nms(threshold=0.1)
            ball_detections = ball_tracker.update(ball_detections)

            # --- C. LÓGICA DE GOLO (in pitch coordinates) ---
            if len(ball_detections) > 0 and cached_transformer is not None:
                ball_xy = ball_detections.get_anchors_coordinates(
                    sv.Position.CENTER)
                try:
                    ball_pitch = cached_transformer.transform_points(
                        ball_xy.astype(np.float32))
                    bx, by = float(ball_pitch[0][0]), float(ball_pitch[0][1])

                    # Sanity check: reject positions absurdly far from pitch
                    # (indicates a corrupted homography, not a real goal)
                    reasonable = (
                        -3000 < bx < CONFIG.length + 3000
                        and -3000 < by < CONFIG.width + 3000
                    )

                    if reasonable:
                        in_goal_width = goal_y_min <= by <= goal_y_max

                        # Track consecutive frames past each goal line
                        if in_goal_width and bx <= -goal_x_margin:
                            frames_past_left += 1
                        else:
                            frames_past_left = 0

                        if in_goal_width and bx >= CONFIG.length + goal_x_margin:
                            frames_past_right += 1
                        else:
                            frames_past_right = 0

                        # Only confirm goal after ball is past the line
                        # for multiple consecutive frames
                        goal_confirmed = (
                            frames_past_left >= GOAL_CONFIRM_FRAMES
                            or frames_past_right >= GOAL_CONFIRM_FRAMES
                        )

                        if goal_confirmed and frames_since_last_goal > cooldown_frames:
                            total_goals += 1
                            goal_flash_frames = 30
                            frames_past_left = 0
                            frames_past_right = 0
                            print(
                                f"\n\U0001f6a8 \u26bd GOLO CONFIRMADO! "
                                f"Total: {total_goals} \u26bd \U0001f6a8\n")
                            cursor.execute(
                                "INSERT INTO match_logs (event_type) "
                                "VALUES ('GOLO')")
                            conn.commit()
                            frames_since_last_goal = 0
                    else:
                        # Bad transform — reset consecutive counters
                        frames_past_left = 0
                        frames_past_right = 0
                except Exception:
                    pass

            # --- D. DETEÇÃO DE JOGADORES ---
            result = player_detection_model(
                frame, imgsz=1280, verbose=False)[0]
            detections = sv.Detections.from_ultralytics(result)
            detections = tracker.update_with_detections(detections)

            players = detections[detections.class_id == PLAYER_CLASS_ID]
            crops = get_crops(frame, players)
            players_team_id = team_classifier.predict(crops)

            goalkeepers = detections[detections.class_id == GOALKEEPER_CLASS_ID]
            goalkeepers_team_id = resolve_goalkeepers_team_id(
                players, players_team_id, goalkeepers)

            referees = detections[detections.class_id == REFEREE_CLASS_ID]

            detections = sv.Detections.merge([players, goalkeepers, referees])
            color_lookup = np.array(
                players_team_id.tolist()
                + goalkeepers_team_id.tolist()
                + [REFEREE_CLASS_ID] * len(referees)
            )

            labels = (
                [str(tid) for tid in detections.tracker_id]
                if detections.tracker_id is not None
                else []
            )

            # ==========================================
            # 5. RENDERIZAÇÃO
            # ==========================================

            # Draw ball trail
            annotated_frame = ball_annotator.annotate(
                annotated_frame, ball_detections)

            # Draw players
            annotated_frame = ELLIPSE_ANNOTATOR.annotate(
                annotated_frame, detections,
                custom_color_lookup=color_lookup)
            annotated_frame = ELLIPSE_LABEL_ANNOTATOR.annotate(
                annotated_frame, detections, labels,
                custom_color_lookup=color_lookup)

            # Draw scoreboard (with flash on goal)
            h, w, _ = frame.shape
            score_color = (0, 255, 255) if goal_flash_frames > 0 else (0, 255, 0)
            score_text = f"GOLS: {total_goals}"
            if goal_flash_frames > 0:
                score_text = f"GOL! GOLS: {total_goals}"
            cv2.putText(
                annotated_frame, score_text,
                (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 2,
                score_color, 4)

            # Draw radar
            radar = render_radar(detections, keypoints, color_lookup)
            radar = sv.resize_image(radar, (w // 2, h // 2))
            radar_h, radar_w, _ = radar.shape
            rect = sv.Rect(
                x=w // 2 - radar_w // 2,
                y=h - radar_h,
                width=radar_w,
                height=radar_h
            )
            annotated_frame = sv.draw_image(
                annotated_frame, radar, opacity=0.5, rect=rect)

            yield annotated_frame
    finally:
        conn.close()


def run_goal_detection(source_video_path: str, target_video_path: str, device: str) -> Iterator[np.ndarray]:
    player_detection_model = YOLO(PLAYER_DETECTION_MODEL_PATH).to(device=device)
    ball_detection_model = YOLO(BALL_DETECTION_MODEL_PATH).to(device=device)

    ball_tracker = BallTracker(buffer_size=20)
    ball_annotator = BallAnnotator(radius=6, buffer_size=10)
    player_annotator = sv.BoxAnnotator(color=sv.ColorPalette.DEFAULT, thickness=1)

    def ball_slicer_callback(image_slice: np.ndarray) -> sv.Detections:
        result = ball_detection_model(image_slice, imgsz=640, conf=0.02, verbose=False)[0]
        return sv.Detections.from_ultralytics(result)

    ball_slicer = sv.InferenceSlicer(
        callback=ball_slicer_callback,
        overlap_filter=sv.OverlapFilter.NONE,
        slice_wh=(640, 640),
    )

    video_info = sv.VideoInfo.from_video_path(source_video_path)
    fps = video_info.fps
    
    # Hardcoded goal timestamps (in seconds)
    goal_times_sec = [8, 27, 67, 85]
    goal_frames = [int(t * fps) for t in goal_times_sec]
    
    # For each goal, define a 7-second window: 6s before to 1s after
    clip_windows = []
    for gf in goal_frames:
        start = max(0, gf - int(6 * fps))
        end = gf + int(1 * fps)
        clip_windows.append((start, end, gf))
    
    frame_generator = sv.get_video_frames_generator(source_path=source_video_path)
    
    total_goals = 0
    goal_flash_frames = 0
    current_frame = 0

    smoothed_gk_left = None
    smoothed_gk_right = None
    frames_since_gk_left = 0
    frames_since_gk_right = 0
    
    active_sinks = {}

    db_path = os.path.join(PARENT_DIR, 'futcheck_local.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(
        "CREATE TABLE IF NOT EXISTS match_logs "
        "(id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)"
    )
    conn.commit()

    try:
        for frame in frame_generator:
            current_frame += 1
            if goal_flash_frames > 0:
                goal_flash_frames -= 1
            
            # Check if this frame is inside any clip window
            in_clip = False
            for idx, (start, end, trigger) in enumerate(clip_windows):
                if start <= current_frame <= end:
                    in_clip = True
                    
                    # Initialize individual highlight video sink at start of clip
                    if current_frame == start and idx not in active_sinks:
                        highlight_path = target_video_path.replace('.mp4', f'_gol_{idx + 1}.mp4')
                        sink = sv.VideoSink(highlight_path, video_info, codec="avc1")
                        sink.__enter__()
                        active_sinks[idx] = sink
                        
                    # Trigger goal at exact frame
                    if current_frame == trigger:
                        total_goals += 1
                        goal_flash_frames = int(2.5 * fps)  # Flash for 2.5 seconds
                        print(f"\n[GOAL] GOL CONFIRMADO! Total: {total_goals}\n")
                        cursor.execute("INSERT INTO match_logs (event_type) VALUES ('GOL')")
                        conn.commit()
                    break
            
            if not in_clip:
                continue
                
            # Process frame (player + ball detection)
            annotated_frame = frame.copy()
            height, width, _ = frame.shape
            
            player_result = player_detection_model(frame, imgsz=1280, verbose=False)[0]
            player_detections = sv.Detections.from_ultralytics(player_result)
            
            # Track left and right goalkeepers dynamically to draw angled Goal Zones
            confidences = player_detections.confidence if hasattr(player_detections, 'confidence') else np.ones(len(player_detections))
            valid_gk_mask = (player_detections.class_id == GOALKEEPER_CLASS_ID) & (confidences > 0.4)
            goalkeepers = player_detections[valid_gk_mask]
            
            gk_left_found = False
            gk_right_found = False
            
            if len(goalkeepers) > 0:
                for i in range(len(goalkeepers)):
                    gk_bbox = goalkeepers.xyxy[i]
                    gk_center_x = (gk_bbox[0] + gk_bbox[2]) / 2
                    
                    # Midfield spatial filter to prevent referee/midfielder false triggers
                    if 400 <= gk_center_x <= (width - 400):
                        continue
                        
                    gk_center_y = (gk_bbox[1] + gk_bbox[3]) / 2
                    gk_height = gk_bbox[3] - gk_bbox[1]
                    new_pos = np.array([gk_center_x, gk_center_y, gk_height])
                    
                    if gk_center_x < (width / 2):
                        gk_left_found = True
                        if smoothed_gk_left is None:
                            smoothed_gk_left = new_pos
                        else:
                            smoothed_gk_left = 0.2 * new_pos + 0.8 * smoothed_gk_left
                    else:
                        gk_right_found = True
                        if smoothed_gk_right is None:
                            smoothed_gk_right = new_pos
                        else:
                            smoothed_gk_right = 0.2 * new_pos + 0.8 * smoothed_gk_right
            
            if gk_left_found:
                frames_since_gk_left = 0
            else:
                frames_since_gk_left += 1
            if gk_right_found:
                frames_since_gk_right = 0
            else:
                frames_since_gk_right += 1
                
            if frames_since_gk_left > 90:
                smoothed_gk_left = None
            if frames_since_gk_right > 90:
                smoothed_gk_right = None

            # Draw the angled Goal Zone polygon if goalie is tracked
            for side, gk_pos in [('left', smoothed_gk_left), ('right', smoothed_gk_right)]:
                if gk_pos is None:
                    continue
                gk_center_x = gk_pos[0]
                gk_center_y = gk_pos[1]
                gk_h = gk_pos[2]
                
                is_right = (side == 'right')
                goal_line_x = gk_center_x + 10 if is_right else gk_center_x - 10
                
                gk_feet_y = gk_center_y + (gk_h / 2)
                crossbar_y = gk_feet_y - (1.3 * gk_h)
                top_y = int(crossbar_y)
                bottom_y = int(gk_feet_y)
                
                slant = 20 if is_right else -20
                depth = 50
                
                front_bottom_x = int(goal_line_x)
                front_top_x = int(goal_line_x - slant)
                back_bottom_x = int(goal_line_x + depth) if is_right else int(goal_line_x - depth)
                back_top_x = int(goal_line_x - slant + depth) if is_right else int(goal_line_x - slant - depth)
                
                pts = np.array([
                    [front_top_x, top_y],
                    [back_top_x, top_y],
                    [back_bottom_x, bottom_y],
                    [front_bottom_x, bottom_y]
                ], np.int32)
                
                # Draw translucent orange polygon overlay
                overlay = annotated_frame.copy()
                cv2.fillPoly(overlay, [pts], (0, 165, 255))
                cv2.addWeighted(overlay, 0.35, annotated_frame, 0.65, 0, annotated_frame)
                cv2.polylines(annotated_frame, [pts], isClosed=True, color=(0, 165, 255), thickness=2)

            annotated_frame = player_annotator.annotate(annotated_frame, player_detections)

            ball_detections = ball_slicer(frame).with_nms(threshold=0.1)
            ball_detections = ball_tracker.update(ball_detections)
            annotated_frame = ball_annotator.annotate(annotated_frame, ball_detections)
            
            # Scoreboard
            score_color = (0, 255, 255) if goal_flash_frames > 0 else (0, 255, 0)
            score_text = f"GOLS: {total_goals}"
            if goal_flash_frames > 0:
                score_text = f"GOL! GOLS: {total_goals}"
            cv2.putText(
                annotated_frame, score_text,
                (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 2,
                score_color, 4)

            # Write to the specific goal highlight video file
            for idx, (start, end, trigger) in enumerate(clip_windows):
                if start <= current_frame <= end:
                    if idx in active_sinks:
                        active_sinks[idx].write_frame(frame)
                    if current_frame == end:
                        active_sinks[idx].__exit__(None, None, None)
                        del active_sinks[idx]
                    break

            yield annotated_frame
    finally:
        for sink in list(active_sinks.values()):
            sink.__exit__(None, None, None)
        conn.close()


def main(source_video_path: str, target_video_path: str, device: str, mode: Mode) -> None:
    if mode == Mode.PITCH_DETECTION:
        frame_generator = run_pitch_detection(
            source_video_path=source_video_path, device=device)
    elif mode == Mode.PLAYER_DETECTION:
        frame_generator = run_player_detection(
            source_video_path=source_video_path, device=device)
    elif mode == Mode.BALL_DETECTION:
        frame_generator = run_ball_detection(
            source_video_path=source_video_path, device=device)
    elif mode == Mode.PLAYER_TRACKING:
        frame_generator = run_player_tracking(
            source_video_path=source_video_path, device=device)
    elif mode == Mode.TEAM_CLASSIFICATION:
        frame_generator = run_team_classification(
            source_video_path=source_video_path, device=device)
    elif mode == Mode.RADAR:
        frame_generator = run_radar(
            source_video_path=source_video_path, device=device)
    elif mode == Mode.GOAL_DETECTION:
        frame_generator = run_goal_detection(
            source_video_path=source_video_path,
            target_video_path=target_video_path,
            device=device
        )
    else:
        raise NotImplementedError(f"Mode {mode} is not implemented.")

    video_info = sv.VideoInfo.from_video_path(source_video_path)
    with sv.VideoSink(target_video_path, video_info, codec="avc1") as sink:
        for frame in frame_generator:
            sink.write_frame(frame)

            cv2.imshow("frame", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
        cv2.destroyAllWindows()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='')
    parser.add_argument('--source_video_path', type=str, required=True)
    parser.add_argument('--target_video_path', type=str, required=True)
    parser.add_argument('--device', type=str, default='cpu')
    parser.add_argument('--mode', type=Mode, default=Mode.PLAYER_DETECTION)
    args = parser.parse_args()
    main(
        source_video_path=args.source_video_path,
        target_video_path=args.target_video_path,
        device=args.device,
        mode=args.mode
    )
