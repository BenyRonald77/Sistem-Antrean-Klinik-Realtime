import { NextResponse } from "next/server";
import { z } from "zod";
import { issueQueueNumber, QueueError } from "@/lib/queue-service";

const schema = z.object({
  serviceId: z.string().min(1),
  patientName: z.string().min(1).max(100),
  patientPhone: z.string().min(8).max(20),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  try {
    const { entry, position } = await issueQueueNumber(parsed.data);
    return NextResponse.json({
      entry: { id: entry.id, code: entry.code, status: entry.status },
      position,
    });
  } catch (error) {
    if (error instanceof QueueError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
