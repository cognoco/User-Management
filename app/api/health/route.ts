import { NextResponse } from 'next/server';
import { getHealthService } from '@/services/health';
import { createMiddlewareChain } from '@/middleware/createMiddlewareChain';
import { errorHandlingMiddleware } from '@/middleware/createMiddlewareChain';

const middleware = createMiddlewareChain([
  errorHandlingMiddleware()
]);

async function handleGet() {
  try {
    const healthService = getHealthService();
    const coreHealth = healthService.getServiceHealth('core');
    return NextResponse.json({
      status: coreHealth.status,
      timestamp: new Date().toISOString(),
      services: { core: coreHealth }
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
