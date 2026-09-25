import { NextResponse } from "next/server";
import { getSupabase } from "../../../lib/supabase";
import { forbiddenResponse, getCurrentUser, isAdmin, unauthorizedResponse } from "../../auth";
import { validateAbcNotation } from "../../../lib/music/abcValidation";
import { slugifyTitle } from "../../../lib/music/documentUtils";
import type { Meter } from "../../../lib/music/constants";

type RouteParams = { params: Promise<{ id: string }> };

async function findDocument(id: string) {
  return getSupabase().from('luciussynth_musicdocuments').select('*').eq('id', id).maybeSingle();
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return unauthorizedResponse();
    const { id } = await params;
    const { data: document, error } = await findDocument(id);
    if (error) throw error;
    if (!document) return NextResponse.json({ error: "Music document not found" }, { status: 404 });
    if (!isAdmin(currentUser) && document.user_id !== currentUser.id) return forbiddenResponse();
    return NextResponse.json(document);
  } catch (error) {
    console.error("Error fetching music document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return unauthorizedResponse();
    const { id } = await params;
    const { title, abcNotation, tempo, meter } = (await request.json()) as {
      title?: string; abcNotation?: string; tempo?: number; meter?: Meter;
    };
    if (!title || !abcNotation || !tempo || !meter) {
      return NextResponse.json({ error: "title, abcNotation, tempo and meter are required" }, { status: 400 });
    }
    const validation = validateAbcNotation(abcNotation);
    if (!validation.valid) {
      return NextResponse.json({ error: "Invalid ABC notation", errors: validation.errors, warnings: validation.warnings }, { status: 422 });
    }
    const { data: existing, error: findError } = await findDocument(id);
    if (findError) throw findError;
    if (!existing) return NextResponse.json({ error: "Music document not found" }, { status: 404 });
    if (!isAdmin(currentUser) && existing.user_id !== currentUser.id) return forbiddenResponse();

    const { data, error } = await getSupabase()
      .from('luciussynth_musicdocuments')
      .update({ name: title, url: slugifyTitle(title), content: abcNotation, tempo, meter, edited: Date.now() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error updating music document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return unauthorizedResponse();
    const { id } = await params;
    const { data: existing, error: findError } = await findDocument(id);
    if (findError) throw findError;
    if (!existing) return NextResponse.json({ error: "Music document not found" }, { status: 404 });
    if (!isAdmin(currentUser) && existing.user_id !== currentUser.id) return forbiddenResponse();

    const { error } = await getSupabase().from('luciussynth_musicdocuments').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ message: "Music document deleted successfully", deletedDocument: existing });
  } catch (error) {
    console.error("Error deleting music document:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
