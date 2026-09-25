"use client"
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const AdminUserList = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/user/getAllUsers');
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  // Helper to format timestamp
  function formatDate(ts) {
    if (!ts) return '';
    const date = new Date(Number(ts));
    const pad = n => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  const isAdmin = currentUser?.role === 'admin';
  const visibleUsers = users.filter(user => isAdmin || user.id === currentUser?.id);

  //if (loading) return <div>Loading users...</div>;
  if (error) return <div className="text-red-500 lucius-dynamic-content">Error: {error}</div>;

  return (
    <div className="w-full overflow-x-auto lucius-dynamic-content">
      <h2 className="text-2xl font-semibold mb-4">Users</h2>
      <div className="admin-table-wrapper">
        <table className="admin-user-list min-w-full border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 border">ID</th>
            <th className="px-4 py-2 border">Name</th>
            <th className="px-4 py-2 border">URL</th>
            <th className="px-4 py-2 border">E-mail</th>
            <th className="px-4 py-2 border">Created</th>
            <th className="px-4 py-2 border">Edited</th>
            <th className="px-4 py-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visibleUsers.map(user => (
            <tr key={user.id} className="border-t">
              <td className="px-4 py-2 border text-center">{user.id}</td>
              <td className="px-4 py-2 border">{user.name}</td>
              <td className="px-4 py-2 border">{user.url}</td>
              <td className="px-4 py-2 border">{user.email}</td>
              <td className="px-4 py-2 border">{formatDate(user.created)}</td>
              <td className="px-4 py-2 border">{formatDate(user.edited)}</td>
              <td className="px-4 py-2 border">
                <Link href={`/admin/user/edit/${user.id}`} className="bg-blue-500 text-white rounded-md m-2 p-2">Edit</Link>
                {isAdmin && user.id !== currentUser?.id && (
                  <Link href={`/admin/user/delete/${user.id}`} className="bg-red-500 text-white rounded-md p-2">Delete</Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminUserList;
