const { Team } = require('../models');

// GET /api/teams
const getTeams = async (req, res) => {
    try {
        const teams = await Team.findAll({
            order: [['name', 'ASC']]
        });
        return res.status(200).json(teams);
    } catch (err) {
        console.error('Error fetching teams:', err);
        return res.status(500).json({ error: 'Erro interno do servidor ao buscar times.' });
    }
};

module.exports = { getTeams };
