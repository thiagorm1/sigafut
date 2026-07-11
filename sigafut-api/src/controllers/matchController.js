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

module.exports = {
    getMatchEvents,
    getMatchStats
};
