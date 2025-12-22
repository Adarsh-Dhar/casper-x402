import { NextRequest, NextResponse } from 'next/server';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4402';

export async function GET(request: NextRequest) {
  try {
    // Get the X-Payment header from the request
    const xPaymentHeader = request.headers.get('x-payment');
    
    // Forward the request to the real server
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (xPaymentHeader) {
      headers['X-Payment'] = xPaymentHeader;
    }
    
    const response = await fetch(`${SERVER_URL}/api/premium-content`, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    // Forward the response with the same status code
    return NextResponse.json(data, { 
      status: response.status,
      headers: {
        'X-Payment-Required': response.headers.get('X-Payment-Required') || '',
      }
    });
    
  } catch (error) {
    console.error('Error proxying to server:', error);
    return NextResponse.json(
      { error: 'Server connection failed' },
      { status: 503 }
    );
  }
}