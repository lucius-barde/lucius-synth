"use client"
import React, { useEffect, useState } from 'react'

const AdminPostCreate = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    content: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch('/api/session');
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user || null);
        }
      } finally {
        setAuthLoading(false);
      }
    }
    fetchSession();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/post/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newPost = await response.json();
        setMessage(`Post "${newPost.name}" created successfully!`);
        setFormData({ name: '', url: '', content: '' }); // Reset form
      } else {
        const errorData = await response.json();
        setMessage(`Error: ${errorData.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <main className="lucius-site-width-wrapper flex flex-col gap-[32px] pt-16 p-8 items-center flex-1">
        <h1 className="text-4xl font-bold">Create Post</h1>
        <div className="lucius-loader" aria-label="Checking permissions..." role="status"><div className="lucius-loader-element"></div></div>

      </main>
    );
  }

  /*if (currentUser?.role !== 'admin') {
    return (
      <main className="lucius-site-width-wrapper flex flex-col gap-[32px] p-8 items-center sm:items-start flex-1">
        <h1 className="text-4xl font-bold">Create Post</h1>
        <div className="p-4 rounded-md bg-red-100 text-red-700">Only admins can create posts.</div>
      </main>
    );
  }*/

  return (
    <main className="lucius-site-width-wrapper flex flex-col gap-[32px] pt-16 p-8 items-center flex-1">
      <h1 className="text-4xl font-bold">Create Post</h1>

      {message && (
        <div className={`p-4 rounded-md w-full max-w-md ${
          message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">
        <div>
          <label htmlFor="name">Title</label><br />
          <input
            className="border border-gray-300 rounded-md p-2 w-full"
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label htmlFor="url">URL</label><br />
          <input
            className="text-sm border border-gray-300 rounded-md p-2 w-full"
            type="text"
            id="url"
            name="url"
            value={formData.url}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label htmlFor="content">Content</label><br />
          <textarea
            className="border border-gray-300 rounded-md p-2 w-full h-32"
            id="content"
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            required
          />
        </div>

        <button
          className="cursor-pointer bg-blue-500 text-white rounded-md p-2 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Post'}
        </button>
      </form>
    </main>
  );
}

export default AdminPostCreate
