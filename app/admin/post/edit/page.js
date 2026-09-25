import { cookies } from 'next/headers';
import AdminPostEdit from '../../../components/AdminPostEdit';
import LoginForm from '../../../components/LoginForm';
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";

export default function Admin() {
  // Get the session cookie on the server
  const session = cookies().get('session');

  return (
    <div className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      <Header />
      {/* If no session, show login form; else show dashboard */}
      {session ? <AdminPostEdit /> : <LoginForm />}
      <Footer />
    </div>
  );
}
