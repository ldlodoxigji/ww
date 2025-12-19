const sequelize = require('./models');
const { runScraper } = require('./scraper');

(async () => {
  try {
    await runScraper();
    console.log('Парсер выполнен однократно');
  } catch (err) {
    console.error('Ошибка выполнения:', err.message);
  } finally {
    await sequelize.closeDatabase();
  }
})();
