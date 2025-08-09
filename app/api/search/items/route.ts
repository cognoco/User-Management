export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/database/supabase';

const bodySchema = z.object({
  query: z.string().optional(),
  categories: z.array(z.string()).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { query, categories, startDate, endDate } = bodySchema.parse(json);

    const supabase = getServiceSupabase();
    let q = supabase.from('items').select('*');
    if (query) q = q.ilike('title', `%${query}%`);
    if (categories && categories.length) q = q.in('category', categories);
    if (startDate) q = q.gte('date', startDate);
    if (endDate) q = q.lte('date', endDate);

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ items: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}