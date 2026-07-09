# ⚽ SIGAFUT — Sistema de Gerenciamento de Arenas de Futsal

Sistema de gerenciamento de arenas de futsal com detecção de eventos em tempo real via visão computacional.

O SIGAFUT processa feeds de câmeras RTSP usando YOLO/OpenCV para detectar automaticamente eventos de partidas (gols, assistências, defesas, cartões) e exibi-los em um dashboard em tempo real via WebSockets.

---

## 📐 Arquitetura

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│ sigafut-web  │────▶│  sigafut-api  │◀───▶│     Redis     │
│  (React)     │     │  (Node.js)   │     │  (Pub/Sub)    │
│  :5173       │     │  :3000       │     │  :6379        │
└─────────────┘     └──────┬───────┘     └───────▲───────┘
                           │                      │
                     ┌─────▼─────┐          ┌─────┴────────┐
                     │   MySQL   │          │sigafut-engine │
                     │   :3306   │          │ (Flask + CV)  │
                     │           │          │  :5000        │
                     └───────────┘          └──────────────┘
```

**Fluxo de comunicação:**

1. **sigafut-engine** detecta/simula eventos de partida e publica no canal Redis `match:live_events`
2. **sigafut-api** assina o canal Redis e encaminha os eventos via **Socket.IO** para os clientes web
3. **sigafut-web** recebe os eventos em tempo real e exibe no dashboard

---

## 🔄 Novo Fluxo e Funcionalidades Recentes

Com as atualizações mais recentes, o fluxo do SigaFut foi expandido para suportar uma gestão mais completa e com inteligência artificial avançada:

1. **Inteligência Artificial (Módulo Sports)**
   - O repositório agora integra a nova engine `sports` de visão computacional, executada em conjunto com o `sigafut-engine`.
   - Há uma pipeline de inferência aprimorada que detecta eventos e extrai métricas detalhadas via OpenCV e YOLO.
2. **Nova Interface e Dashboard Web (React/Vite)**
   - **Gestão de Quadras e Horários**: Calendário dinâmico com navegação de quadras, definição de slots visíveis e bloqueio de manutenção.
   - **Gerenciamento de Times**: Seção dedicada à administração de times com layouts customizáveis (grade e lista).
   - **Performance e Persistência**: Implementação de *localStorage* para garantir resposta imediata e persistência dos dados de reservas, times e configurações do centro esportivo.
   - **Replays em Português BR**: A área de *highlights* e replays dos eventos foi reformulada e totalmente localizada para Português, simplificando a visualização de gols e assistências após as partidas.
   - **Navegação Inteligente**: Menu lateral (Sidebar) atualizado, incluindo detalhes rápidos do perfil do usuário e atalhos de gestão.

---

## 🛠️ Tech Stack

| Serviço | Tecnologias | Porta |
|---------|-------------|-------|
| **sigafut-web** | React 19, Vite 8, Socket.IO Client, Lucide React | `5173` |
| **sigafut-api** | Node.js, Express 5, Socket.IO 4, Sequelize 6, mysql2, Redis | `3000` |
| **sigafut-engine** | Python 3.10, Flask, OpenCV, Ultralytics (YOLO), Redis | `5000` |
| **Banco de dados** | MySQL 8.0 | `3306` |
| **Cache/PubSub** | Redis Alpine | `6379` |

---

## 🚀 Como Rodar

### Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/install/)

### Subir toda a stack

```bash
docker compose up --build
```

Depois acesse **http://localhost:5173** no navegador.

### Rodar em background

```bash
docker compose up --build -d
```

### Ver logs de um serviço específico

```bash
docker compose logs -f sigafut-web
docker compose logs -f sigafut-api
docker compose logs -f sigafut-engine
```

### Parar tudo

```bash
docker compose down
```

### Parar e remover volumes (reset do banco)

```bash
docker compose down -v
```

### Executar Análises de Vídeo (Módulo IA / Sports)

Para processar vídeos locais (como os baixados na pasta `data`) com os modelos de IA, utilize os scripts do módulo `sports`. 
Supondo que você possua um vídeo em `sports/examples/soccer/data/video.mp4`:

```bash
# Entre na pasta do motor esportivo
cd sports/examples/soccer

# Execute o processamento (Exemplo: modo RADAR)
python main.py --source_video_path data/video.mp4 \
  --target_video_path data/video-radar.mp4 \
  --device cpu --mode RADAR
```
> Modos disponíveis: `PITCH_DETECTION`, `PLAYER_DETECTION`, `BALL_DETECTION`, `PLAYER_TRACKING`, `TEAM_CLASSIFICATION`, `RADAR`, `GOAL_DETECTION`.

---

## 🗄️ Banco de Dados

O schema é inicializado automaticamente via `init-db/schema.sql`. As tabelas são:

| Tabela | Descrição |
|--------|-----------|
| `teams` | Times de futsal (nome, logo) |
| `players` | Jogadores (time, nome, número, posição) |
| `matches` | Partidas (times, placar, status: scheduled/live/finished) |
| `cameras` | Câmeras RTSP vinculadas a partidas (posição: gol_esq, gol_dir, meio) |
| `events` | Eventos detectados (gol, assistência, defesa, cartão amarelo/vermelho) |

---

## 🔌 API Endpoints

### sigafut-api (`:3000`)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/` | Health check |
| WebSocket | Socket.IO | Emite `new_event` em tempo real |

### sigafut-engine (`:5000`)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/` | Health check |
| `GET` | `/api/cameras/` | Listar câmeras |
| `POST` | `/api/cameras/start` | Iniciar simulação de eventos |

---

## ⚙️ Variáveis de Ambiente

As variáveis já estão configuradas no `docker-compose.yml` para desenvolvimento:

| Variável | Serviço | Descrição |
|----------|---------|-----------|
| `DB_HOST` | sigafut-api | Host do MySQL |
| `DB_USER` | sigafut-api | Usuário do MySQL |
| `DB_PASS` | sigafut-api | Senha do MySQL |
| `DB_NAME` | sigafut-api | Nome do banco |
| `REDIS_HOST` | sigafut-api, sigafut-engine | Host do Redis |
| `FLASK_APP` | sigafut-engine | Entry point do Flask |
| `FLASK_ENV` | sigafut-engine | Ambiente do Flask |

---

## 📁 Estrutura do Projeto

```
SIGAFUT/
├── docker-compose.yml        # Orquestração dos serviços
├── init-db/
│   └── schema.sql            # Schema inicial do banco
├── sigafut-api/              # API Node.js (Express + Socket.IO)
│   └── src/
│       ├── app.js            # Entry point
│       └── models/           # Modelos Sequelize
├── sigafut-engine/           # Engine Python (Flask + CV)
│   ├── app.py                # Entry point
│   └── app/
│       └── blueprints/       # Rotas Flask
│           └── camera_bp.py  # API de câmeras + simulação
└── sigafut-web/              # Frontend React (Vite)
    └── src/
        ├── App.jsx           # Dashboard principal
        ├── index.css         # Estilos globais
        └── pages/
            └── Login/        # Página de login
├── sports/                   # Motor de IA para esportes
```

---

## 📝 Licença

Este projeto é privado e de uso interno.
