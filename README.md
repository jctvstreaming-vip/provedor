# mediafire-scraper

Bot Puppeteer + Cloudflare Worker that extracts direct MediaFire links and stores them in Cloudflare KV.

## Quick start

1. Copy `.env.example` to `.env` and fill your Cloudflare credentials:
```
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
KV_NAMESPACE_ID=...
```

2. Install dependencies:
```
npm install
```

3. Run the scraper to extract a MediaFire ID and save to KV:
```
node scraper.js xrus1qkl3npk7ah
```

4. Deploy the Worker (`worker.js`) to Cloudflare and bind the KV namespace to the variable `MEDIAFIRE_KV`.

## Files

- `scraper.js` - Puppeteer script that extracts direct links and saves to Cloudflare KV.
- `worker.js` - Cloudflare Worker (module format) that reads KV and redirects to the direct link.
