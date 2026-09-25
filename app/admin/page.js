import { cookies } from 'next/headers';

import AdminPageMain from '../components/AdminPageMain';
import LoginForm from '../components/LoginForm';
import Header from "../components/Header";
import Footer from "../components/Footer";

export default async function Admin() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('sb-access-token')?.value;


  return (
    <div className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      <Header />
      {accessToken ? <AdminPageMain /> : <LoginForm />}
      <Footer />
    </div>
  );
}
