import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
import { getCurrentUser, unauthorizedResponse } from '../../auth';

export async function POST(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return unauthorizedResponse();
    const body = await request.json();
    if (!body.name || !body.url || !body.content) {
      return NextResponse.json({ error: 'name, url and content are required' }, { status: 400 });
    }
    const now = Date.now();
    const { data, error } = await getSupabase()
      .from('luciussynth_posts')
      .insert({
        name: body.name,
        url: body.url,
        content: body.content,
        user_id: user.id,
        created: now,
        edited: now,
      })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
