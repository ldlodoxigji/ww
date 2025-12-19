const { DataTypes } = require('sequelize');
const sequelize = require('./index');
const Page = require('./Page');

const ParsedData = sequelize.define('ParsedData', {
  title: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  price: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  rating: DataTypes.STRING,
  unitsSold: DataTypes.STRING,
  category: DataTypes.STRING,
  pageId: {
    type: DataTypes.INTEGER,
    references: {
      model: Page,
      key: 'id',
    },
  },
}, {
  timestamps: true,
});

Page.hasMany(ParsedData, { foreignKey: 'pageId' });
ParsedData.belongsTo(Page, { foreignKey: 'pageId' });

module.exports = ParsedData;
