"use client"
import React, { useEffect, useState } from 'react';

const PostList = () => {
  const [posts, setPosts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/getPostsPaged?posts_per_page=3&page=${currentPage}`);
        if (!res.ok) throw new Error('Failed to fetch posts');
        const data = await res.json();
        setPosts(data.posts);
        setTotalPages(data.pagination.total_pages);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setIsInitialLoad(false);
      }
    }
    fetchPosts();
  }, [currentPage]);


  // Copy-pasted from AdminPostList.jsx
  // Helper to format timestamp
  function formatDate(ts) {
    if (!ts) return '';
    const date = new Date(Number(ts));
    const pad = n => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  if (error) return <section id="blog"><div className="text-red-500 lucius-dynamic-content">Error: {error}</div></section>;

  return (
   <section id="blog" className="w-full">
	  <h2>Latest posts</h2>
      <div className="lucius-dynamic-content-wrapper w-full overflow-x-auto">
        {loading && isInitialLoad ? (
          <div className="lucius-loader" aria-label="Loading posts" role="status"><div className="lucius-loader-element"></div></div>
        ) : (
          posts.map(post => (
            <article key={post.id} className='post mt-4 mb-4 lucius-dynamic-content'>
              <h3 className='text-xl font-semibold mb-2'><a href={`/post/${post.id}`}>{post.name}</a></h3>
              <p className='text-sm text-gray-600'>{formatDate(post.created)}</p>

              <div>
                <p>{post.content.length > 300 ? post.content.slice(0, 300) + '…' : post.content}</p>
                <a href={`/post/${post.id}`} className='text-blue-500'>Read more</a>
              </div>
            </article>
          ))
        )}

        {(!loading || !isInitialLoad) && totalPages > 0 && (
          <nav className="flex items-center justify-center gap-2 mt-6" aria-label="Posts pagination">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                aria-current={page === currentPage ? 'page' : undefined}
                className={`px-3 py-1 rounded-md border ${
                  page === currentPage
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-blue-500 border-blue-500 hover:bg-blue-50'
                }`}
              >
                {page}
              </button>
            ))}
          </nav>
        )}
      </div>
   </section>

  );
}

export default PostList;
