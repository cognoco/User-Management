import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { setCorrelationId, getCorrelationId } from './correlation-id';

export function correlationIdMiddleware() {
  return async function (
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => Promise<void>
  ) {
    const incomingId = (req.headers['x-correlation-id'] as string) || undefined;
    const parentId = (req as any).correlationId as string | undefined;
    const id = incomingId || (parentId ? `${parentId}.${uuidv4()}` : uuidv4());

    (req as any).correlationId = id;
    res.setHeader('X-Correlation-Id', id);
    
    // Also set it in the correlation ID context for consistency
    setCorrelationId(id);

    try {
      await next();
    } catch (error: any) {
      // Attach correlation ID to errors
      if (error && typeof error === 'object') {
        error.correlationId = id;
      }
      throw error;
    } finally {
      // no-op; request-scoped only
    }
  };
}

