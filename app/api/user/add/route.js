import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'User registration is disabled. Manage users in Supabase Auth.' },
    { status: 410 }
  );
}
