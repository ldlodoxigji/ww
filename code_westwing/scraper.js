const https = require('https');
const cheerio = require('cheerio');

// ===== БД =====
const sequelize = require('../models');
const Page = require('../models/Page');
const ParsedData = require('../models/ParsedData');
// ==============

function parseWestwing(pageRecord) {
  console.log('Загружаем страницу Westwing...');

  return new Promise((resolve, reject) => {
    https.get('https://www.westwing.es/muebles/', (response) => {
      let html = '';

      response.on('data', (chunk) => {
        html += chunk;
      });

      response.on('end', async () => {
        try {
          const $ = cheerio.load(html);

          let savedCount = 0;
          const uniqueLinks = new Set();

          const links = $('a').toArray();

          for (const element of links) {
            const link = $(element);
            const href = link.attr('href');
            const text = link.text().trim();

            if (
              href &&
              href.includes('.html') &&
              !href.includes('account') &&
              !href.includes('customer') &&
              text.length > 10 &&
              text.length < 100
            ) {
              if (uniqueLinks.has(href)) continue;
              uniqueLinks.add(href);

              const priceElement = link.closest('div').find('div').filter((i, el) => {
                return $(el).text().includes('€');
              }).first();

              let price = 'Цена не указана';
              if (priceElement.length > 0) {
                const raw = priceElement.text().trim();
                const match = raw.match(/[\d.,]+\s*€/);
                if (match) price = match[0];
              }

              console.log(`Найден: ${text} - ${price}`);
              console.log(`Ссылка: https://www.westwing.es${href}`);
              console.log('---');

              // ===== СОХРАНЕНИЕ В БД =====
              await ParsedData.create({
                title: text,
                price,
                rating: '',
                unitsSold: '',
                category: 'Westwing',
                pageId: pageRecord.id
              });
              // ==========================

              savedCount++;
            }
          }

          console.log(`Успешно сохранено товаров: ${savedCount}`);
          console.log('Данные сохранены в БД');
          resolve(savedCount);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (error) => {
      console.log('Ошибка:', error.message);
      reject(error);
    });
  });
}

async function scrapeWestwing(pageRecord) {
  console.log('=== Парсинг Westwing ===');
  console.log('=======================\n');

  try {
    await sequelize.ensureDatabase();
    await parseWestwing(pageRecord);
  } catch (error) {
    console.error('Ошибка:', error.message);
    throw error;
  }
}

module.exports = { scrapeWestwing };

if (require.main === module) {
  (async () => {
    const url = 'https://www.westwing.es/muebles/';
    await sequelize.ensureDatabase();
    const [pageRecord] = await Page.findOrCreate({
      where: { url },
      defaults: { html: 'HTML получен через HTTPS (Westwing)' }
    });

    await scrapeWestwing(pageRecord);
    await sequelize.closeDatabase();
  })();
}
