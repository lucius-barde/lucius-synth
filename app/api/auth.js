import { NextResponse } from 'next/server';
import { getSupabase } from '../lib/supabase';

export async function getCurrentUser(request) {
  const token = request.cookies.get('sb-access-token')?.value;
  if (!token) return null;

  const { data: { user }, error } = await getSupabase().auth.getUser(token);
  if (error || !user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name || user.email,
    role: user.app_metadata?.role || (user.email && user.email === process.env.SUPABASE_ADMIN_EMAIL ? 'admin' : 'user'),
    created: user.created_at,
    edited: user.updated_at,
  };
}

export function isAdmin(user) {
  return user?.role === 'admin';
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
