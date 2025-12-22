import { NextResponse } from 'next/server';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4402';

export async function GET() {
  try {
    const response = await fetch(`${SERVER_URL}/api/info`);
    
    if (!response.ok) {
      throw new Error('Server not available');
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching server info:', error);
    return NextResponse.json(
      { 
        error: 'Server connection failed',
        message: 'Unable to connect to the x402 server. Make sure it is running on port 4402.'
      },
      { status: 503 }
    );
  }
}