import { NextRequest, NextResponse } from 'next/server';

const CASPER_RPC_URL = process.env.CASPER_NODE_URL || 'https://node.casper-test.casper.network/rpc';

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

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Casper RPC proxy error:', error);
    return NextResponse.json(
      { 
        error: 'RPC request failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}