import { cookies } from 'next/headers';
import AdminUserCreate from '../../../components/AdminUserCreate';
import LoginForm from '../../../components/LoginForm';
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";

export default function AdminUserCreatePage() {
  const session = cookies().get('session');

  return (
    <div className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      <Header />
      {session ? <AdminUserCreate /> : <LoginForm />}
      <Footer />
    </div>
  );
}


