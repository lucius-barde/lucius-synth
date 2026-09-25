import { NextResponse } from 'next/server';

const unavailable = () => NextResponse.json(
  { error: 'User management is handled by Supabase Auth and is not available through this API.' },
  { status: 410 }
);

export async function GET() { return unavailable(); }
export async function PUT() { return unavailable(); }
export async function DELETE() { return unavailable(); }
