const sequelize = require('./models');
const Page = require('./models/Page');
const TaskRun = require('./models/TaskRun');
const JobLock = require('./models/JobLock');
const { scrapeAmazon } = require('./code_amazon/scraper');
const { scrapeCoolmod } = require('./code_coolmod/scraper');
const { scrapeStradivarius } = require('./code_stradivarius/scraper');
const { scrapeUlanka } = require('./code_ulanka/scraper');
const { scrapeWestwing } = require('./code_westwing/scraper');

const LOCK_KEY = 'multi-source-scraper';

const SOURCES = [
  {
    key: 'amazon-bestsellers',
    url: 'https://www.amazon.es/gp/bestsellers',
    html: 'HTML сохранён в рамках практической работы №3',
    runner: (page) => scrapeAmazon(page.id),
  },
  {
    key: 'coolmod',
    url: 'https://www.coolmod.com/coolpcs-black/',
    html: 'HTML получен через Puppeteer (Coolmod)',
    runner: (page) => scrapeCoolmod(page),
  },
  {
    key: 'stradivarius',
    url: 'https://www.stradivarius.com/ic/mujer/ropa/sudaderas-n1989',
    html: 'HTML получен через Puppeteer (Stradivarius)',
    runner: (page) => scrapeStradivarius(page),
  },
  {
    key: 'ulanka',
    url: 'https://ulanka.com/en-eu/pages/look-1',
    html: 'HTML получен через HTTPS (Ulanka)',
    runner: (page) => scrapeUlanka(page),
  },
  {
    key: 'westwing',
    url: 'https://www.westwing.es/muebles/',
    html: 'HTML получен через HTTPS (Westwing)',
    runner: (page) => scrapeWestwing(page),
  },
];

async function acquireLock() {
  try {
    await JobLock.create({
      source: LOCK_KEY,
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
  await JobLock.destroy({ where: { source: LOCK_KEY } });
}

async function ensurePageRecord(source) {
  const [page] = await Page.findOrCreate({
    where: { url: source.url },
    defaults: { html: source.html },
  });

  return page;
}

async function runSource(source) {
  const taskRun = await TaskRun.create({
    source: source.key,
    status: 'running',
    startedAt: new Date(),
  });

  try {
    const page = await ensurePageRecord(source);
    await taskRun.update({ pageId: page.id });

    console.log(`Запуск парсера для ${source.key}...`);
    await source.runner(page);

    await taskRun.update({
      status: 'success',
      finishedAt: new Date(),
    });
    console.log(`Парсер ${source.key} завершён, данные сохранены в БД`);
  } catch (err) {
    await taskRun.update({
      status: 'error',
      finishedAt: new Date(),
      errorMessage: err.message,
    });

    console.error(`Ошибка выполнения (${source.key}):`, err.message);
    throw err;
  }
}

async function runScraper() {
  await sequelize.ensureDatabase();

  const lockAcquired = await acquireLock();
  if (!lockAcquired) return;

  const errors = [];

  try {
    for (const source of SOURCES) {
      try {
        await runSource(source);
      } catch (err) {
        errors.push(`${source.key}: ${err.message}`);
      }
    }

    if (errors.length) {
      throw new Error(`Часть источников завершилась ошибкой: ${errors.join('; ')}`);
    }
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
