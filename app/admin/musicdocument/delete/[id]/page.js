import { cookies } from 'next/headers';
import AdminMusicDocumentDelete from '../../../../components/AdminMusicDocumentDelete';
import LoginForm from '../../../../components/LoginForm';
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';

export default async function AdminMusicDocumentDeletePage({ params }) {
  const session = (await cookies()).get('session');
  const { id } = await params;
  return (
    <div className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      <Header />
      {session ? <AdminMusicDocumentDelete documentId={id} /> : <LoginForm />}
      <Footer />
    </div>
  );
}
