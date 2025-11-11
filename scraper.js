// scraper.js
// Usage: node scraper.js <MEDIAFIRE_ID>
// Requires .env with CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, KV_NAMESPACE_ID

require('dotenv').config();
const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const KV_NAMESPACE = process.env.KV_NAMESPACE_ID;

if (!ACCOUNT_ID || !API_TOKEN || !KV_NAMESPACE) {
  console.error('ERROR: Missing Cloudflare credentials in .env');
  process.exit(1);
}

const MEDIAFIRE_BASE = 'https://www.mediafire.com/file/';

async function saveToKV(key, value) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE}/values/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'text/plain'
    },
    body: value
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error('KV write failed: ' + (json ? JSON.stringify(json) : res.statusText));
  }
  return true;
}

async function extractDirectLink(page, id) {
  const url = `${MEDIAFIRE_BASE}${id}/file`;
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  // Try to get redirect location by clicking download button or reading HTML
  try {
    // Try to click the download button if present
    const selectors = ['a#downloadButton', 'a[data-href]', 'a[href*="/download/"]'];
    for (const sel of selectors) {
      const el = await page.$(sel);
      if (el) {
        const href = await page.evaluate(e => e.href || e.getAttribute('data-href') || e.getAttribute('data-url'), el);
        if (href && href.includes('download')) return href;
      }
    }
  } catch (e) {
    // ignore
  }

  // Fallback: search page HTML for download* link
  const html = await page.content();
  const regex = /(https?:\/\/download[0-9a-zA-Z.\-]+\.mediafire\.com\/[^\"'<> ]+\.(mp4|mkv|avi|mov|mp3))/i;
  const m = html.match(regex);
  if (m && m[0]) return m[0];

  // Try download_repair endpoint
  try {
    const repairUrl = `https://www.mediafire.com/download_repair.php?qkey=${id}&origin=click_button`;
    await page.goto(repairUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    const repairHtml = await page.content();
    const m2 = repairHtml.match(regex);
    if (m2 && m2[0]) return m2[0];
  } catch (e) {}

  return null;
}

(async () => {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: node scraper.js <MEDIAFIRE_ID>');
    process.exit(1);
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  try {
    console.log('Looking for direct link for:', id);
    const link = await extractDirectLink(page, id);
    if (!link) {
      console.error('No direct link found.');
      await browser.close();
      process.exit(2);
    }
    console.log('Found:', link);
    await saveToKV(id, link);
    console.log('Saved to Cloudflare KV under key:', id);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
})();
