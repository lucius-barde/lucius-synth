"use client"
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const AdminMusicDocumentList = ({ currentUser }) => {
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const res = await fetch('/api/musicdocument/getAllMusicDocuments');
        if (!res.ok) throw new Error('Failed to fetch music documents');
        setDocuments(await res.json());
      } catch (err) {
        setError(err.message);
      }
    }
    fetchDocuments();
  }, []);

  function formatDate(ts) {
    if (!ts) return '';
    const date = new Date(Number(ts));
    const pad = n => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  const isAdmin = currentUser?.role === 'admin';
  const visibleDocuments = documents.filter(document => isAdmin || document.user_id === currentUser?.id);

  if (error) return <div className="text-red-500 lucius-dynamic-content">Error: {error}</div>;

  return (
    <div className="w-full overflow-x-auto lucius-dynamic-content">
      <h2 className="text-2xl font-semibold mb-4">Music documents</h2>
      <div className="admin-table-wrapper">
        <table className="min-w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border">ID</th>
              <th className="px-4 py-2 border">Name</th>
              <th className="px-4 py-2 border">URL</th>
              <th className="px-4 py-2 border">Tempo</th>
              <th className="px-4 py-2 border">Meter</th>
              <th className="px-4 py-2 border">Created</th>
              <th className="px-4 py-2 border">Edited</th>
              <th className="px-4 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleDocuments.map(document => (
              <tr key={document.id} className="border-t">
                <td className="px-4 py-2 border text-center">{document.id}</td>
                <td className="px-4 py-2 border">{document.name}</td>
                <td className="px-4 py-2 border">{document.url}</td>
                <td className="px-4 py-2 border text-center">{document.tempo}</td>
                <td className="px-4 py-2 border text-center">{document.meter}</td>
                <td className="px-4 py-2 border">{formatDate(document.created)}</td>
                <td className="px-4 py-2 border">{formatDate(document.edited)}</td>
                <td className="px-4 py-2 border">
                  <Link href={`/musicdocument/${document.id}`} className="bg-blue-500 text-white rounded-md m-1 p-2">View</Link>
                  {(isAdmin || document.user_id === currentUser?.id) && (
                    <>
                      <Link href={`/admin/musicdocument/edit/${document.id}`} className="bg-blue-500 text-white rounded-md m-1 p-2">Edit</Link>
                      <Link href={`/admin/musicdocument/delete/${document.id}`} className="bg-red-500 text-white rounded-md m-1 p-2">Delete</Link>
                    </>
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

export default AdminMusicDocumentList;
