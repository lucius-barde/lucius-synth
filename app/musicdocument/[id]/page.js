import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import DawEditor from "../../components/music/DawEditor";

export default async function MusicDocumentPage({ params }) {
  const cookieStore = await cookies();
  const session = cookieStore.get("sb-access-token") || cookieStore.get("sb-refresh-token");
  const { id } = await params;

  if (!session) redirect(`/login?returnTo=/musicdocument/${id}`);

  return (
    <div className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      <Header />
      <DawEditor documentId={id} />
      <Footer />
    </div>
  );
}
