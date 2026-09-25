import { NextResponse } from 'next/server';
import { getSupabase } from '../lib/supabase';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const email = String(formData.get('login') || '').trim();
    const password = String(formData.get('password') || '');

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 });
    }

    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: data.session.expires_in,
    };
    response.cookies.set('sb-access-token', data.session.access_token, options);
    response.cookies.set('sb-refresh-token', data.session.refresh_token, {
      ...options,
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (error) {
    console.error('Supabase login failed:', error);
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 });
  }
}
