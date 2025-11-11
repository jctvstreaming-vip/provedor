// worker.js - Module format for Cloudflare Workers (using wrangler v2)
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const id = url.pathname.replace('/', '').trim();
    if (!id) return new Response('Missing ID in path', { status: 400 });

    // KV binding name: MEDIAFIRE_KV (configure in wrangler.toml or dashboard)
    const link = await env.MEDIAFIRE_KV.get(id);
    if (!link) return new Response('Link not found in KV. Run scraper first.', { status: 404 });

    return Response.redirect(link, 302);
  }
};
