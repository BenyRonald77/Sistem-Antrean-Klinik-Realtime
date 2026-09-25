import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { QueueStatus } from "@/lib/constants";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const entry = await prisma.queueEntry.findUnique({
    where: { id: params.id },
    include: { service: true, counter: true },
  });

  if (!entry) {
    return NextResponse.json({ error: "Nomor antrean tidak ditemukan" }, { status: 404 });
  }

  let position: number | null = null;
  if (entry.status === QueueStatus.WAITING) {
    position = await prisma.queueEntry.count({
      where: {
        serviceId: entry.serviceId,
        queueDate: entry.queueDate,
        status: QueueStatus.WAITING,
        number: { lt: entry.number },
      },
    });
  }

  return NextResponse.json({
    code: entry.code,
    serviceName: entry.service.name,
    status: entry.status,
    counterName: entry.counter?.name ?? null,
    position,
  });
}
