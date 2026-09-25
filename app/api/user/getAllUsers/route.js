import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'User management is handled by Supabase Auth.' },
    { status: 410 }
  );
}
