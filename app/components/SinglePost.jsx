"use client"
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const SinglePost = () => {
    const { id } = useParams();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Copy-pasted from AdminPostList.jsx
    useEffect(() => {
      async function fetchPost() {
        try {
          const res = await fetch(`/api/post/${id}`);
          if (!res.ok) throw new Error('Failed to fetch post');
          const data = await res.json();
          setPost(data);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
      if (id) fetchPost();
    }, [id]);

    // Copy-pasted from AdminPostList.jsx
    // Helper to format timestamp
    function formatDate(ts) {
        if (!ts) return '';
        const date = new Date(Number(ts));
        const pad = n => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }


    if (loading) return <main className="lucius-site-width-wrapper p-8 flex-1"><div className="lucius-loader" aria-label="Loading post..." role="status"><div className="lucius-loader-element"></div></div></main>;
    if (error) return <main className="lucius-site-width-wrapper p-8 flex-1"><div>Error: {error}</div></main>;
    if (!post) return <main className="lucius-site-width-wrapper p-8 flex-1"><div>This post does not exist.</div></main>;

    return(

        <main className="lucius-site-width-wrapper flex-1">
            <section id="blog">
            <div className="w-full overflow-x-auto">
                    <article className='single-post m-8'>
                        <h1 className='text-4xl font-bold'>{post.name}</h1>
                        <p className='text-sm text-gray-600 mb-4'>{formatDate(post.created)}</p>
                        <p className=''>{post.content}</p>
                    </article>
                </div>
            </section>
        </main>
    )
}

export default SinglePost;
