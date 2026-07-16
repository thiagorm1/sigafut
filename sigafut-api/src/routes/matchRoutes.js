const express = require('express');
const router = express.Router();
const { getMatchEvents, getMatchStats, createMatchEvent } = require('../controllers/matchController');

router.get('/:matchId/events', getMatchEvents);
router.get('/:matchId/stats', getMatchStats);
router.post('/:matchId/events', createMatchEvent);

module.exports = router;
