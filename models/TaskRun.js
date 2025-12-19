const { DataTypes } = require('sequelize');
const sequelize = require('./index');
const Page = require('./Page');

const TaskRun = sequelize.define('TaskRun', {
  source: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('running', 'success', 'error'),
    allowNull: false,
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  finishedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  pageId: {
    type: DataTypes.INTEGER,
    references: {
      model: Page,
      key: 'id',
    },
  },
}, {
  timestamps: false,
});

Page.hasMany(TaskRun, { foreignKey: 'pageId' });
TaskRun.belongsTo(Page, { foreignKey: 'pageId' });

module.exports = TaskRun;
