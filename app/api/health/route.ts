import { NextResponse } from 'next/server';
import { getHealthService } from '@/services/health';
import { createMiddlewareChain } from '@/middleware/createMiddlewareChain';
import { errorHandlingMiddleware } from '@/middleware/createMiddlewareChain';

const middleware = createMiddlewareChain([
  errorHandlingMiddleware()
]);

// DEBUG: health route module loaded
async function handleGet() {
  try {
    const healthService = getHealthService();
    const status = await healthService.checkSystemHealth();
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: status
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}

export const GET = middleware(() => handleGet());
