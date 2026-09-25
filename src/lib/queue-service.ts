import { prisma } from "@/lib/prisma";
import { NotificationType, QueueStatus } from "@/lib/constants";
import { getQueueDateString } from "@/lib/queue-date";
import { broadcastQueueCalled, broadcastQueueUpdated } from "@/lib/realtime";
import {
  buildAlmostTurnMessage,
  buildCalledMessage,
  buildIssuedMessage,
  sendQueueNotification,
} from "@/lib/whatsapp";

const NOTIFY_BEFORE_TURNS = Number(process.env.WA_NOTIFY_BEFORE_TURNS ?? 3);

export class QueueError extends Error {}

/** Jumlah pasien berstatus WAITING dengan nomor lebih kecil (masih di depan). */
async function countWaitingAhead(entry: {
  serviceId: string;
  queueDate: string;
  number: number;
}) {
  return prisma.queueEntry.count({
    where: {
      serviceId: entry.serviceId,
      queueDate: entry.queueDate,
      status: QueueStatus.WAITING,
      number: { lt: entry.number },
    },
  });
}

/** Pasien mengambil nomor antrean baru untuk sebuah layanan/poli. */
export async function issueQueueNumber(params: {
  serviceId: string;
  patientName: string;
  patientPhone: string;
}) {
  const service = await prisma.service.findUnique({
    where: { id: params.serviceId },
    include: { clinic: true },
  });

  if (!service || !service.isActive) {
    throw new QueueError("Layanan/poli tidak ditemukan atau sedang tidak aktif");
  }

  const queueDate = getQueueDateString(service.clinic.timezone);

  const entry = await prisma.$transaction(async (tx) => {
    const last = await tx.queueEntry.findFirst({
      where: { serviceId: service.id, queueDate },
      orderBy: { number: "desc" },
    });
    const number = (last?.number ?? 0) + 1;
    const code = `${service.prefix}-${String(number).padStart(3, "0")}`;

    return tx.queueEntry.create({
      data: {
        serviceId: service.id,
        queueDate,
        number,
        code,
        patientName: params.patientName,
        patientPhone: params.patientPhone,
        status: QueueStatus.WAITING,
      },
    });
  });

  const position = await countWaitingAhead(entry);

  await sendQueueNotification({
    queueEntryId: entry.id,
    phone: entry.patientPhone,
    message: buildIssuedMessage(entry.code, service.name, position),
    type: NotificationType.ISSUED,
  });

  broadcastQueueUpdated({ clinicId: service.clinicId, serviceId: service.id });

  return { entry, position };
}

/** Kirim notifikasi "hampir giliran" ke pasien yang posisinya == N antrean lagi. */
async function notifyAlmostTurn(serviceId: string, queueDate: string) {
  const waitingEntries = await prisma.queueEntry.findMany({
    where: { serviceId, queueDate, status: QueueStatus.WAITING },
    orderBy: { number: "asc" },
    include: { service: true },
  });

  const target = waitingEntries[NOTIFY_BEFORE_TURNS];
  if (!target) return;

  const alreadyNotified = await prisma.notificationLog.findFirst({
    where: { queueEntryId: target.id, type: NotificationType.ALMOST_TURN },
  });
  if (alreadyNotified) return;

  await sendQueueNotification({
    queueEntryId: target.id,
    phone: target.patientPhone,
    message: buildAlmostTurnMessage(target.code, target.service.name, NOTIFY_BEFORE_TURNS),
    type: NotificationType.ALMOST_TURN,
  });
}

