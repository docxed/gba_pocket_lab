const readTotal = 'SELECT total FROM visits WHERE id = 1';
const addVisit = 'UPDATE visits SET total = total + 1 WHERE id = 1 RETURNING total';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const headers = { 'Cache-Control': 'no-store', Vary: 'Origin' };
    if (url.pathname !== '/visits' || url.search) return new Response(null, { status: 404, headers });
    if (!env.SITE_ORIGIN || origin !== env.SITE_ORIGIN) return new Response(null, { status: 403, headers });

    headers['Access-Control-Allow-Origin'] = origin;
    if (request.method !== 'GET' && request.method !== 'POST') {
      return new Response(null, { status: 405, headers: { ...headers, Allow: 'GET, POST' } });
    }
    if (request.body) return new Response(null, { status: 400, headers });

    try {
      const row = await env.DB.prepare(request.method === 'POST' ? addVisit : readTotal).first();
      return Response.json({ total: row.total }, { headers });
    } catch {
      return new Response(null, { status: 503, headers });
    }
  }
};
