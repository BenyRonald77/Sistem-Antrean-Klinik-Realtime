import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/api-auth";
import { QueueError, recallCurrentForCounter } from "@/lib/queue-service";

const schema = z.object({ counterId: z.string().min(1) });

export async function POST(request: Request) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "counterId wajib diisi" }, { status: 400 });
  }

  try {
    const entry = await recallCurrentForCounter(parsed.data.counterId);
    if (!entry) {
      return NextResponse.json({ entry: null, message: "Belum ada nomor aktif di loket ini" });
    }
    return NextResponse.json({ entry: { id: entry.id, code: entry.code } });
  } catch (error) {
    if (error instanceof QueueError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
