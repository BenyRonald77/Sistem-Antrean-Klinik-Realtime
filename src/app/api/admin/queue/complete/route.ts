import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { completeQueueEntry, QueueError } from "@/lib/queue-service";

const schema = z.object({ entryId: z.string().min(1) });

export async function POST(request: Request) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "entryId wajib diisi" }, { status: 400 });
  }

  try {
    const entry = await completeQueueEntry(parsed.data.entryId);
    return NextResponse.json({ entry: { id: entry.id, status: entry.status } });
  } catch (error) {
    if (error instanceof QueueError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
