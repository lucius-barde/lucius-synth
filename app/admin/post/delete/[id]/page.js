"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const DeletePostPage = ({ params }) => {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canDelete, setCanDelete] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchPost() {
      try {
        const sessionRes = await fetch('/api/session');
        const sessionData = sessionRes.ok ? await sessionRes.json() : null;
        const currentUser = sessionData?.user || null;

        const res = await fetch(`/api/post/${params.id}`);
        if (!res.ok) throw new Error('Failed to fetch post');
        const data = await res.json();
        setCanDelete(currentUser?.role === 'admin' || data.user_id === currentUser?.id);
        setPost(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [params.id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/post/${params.id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) throw new Error('Failed to delete post');
      
      // Redirect to admin dashboard after successful deletion
      router.push('/admin');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  if (loading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  if (error) return <div className="flex justify-center items-center min-h-screen text-red-500">Error: {error}</div>;
  if (!post) return <div className="flex justify-center items-center min-h-screen">Post not found</div>;
  if (!canDelete) return <div className="flex justify-center items-center min-h-screen text-red-500">You can only delete your own posts.</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Delete Post</h1>
            <Link 
              href="/admin" 
              className="bg-gray-500 text-white rounded-md px-4 py-2 hover:bg-gray-600 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-800">Warning</h3>
                <p className="text-sm text-red-700">
                  This action cannot be undone. This will permanently delete the post.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Post Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">ID</label>
                <p className="mt-1 text-sm text-gray-900">{post.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">{post.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">URL</label>
                <p className="mt-1 text-sm text-gray-900">{post.url}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(post.created).toLocaleString()}
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Content Preview</label>
                <p className="mt-1 text-sm text-gray-900">
                  {post.content.length > 200 ? post.content.slice(0, 200) + '...' : post.content}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Link 
              href="/admin" 
              className="bg-gray-500 text-white rounded-md px-6 py-2 hover:bg-gray-600 transition-colors"
            >
              Cancel
            </Link>
            <button
              onClick={openModal}
              className="cursor-pointer bg-red-600 text-white rounded-md px-6 py-2 hover:bg-red-700 transition-colors"
            >
              Delete Post
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Confirm Deletion</h3>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete &quot;{post.name}&quot;? This action cannot be undone.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeModal}
                disabled={deleting}
                className="cursor-pointer bg-gray-300 text-gray-700 rounded-md px-4 py-2 hover:bg-gray-400 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="cursor-pointer bg-red-600 text-white rounded-md px-4 py-2 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletePostPage;
