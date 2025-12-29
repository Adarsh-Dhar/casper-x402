import { NextRequest } from 'next/server';

const sanitizeUrl = (value: string) =>
  value
    .trim()
    .replace(/^`|`$/g, '')
    .replace(/^"|"$/g, '')
    .replace(/^'|'$/g, '');

const CASPER_RPC_URL = sanitizeUrl(
  process.env.CASPER_NODE_URL || 'http://34.220.83.153:7777'
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // console.log('🌐 Proxying Casper RPC request:', body.method);
    
    const response = await fetch(CASPER_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseBody = await response.arrayBuffer();
    return new Response(responseBody, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('❌ Casper RPC proxy error:', error);
    return Response.json(
      {
        error: 'RPC request failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
