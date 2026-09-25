"use client"
import React, { useState, useEffect } from 'react'

const AdminUserEdit = ({ userId }) => {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    email: '',
    description: '',
    password: '',
    role: 'user',
    status: 'active',
    permissions: 'read'
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const sessionResponse = await fetch('/api/session');
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          setCurrentUser(sessionData.user || null);
        }

        const response = await fetch(`/api/user/${userId}`);
        if (response.ok) {
          const user = await response.json();
          setFormData({
            name: user.name || '',
            url: user.url || '',
            email: user.email || '',
            description: user.description || '',
            password: '',
            role: user.role || 'user',
            status: user.status || 'active',
            permissions: Array.isArray(user.permissions) ? (user.permissions[0] || 'read') : 'read'
          });
        } else {
          setMessage('Error: Could not fetch user data');
        }
      } catch (error) {
        setMessage(`Error: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const isAdmin = currentUser?.role === 'admin';

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
      const response = await fetch(`/api/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          url: formData.url,
          email: formData.email,
          description: formData.description,
          password: formData.password,
          role: formData.role,
          status: formData.status,
          permissions: [formData.permissions]
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setMessage(`User "${updatedUser.name}" updated successfully!`);
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

  if (isLoading) {
    return (
      <main className="lucius-site-width-wrapper flex flex-col gap-[32px] p-8 items-center sm:items-start flex-1">
        <h1 className="text-4xl font-bold">Edit User</h1>
        <div className="lucius-loader" aria-label="Loading data..." role="status"><div className="lucius-loader-element"></div></div>

      </main>
    );
  }

  return (
    <main className="lucius-site-width-wrapper flex flex-col gap-[32px] p-8 items-center sm:items-start flex-1">
      <h1 className="text-4xl font-bold">Edit User</h1>

      {message && (
        <div className={`p-4 rounded-md w-full max-w-md ${
          message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md">
        <div>
          <label htmlFor="name">Name</label><br />
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
          <label htmlFor="email">Email</label><br />
          <input
            className="text-sm border border-gray-300 rounded-md p-2 w-full"
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label htmlFor="description">Description</label><br />
          <textarea
            className="border border-gray-300 rounded-md p-2 w-full h-24"
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
          />
        </div>
        <div>
          <label htmlFor="password">Password</label><br />
          <input
            className="text-sm border border-gray-300 rounded-md p-2 w-full"
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Leave blank to keep current password"
          />
          <div className="text-xs text-gray-500 mt-1">If provided, it will be securely hashed with bcrypt.</div>
        </div>
        {isAdmin && (
          <>
            <div>
              <label htmlFor="role">Role</label><br />
              <select
                className="text-sm border border-gray-300 rounded-md p-2 w-full"
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
              >
                <option value="admin">admin</option>
                <option value="user">user</option>
              </select>
            </div>
            <div>
              <label htmlFor="status">Status</label><br />
              <select
                className="text-sm border border-gray-300 rounded-md p-2 w-full"
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
              >
                <option value="active">active</option>
                <option value="deleted">deleted</option>
              </select>
            </div>
            <div>
              <label>Permissions</label><br />
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="permissions"
                    value="read"
                    checked={formData.permissions === 'read'}
                    onChange={handleInputChange}
                  />
                  <span>read</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="permissions"
                    value="write"
                    checked={formData.permissions === 'write'}
                    onChange={handleInputChange}
                  />
                  <span>write</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="permissions"
                    value="delete"
                    checked={formData.permissions === 'delete'}
                    onChange={handleInputChange}
                  />
                  <span>delete</span>
                </label>
              </div>
            </div>
          </>
        )}

        <button
          className="cursor-pointer bg-blue-500 text-white rounded-md p-2 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Updating...' : 'Update User'}
        </button>
      </form>
    </main>
  );
}

export default AdminUserEdit
