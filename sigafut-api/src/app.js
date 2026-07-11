require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const redis = require('redis');
const { Match, Player, Event } = require('./models');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Auth routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Team routes
const teamRoutes = require('./routes/teamRoutes');
app.use('/api/teams', teamRoutes);

// Match routes
const matchRoutes = require('./routes/matchRoutes');
app.use('/api/matches', matchRoutes);

// Redis setup
const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:6379`
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

(async () => {
    await redisClient.connect();
    console.log('Connected to Redis');

    // Subscribe to match events from Python service
    const subscriber = redisClient.duplicate();
    await subscriber.connect();
    await subscriber.subscribe('match:live_events', async (message) => {
        console.log('Received event from Python:', message);
        try {
            const eventData = JSON.parse(message);
            
            // Forward to all connected socket clients immediately
            io.emit('new_event', eventData);

            // Persist the event to the database if it matches one of the valid event types
            const validTypes = ['goal', 'assist', 'save', 'yellow_card', 'red_card', 'pass'];
            if (eventData && validTypes.includes(eventData.type)) {
                const matchId = eventData.match_id || 1;

                // Ensure Match exists
                await Match.findOrCreate({
                    where: { id: matchId },
                    defaults: {
                        home_team_id: 1, // Default Teams from schema.sql
                        away_team_id: 2,
                        scheduled_at: new Date(),
                        status: 'live'
                    }
                });

                // Ensure Player exists (if a positive ID is supplied)
                let playerId = eventData.player_id;
                if (playerId && playerId > 0) {
                    await Player.findOrCreate({
                        where: { id: playerId },
                        defaults: {
                            name: `Jogador ${playerId}`,
                            team_id: 1, // Default Team
                            number: playerId,
                            position: 'Desconhecido'
                        }
                    });
                } else {
                    playerId = null;
                }

                // Save event
                await Event.create({
                    match_id: matchId,
                    player_id: playerId,
                    type: eventData.type,
                    timestamp_match: eventData.timestamp_match || '00:00:00',
                    video_highlight_url: eventData.video_highlight_url || null
                });
                console.log(`[API] Event '${eventData.type}' successfully persisted for Match ${matchId}`);
            }
        } catch (err) {
            console.error('[API] Error processing and persisting live event:', err);
        }
    });
})();

// Basic Route
app.get('/', (req, res) => {
    res.send('SIGAFUT Node API is running');
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
