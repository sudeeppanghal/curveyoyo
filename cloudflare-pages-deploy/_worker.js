export default {
  async fetch(request, env, ctx) {
    const originalUrl = new URL(request.url);
    const targetUrl = new URL(request.url);
    targetUrl.hostname = 'yoyosmm.vercel.app';
    targetUrl.protocol = 'https:';
    targetUrl.port = '';

    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-Host', originalUrl.host);
    headers.set('X-Forwarded-Proto', originalUrl.protocol.replace(':', ''));

    const reqInit = {
      method: request.method,
      headers: headers,
      redirect: 'manual'
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      reqInit.body = request.body;
      reqInit.duplex = 'half';
    }

    try {
      const response = await fetch(targetUrl.toString(), reqInit);

      const resHeaders = new Headers(response.headers);
      const location = resHeaders.get('Location');
      if (location && location.includes('yoyosmm.vercel.app')) {
        resHeaders.set('Location', location.replace('yoyosmm.vercel.app', originalUrl.host));
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: resHeaders
      });
    } catch (err) {
      return new Response('Gateway Error: ' + err.message, { status: 502 });
    }
  }
};
