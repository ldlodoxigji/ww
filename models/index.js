const path = require('path');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.resolve(__dirname, '..', 'database.sqlite'),
  logging: false,
});

let isSynced = false;

async function ensureDatabase() {
  if (isSynced) return sequelize;

  await sequelize.authenticate();
  await sequelize.sync({ alter: false });
  isSynced = true;
  return sequelize;
}

async function closeDatabase() {
  if (!isSynced) return;
  await sequelize.close();
  isSynced = false;
}

sequelize.ensureDatabase = ensureDatabase;
sequelize.closeDatabase = closeDatabase;

module.exports = sequelize;
