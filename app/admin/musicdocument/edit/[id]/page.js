import { cookies } from 'next/headers';
import AdminMusicDocumentEdit from '../../../../components/AdminMusicDocumentEdit';
import LoginForm from '../../../../components/LoginForm';
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';

export default async function AdminMusicDocumentEditPage({ params }) {
  const session = (await cookies()).get('session');
  const { id } = await params;
  return (
    <div className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      <Header />
      {session ? <AdminMusicDocumentEdit documentId={id} /> : <LoginForm />}
      <Footer />
    </div>
  );
}
