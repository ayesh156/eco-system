// Minimal Vercel Serverless Test - No external dependencies
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Simple health check
  return res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Backend is running on Vercel!',
    path: req.url,
    method: req.method,
    env: {
      hasDbUrl: !!process.env.DATABASE_URL,
      nodeEnv: process.env.NODE_ENV || 'not set'
    }
  });
}
