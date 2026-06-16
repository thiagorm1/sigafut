const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'sigafut_db',
    process.env.DB_USER || 'sigafut_user',
    process.env.DB_PASS || 'horus_password',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false
    }
);

const Team = sequelize.define('Team', {
    name: { type: DataTypes.STRING, allowNull: false },
    logo_url: DataTypes.STRING
});

const Player = sequelize.define('Player', {
    name: { type: DataTypes.STRING, allowNull: false },
    number: DataTypes.INTEGER,
    position: DataTypes.STRING
});

const Match = sequelize.define('Match', {
    scheduled_at: DataTypes.DATE,
    status: {
        type: DataTypes.ENUM('scheduled', 'live', 'finished'),
        defaultValue: 'scheduled'
    },
    score_home: { type: DataTypes.INTEGER, defaultValue: 0 },
    score_away: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const Camera = sequelize.define('Camera', {
    name: DataTypes.STRING,
    rtsp_url: { type: DataTypes.STRING, allowNull: false },
    position_type: DataTypes.STRING
});

const Event = sequelize.define('Event', {
    type: {
        type: DataTypes.ENUM('goal', 'assist', 'save', 'yellow_card', 'red_card'),
        allowNull: false
    },
    timestamp_match: DataTypes.STRING,
    video_highlight_url: DataTypes.STRING
});

// Associations
Team.hasMany(Player);
Player.belongsTo(Team);

Match.belongsTo(Team, { as: 'HomeTeam', foreignKey: 'home_team_id' });
Match.belongsTo(Team, { as: 'AwayTeam', foreignKey: 'away_team_id' });

Match.hasMany(Camera);
Camera.belongsTo(Match);

Match.hasMany(Event);
Event.belongsTo(Match);

Player.hasMany(Event);
Event.belongsTo(Player);

module.exports = {
    sequelize,
    Team,
    Player,
    Match,
    Camera,
    Event
};
