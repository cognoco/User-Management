export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/database/supabase';

export async function POST(req: NextRequest) {
  try {
    const { data } = await req.json();
    if (!data) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }
    const supabase = getServiceSupabase();
    const { data: inserted, error } = await supabase.from('imported_data').insert(data).select('*');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ inserted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}