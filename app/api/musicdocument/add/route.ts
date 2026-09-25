import { NextResponse } from "next/server";
import { getSupabase } from "../../../lib/supabase";
import { getCurrentUser, unauthorizedResponse } from "../../auth";
import { validateAbcNotation } from "../../../lib/music/abcValidation";
import { slugifyTitle } from "../../../lib/music/documentUtils";
import type { Meter } from "../../../lib/music/constants";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) return unauthorizedResponse();

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

    const now = Date.now();
    const { data, error } = await getSupabase()
      .from('luciussynth_musicdocuments')
      .insert({
        url: slugifyTitle(title), name: title, content: abcNotation, tempo, meter,
        user_id: currentUser.id, created: now, edited: now,
      })
      .select('*')
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const details =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : error instanceof Error
          ? error.message
          : String(error);
    console.error("Error creating music document:", error);
    return NextResponse.json({ error: details }, { status: 500 });
  }
}
