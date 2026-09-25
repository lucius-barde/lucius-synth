import { NextResponse } from 'next/server';
import { getCurrentUser } from '../auth';

export async function GET(request) {
  const user = await getCurrentUser(request);
  return NextResponse.json({ loggedIn: !!user, user });
}
