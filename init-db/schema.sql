CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    role ENUM('admin', 'operador', 'cliente') DEFAULT 'cliente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Administrador pré-cadastrado (senha: senhasecreta)
INSERT INTO usuarios (nome, email, senha, role)
VALUES ('Administrador', 'admin@sigafut.br', '$2b$10$8J2U/TO.EnMmH.wLBjAlT.myjIwV4R7o1L2vh6XUK6xLTGf/fISQ.', 'admin');

CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT,
    name VARCHAR(255) NOT NULL,
    number INT,
    position VARCHAR(50),
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS matches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    home_team_id INT,
    away_team_id INT,
    scheduled_at DATETIME,
    status ENUM('scheduled', 'live', 'finished') DEFAULT 'scheduled',
    score_home INT DEFAULT 0,
    score_away INT DEFAULT 0,
    FOREIGN KEY (home_team_id) REFERENCES teams(id),
    FOREIGN KEY (away_team_id) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS cameras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT,
    name VARCHAR(255),
    rtsp_url VARCHAR(255) NOT NULL,
    position_type VARCHAR(50), -- e.g., 'goal_left', 'goal_right', 'midfield'
    FOREIGN KEY (match_id) REFERENCES matches(id)
);

CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT,
    player_id INT,
    type ENUM('goal', 'assist', 'save', 'yellow_card', 'red_card') NOT NULL,
    timestamp_match VARCHAR(50), -- Time relative to match start, e.g., "00:15:30"
    video_highlight_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_id) REFERENCES matches(id),
    FOREIGN KEY (player_id) REFERENCES players(id)
);
