import { NextResponse } from 'next/server';
import { getSupabase } from '../../lib/supabase';

const DEFAULT_POSTS_PER_PAGE = 3;
const DEFAULT_PAGE = 1;

function getPositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const postsPerPage = getPositiveInteger(searchParams.get('posts_per_page'), DEFAULT_POSTS_PER_PAGE);
    const page = getPositiveInteger(searchParams.get('page'), DEFAULT_PAGE);
    const offset = (page - 1) * postsPerPage;
    const { data: posts, count, error } = await getSupabase()
      .from('luciussynth_posts')
      .select('*', { count: 'exact' })
      .order('edited', { ascending: false })
      .range(offset, offset + postsPerPage - 1);
    if (error) throw error;

    return NextResponse.json({
      posts,
      pagination: {
        page,
        posts_per_page: postsPerPage,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / postsPerPage),
      },
    });
  } catch (error) {
    console.error('Error fetching paginated posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
