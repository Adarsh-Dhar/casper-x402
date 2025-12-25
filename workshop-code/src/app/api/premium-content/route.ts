import { NextRequest } from 'next/server';

const getServerUrl = () => process.env.SERVER_URL || 'http://localhost:4402';

const buildProxyHeaders = (request: NextRequest): HeadersInit => {
  const headers: Record<string, string> = {};

  const xPayment = request.headers.get('x-payment');
  if (xPayment) headers['x-payment'] = xPayment;

  const accept = request.headers.get('accept');
  if (accept) headers.accept = accept;

  return headers;
};

const filterResponseHeaders = (headers: Headers): Headers => {
  const outgoing = new Headers();
  headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'transfer-encoding' || lower === 'connection' || lower === 'keep-alive') return;
    outgoing.set(key, value);
  });
  return outgoing;
};

export async function GET(request: NextRequest): Promise<Response> {
  const serverUrl = getServerUrl();
  const response = await fetch(`${serverUrl}/api/premium-content`, {
    method: 'GET',
    headers: buildProxyHeaders(request),
    cache: 'no-store',
  });

  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers: filterResponseHeaders(response.headers),
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  const serverUrl = getServerUrl();
  const response = await fetch(`${serverUrl}/api/premium-content`, {
    method: 'POST',
    headers: buildProxyHeaders(request),
    body: await request.arrayBuffer(),
    cache: 'no-store',
  });

  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers: filterResponseHeaders(response.headers),
  });
}
