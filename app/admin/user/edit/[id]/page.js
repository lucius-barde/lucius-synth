import { cookies } from 'next/headers';
import AdminUserEdit from '../../../../components/AdminUserEdit';
import LoginForm from '../../../../components/LoginForm';
import Header from "../../../../components/Header";
import Footer from "../../../../components/Footer";

export default function AdminUserEditPage({ params }) {
  const session = cookies().get('session');

  return (
    <div className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      <Header />
      {session ? <AdminUserEdit userId={params.id} /> : <LoginForm />}
      <Footer />
    </div>
  );
}


