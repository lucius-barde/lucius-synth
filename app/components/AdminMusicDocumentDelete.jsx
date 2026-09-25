"use client"
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const AdminMusicDocumentDelete = ({ documentId }) => {
  const [document, setDocument] = useState(null);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchDocument() {
      try {
        const [sessionResponse, documentResponse] = await Promise.all([
          fetch('/api/session'),
          fetch(`/api/musicdocument/${documentId}`),
        ]);
        const sessionData = sessionResponse.ok ? await sessionResponse.json() : null;
        if (!documentResponse.ok) throw new Error('Could not fetch music document');
        const data = await documentResponse.json();
        const user = sessionData?.user;
        setCanDelete(user?.role === 'admin' || data.user_id === user?.id);
        setDocument(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (documentId) fetchDocument();
  }, [documentId]);

  async function handleDelete() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/musicdocument/${documentId}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Could not delete music document');
      }
      router.push('/admin');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  if (loading) return <main className="p-8">Loading...</main>;
  if (error) return <main className="p-8 text-red-500">Error: {error}</main>;
  if (!document) return <main className="p-8">Music document not found</main>;
  if (!canDelete) return <main className="p-8 text-red-500">You can only delete your own music documents.</main>;

  return (
    <main className="lucius-site-width-wrapper flex flex-col gap-6 p-8 flex-1">
      <div className="flex items-center justify-between"><h1 className="text-4xl font-bold">Delete Music Document</h1><Link href="/admin" className="bg-gray-500 text-white rounded-md px-4 py-2">Back to Dashboard</Link></div>
      <div className="bg-red-50 border border-red-200 rounded-lg p-6"><p>This action cannot be undone.</p><p className="mt-2">Delete <strong>{document.name}</strong>?</p></div>
      <div className="flex gap-4 justify-end"><Link href="/admin" className="bg-gray-500 text-white rounded-md px-6 py-2">Cancel</Link><button onClick={handleDelete} disabled={deleting} className="bg-red-600 text-white rounded-md px-6 py-2 disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete Music Document'}</button></div>
    </main>
  );
};

export default AdminMusicDocumentDelete;
