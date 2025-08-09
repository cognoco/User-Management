export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/utils';
import { getStorageService } from '@/services/storage';
import { z } from 'zod';

const schema = z.object({ oldPath: z.string(), newPath: z.string() });

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { oldPath, newPath } = schema.parse(body);
    const storage = getStorageService();
    const result = await storage.moveFile('files', oldPath, newPath);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Rename failed' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}