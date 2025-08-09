import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';

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

    try {
      await next();
    } finally {
      // no-op; request-scoped only
    }
  };
}

