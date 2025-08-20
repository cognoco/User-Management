import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const text = await request.text();
    console.log('Raw body:', text);
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      parsed = { error: 'Failed to parse JSON', raw: text };
    }
    
    return NextResponse.json({
      headers: Object.fromEntries(request.headers.entries()),
      body: parsed,
      contentType: request.headers.get('content-type'),
      contentLength: request.headers.get('content-length')
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}