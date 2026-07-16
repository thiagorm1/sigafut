const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

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

const User = sequelize.define('User', {
    nome: { type: DataTypes.STRING, allowNull: false },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
    },
    senha: { type: DataTypes.STRING, allowNull: false },
    role: {
        type: DataTypes.ENUM('admin', 'operador', 'cliente'),
        defaultValue: 'cliente'
    }
}, {
    tableName: 'usuarios',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
        beforeCreate: async (user) => {
            const salt = await bcrypt.genSalt(10);
            user.senha = await bcrypt.hash(user.senha, salt);
        }
    }
});

User.prototype.validarSenha = async function (senha) {
    return bcrypt.compare(senha, this.senha);
};

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
        type: DataTypes.ENUM('goal', 'assist', 'save', 'yellow_card', 'red_card', 'pass'),
        allowNull: false
    },
    timestamp_match: DataTypes.STRING,
    video_highlight_url: DataTypes.STRING
}, {
    tableName: 'events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

// Associations
Team.hasMany(Player, { foreignKey: 'team_id' });
Player.belongsTo(Team, { foreignKey: 'team_id' });

Match.belongsTo(Team, { as: 'HomeTeam', foreignKey: 'home_team_id' });
Match.belongsTo(Team, { as: 'AwayTeam', foreignKey: 'away_team_id' });

Match.hasMany(Camera, { foreignKey: 'match_id' });
Camera.belongsTo(Match, { foreignKey: 'match_id' });

Match.hasMany(Event, { foreignKey: 'match_id' });
Event.belongsTo(Match, { foreignKey: 'match_id' });

Player.hasMany(Event, { foreignKey: 'player_id' });
Event.belongsTo(Player, { foreignKey: 'player_id' });

module.exports = {
    sequelize,
    User,
    Team,
    Player,
    Match,
    Camera,
    Event
};
