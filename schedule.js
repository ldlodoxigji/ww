const { runScraper } = require('./scraper');

const FIVE_MINUTES_MS = 5 * 60 * 1000;

async function launchOnce(reason) {
  const startedAt = new Date().toISOString();
  console.log(`[${startedAt}] ${reason}`);

  try {
    await runScraper();
    console.log(`[${new Date().toISOString()}] Парсинг успешно завершён`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Ошибка при выполнении парсера:`, error.message);
  }
}

launchOnce('Первоначальный запуск парсера...');
setInterval(() => launchOnce('Запуск парсера по расписанию...'), FIVE_MINUTES_MS);

console.log(`[${new Date().toISOString()}] Планировщик запущен. Перезапуск каждые 5 минут.`);
