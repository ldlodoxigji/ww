const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const JobLock = sequelize.define('JobLock', {
  source: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  lockedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  timestamps: false,
});

module.exports = JobLock;