/** Petugas memanggil antrean berikutnya untuk sebuah loket. */
export async function callNextForCounter(counterId: string) {
  const counter = await prisma.counter.findUnique({
    where: { id: counterId },
    include: { services: true, clinic: true },
  });

  if (!counter) throw new QueueError("Loket tidak ditemukan");

  const serviceIds = counter.services.map((cs) => cs.serviceId);
  if (serviceIds.length === 0) {
    throw new QueueError("Loket ini belum terhubung ke layanan/poli manapun");
  }

  const queueDate = getQueueDateString(counter.clinic.timezone);

  const next = await prisma.queueEntry.findFirst({
    where: {
      serviceId: { in: serviceIds },
      queueDate,
      status: QueueStatus.WAITING,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!next) return null;

  const updated = await prisma.queueEntry.update({
    where: { id: next.id },
    data: { status: QueueStatus.CALLED, counterId: counter.id, calledAt: new Date() },
    include: { service: true },
  });

  await sendQueueNotification({
    queueEntryId: updated.id,
    phone: updated.patientPhone,
    message: buildCalledMessage(updated.code, updated.service.name, counter.name),
    type: NotificationType.CALLED,
  });

  broadcastQueueCalled({
    clinicId: counter.clinicId,
    serviceId: updated.serviceId,
    serviceName: updated.service.name,
    counterName: counter.name,
    code: updated.code,
    patientName: updated.patientName,
  });
  broadcastQueueUpdated({ clinicId: counter.clinicId, serviceId: updated.serviceId });

  await notifyAlmostTurn(updated.serviceId, queueDate);

  return updated;
}

/** Panggil ulang (re-broadcast) nomor yang sedang aktif di sebuah loket. */
export async function recallCurrentForCounter(counterId: string) {
  const counter = await prisma.counter.findUnique({ where: { id: counterId } });
  if (!counter) throw new QueueError("Loket tidak ditemukan");

  const current = await prisma.queueEntry.findFirst({
    where: { counterId, status: QueueStatus.CALLED },
    orderBy: { calledAt: "desc" },
    include: { service: true },
  });

  if (!current) return null;

  broadcastQueueCalled({
    clinicId: counter.clinicId,
    serviceId: current.serviceId,
    serviceName: current.service.name,
    counterName: counter.name,
    code: current.code,
    patientName: current.patientName,
  });

  return current;
}

export async function skipQueueEntry(entryId: string) {
  const entry = await prisma.queueEntry.findUnique({
    where: { id: entryId },
    include: { service: true },
  });
  if (!entry) throw new QueueError("Data antrean tidak ditemukan");
  if (entry.status !== QueueStatus.WAITING && entry.status !== QueueStatus.CALLED) {
    throw new QueueError("Antrean ini sudah selesai/di-skip sebelumnya");
  }

  const updated = await prisma.queueEntry.update({
    where: { id: entryId },
    data: { status: QueueStatus.SKIPPED },
  });

  broadcastQueueUpdated({ clinicId: entry.service.clinicId, serviceId: entry.serviceId });

  return updated;
}

export async function completeQueueEntry(entryId: string) {
  const entry = await prisma.queueEntry.findUnique({
    where: { id: entryId },
    include: { service: true },
  });
  if (!entry) throw new QueueError("Data antrean tidak ditemukan");
  if (entry.status !== QueueStatus.CALLED) {
    throw new QueueError("Hanya antrean berstatus CALLED yang bisa diselesaikan");
  }

  const updated = await prisma.queueEntry.update({
    where: { id: entryId },
    data: { status: QueueStatus.DONE, doneAt: new Date() },
  });

  broadcastQueueUpdated({ clinicId: entry.service.clinicId, serviceId: entry.serviceId });

  return updated;
}

/** Data agregat untuk layar antrean publik: nomor aktif per loket + antrean berikutnya per layanan. */
export async function getDisplayState(clinicId: string) {
  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
  const queueDate = getQueueDateString(clinic.timezone);

  const [counters, services] = await Promise.all([
    prisma.counter.findMany({
      where: { clinicId, isActive: true },
      orderBy: { name: "asc" },
      include: {
        queueEntries: {
          where: { status: QueueStatus.CALLED, queueDate },
          orderBy: { calledAt: "desc" },
          take: 1,
          include: { service: true },
        },
      },
    }),
    prisma.service.findMany({
      where: { clinicId, isActive: true },
      orderBy: { name: "asc" },
      include: {
        queueEntries: {
          where: { status: QueueStatus.WAITING, queueDate },
          orderBy: { number: "asc" },
          take: 5,
        },
      },
    }),
  ]);

  return {
    queueDate,
    nowServing: counters
      .filter((counter) => counter.queueEntries.length > 0)
      .map((counter) => {
        const entry = counter.queueEntries[0];
        return {
          counterId: counter.id,
          counterName: counter.name,
          code: entry.code,
          serviceName: entry.service.name,
          patientName: entry.patientName,
        };
      }),
    upcoming: services.map((service) => ({
      serviceId: service.id,
      serviceName: service.name,
      entries: service.queueEntries.map((entry) => entry.code),
    })),
  };
}
