"use client"
import React, { useEffect, useState } from 'react';

const AdminMusicDocumentEdit = ({ documentId }) => {
  const [formData, setFormData] = useState({ title: '', abcNotation: '', tempo: 120, meter: '4/4' });
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchDocument() {
      try {
        const [sessionResponse, documentResponse] = await Promise.all([
          fetch('/api/session'),
          fetch(`/api/musicdocument/${documentId}`),
        ]);
        const sessionData = sessionResponse.ok ? await sessionResponse.json() : null;
        if (!documentResponse.ok) throw new Error('Could not fetch music document');
        const document = await documentResponse.json();
        const user = sessionData?.user;
        setCanEdit(user?.role === 'admin' || document.user_id === user?.id);
        setFormData({
          title: document.name || '',
          abcNotation: document.content || '',
          tempo: document.tempo || 120,
          meter: document.meter || '4/4',
        });
      } catch (error) {
        setMessage(`Error: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
    if (documentId) fetchDocument();
  }, [documentId]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData(previous => ({
      ...previous,
      [name]: name === 'tempo' ? Number(value) : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch(`/api/musicdocument/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update music document');
      setMessage(`Music document "${data.name}" updated successfully!`);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="lucius-site-width-wrapper p-8 flex-1">Loading...</main>;
  if (!canEdit) return <main className="lucius-site-width-wrapper p-8 flex-1"><h1 className="text-4xl font-bold">Edit Music Document</h1><div className="mt-6 p-4 rounded-md bg-red-100 text-red-700">You can only edit your own music documents.</div></main>;

  return (
    <main className="lucius-site-width-wrapper flex flex-col gap-8 p-8 items-center sm:items-start flex-1">
      <h1 className="text-4xl font-bold">Edit Music Document</h1>
      {message && <div className={`p-4 rounded-md w-full max-w-2xl ${message.startsWith('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message}</div>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-2xl">
        <label>Title<input className="border border-gray-300 rounded-md p-2 w-full" name="title" value={formData.title} onChange={handleChange} required /></label>
        <label>Tempo<input className="border border-gray-300 rounded-md p-2 w-full" type="number" name="tempo" value={formData.tempo} onChange={handleChange} min="1" required /></label>
        <label>Meter<select className="border border-gray-300 rounded-md p-2 w-full" name="meter" value={formData.meter} onChange={handleChange}><option>2/4</option><option>3/4</option><option>4/4</option><option>6/8</option><option>9/8</option></select></label>
        <label>ABC notation<textarea className="border border-gray-300 rounded-md p-2 w-full h-64 font-mono" name="abcNotation" value={formData.abcNotation} onChange={handleChange} required /></label>
        <button className="bg-blue-500 text-white rounded-md p-2 disabled:bg-gray-400" type="submit" disabled={submitting}>{submitting ? 'Updating...' : 'Update Music Document'}</button>
      </form>
    </main>
  );
};

export default AdminMusicDocumentEdit;
