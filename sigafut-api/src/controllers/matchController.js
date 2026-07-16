const { Match, Event, Player, Team } = require('../models');

// GET /api/matches/:matchId/events
const getMatchEvents = async (req, res) => {
    try {
        const { matchId } = req.params;

        // Verify match exists
        const match = await Match.findByPk(matchId);
        if (!match) {
            return res.status(404).json({ error: 'Partida não encontrada.' });
        }

        // Fetch events with player details
        const events = await Event.findAll({
            where: { match_id: matchId },
            include: [
                {
                    model: Player,
                    attributes: ['id', 'name', 'number', 'position']
                }
            ],
            order: [
                ['timestamp_match', 'ASC'],
                ['id', 'ASC']
            ]
        });

        return res.status(200).json(events);
    } catch (err) {
        console.error('Error fetching match events:', err);
        return res.status(500).json({ error: 'Erro interno do servidor ao buscar eventos da partida.' });
    }
};

// GET /api/matches/:matchId/stats
const getMatchStats = async (req, res) => {
    try {
        const { matchId } = req.params;

        // Fetch match with team names
        const match = await Match.findByPk(matchId, {
            include: [
                { model: Team, as: 'HomeTeam', attributes: ['id', 'name', 'logo_url'] },
                { model: Team, as: 'AwayTeam', attributes: ['id', 'name', 'logo_url'] }
            ]
        });

        if (!match) {
            return res.status(404).json({ error: 'Partida não encontrada.' });
        }

        // Fetch all events for the match to aggregate statistics
        const events = await Event.findAll({
            where: { match_id: matchId }
        });

        const stats = {
            goals: 0,
            passes: 0,
            assists: 0,
            saves: 0,
            yellow_cards: 0,
            red_cards: 0
        };

        events.forEach(e => {
            if (e.type === 'goal') stats.goals++;
            else if (e.type === 'pass') stats.passes++;
            else if (e.type === 'assist') stats.assists++;
            else if (e.type === 'save') stats.saves++;
            else if (e.type === 'yellow_card') stats.yellow_cards++;
            else if (e.type === 'red_card') stats.red_cards++;
        });

        return res.status(200).json({
            match_id: match.id,
            status: match.status,
            scheduled_at: match.scheduled_at,
            score_home: match.score_home,
            score_away: match.score_away,
            home_team: match.HomeTeam,
            away_team: match.AwayTeam,
            statistics: stats
        });
    } catch (err) {
        console.error('Error calculating match stats:', err);
        return res.status(500).json({ error: 'Erro interno do servidor ao calcular estatísticas da partida.' });
    }
};

// POST /api/matches/:matchId/events
const createMatchEvent = async (req, res) => {
    try {
        const { matchId } = req.params;
        const { type, player_id, timestamp_match, video_highlight_url } = req.body;

        const validTypes = ['goal', 'assist', 'save', 'yellow_card', 'red_card', 'pass'];
        if (!type || !validTypes.includes(type)) {
            return res.status(400).json({ error: `Tipo de evento inválido. Tipos permitidos: ${validTypes.join(', ')}` });
        }

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
        let playerId = player_id;
        if (playerId && playerId > 0) {
            await Player.findOrCreate({
                where: { id: playerId },
                defaults: {
                    name: `Jogador ${playerId}`,
                    team_id: 1,
                    number: playerId,
                    position: 'Desconhecido'
                }
            });
        } else {
            playerId = null;
        }

        // Save event
        const event = await Event.create({
            match_id: matchId,
            player_id: playerId,
            type,
            timestamp_match: timestamp_match || '00:00:00',
            video_highlight_url: video_highlight_url || null
        });

        return res.status(201).json(event);
    } catch (err) {
        console.error('Error creating match event:', err);
        return res.status(500).json({ error: 'Erro interno do servidor ao salvar o evento.' });
    }
};

module.exports = {
    getMatchEvents,
    getMatchStats,
    createMatchEvent
};
