const sequelize = require('./models');
const Page = require('./models/Page');
const TaskRun = require('./models/TaskRun');
const JobLock = require('./models/JobLock');
const { scrapeAmazon } = require('./code_amazon/scraper');

const SOURCE_KEY = 'amazon-bestsellers';

async function acquireLock() {
  try {
    await JobLock.create({
      source: SOURCE_KEY,
      lockedAt: new Date(),
    });
    return true;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.warn('Запуск пропущен: парсер уже работает.');
      return false;
    }
    throw error;
  }
}

async function releaseLock() {
  await JobLock.destroy({ where: { source: SOURCE_KEY } });
}

async function runScraper() {
  await sequelize.ensureDatabase();

  const lockAcquired = await acquireLock();
  if (!lockAcquired) return;

  const taskRun = await TaskRun.create({
    source: SOURCE_KEY,
    status: 'running',
    startedAt: new Date(),
  });

  try {
    const [page] = await Page.findOrCreate({
      where: { url: 'https://www.amazon.es/gp/bestsellers' },
      defaults: { html: 'HTML сохранён в рамках практической работы №3' },
    });

    await taskRun.update({ pageId: page.id });

    console.log('Запуск Amazon парсера...');
    await scrapeAmazon(page.id);

    await taskRun.update({
      status: 'success',
      finishedAt: new Date(),
    });

    console.log('Парсинг завершён, данные сохранены в БД');
  } catch (err) {
    await taskRun.update({
      status: 'error',
      finishedAt: new Date(),
      errorMessage: err.message,
    });

    console.error('Ошибка выполнения:', err.message);
    throw err;
  } finally {
    await releaseLock();
  }
}

module.exports = { runScraper };

if (require.main === module) {
  runScraper()
    .then(() => sequelize.closeDatabase())
    .then(() => process.exit(0))
    .catch(async (err) => {
      console.error('Критическая ошибка:', err);
      await sequelize.closeDatabase();
      process.exit(1);
    });
}
