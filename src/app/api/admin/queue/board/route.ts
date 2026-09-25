import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { QueueStatus } from "@/lib/constants";
import { getQueueDateString } from "@/lib/queue-date";

export async function GET(request: Request) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  const counterId = new URL(request.url).searchParams.get("counterId");
  if (!counterId) {
    return NextResponse.json({ error: "counterId wajib diisi" }, { status: 400 });
  }

  const counter = await prisma.counter.findFirst({
    where: { id: counterId, clinicId: auth.session.clinicId },
    include: { services: true, clinic: true },
  });
  if (!counter) {
    return NextResponse.json({ error: "Loket tidak ditemukan" }, { status: 404 });
  }

  const serviceIds = counter.services.map((cs) => cs.serviceId);
  const queueDate = getQueueDateString(counter.clinic.timezone);

  const [current, waiting] = await Promise.all([
    prisma.queueEntry.findFirst({
      where: { counterId: counter.id, status: QueueStatus.CALLED, queueDate },
      orderBy: { calledAt: "desc" },
      include: { service: true },
    }),
    prisma.queueEntry.findMany({
      where: { serviceId: { in: serviceIds }, queueDate, status: QueueStatus.WAITING },
      orderBy: { createdAt: "asc" },
      include: { service: true },
    }),
  ]);

  return NextResponse.json({
    current: current
      ? {
          id: current.id,
          code: current.code,
          serviceName: current.service.name,
          patientName: current.patientName,
        }
      : null,
    waiting: waiting.map((entry) => ({
      id: entry.id,
      code: entry.code,
      serviceName: entry.service.name,
      patientName: entry.patientName,
    })),
  });
}
