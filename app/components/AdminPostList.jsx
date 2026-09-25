"use client"
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const AdminPostList = ({ currentUser }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch('/api/post/getAllPosts');
        if (!res.ok) throw new Error('Failed to fetch posts');
        const data = await res.json();
        setPosts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  // Helper to format timestamp
  function formatDate(ts) {
    if (!ts) return '';
    const date = new Date(Number(ts));
    const pad = n => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  const isAdmin = currentUser?.role === 'admin';
  const visiblePosts = posts.filter(post => isAdmin || post.user_id === currentUser?.id);

  //if (loading) return <div>Loading posts...</div>;
  if (error) return <div className="text-red-500 lucius-dynamic-content">Error: {error}</div>;

  return (
    <div className="w-full overflow-x-auto lucius-dynamic-content">
      <h2 className="text-2xl font-semibold mb-4">Posts</h2>
      <div className="admin-table-wrapper">
        <table className=" min-w-full border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 border">ID</th>
            <th className="px-4 py-2 border">Name</th>
            <th className="px-4 py-2 border">URL</th>
            <th className="px-4 py-2 border">Content</th>
            <th className="px-4 py-2 border">Created</th>
            <th className="px-4 py-2 border">Edited</th>
            <th className="px-4 py-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visiblePosts.map(post => (
            <tr key={post.id} className="border-t">
              <td className="px-4 py-2 border text-center">{post.id}</td>
              <td className="px-4 py-2 border">{post.name}</td>
              <td className="px-4 py-2 border">{post.url}</td>
              <td className="px-4 py-2 border">{post.content.length > 60 ? post.content.slice(0, 60) + '…' : post.content}</td>
              <td className="px-4 py-2 border">{formatDate(post.created)}</td>
              <td className="px-4 py-2 border">{formatDate(post.edited)}</td>
              <td className="px-4 py-2 border">
                <Link href={`/admin/post/edit/${post.id}`} className="bg-blue-500 text-white rounded-md m-2 p-2">Edit</Link>
                <Link href={`/admin/post/delete/${post.id}`} className="bg-red-500 text-white rounded-md p-2">Delete</Link>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminPostList;
