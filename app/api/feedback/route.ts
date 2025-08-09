export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/database/supabase';
import { createMiddlewareChain, errorHandlingMiddleware } from '@/middleware/createMiddlewareChain';

const middleware = createMiddlewareChain([errorHandlingMiddleware()]);

const feedbackSchema = z.object({
  category: z.string(),
  message: z.string(),
  screenshotUrl: z.string().nullable().optional(),
});

export const POST = middleware(async (req: NextRequest, auth) => {
  const data = feedbackSchema.parse(await req.json());
  const supabase = getServiceSupabase();
  const { error } = await supabase.from('feedback').insert({
    ...data,
    userId: auth.userId,
    createdAt: new Date().toISOString(),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
});
