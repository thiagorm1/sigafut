const express = require('express');
const router = express.Router();
const { getMatchEvents, getMatchStats } = require('../controllers/matchController');

router.get('/:matchId/events', getMatchEvents);
router.get('/:matchId/stats', getMatchStats);

module.exports = router;
