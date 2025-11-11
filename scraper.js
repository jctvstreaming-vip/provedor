import puppeteer from 'puppeteer';
import fetch from 'node-fetch';

// Configurações Cloudflare
const ACCOUNT_ID = 'mediafirelinks';
const NAMESPACE_ID = '267a8171-d0f4-40dd-b740-d56711d94c07';
const API_TOKEN = 'mediafirelinks';

// Lista de IDs do MediaFire para atualizar
const mediafireIDs = [
  'muas5t8ethatm40',
  'outroID1',
  'outroID2'
];

async function saveToKV(id, link) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}/values/${id}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'text/plain'
    },
    body: link
  });
  const json = await res.json();
  if (!json.success) console.log(`Erro ao salvar ${id}:`, json.errors);
  else console.log(`✅ Salvo ${id} no KV`);
}

async function scrapeMediaFire(id) {
  const url = `https://www.mediafire.com/file/${id}/file`;
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
  );

  await page.goto(url, { waitUntil: 'networkidle2' });

  try {
    await page.waitForSelector('a#downloadButton', { timeout: 15000 });
    const link = await page.$eval('a#downloadButton', el => el.href);
    await saveToKV(id, link);
  } catch (err) {
    console.log(`❌ Erro ao capturar ${id}:`, err.message);
  }

  await browser.close();
}

(async () => {
  for (const id of mediafireIDs) {
    console.log(`🔹 Atualizando ${id}...`);
    await scrapeMediaFire(id);
  }
  console.log('✅ Todos os links atualizados!');
})();
