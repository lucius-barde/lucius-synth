import { NextResponse } from "next/server";
import { getSupabase } from "../../../lib/supabase";
import { getCurrentUser, isAdmin, unauthorizedResponse } from "../../auth";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return unauthorizedResponse();

    let query = getSupabase()
      .from('luciussynth_musicdocuments')
      .select('id, url, name, tempo, meter, user_id, created, edited')
      .order('edited', { ascending: false });
    if (!isAdmin(currentUser)) query = query.eq('user_id', currentUser.id);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching music documents:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
