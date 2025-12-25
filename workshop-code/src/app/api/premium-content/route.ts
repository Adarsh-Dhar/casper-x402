// workshop-code/pages/api/premium-content.ts
// This file should be created if you want to use Next.js API routes as a proxy

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get server URL from environment or use default
  const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4402';
  
  try {
    console.log('\n🔄 Next.js API Proxy:');
    console.log('   Method:', req.method);
    console.log('   Target:', `${SERVER_URL}/api/premium-content`);
    console.log('   Headers:', Object.keys(req.headers));
    
    // Forward relevant headers including X-Payment
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Copy X-Payment header if present
    if (req.headers['x-payment']) {
      headers['x-payment'] = req.headers['x-payment'] as string;
      console.log('   ✅ X-Payment header forwarded');
    } else {
      console.log('   ⚠️  No X-Payment header present');
    }

    // Forward the request to Express server
    const response = await fetch(`${SERVER_URL}/api/premium-content`, {
      method: req.method || 'GET',
      headers,
    });

    console.log('   Response status:', response.status);

    // Forward response status
    res.status(response.status);

    // Forward all response headers (important for 402 responses)
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Forward response body
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('   Response:', data.error || data.message || 'Success');
      res.json(data);
    } else {
      const text = await response.text();
      res.send(text);
    }

  } catch (error) {
    console.error('❌ Proxy error:', error);
    res.status(500).json({
      error: 'Proxy error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}