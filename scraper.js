import puppeteer from 'puppeteer';
import fetch from 'node-fetch';

// Configurações Cloudflare
const ACCOUNT_ID = 'seu_account_id';
const API_TOKEN = 'seu_api_token';
const NAMESPACE = 'mediafirelinks'; // mesmo binding do Worker

// Função para salvar KV
async function saveKV(key, value) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE}/values/${key}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'text/plain'
    },
    body: value
  });
  const data = await res.json();
  return data;
}

// Função principal
async function scrapeMediafire(id) {
  const url = `https://www.mediafire.com/file/${id}/file`;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
  );

  await page.goto(url, { waitUntil: 'networkidle2' });

  // Tenta extrair o link do botão de download
  const downloadLink = await page.evaluate(() => {
    const btn = document.querySelector('a#downloadButton');
    return btn ? btn.href : null;
  });

  await browser.close();

  if (!downloadLink) {
    throw new Error('Não foi possível extrair o link do MediaFire.');
  }

  // Salva no KV
  await saveKV(id, downloadLink);
  console.log(`✅ ID ${id} salvo no KV: ${downloadLink}`);
}

// Exemplo de execução
const mediafireID = 'H95CVCBQ'; // ID do arquivo
scrapeMediafire(mediafireID).catch(console.error);
