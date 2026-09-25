import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
import { forbiddenResponse, getCurrentUser, isAdmin, unauthorizedResponse } from '../../auth';

async function findPost(id) {
  return getSupabase().from('luciussynth_posts').select('*').eq('id', id).maybeSingle();
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { data, error } = await findPost(id);
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return unauthorizedResponse();
    const { id } = await params;
    const { data: existing, error: findError } = await findPost(id);
    if (findError) throw findError;
    if (!existing) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    if (!isAdmin(user) && existing.user_id !== user.id) return forbiddenResponse();

    const body = await request.json();
    const { data, error } = await getSupabase()
      .from('luciussynth_posts')
      .update({ url: body.url, name: body.name, content: body.content, edited: Date.now() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return unauthorizedResponse();
    const { id } = await params;
    const { data: existing, error: findError } = await findPost(id);
    if (findError) throw findError;
    if (!existing) return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    if (!isAdmin(user) && existing.user_id !== user.id) return forbiddenResponse();
    const { error } = await getSupabase().from('luciussynth_posts').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ message: 'Post deleted successfully', deletedPost: existing });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
